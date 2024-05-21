// import crypto from 'crypto'
import * as crypto from 'crypto'
import CONSTANTS from './constants'


// 确保密钥是32字节的二进制数据
const defaultEncryptionKey: Buffer = Buffer.from(CONSTANTS.CRYPTO_KEY, 'utf8') // 长度必须是32字节

export function encrypt(plaintext: string): string {
    return encryptWithKey(plaintext, defaultEncryptionKey)
}

export function deCrypt(ciphertext: string): string {
    return decryptWithKey(ciphertext, defaultEncryptionKey)
}

function encryptWithKey(plaintext: string, key: Buffer): string {
    let cipher: crypto.CipherGCM;
    let encrypted: Buffer;
    const iv: Buffer = crypto.randomBytes(12);  // 生成一个 12 字节的随机 IV

    try {
        // 创建加密器实例，使用 AES-256-GCM
        cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        // 对明文进行加密
        encrypted = cipher.update(plaintext, 'utf8');
        // 结束加密过程并拼接结果
        encrypted = Buffer.concat([encrypted, cipher.final()]);
    } catch (error) {
        throw new Error("Encryption failed: " + error.message);
    }

    // 获取认证标签
    const authTag: Buffer = cipher.getAuthTag();

    // 将 IV, 加密后的数据和 Auth Tag 结合，然后转为 Base64
    return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

function decryptWithKey(ciphertextBase64: string, key: Buffer): string {
    let ciphertext: Buffer;
    try {
        ciphertext = Buffer.from(ciphertextBase64, 'base64');
    } catch (error) {
        throw new Error("Failed to decode Base64 ciphertext: " + error.message);
    }

    if (ciphertext.length < 28) { // 至少需要12字节的IV和16字节的Auth Tag
        throw new Error("Ciphertext too short");
    }

    const iv: Buffer = ciphertext.subarray(0, 12);
    const encryptedText: Buffer = ciphertext.subarray(12, ciphertext.length - 16);
    const authTag: Buffer = ciphertext.subarray(ciphertext.length - 16);

    // 创建解密器实例
    let decipher: crypto.DecipherGCM;
    try {
        decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);  // 设置认证标签，用于验证数据的完整性
    } catch (error) {
        throw new Error("Decryption setup failed: " + error.message);
    }

    let decrypted: Buffer;
    try {
        decrypted = decipher.update(encryptedText);  // 解密
        decrypted = Buffer.concat([decrypted, decipher.final()]);  // 结束解密过程并拼接结果
    } catch (error) {
        throw new Error("Decryption failed: " + error.message);
    }

    return decrypted.toString('utf8');  // 转换为 UTF-8 字符串
}