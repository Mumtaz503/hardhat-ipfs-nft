const { expect, assert } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    :describe("Graffiti Unit tests", function() {
        let 
        vrfCoordinatorV2Mock, 
        vrfCoordinatorAddress, 
        deployer, 
        deployerSigner,
        mintFee, 
        graffitiNft;
        const chainId = network.config.chainId;

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"]);
            vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", deployer);
            graffitiNft = await ethers.getContract("Graffiti", deployer);
            mintFee = ethers.utils.parseEther("0.026");
        });

        describe("Constructor", () => {
            it("Should initialize the values correctly", async function () {
                const tokenUris = await graffitiNft.getGraffitiTokenURIs(0);
                assert(tokenUris.includes("ipfs://"));
            });
        });

        describe("requestRandomNft", () => {
            it("Should revert if no fee is paid", async function () {
                const transactionResponse = await graffitiNft.requestRandomNft({ value: 0 }); // Sending 0 wei to simulate no fee
                await expect(transactionResponse).to.be.reverted();
                //This no work IDK why.
            });        
        });
    });