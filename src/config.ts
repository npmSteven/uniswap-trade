import dotenv from 'dotenv';

dotenv.config();

const config: {
    mainnetUrl: string;
    walletAddress: string;
    walletSecret: string;
    wethAddress: string;
    usdcAddress: string;
    factoryAddress: string;
    swapRouterAddress: string;
    chainId: number;
} = {
    mainnetUrl: process.env.MAINNET_URL,
    walletAddress: process.env.WALLET_ADDRESS,
    walletSecret: process.env.WALLET_SECRET,
    wethAddress: process.env.WETH_ADDRESS,
    usdcAddress: process.env.USDC_ADDRESS,
    factoryAddress: process.env.FACTORY_ADDRESS,
    swapRouterAddress: process.env.SWAP_ROUTER_ADDRESS,
    chainId: parseInt(process.env.CHAIN_ID),
}

export default config;