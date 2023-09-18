const pinataSdk = require("@pinata/sdk");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const pinataApiKey = process.env.PINATA_API_KEY;
const pinataApiSecret = process.env.PINATA_API_SECRET;
const pinata = new pinataSdk(pinataApiKey, pinataApiSecret);

async function storeImages(imagesFolderPath) {
    const pathToImages = path.resolve(imagesFolderPath);
    const files = fs.readdirSync(pathToImages);
    let responses = [];

    console.log("Uploading the images to Pinata");
    for(const fileIndex in files) {      //Basically a for loop where `fileIndex` is `i` in regular for loop
        console.log(`Working on image at index: ${fileIndex}...`)
        const readStream = fs.createReadStream(`${pathToImages}/${files[fileIndex]}`);
        const options = {
            pinataMetadata: {
                name: files[fileIndex]
            },
        }
        try {
            const response = await pinata.pinFileToIPFS(readStream, options);
            responses.push(response);
        } catch(error) {
            console.log(error);
        }
    }

    return {responses, files}
}

async function storeTokenUriMetadata(metadata) {
    try {
        const res = await pinata.pinJSONToIPFS(metadata);
        return res;
    } catch (error) {
        console.log(error);
    }
    return null;
}

module.exports = {
    storeImages,
    storeTokenUriMetadata
}