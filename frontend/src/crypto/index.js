import 'react-native-get-random-values';
import forge from 'node-forge';

/**
 * Generate an RSA-2048 Key Pair.
 * Returns { publicKeyPem, privateKeyPem }
 */
export const generateKeyPair = () => {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  return {
    publicKeyPem: forge.pki.publicKeyToPem(keypair.publicKey),
    privateKeyPem: forge.pki.privateKeyToPem(keypair.privateKey),
  };
};

/**
 * Encrypt a plaintext message using AES-256-GCM with a random session key,
 * then encrypt the session key with both receiver's and admin's RSA public keys.
 *
 * @param {string} plaintext - The message to encrypt
 * @param {string} receiverPublicKeyPem - PEM-encoded RSA public key of receiver
 * @param {string} adminPublicKeyPem - PEM-encoded RSA public key of admin
 * @returns {{ encrypted_message, iv, auth_tag, encrypted_session_key_user, encrypted_session_key_admin }}
 */
export const encryptMessage = (plaintext, receiverPublicKeyPem, adminPublicKeyPem) => {
  // 1. Generate random 32-byte AES session key + 12-byte IV
  const sessionKey = forge.random.getBytesSync(32);
  const iv = forge.random.getBytesSync(12);

  // 2. Encrypt message with AES-256-GCM
  const cipher = forge.cipher.createCipher('AES-GCM', sessionKey);
  cipher.start({ iv, tagLength: 128 });
  cipher.update(forge.util.createBuffer(forge.util.encodeUtf8(plaintext)));
  cipher.finish();

  const encrypted_message = forge.util.encode64(cipher.output.getBytes());
  const auth_tag = forge.util.encode64(cipher.mode.tag.getBytes());
  const ivBase64 = forge.util.encode64(iv);

  // 3. Encrypt session key with receiver's RSA public key
  const receiverPubKey = forge.pki.publicKeyFromPem(receiverPublicKeyPem);
  const encrypted_session_key_user = forge.util.encode64(
    receiverPubKey.encrypt(sessionKey, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: { md: forge.md.sha256.create() },
    })
  );

  // 4. Encrypt session key with admin's RSA public key
  const adminPubKey = forge.pki.publicKeyFromPem(adminPublicKeyPem);
  const encrypted_session_key_admin = forge.util.encode64(
    adminPubKey.encrypt(sessionKey, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: { md: forge.md.sha256.create() },
    })
  );

  return {
    encrypted_message,
    iv: ivBase64,
    auth_tag,
    encrypted_session_key_user,
    encrypted_session_key_admin,
  };
};

/**
 * Decrypt a message using the recipient's private RSA key.
 *
 * @param {string} encryptedMessageB64 - Base64 AES ciphertext
 * @param {string} ivB64 - Base64 IV
 * @param {string} authTagB64 - Base64 GCM Auth Tag
 * @param {string} encryptedSessionKeyB64 - Base64 RSA-encrypted session key
 * @param {string} privateKeyPem - PEM-encoded RSA private key
 * @returns {string} - Decrypted plaintext
 */
export const decryptMessage = (encryptedMessageB64, ivB64, authTagB64, encryptedSessionKeyB64, privateKeyPem) => {
  // 1. Decrypt session key with RSA private key
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const sessionKey = privateKey.decrypt(
    forge.util.decode64(encryptedSessionKeyB64),
    'RSA-OAEP',
    { md: forge.md.sha256.create(), mgf1: { md: forge.md.sha256.create() } }
  );

  // 2. Decrypt message with AES-GCM
  const decipher = forge.cipher.createDecipher('AES-GCM', sessionKey);
  decipher.start({
    iv: forge.util.decode64(ivB64),
    tag: forge.util.createBuffer(forge.util.decode64(authTagB64)),
    tagLength: 128,
  });
  decipher.update(forge.util.createBuffer(forge.util.decode64(encryptedMessageB64)));
  const pass = decipher.finish();

  if (!pass) {
    throw new Error('Message authentication failed. The message may have been tampered with.');
  }

  return forge.util.decodeUtf8(decipher.output.getBytes());
};

/**
 * Admin-specific: Derive AES key from master key + salt using PBKDF2,
 * then decrypt the admin's encrypted private key.
 *
 * @param {string} masterKey - The 16-digit admin master key
 * @param {string} saltHex - Hex-encoded salt from AdminConfig
 * @param {string} encryptedPrivKeyJson - JSON string containing { encrypted, iv, authTag }
 * @returns {string} - PEM-encoded admin private key
 */
export const decryptAdminPrivateKey = (masterKey, saltHex, encryptedPrivKeyJson) => {
  const salt = forge.util.hexToBytes(saltHex);

  // Derive 256-bit key using PBKDF2
  const derivedKey = forge.pkcs5.pbkdf2(masterKey, salt, 100000, 32, forge.md.sha256.create());

  const payload = JSON.parse(encryptedPrivKeyJson);
  const iv = forge.util.hexToBytes(payload.iv);
  const authTag = forge.util.hexToBytes(payload.authTag);
  const ciphertext = forge.util.hexToBytes(payload.encrypted);

  const decipher = forge.cipher.createDecipher('AES-GCM', derivedKey);
  decipher.start({
    iv,
    tag: forge.util.createBuffer(authTag),
    tagLength: 128,
  });
  decipher.update(forge.util.createBuffer(ciphertext));
  const pass = decipher.finish();

  if (!pass) {
    throw new Error('Admin key decryption failed. Invalid master key.');
  }

  return forge.util.decodeUtf8(decipher.output.getBytes());
};
