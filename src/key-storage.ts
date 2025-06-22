/**
 * Provides utilities for securely encrypting and decrypting a private key.
 */
import crypto from "crypto";
import fs from "fs";

/**
 * Manages the secure storage of an encrypted private key.
 */
class KeyStorage {
    /** The file where the encrypted key is stored. */
    private static readonly KEY_FILE = '.env.encrypted';
    /** The length of the salt for PBKDF2. */
    private static readonly SALT_LENGTH = 32;
    /** The length of the initialization vector (IV) for AES. */
    private static readonly IV_LENGTH = 16;

    /**
     * Encrypts a private key with a password and saves it to a file.
     * @param privateKey The private key to encrypt.
     * @param password The password to use for encryption.
     */
    static encryptPrivateKey(privateKey: string, password: string): void {
        try {
            const salt = crypto.randomBytes(this.SALT_LENGTH);
            const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
            const iv = crypto.randomBytes(this.IV_LENGTH);

            const algorithm = 'aes-256-cbc';
            const cipher = crypto.createCipheriv(algorithm, key, iv);

            let encrypted = cipher.update(privateKey, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const dataToStore = {
                salt: salt.toString('hex'),
                iv: iv.toString('hex'),
                encrypted: encrypted,
                algorithm: algorithm
            };

            fs.writeFileSync(this.KEY_FILE, JSON.stringify(dataToStore));
            console.log('✅ Private key encrypted and saved securely');
        } catch (error) {
            const err = error as Error;
            throw new Error(`Failed to encrypt private key: ${err.message}`);
        }
    }

    /**
     * Decrypts the private key from the storage file using a password.
     * @param password The password to use for decryption.
     * @returns The decrypted private key.
     */
    static decryptPrivateKey(password: string): string {
        try {
            if (!fs.existsSync(this.KEY_FILE)) {
                throw new Error('Encrypted key file not found. Please run setup first.');
            }

            const encryptedData = JSON.parse(fs.readFileSync(this.KEY_FILE, 'utf8'));
            const salt = Buffer.from(encryptedData.salt, 'hex');
            const iv = Buffer.from(encryptedData.iv, 'hex');
            const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

            const algorithm = encryptedData.algorithm || 'aes-256-cbc';
            const decipher = crypto.createDecipheriv(algorithm, key, iv);

            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            const err = error as Error;
            throw new Error(`Failed to decrypt private key: ${err.message}`);
        }
    }
}

export { KeyStorage };