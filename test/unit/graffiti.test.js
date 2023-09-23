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
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
            graffitiNft = await ethers.getContract("Graffiti", deployer);
            mintFee = ethers.parseEther("0.026");
        });

        describe("Constructor", () => {
            it("Should initialize the values correctly", async function () {
                const tokenUris = await graffitiNft.getGraffitiTokenURIs(0);
                assert(tokenUris.includes("ipfs://"));
            });
        });

        describe("requestRandomNft", () => {
            it("Should revert if no fee is paid", async function () {
                await expect(graffitiNft.requestRandomNft({value: 0})).to.be.reverted;
            });
            it("Should emit a requestId from chainlink VRF", async function () {
                await expect(graffitiNft.requestRandomNft({value: mintFee})).to.emit(graffitiNft, "NftRequest");
            });
            it("Should add the request Id of the minter", async function () {
                const txResponse = await graffitiNft.requestRandomNft({value: mintFee});
                const txReciept = await txResponse.wait(1);
                const requestId = txReciept.logs[1].args.requestId;

                const minterAddress = await graffitiNft.getRequestToSender(requestId);
                assert.equal(minterAddress, deployer);
            });
        });

        describe("getGraffitiFromModdedRng", () => {
            it("Should return graffiti1 if modded RNG is less than 10", async function () {
                const expectedValue = await graffitiNft.getGraffitiFromModdedRng(5);
                assert.equal(expectedValue, 0);
            });
            it("Should return graffiti3 if the value is between 30-50", async function () {
                const expectedValue = await graffitiNft.getGraffitiFromModdedRng(43);
                assert.equal(expectedValue, 2);
            });
            //The getGraffitiFromModdedRng() function is returning the values as expected.
            //This test is just an example. We should write comprehensive tests for real projects.
        });
        describe("fulfillRandomWords", () => {
            it("Should mint an NFT to a buyer when request is submitted", async function () {
                await new Promise(async (resolve, reject) => {
                    graffitiNft.once("NftMinted", async () => {
                        try {
                            const tokenUri = await graffitiNft.getGraffitiTokenURIs("0");
                            const tokenCounter = await graffitiNft.getTokenCounter();
                            const updatedBuyerBalance = await graffitiNft.balanceOf(deployer);
                            
                            assert(tokenUri.toString().includes("ipfs://"));
                            assert.equal(tokenCounter.toString(), "1");
                            assert(updatedBuyerBalance > 0);
                            
                            resolve();
                        } catch (err) {
                            console.log(err);
                            reject(err);
                        }
                    });
                    try {
                        const txResponse = await graffitiNft.requestRandomNft({value: mintFee});
                        const txReciept = await txResponse.wait(1);
                        const requestId = txReciept.logs[1].args.requestId;

                        await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, graffitiNft.target);
                    } catch (error) {
                        console.log(error);
                        reject(error);
                    }
                });
            });
        });
    });