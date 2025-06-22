import fs from "fs";
import path from 'path';

/**
 * Console colors for logging.
 */
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
};

/**
 * Defines the log level.
 */
type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

/**
 * Defines the structure of a log entry.
 */
interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
}

/**
 * A logger class with support for console and file logging.
 */
export class Logger {
    private logFile: string;
    private enableFileLogging: boolean;

    /**
     * @param logFile The path to the log file.
     * @param enableFileLogging Whether to enable file logging.
     */
    constructor(logFile = 'bot.log', enableFileLogging = true) {
        this.logFile = logFile;
        this.enableFileLogging = enableFileLogging;

        if (this.enableFileLogging) {
            this.ensureLogDirectory();
        }
    }

    /**
     * Ensures the log directory exists.
     */
    private ensureLogDirectory(): void {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    /**
     * Gets the current timestamp in ISO format.
     * @returns The ISO timestamp string.
     */
    private getTimestamp(): string {
        return new Date().toISOString();
    }

    /**
     * Formats a message for console output.
     * @param level The log level.
     * @param message The log message.
     * @param emoji The emoji to use for the message.
     * @returns The formatted console message.
     */
    private formatConsoleMessage(level: LogLevel, message: string, emoji: string): string {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        // const coloredLevel = this.colorizeLevel(level);

        return `${colors.gray}[${timestamp}]${colors.reset} ${emoji} ${message}`;
    }

    /**
     * Colorizes a log level for console output.
     * @param level The log level to colorize.
     * @returns The colorized log level string.
     */
    private colorizeLevel(level: LogLevel): string {
        switch (level) {
            case 'info':
                return `${colors.blue}INFO${colors.reset}`;
            case 'success':
                return `${colors.green}SUCCESS${colors.reset}`;
            case 'warn':
                return `${colors.yellow}WARN${colors.reset}`;
            case 'error':
                return `${colors.red}ERROR${colors.reset}`;
            case 'debug':
                return `${colors.magenta}DEBUG${colors.reset}`;
            default:
                return String(level).toUpperCase();
        }
    }

    /**
     * Writes a log entry to the log file.
     * @param entry The log entry to write.
     */
    private writeToFile(entry: LogEntry): void {
        if (!this.enableFileLogging) return;

        try {
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.logFile, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * The core logging method.
     * @param level The log level.
     * @param message The log message.
     * @param data Optional data to include in the log.
     * @param emoji The emoji to use for the message.
     */
    private log(level: LogLevel, message: string, data?: any, emoji = '📝'): void {
        const entry: LogEntry = {
            timestamp: this.getTimestamp(),
            level,
            message,
            data
        };

        // Pretty print to console
        console.log(this.formatConsoleMessage(level, message, emoji));

        // Detailed data output to console only for errors
        if (level === 'error' && data) {
            console.log(`${colors.red}Details:${colors.reset}`, data);
        }

        // Detailed record to file
        this.writeToFile(entry);
    }

    // --- Special methods for the staking bot ---

    /**
     * Logs the bot starting message.
     * @param config The bot configuration.
     */
    botStarting(config: any): void {
        this.log('info', `Starting Venice Staking Bot (interval: ${config.intervalHours}h)`, config, '🚀');
    }

    /**
     * Logs when the wallet is initialized.
     * @param address The wallet address.
     * @param tokenSymbol The token symbol.
     */
    walletInitialized(address: string, tokenSymbol: string): void {
        this.log('success', `Wallet and contracts initialized (${address.slice(0, 6)}...${address.slice(-4)})`,
            { address, tokenSymbol }, '✅');
    }

    /**
     * Logs when a health check passes.
     * @param data The health check data.
     */
    healthCheckPassed(data: any): void {
        const ethBalance = parseFloat(data.ethBalance).toFixed(4);
        this.log('info', `Health check passed (ETH: ${ethBalance})`, data, '📊');
    }

    /**
     * Logs the start of a new claim and stake cycle.
     */
    cycleStarting(): void {
        this.log('info', 'Starting claim and stake cycle', undefined, '🎯');
    }

    /**
     * Logs when pending rewards are detected.
     * @param amount The amount of pending rewards.
     * @param symbol The token symbol.
     */
    pendingRewardsDetected(amount: string, symbol: string): void {
        this.log('info', `Pending rewards detected: ${amount} ${symbol}`, { amount, symbol }, '💰');
    }

    /**
     * Logs when there are no pending rewards to claim.
     */
    noPendingRewards(): void {
        this.log('info', 'No pending rewards to claim', undefined, '💤');
    }

    /**
     * Logs when rewards are successfully claimed.
     * @param amount The amount of rewards claimed.
     * @param symbol The token symbol.
     * @param hash The transaction hash.
     */
    rewardsClaimed(amount: string, symbol: string, hash: string): void {
        this.log('success', `Rewards claimed successfully: ${amount} ${symbol}`,
            { amount, symbol, transactionHash: hash }, '✅');
    }

    /**
     * Logs when token approval is successful.
     * @param amount The amount of tokens approved.
     * @param symbol The token symbol.
     * @param hash The transaction hash.
     */
    tokenApprovalSuccess(amount: string, symbol: string, hash: string): void {
        this.log('success', `Token approval successful`,
            { amount, symbol, transactionHash: hash }, '🔐');
    }

    /**
     * Logs when tokens are successfully staked.
     * @param amount The amount of tokens staked.
     * @param symbol The token symbol.
     * @param hash The transaction hash.
     */
    tokensStaked(amount: string, symbol: string, hash: string): void {
        this.log('success', `Tokens staked successfully: ${amount} ${symbol}`,
            { amount, symbol, transactionHash: hash }, '🥩');
    }

    /**
     * Logs the completion of a claim and stake cycle.
     * @param duration The duration of the cycle in milliseconds.
     */
    cycleCompleted(duration: number): void {
        const durationStr = duration > 1000 ? `${Math.round(duration / 1000)}s` : `${duration}ms`;
        this.log('success', `Claim and stake cycle completed in ${durationStr}`, { duration }, '✅');
    }

    /**
     * Logs the time until the next execution.
     * @param hours The number of hours until the next execution.
     */
    nextExecution(hours: number): void {
        this.log('info', `Next execution in ${hours} hours`, { hours }, '⏰');
    }

    /**
     * Logs when staking is paused.
     */
    stakingPaused(): void {
        this.log('warn', 'Staking is currently paused - skipping cycle', undefined, '⏸️');
    }

    /**
     * Logs when the gas price is too high.
     * @param current The current gas price.
     * @param max The maximum allowed gas price.
     */
    gasPriceTooHigh(current: string, max: string): void {
        this.log('warn', `Gas price too high (${current} > ${max} gwei) - skipping`,
            { current, max }, '⛽');
    }

    /**
     * Logs when the ETH balance is low.
     * @param balance The current ETH balance.
     */
    lowEthBalance(balance: string): void {
        this.log('warn', `Low ETH balance for gas fees: ${balance} ETH`, { balance }, '⚠️');
    }

    /**
     * Logs when the amount to stake is below the minimum threshold.
     * @param amount The amount to stake.
     * @param minimum The minimum stake amount.
     * @param symbol The token symbol.
     */
    belowMinStake(amount: string, minimum: string, symbol: string): void {
        this.log('warn', `Amount below minimum stake threshold (${amount} < ${minimum} ${symbol})`,
            { amount, minimum, symbol }, '📏');
    }

    /**
     * Logs when an operation is being retried.
     * @param attempt The current retry attempt.
     * @param maxAttempts The maximum number of retries.
     * @param operation The name of the operation being retried.
     */
    retrying(attempt: number, maxAttempts: number, operation: string): void {
        this.log('warn', `${operation} failed - retrying (${attempt}/${maxAttempts})`,
            { attempt, maxAttempts, operation }, '🔄');
    }

    /**
     * Logs when an operation has failed.
     * @param operation The name of the failed operation.
     * @param error The error message.
     */
    operationFailed(operation: string, error: string): void {
        this.log('error', `${operation} failed: ${error}`, { operation, error }, '❌');
    }

    /**
     * Logs a critical error that causes the bot to stop.
     * @param error The error message.
     */
    criticalError(error: string): void {
        this.log('error', `Critical error - stopping bot: ${error}`, { error }, '🛑');
    }

    /**
     * Logs when the bot is stopped gracefully.
     */
    botStopped(): void {
        this.log('info', 'Bot stopped gracefully', undefined, '⏹️');
    }

    /**
     * Logs the bot's metrics.
     * @param metrics The bot metrics.
     */
    metrics(metrics: any): void {
        const summary = `Successful: ${metrics.successfulCycles}, Failed: ${metrics.failedCycles}, ` +
            `Total Claimed: ${metrics.totalClaimed}, Total Staked: ${metrics.totalStaked}`;
        this.log('info', `Bot metrics - ${summary}`, metrics, '📊');
    }

    /**
     * Logs when waiting for a transaction confirmation.
     * @param hash The transaction hash.
     */
    transactionWaiting(hash: string): void {
        this.log('info', `Waiting for transaction confirmation...`, { hash }, '⏳');
    }

    /**
     * Logs when a transaction is confirmed.
     * @param hash The transaction hash.
     * @param gasUsed The amount of gas used.
     */
    transactionConfirmed(hash: string, gasUsed: string): void {
        this.log('success', `Transaction confirmed (gas: ${gasUsed})`, { hash, gasUsed }, '✅');
    }

    // --- Standard logging methods (for backward compatibility) ---

    /**
     * Logs an informational message.
     * @param message The message to log.
     * @param data Optional data to include.
     */
    info(message: string, data?: any): void {
        this.log('info', message, data, 'ℹ️');
    }

    /**
     * Logs a success message.
     * @param message The message to log.
     * @param data Optional data to include.
     */
    success(message: string, data?: any): void {
        this.log('success', message, data, '✅');
    }

    /**
     * Logs a warning message.
     * @param message The message to log.
     * @param data Optional data to include.
     */
    warn(message: string, data?: any): void {
        this.log('warn', message, data, '⚠️');
    }

    /**
     * Logs an error message.
     * @param message The message to log.
     * @param data Optional data to include.
     */
    error(message: string, data?: any): void {
        this.log('error', message, data, '❌');
    }

    /**
     * Logs a debug message. Only logs if DEBUG environment variable is 'true'.
     * @param message The message to log.
     * @param data Optional data to include.
     */
    debug(message: string, data?: any): void {
        if (process.env.DEBUG === 'true') {
            this.log('debug', message, data, '🐛');
        }
    }
}
