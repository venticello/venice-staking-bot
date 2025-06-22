
// Secure key storage utilities
import crypto from "crypto";
import fs from "fs";

class KeyStorage {
    private static readonly KEY_FILE = '.env.encrypted';
    private static readonly SALT_LENGTH = 32;
    private static readonly IV_LENGTH = 16;

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