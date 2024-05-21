const crypto = require('crypto')

// 确保密钥是32字节的二进制数据
const defaultEncryptionKey = Buffer.from("0123456789ABCDEF0123456789ABCDEF", 'utf8') // 长度必须是32字节

function encryptWithKey(plaintext, key) {
    let cipher, encrypted
    const iv = crypto.randomBytes(12)  // 生成一个 12 字节的随机 IV

    try {
        // 创建加密器实例，使用 AES-256-GCM
        cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
        // 对明文进行加密
        encrypted = cipher.update(plaintext, 'utf8')
        // 结束加密过程并拼接结果
        encrypted = Buffer.concat([encrypted, cipher.final()])
    } catch (error) {
        throw new Error("Encryption failed: " + error.message)
    }

    // 获取认证标签
    const authTag = cipher.getAuthTag()

    // 将 IV, 加密后的数据和 Auth Tag 结合，然后转为 Base64
    return Buffer.concat([iv, encrypted, authTag]).toString('base64')
}

function decryptWithKey(ciphertextBase64, key) {
    // 解码 Base64 获取原始的密文和 IV
    let ciphertext
    try {
        ciphertext = Buffer.from(ciphertextBase64, 'base64')
    } catch (error) {
        throw new Error("Failed to decode Base64 ciphertext: " + error.message)
    }

    if (ciphertext.length < 28) { // 至少需要12字节的IV和16字节的Auth Tag
        throw new Error("Ciphertext too short")
    }

    const iv = ciphertext.subarray(0, 12)
    const encryptedText = ciphertext.subarray(12, ciphertext.length - 16)
    const authTag = ciphertext.subarray(ciphertext.length - 16)

    // 创建解密器实例
    let decipher
    try {
        decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
        decipher.setAuthTag(authTag)  // 设置认证标签，用于验证数据的完整性
    } catch (error) {
        throw new Error("Decryption setup failed: " + error.message)
    }

    let decrypted
    try {
        decrypted = decipher.update(encryptedText)  // 解密
        decrypted = Buffer.concat([decrypted, decipher.final()])  // 结束解密过程并拼接结果
    } catch (error) {
        throw new Error("Decryption failed: " + error.message)
    }

    return decrypted.toString('utf8')  // 转换为 UTF-8 字符串
}


// 示例使用
// const test = '66666666';

// let startTime = process.hrtime();
// const encryptedText = encryptWithKey(test, defaultEncryptionKey);
// let [sec, nano] = process.hrtime(startTime);
// console.log(`Encryption took ${sec + nano / 1e9} seconds.`);
// console.log('Encrypted:', encryptedText);

// startTime = process.hrtime();
// const decryptedText = decryptWithKey(encryptedText, defaultEncryptionKey);
// [sec, nano] = process.hrtime(startTime);
// console.log(`Decryption took ${sec + nano / 1e9} seconds.`);
// console.log('Decrypted:', decryptedText);

// 示例使用并计时
const test = '66666666';

let startTime = process.hrtime();
const encryptedText = encryptWithKey(test, defaultEncryptionKey);
let elapsed = process.hrtime(startTime);
console.log(`Encryption took ${elapsed[0] * 1000 + elapsed[1] / 1e6} milliseconds.`);
console.log('Encrypted:', encryptedText);

startTime = process.hrtime();
const decryptedText = decryptWithKey(encryptedText, defaultEncryptionKey);
elapsed = process.hrtime(startTime);
console.log(`Decryption took ${elapsed[0] * 1000 + elapsed[1] / 1e6} milliseconds.`);
console.log('Decrypted:', decryptedText);