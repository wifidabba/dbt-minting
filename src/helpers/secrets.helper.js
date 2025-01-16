const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");
const solanaWeb3 = require('@solana/web3.js');
const { default: bs58 } = require("bs58");
const { retrieveSecretKey } = require('./crypto.helper');

const fetchAzureVaultClient = (keyVaultName) => {
    const credential = new DefaultAzureCredential();
    const url = `https://${keyVaultName}.vault.azure.net`;
    return new SecretClient(url, credential);
}

const fetchSecretFromAzureVault = async(client, secretName) => {
    const secret = await client.getSecret(secretName);
    
    if (!secret?.value) {
        throw new Error(`Secret ${secretName} not found or empty`);
    }
    
    return secret.value;
}

const fetchTokenInfo = async () => {
    const requiredSecrets = [
        'ADMIN-DABBA-ATA',
        'DABBA-TOKEN-PER-EPOCH',
        'DABBA-TOKEN-SUPPLY',
        'RPC-URL',
        'MINT-AUTH-PK',
        'DABBA-TOKEN-DECIMALS',
        'TOKEN-MINT-PUBLIC-KEY',
    ];

    const mintingAppGlobalVault = fetchAzureVaultClient('minting-app-global');
    
    const [
        ADMIN_DABBA_ATA,
        DABBA_TOKEN_PER_EPOCH,
        DABBA_TOKEN_SUPPLY,
        RPC_URL,
        MINT_AUTH_PK,
        DABBA_TOKEN_DECIMALS,
        TOKEN_MINT_PUBLIC_KEY,
    ] = await Promise.all(
        requiredSecrets.map(secretName => 
            fetchSecretFromAzureVault(mintingAppGlobalVault, secretName)
        )
    );

    const connection = new solanaWeb3.Connection(RPC_URL, {
        commitment: 'confirmed',
    });

    return {
        connection: connection,
        adminDabbaAta: new solanaWeb3.PublicKey(ADMIN_DABBA_ATA),
        tokenMintAmount: BigInt(parseInt(DABBA_TOKEN_PER_EPOCH) * (10 ** parseInt(DABBA_TOKEN_DECIMALS))),
        tokenTotalSupply: BigInt(parseInt(DABBA_TOKEN_SUPPLY) * (10 ** parseInt(DABBA_TOKEN_DECIMALS))),
        mintAuthPk: new solanaWeb3.PublicKey(MINT_AUTH_PK),
        tokenMintPublicKey: new solanaWeb3.PublicKey(TOKEN_MINT_PUBLIC_KEY),
    };
}

const fetchMintAuth = async () => {
    const mintingShardOneVault = fetchAzureVaultClient('minting-shard-one');
    const mintingShardTwoVault = fetchAzureVaultClient('minting-shard-two');
    const mintingShardThreeVault = fetchAzureVaultClient('minting-shard-three');

    const mintingKeyOneVault = fetchAzureVaultClient('minting-key-one');
    const mintingKeyTwoVault = fetchAzureVaultClient('minting-key-two');
    const mintingKeyThreeVault = fetchAzureVaultClient('minting-key-three');

    const [encryptedShardOne, encryptedShardTwo, encryptedShardThree, ivOne, ivTwo, ivThree, encryptionKeyOne, encryptionKeyTwo, encryptionKeyThree] = await Promise.all([
        fetchSecretFromAzureVault(mintingShardOneVault, 'encrypted-shard-one'),
        fetchSecretFromAzureVault(mintingShardTwoVault, 'encrypted-shard-two'),
        fetchSecretFromAzureVault(mintingShardThreeVault, 'encrypted-shard-three'),
        fetchSecretFromAzureVault(mintingShardOneVault, 'iv-one'),
        fetchSecretFromAzureVault(mintingShardTwoVault, 'iv-two'),
        fetchSecretFromAzureVault(mintingShardThreeVault, 'iv-three'),
        fetchSecretFromAzureVault(mintingKeyOneVault, 'encryption-key-one'),
        fetchSecretFromAzureVault(mintingKeyTwoVault, 'encryption-key-two'),
        fetchSecretFromAzureVault(mintingKeyThreeVault, 'encryption-key-three')
    ]);

    const encryptionKeys = [encryptionKeyOne, encryptionKeyTwo, encryptionKeyThree];
    const ivs = [ivOne, ivTwo, ivThree];
    const encryptedShards = [encryptedShardOne, encryptedShardTwo, encryptedShardThree];

    const mintAuthSk = retrieveSecretKey(encryptionKeys, ivs, encryptedShards);

    return solanaWeb3.Keypair.fromSecretKey(bs58.decode(mintAuthSk));
}

module.exports = {
    fetchTokenInfo,
    fetchMintAuth,
};