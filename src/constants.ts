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

export { STAKING_ABI, ERC20_ABI, DEFAULT_CONFIG };