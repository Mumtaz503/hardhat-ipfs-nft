const {network} = require("hardhat");
const {developmentChains, networkConfig} = require("../helper-hardhat-config");
const {verify} = require("../utils/verification");
const {storeImages, storeTokenUriMetadata} = require("../utils/uploadToPinata");

let tokenURIs;
const FUND_AMOUNT = "1000000000000000000000";
const imagesFolderPath = "./images";
const metadataTemplate = {
    name:"",
    description:"",
    image:"",
    attributes: [
        {
            value: 100,
        },
    ]
}

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();
    const chainId = network.config.chainId;

    if(process.env.UPLOAD_TO_PINATA == "true") {
        tokenURIs = await handleTokenUris();
    }

    let vrfCoordinatorAddress, subscriptionId;

    if(developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorAddress = vrfCoordinatorV2Mock.address;
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReciept = await transactionResponse.wait(1);
        subscriptionId = transactionReciept.events[0].args.subId;
        vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
    } else {
        vrfCoordinatorAddress = networkConfig[chainId].vrfCoordinatorV2;
        subscriptionId = networkConfig[chainId].subscriptionId;
    }

    log("--------------------------------------------------------------------------");

    const arguments = [
        vrfCoordinatorAddress, 
        subscriptionId, networkConfig[chainId].gasLane, 
        networkConfig[chainId].callbackGasLimit, 
        tokenURIs,
        networkConfig[chainId].mintFee
    ];

    const graffitiNft = await deploy("Graffiti", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    log("--------------------------------------------------------------------------");

    if(!developmentChains.includes(network.name)) {
        console.log("Verifying contract please wait...");
        await verify(graffitiNft.address, arguments);
    }
}

async function handleTokenUris() {
    tokenURIs = [];
    const {responses: uploadedImagesResponses, files} = await storeImages(imagesFolderPath);

    for(const eachImageUploadResponseIndex in uploadedImagesResponses) {
        let tokenUriMetadata = {...metadataTemplate}
        tokenUriMetadata.name = files[eachImageUploadResponseIndex].replace(".png","");
        tokenUriMetadata.description = `${tokenUriMetadata.name} is a dev's illustration of art`;
        tokenUriMetadata.image = `ipfs://${uploadedImagesResponses[eachImageUploadResponseIndex].IpfsHash}`;
        console.log(`Uploading ${tokenUriMetadata.name}`);

        const res = await storeTokenUriMetadata(tokenUriMetadata);
        tokenURIs.push(`ipfs://${res.IpfsHash}`);
    }
    console.log("Token URIs uploaded and they are: ");
    console.log(tokenURIs);

    return tokenURIs;
}


module.exports.tags = ["all", "graffiti", "main"];