const { combine } = require('shamirs-secret-sharing');
const { createDecipheriv } = require('crypto');

function retrieveSecretKey(encryptionKeys, ivs, encryptedShards, authTags) {
    const decryptedShards = encryptedShards.map((encryptedShard, index) => {
        const encryptionKey = Buffer.from(encryptionKeys[index], 'hex'); // 32 bytes = 256 bits
        const iv = Buffer.from(ivs[index], 'hex'); // 16 bytes = 128 bits
        const authTag = Buffer.from(authTags[index], 'hex');

        const decrypted = decrypt(Buffer.from(encryptedShard, 'hex'), encryptionKey, iv, authTag);

        return decrypted;
    });

    // Combine the decrypted shards to retrieve the secret
    const recoveredSecretBuffer = combine(decryptedShards);

    return recoveredSecretBuffer.toString('utf-8');
}


function decrypt(encryptedData, encryptionKey, iv, authTag) {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);

    // Set the authentication tag for verification during decryption
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
}

module.exports = {
    retrieveSecretKey,
}