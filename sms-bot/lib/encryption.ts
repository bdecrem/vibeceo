/**
 * Encryption utilities for securing sensitive data like OAuth tokens
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment variable
 * The key should be a 32-byte (64 hex characters) string
 */
function getEncryptionKey(): Buffer {
  const key = process.env.OAUTH_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('OAUTH_ENCRYPTION_KEY environment variable is not set');
  }

  if (key.length !== 64) {
    throw new Error('OAUTH_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string value
 * Returns base64-encoded string in format: salt:iv:authTag:encryptedData
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();

    // Generate random IV and salt
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine: salt:iv:authTag:encrypted
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);

    // Return as base64
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt an encrypted string
 * Expects base64-encoded string in format: salt:iv:authTag:encryptedData
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();

    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a new encryption key
 * Use this to generate the OAUTH_ENCRYPTION_KEY value
 * Run: node -e "require('./dist/lib/encryption.js').generateEncryptionKey()"
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(32).toString('hex');
  console.log('\nGenerated encryption key (add to .env):');
  console.log(`OAUTH_ENCRYPTION_KEY=${key}`);
  console.log('\nWARNING: Store this securely! Losing this key means all encrypted tokens are unrecoverable.\n');
  return key;
}

/**
 * Verify encryption/decryption works correctly
 */
export function testEncryption(): boolean {
  try {
    const testData = 'test-oauth-token-12345';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);

    if (decrypted !== testData) {
      console.error('❌ Encryption test failed: decrypted data does not match original');
      return false;
    }

    console.log('✅ Encryption test passed');
    return true;
  } catch (error) {
    console.error('❌ Encryption test failed:', error);
    return false;
  }
}
