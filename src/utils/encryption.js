// require("dotenv").config();
// const crypto = require("crypto");

// const algorithm = "aes-256-cbc";

// const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; 

// if (!ENCRYPTION_KEY) {
//   throw new Error("ENCRYPTION_KEY is not defined in environment variables");
// }

// const IV_LENGTH =16;

// const encrypt = (text) => {
//   const iv = crypto.randomBytes(IV_LENGTH);
//   const key = Buffer.from(ENCRYPTION_KEY, 'utf-8'); // Ensure correct encoding
//   if (key.length !== 32) {
//     throw new Error(`Encryption key length is ${key.length}, expected 32 bytes`);
//   }

//   const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
//   let encrypted = cipher.update(text, 'utf8', 'hex');
//   encrypted += cipher.final('hex');

//   return iv.toString('hex') + ':' + encrypted;
// };

// const decrypt = (text) => {
//   const textParts = text.split(':');
//   const iv = Buffer.from(textParts.shift(), 'hex');
//   const encryptedText = Buffer.from(textParts.join(':'), 'hex');
//   const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
//   let decrypted = decipher.update(encryptedText);
//   decrypted = Buffer.concat([decrypted, decipher.final()]);
//   return decrypted.toString();
// };

// module.exports = { encrypt, decrypt };

require("dotenv").config();
const crypto = require("crypto");
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is not defined in environment variables");
}
const IV_LENGTH = 16;

// Standardize the key to ensure it's always 32 bytes (256 bits)
const getStandardizedKey = () => {
  // If the key is a hexadecimal string, convert it directly
  if (/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  }
  
  // Otherwise, derive a 32-byte key using SHA-256
  return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
};

const encrypt = (text) => {
  if (!text) return '';
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getStandardizedKey();
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Store IV and encrypted data together with an identifier to mark it as encrypted
    return `ENC:${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error.message);
    // Return original text if encryption fails
    return text;
  }
};

const decrypt = (text) => {
  // Handle empty or non-string inputs
  if (!text || typeof text !== 'string') return '';
  
  // Special handling for data with the encryption marker
  if (text.startsWith('ENC:')) {
    try {
      const parts = text.slice(4).split(':'); // Remove 'ENC:' prefix and split
      
      if (parts.length < 2 || !parts[0]) {
        console.warn('Invalid encrypted format or empty IV, returning original');
        return text;
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      if (iv.length !== IV_LENGTH) {
        console.warn(`Invalid IV length: ${iv.length} bytes, returning original`);
        return text;
      }
      
      const encryptedText = parts.slice(1).join(':');
      const key = getStandardizedKey();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      return text; // Return original text if decryption fails
    }
  }
  
  // For data without the encryption marker, check if it matches the old format
  if (text.includes(':')) {
    try {
      const parts = text.split(':');
      
      // Skip if format is invalid
      if (parts.length < 2 || !parts[0]) {
        return text;
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      // Skip if IV is invalid
      if (iv.length !== IV_LENGTH) {
        return text;
      }
      
      const encryptedText = parts.slice(1).join(':');
      const key = getStandardizedKey();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      // Old format but can't decrypt, just return the original
      return text;
    }
  }
  
  // If we get here, the text is likely not encrypted
  return text;
};

// Utility to check if a string appears to be encrypted
const isEncrypted = (text) => {
  if (!text || typeof text !== 'string') return false;
  return text.startsWith('ENC:') || (text.includes(':') && text.split(':')[0].length === IV_LENGTH * 2);
};

// Re-encrypt existing data to the new format
const reEncrypt = (text) => {
  try {
    // First try to decrypt if it appears encrypted
    let decrypted = text;
    if (isEncrypted(text)) {
      decrypted = decrypt(text);
    }
    // Then encrypt with the new format
    return encrypt(decrypted);
  } catch (error) {
    console.error('Re-encryption error:', error.message);
    return text;
  }
};

module.exports = { encrypt, decrypt, isEncrypted, reEncrypt };