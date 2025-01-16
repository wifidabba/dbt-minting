const { app } = require('@azure/functions');
const token = require('@solana/spl-token');
const { mintTokens, setMintAuthorityToNull, checkPayerBalance } = require('./helpers/solana.helper');
const { fetchTokenInfo } = require('./helpers/secrets.helper');

app.timer('mintTokens', {
    schedule: '0 */1 * * * *',
    handler: async(myTimer, context) => {
        try{
            context.log('Running cron...');

            const { connection, adminDabbaAta, tokenMintAmount, tokenTotalSupply, mintAuthPk, tokenMintPublicKey } = await fetchTokenInfo();

            await checkPayerBalance(connection, mintAuthPk);

            const mintInfo = await token.getMint(connection, tokenMintPublicKey);
            context.log(`Current DABBA supply - ${mintInfo.supply}`);

            const remainingSupply = tokenTotalSupply - BigInt(mintInfo.supply);

            // upon reaching max DABBA supply, cronjob should be terminated
            if(remainingSupply <= 0){
                return;
            }

            const toMint = tokenMintAmount < remainingSupply ? tokenMintAmount : remainingSupply;

            context.log("toMint", toMint);

            await mintTokens(connection, tokenMintPublicKey, adminDabbaAta, toMint, mintAuthPk);

            context.log("mintInfo.supply + toMint", mintInfo.supply + toMint)
            context.log("tokenTotalSupply", tokenTotalSupply)
            context.log("mintInfo.supply + toMint >= tokenTotalSupply", mintInfo.supply + toMint >= tokenTotalSupply)

            // if max supply is reached mintAuthority should be set to null to prevent further minting
            if(mintInfo.supply + toMint >= tokenTotalSupply){
                context.log("Maximum DABBA token supply has been minted");
                await setMintAuthorityToNull(connection, tokenMintPublicKey, mintAuthPk);
                return;
            }
            
        }catch(err){
            context.log(err);
        }
    }
});






