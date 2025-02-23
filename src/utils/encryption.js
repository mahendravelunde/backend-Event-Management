require("dotenv").config();
const crypto = require("crypto");

const algorithm = "aes-256-cbc";
// console.log("ENCRYPTION_KEY:", process.env.ENCRYPTION_KEY);

// const encryptionKey = process.env.ENCRYPTION_KEY;

// if (!encryptionKey) {
//   throw new Error("ENCRYPTION_KEY is not defined in environment variables");
// }

// const key = Buffer.from(encryptionKey, "hex");
// const IV_LENGTH = 16;

exports.encryptOld = async (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

// exports.encrypt = (text) => {
//   const key = CryptoJS.enc.Hex.parse("5f3c2d1e0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3");
//   const iv = CryptoJS.enc.Hex.parse("00000000000000000000000000000000"); // 16-byte IV
//   return CryptoJS.AES.encrypt(text, key, { iv: iv }).toString();
// };


// exports.decrypt = async (text) => {
//   const [ivHex, encryptedHex] = text.split(":");
//   const iv = Buffer.from(ivHex, "hex");
//   const decipher = crypto.createDecipheriv(algorithm, key, iv);
//   let decrypted = decipher.update(encryptedHex, "hex", "utf8");
//   decrypted += decipher.final("utf8");
//   return decrypted;
// };




const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes
// console.log("lenth",process.env.ENCRYPTION_KEY?.length);

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is not defined in environment variables");
}

const IV_LENGTH =16;

const encrypt1 = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY, 'utf-8'); // Ensure correct encoding
  if (key.length !== 32) {
    throw new Error(`Encryption key length is ${key.length}, expected 32 bytes`);
  }

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (text) => {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

module.exports = { encrypt, decrypt };