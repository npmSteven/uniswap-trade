import { ethers } from 'ethers';
import { FeeAmount } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';

// ABI's
import IUniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json' assert { type: 'json' };
import ERC20 from './ERC20.json' assert { type: 'json' };
import SwapRouterABI from './SwapRouterABI.json' assert { type: 'json' };
import FactoryABI from './FactoryABI.json' assert { type: 'json' };
import config from './config.js';

const provider = new ethers.providers.JsonRpcProvider(config.mainnetUrl);

const WETH = new Token(
  config.chainId,
  config.wethAddress,
  18,
  'WETH',
  'Wrapped Ether',
);
const USDC = new Token(
  config.chainId,
  config.usdcAddress,
  6,
  'USDC',
  'USD Coin',
);

const factoryContract = new ethers.Contract(config.factoryAddress, FactoryABI, provider);

const wallet = new ethers.Wallet(config.walletSecret);
const connectedWallet = wallet.connect(provider);
const swapRouterContract = new ethers.Contract(
  config.swapRouterAddress,
  SwapRouterABI,
  provider,
);
const inputAmount = 0.01;
const amountIn = ethers.utils.parseUnits(inputAmount.toString(), 18);
const approvalAmount = ethers.utils.parseUnits("100000", 18);

const wethContract = new ethers.Contract(config.wethAddress, ERC20, provider);
const usdcContract = new ethers.Contract(config.usdcAddress, ERC20, provider);

async function getPoolInfo(poolContract: ethers.Contract) {
  try {
    const [token0, token1, fee, slot] = await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.slot0(),
    ]);
    return {
      token0,
      token1,
      fee,
      sqrtPriceX96: slot[0],
    };
  } catch (e) {
    console.error('ERROR - getPoolInfo():', e);
    throw e;
  }
}

async function init(): Promise<void> {
  try {
    const poolAddress = await factoryContract.getPool(config.wethAddress, config.usdcAddress, FeeAmount.HIGH);
    const poolContract = new ethers.Contract(poolAddress, IUniswapV3Pool.abi, provider);
    console.log(poolAddress);
    
    const poolInfo = await getPoolInfo(poolContract);
    console.log(poolInfo);
    
    const swapRouterContractConnected =
      swapRouterContract.connect(connectedWallet);
    
    const wethContractConnected = wethContract.connect(connectedWallet);
    
    console.log('ask for approval');
    const approveTx = await wethContractConnected.approve(config.swapRouterAddress, approvalAmount);
    await approveTx.wait();
    console.log('approved');
    
    // Get Balance before
    const wethBal = await wethContract.balanceOf(config.walletAddress);
    const usdcBal = await usdcContract.balanceOf(config.walletAddress);
    console.log('Your balance');
    console.log(`WETH: ${wethBal}`);
    console.log(`USDC: ${usdcBal}`);

    const inputs = {
      tokenIn: WETH.address,
      tokenOut: USDC.address,
      recipient: config.walletAddress,
      fee: poolInfo.fee,
      deadline: Math.floor(Date.now() / 1000) + (60 * 10),
      amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    };
    
    // Fetch the current gas price and increase it by at least 50% to ensure the replacement fee is sufficient
    const currentGasPrice = await provider.getGasPrice();
    const gasPriceMultiplier = 1.5;
    const increasedGasPrice = currentGasPrice.mul(
      ethers.BigNumber.from(Math.floor(gasPriceMultiplier)),
    );

    console.log(ethers.utils.formatUnits(increasedGasPrice, 'ether'));
    console.log('[TX]: Started');
    console.log(inputs);
    const tx = await swapRouterContractConnected.exactInputSingle(inputs, { gasLimit: ethers.utils.hexlify(100_000) });
    console.log('[TX]: Mining');
    await tx.wait();
    console.log('[TX]: Mined');
  } catch (e) {
    if (e.code === 'REPLACEMENT_UNDERPRICED') {
      console.error('Replacement transaction underpriced:', e);
    } else if (e.code === 'NONCE_EXPIRED') {
      console.error('Nonce expired:', e);
    } else if (e.code === 'TRANSACTION_REPLACED') {
      console.error('Transaction replaced:', e);
    } else {
      console.error('ERROR - init():', e);
    }
  }
}

init();
