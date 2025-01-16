const { join } = require('shamir');
const { createDecipheriv } = require('crypto');

const retrieveSecretKey = function(encryptionKeys, ivs, encryptedShards) {

    const recoveredShards = encryptedShards.map((shard, index) => {
        const encryptionKey = encryptionKeys[index]; // 32 bytes = 256 bits
        const iv = ivs[index]; // 16 bytes = 128 bits

        // Encrypt the shard
        const decrypted = decryptShard(shard, Buffer.from(encryptionKey, 'hex'), Buffer.from(iv, 'hex'))

        // Return encrypted shard along with its key and IV
        return decrypted.toString('hex');
    });

    const formattedShards = formatShards(recoveredShards);

    const recoveredEncryptedSecret = join(formattedShards);

    const utf8Decoder = new TextDecoder();
    return utf8Decoder.decode(recoveredEncryptedSecret);
}

const decryptShard = function (encryptedShard, encryptionKeyHex, ivHex) {
    // Convert encryptionKey and IV from hex to buffers
    const encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');

    // Convert the encrypted shard from hex to buffer
    const encryptedBuffer = Buffer.from(encryptedShard, 'hex');

    // Create a decipher instance
    const decipher = createDecipheriv('aes-256-cbc', encryptionKey, iv);

    // Decrypt the shard
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted; // Return the decrypted shard as a buffer
}

const formatShards = function (shardsArray) {
    return shardsArray.reduce((acc, shardHex, index) => {
        acc[index + 1] = Uint8Array.from(Buffer.from(shardHex, 'hex'));
        return acc;
    }, {});
}

module.exports = {
    retrieveSecretKey,
}