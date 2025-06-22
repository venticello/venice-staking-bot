import {Address} from "viem";

/**
 * Extended configuration for the staking bot.
 */
interface Config {
    /** The address of the staking contract. */
    stakingContractAddress: Address;
    /** The address of the token contract. */
    tokenContractAddress: Address;
    /** The interval in hours to run the claim and stake cycle. */
    intervalHours: number;
    /** The maximum number of retries for a failed operation. */
    maxRetries: number;
    /** The base delay in milliseconds for exponential backoff. */
    baseDelay: number;
    /** The multiplier for the gas limit estimation. */
    gasLimitMultiplier: number;
    /** The RPC URL for the blockchain network. */
    rpcUrl?: string;
    /** The minimum amount to stake. */
    minStakeAmount?: string;
    /** The maximum gas price in gwei to execute a transaction. */
    maxGasPrice?: string;
    /** The interval in minutes for health checks. */
    healthCheckInterval?: number;
    /** Whether to enable metrics collection. */
    enableMetrics?: boolean;
}

/**
 * Metrics for monitoring the bot's performance.
 */
interface BotMetrics {
    /** The total amount of tokens claimed. */
    totalClaimed: bigint;
    /** The total amount of tokens staked. */
    totalStaked: bigint;
    /** The number of successful claim and stake cycles. */
    successfulCycles: number;
    /** The number of failed claim and stake cycles. */
    failedCycles: number;
    /** The timestamp of the last successful cycle. */
    lastSuccessfulCycle: Date | null;
    /** The timestamp of the last failed cycle. */
    lastFailedCycle: Date | null;
    /** The average amount of gas used per transaction. */
    averageGasUsed: bigint;
    /** The total cost of gas for all transactions. */
    totalGasCost: bigint;
}

/**
 * Defines the types of errors the bot can encounter.
 */
enum ErrorType {
    /** An error related to network connectivity. */
    NETWORK_ERROR = 'NETWORK_ERROR',
    /** An error related to contract interaction. */
    CONTRACT_ERROR = 'CONTRACT_ERROR',
    /** An error due to insufficient balance for a transaction. */
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    /** An error when the current gas price is above the configured maximum. */
    GAS_PRICE_TOO_HIGH = 'GAS_PRICE_TOO_HIGH',
    /** An unknown or uncategorized error. */
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Custom error class for the bot, containing an error type.
 */
class BotError extends Error {
    /**
     * @param type The type of the error.
     * @param message The error message.
     * @param originalError The original error that was caught.
     */
    constructor(
        public type: ErrorType,
        message: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'BotError';
    }

}

export {type Config, type BotMetrics, ErrorType, BotError};