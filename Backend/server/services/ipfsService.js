const axios = require("axios");
const FormData = require("form-data");
const config = require("../config/env");

async function uploadToPinata(imageBuffer, title, description) {
  try {
    const formData = new FormData();
    formData.append("file", imageBuffer, {
      filename: `${title || "image"}.jpg`,
      contentType: "image/jpeg",
    });

    formData.append(
      "pinataMetadata",
      JSON.stringify({
        name: title || "Image",
        keyvalues: {
          description: description || "",
          source: "image-verification-system",
          creatorHash: "placeholder",
        },
      })
    );

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: config.PINATA_API_KEY,
          pinata_secret_api_key: config.PINATA_API_SECRET,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    return {
      success: true,
      ipfsHash: response.data.IpfsHash,
      pinId: response.data.PinId,
      url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
}

module.exports = { uploadToPinata };
