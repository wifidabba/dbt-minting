const solanaWeb3 = require('@solana/web3.js');
const token = require('@solana/spl-token');
const { fetchMintAuth } = require('./secrets.helper');

const MINIMUM_PAYER_BALANCE = solanaWeb3.LAMPORTS_PER_SOL * 0.01;

const mintTokens = async (connection, mintPublicKey, tokenAccountAddress, amount, mintAuthPk) => {
 
    console.log(`Minting new tokens : \n : ${amount}`);

    // build transaction to mint DABBA tokens
    const instructions = [
        token.createMintToInstruction(
            mintPublicKey,
            new solanaWeb3.PublicKey(tokenAccountAddress),
            mintAuthPk,
            amount
        )
    ];

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');

    const messageV0 = new solanaWeb3.TransactionMessage({
        payerKey: mintAuthPk,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: instructions
    }).compileToV0Message();

    const transaction = new solanaWeb3.VersionedTransaction(messageV0);

    let mintAuth = await fetchMintAuth();

    transaction.sign([mintAuth]);

    mintAuth = null;

    const txid = await connection.sendTransaction(transaction, { maxRetries: 3 });

    console.log("Transaction sent to network", txid);
}

const setMintAuthorityToNull = async (connection, mintPublicKey, mintAuthPk) => {
    console.log(`Setting mint authority of token to null`);

    // build transaction to set mint authority to null
    const transaction = new solanaWeb3.Transaction().add(
        token.createSetAuthorityInstruction(
            mintPublicKey,
            new solanaWeb3.PublicKey(mintAuthPk),
            token.AuthorityType.MintTokens,
            null
        )
    );

    let mintAuth = await fetchMintAuth();

    let signature = await solanaWeb3.sendAndConfirmTransaction(
            connection,
            transaction,
            [mintAuth]
    );

    mintAuth = null;

    console.log(`Txn : ${signature}`);
}

const checkPayerBalance = async (connection, payer) => {
    const balance = await connection.getBalance(payer, 'confirmed');

    console.log(`Payer balance: ${balance} lamports (${balance / solanaWeb3.LAMPORTS_PER_SOL} SOL)`);

    if (balance < MINIMUM_PAYER_BALANCE) {
        const errorMessage = `Insufficient balance in payer account (${balance / solanaWeb3.LAMPORTS_PER_SOL} SOL). Minimum required balance: ${MINIMUM_PAYER_BALANCE / solanaWeb3.LAMPORTS_PER_SOL} SOL.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    console.log('Payer account has sufficient balance for transactions.');
    return true;
}

module.exports = {
    mintTokens, 
    setMintAuthorityToNull,
    checkPayerBalance,
}