require("dotenv").config({ path: __dirname + "/../../.env" });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CREATOR_SALT: process.env.CREATOR_SALT,
  SECRET_CODE_SALT: process.env.SECRET_CODE_SALT,
  PINATA_API_KEY: process.env.PINATA_API_KEY,
  PINATA_API_SECRET: process.env.PINATA_API_SECRET,
  BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL,
  BLOCKCHAIN_PRIVATE_KEY: process.env.BLOCKCHAIN_PRIVATE_KEY,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  PYTHON_PATH: process.env.PYTHON_PATH || "python",
};
