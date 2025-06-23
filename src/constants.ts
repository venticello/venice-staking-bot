import {parseAbi} from "viem";
import {Config} from "./bot.types";

/**
 * Enhanced default configuration.
 */
const DEFAULT_CONFIG: Config = {
    stakingContractAddress: '0x321b7ff75154472B18EDb199033fF4D116F340Ff',
    tokenContractAddress: '0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf',
    intervalHours: 24,
    maxRetries: 3,
    baseDelay: 1000,
    gasLimitMultiplier: 1.2,
    rpcUrl: 'https://mainnet.base.org',
    minStakeAmount: '0.001', // Minimum 0.001 tokens
    maxGasPrice: '50', // Maximum 50 gwei
    healthCheckInterval: 60, // 60 minutes
    enableMetrics: true
};

function loadConfig(): Config {
    return {
        stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS as `0x${string}` || DEFAULT_CONFIG.stakingContractAddress,
        tokenContractAddress: process.env.TOKEN_CONTRACT_ADDRESS as `0x${string}` || DEFAULT_CONFIG.tokenContractAddress,
        intervalHours: parseInt(process.env.INTERVAL_HOURS || DEFAULT_CONFIG.intervalHours.toString()),
        maxRetries: parseInt(process.env.MAX_RETRIES || DEFAULT_CONFIG.maxRetries.toString()),
        baseDelay: parseInt(process.env.BASE_DELAY || DEFAULT_CONFIG.baseDelay.toString()),
        gasLimitMultiplier: parseFloat(process.env.GAS_LIMIT_MULTIPLIER || DEFAULT_CONFIG.gasLimitMultiplier.toString()),
        rpcUrl: process.env.RPC_URL || DEFAULT_CONFIG.rpcUrl,
        minStakeAmount: process.env.MIN_STAKE_AMOUNT || DEFAULT_CONFIG.minStakeAmount,
        maxGasPrice: process.env.MAX_GAS_PRICE || DEFAULT_CONFIG.maxGasPrice,
        healthCheckInterval: parseInt(
            process.env.HEALTH_CHECK_INTERVAL || DEFAULT_CONFIG.healthCheckInterval.toString()),
        enableMetrics: process.env.ENABLE_METRICS === 'true' || DEFAULT_CONFIG.enableMetrics
    };
}

export const config = loadConfig();

/**
 * Extended ABIs with additional functions.
 */
const STAKING_ABI = parseAbi([
    'event Claimed(address indexed user, uint256 amount)',
    'event Staked(address indexed user, uint256 amount)',
    'function claim() returns (uint256)',
    'function stake(address recipient, uint256 amount)',
    'function pendingRewards(address user) view returns (uint256)',
]);

const ERC20_ABI = parseAbi([
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)'
]);

export {STAKING_ABI, ERC20_ABI, DEFAULT_CONFIG};