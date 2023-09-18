//SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

pragma solidity ^0.8.18;

/*Custom error codes*/
error Graffiti__RangeOutOfBounds();
error Graffiti__MinMintFeeNotPaid();
error Graffiti__TransactionFailed();

contract Graffiti is ERC721URIStorage, VRFConsumerBaseV2, Ownable{

    /*Type Declarations*/
    enum Graffitis {
        graffiti1, //0-10
        graffiti2, //10-30
        graffiti3, //30-50
        graffiti4, //50-70
        graffiti5  //70-MAX_CHANCE_VALUE
    }

    /*VRF variables*/
    VRFCoordinatorV2Interface private immutable i_vrfCoordinatorV2;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    /*VRF helpers*/
    mapping (uint256 => address) public s_requestIdToSender;

    /*NFT variables*/
    uint256 private s_tokenCounter;
    uint256 private constant MAX_CHANCE_VALUE = 100;
    string[] internal s_graffitiTokenURI;
    uint256 internal immutable i_mintFee;

    /*Events*/
    event NftRequest(uint256 indexed requestId, address minter);
    event NftMinted(Graffitis mintedGraffiti, address owner);
    event Withdrawn(uint256 indexed amount);

    constructor(
        address _vrfCoordinatorV2,
        uint64 _subscriptionId,
        bytes32 _gasLane,
        uint32 _callbackGasLimit,
        string[5] memory _graffitiTokenURI,
        uint256 _mintFee
    ) 
    ERC721("Graffit", "GFT") 
    VRFConsumerBaseV2(_vrfCoordinatorV2){
        i_vrfCoordinatorV2 = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_subscriptionId = _subscriptionId;
        i_gasLane = _gasLane;
        i_callbackGasLimit = _callbackGasLimit;
        s_graffitiTokenURI = _graffitiTokenURI;
        i_mintFee = _mintFee;
    }

    function requestRandomNft() public payable returns (uint256 requestId){
        if(msg.value < i_mintFee) {
            revert Graffiti__MinMintFeeNotPaid();
        }

        requestId = i_vrfCoordinatorV2.requestRandomWords(
            i_gasLane, 
            i_subscriptionId, 
            REQUEST_CONFIRMATIONS, 
            i_callbackGasLimit, 
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;

        emit NftRequest(requestId, msg.sender);
    }

    function fulfillRandomWords(
        uint256 _requestId, 
        uint256[] memory _randomWords
        ) internal override {
        address nftOwner = s_requestIdToSender[_requestId];
        uint256 mintedTokenId = s_tokenCounter;

        uint256 moddedRng = _randomWords[0] % MAX_CHANCE_VALUE;

        Graffitis pickedGraffiti = getGraffitiFromModdedRng(moddedRng);
        s_tokenCounter += s_tokenCounter;
        _safeMint(nftOwner, mintedTokenId);
        _setTokenURI(mintedTokenId, s_graffitiTokenURI[uint256(pickedGraffiti)]);

        emit NftMinted(pickedGraffiti, nftOwner);
    }

    function withdraw() public onlyOwner {
        uint256 transferAmount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: transferAmount}("");
        if(!success) {
            revert Graffiti__TransactionFailed();
        }

        emit Withdrawn(transferAmount);
    }

    /*View & Pure Functions for testing & help*/
    function getChanceArray() public pure returns (uint256[5] memory) {
        return [10, 30, 50, 70, MAX_CHANCE_VALUE];
    }

    function getGraffitiFromModdedRng(uint256 _moddedRng) public pure returns (Graffitis) {
        uint256 cummulativeSum = 0;
        uint256[5] memory chanceArray = getChanceArray();

        for(uint256 i = 0; i<chanceArray.length; i++) {
            if(_moddedRng >= cummulativeSum && _moddedRng < cummulativeSum + chanceArray[i]) {
                return Graffitis(i);
            }
            cummulativeSum += chanceArray[i];
        }
        revert Graffiti__RangeOutOfBounds();
    }

    function getMintFee() public view returns(uint256) {
        return i_mintFee;
    }

    function getGraffitiTokenURIs(uint256 _uriIndex) public view returns (string memory) {
        return s_graffitiTokenURI[_uriIndex];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}