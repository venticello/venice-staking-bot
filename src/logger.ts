import fs from "fs";
import path from 'path';

// Цвета для консоли
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

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
}


export class Logger {
    private logFile: string;
    private enableFileLogging: boolean;

    constructor(logFile = 'bot.log', enableFileLogging = true) {
        this.logFile = logFile;
        this.enableFileLogging = enableFileLogging;

        if (this.enableFileLogging) {
            this.ensureLogDirectory();
        }
    }

    private ensureLogDirectory(): void {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    private getTimestamp(): string {
        return new Date().toISOString();
    }

    private formatConsoleMessage(level: LogLevel, message: string, emoji: string): string {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        // const coloredLevel = this.colorizeLevel(level);

        return `${colors.gray}[${timestamp}]${colors.reset} ${emoji} ${message}`;
    }

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

    private writeToFile(entry: LogEntry): void {
        if (!this.enableFileLogging) return;

        try {
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.logFile, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    private log(level: LogLevel, message: string, data?: any, emoji = '📝'): void {
        const entry: LogEntry = {
            timestamp: this.getTimestamp(),
            level,
            message,
            data
        };

        // Красивый вывод в консоль
        console.log(this.formatConsoleMessage(level, message, emoji));

        // Подробный вывод данных в консоль только для ошибок
        if (level === 'error' && data) {
            console.log(`${colors.red}Details:${colors.reset}`, data);
        }

        // Подробная запись в файл
        this.writeToFile(entry);
    }

    // Специальные методы для стейкинг бота
    botStarting(config: any): void {
        this.log('info', `Starting Venice Staking Bot (interval: ${config.intervalHours}h)`, config, '🚀');
    }

    walletInitialized(address: string, tokenSymbol: string): void {
        this.log('success', `Wallet and contracts initialized (${address.slice(0, 6)}...${address.slice(-4)})`,
            { address, tokenSymbol }, '✅');
    }

    healthCheckPassed(data: any): void {
        const ethBalance = parseFloat(data.ethBalance).toFixed(4);
        this.log('info', `Health check passed (ETH: ${ethBalance})`, data, '📊');
    }

    cycleStarting(): void {
        this.log('info', 'Starting claim and stake cycle', undefined, '🎯');
    }

    pendingRewardsDetected(amount: string, symbol: string): void {
        this.log('info', `Pending rewards detected: ${amount} ${symbol}`, { amount, symbol }, '💰');
    }

    noPendingRewards(): void {
        this.log('info', 'No pending rewards to claim', undefined, '💤');
    }

    rewardsClaimed(amount: string, symbol: string, hash: string): void {
        this.log('success', `Rewards claimed successfully: ${amount} ${symbol}`,
            { amount, symbol, transactionHash: hash }, '✅');
    }

    tokenApprovalSuccess(amount: string, symbol: string, hash: string): void {
        this.log('success', `Token approval successful`,
            { amount, symbol, transactionHash: hash }, '🔐');
    }

    tokensStaked(amount: string, symbol: string, hash: string): void {
        this.log('success', `Tokens staked successfully: ${amount} ${symbol}`,
            { amount, symbol, transactionHash: hash }, '🥩');
    }

    cycleCompleted(duration: number): void {
        const durationStr = duration > 1000 ? `${Math.round(duration / 1000)}s` : `${duration}ms`;
        this.log('success', `Claim and stake cycle completed in ${durationStr}`, { duration }, '✅');
    }

    nextExecution(hours: number): void {
        this.log('info', `Next execution in ${hours} hours`, { hours }, '⏰');
    }

    stakingPaused(): void {
        this.log('warn', 'Staking is currently paused - skipping cycle', undefined, '⏸️');
    }

    gasPriceTooHigh(current: string, max: string): void {
        this.log('warn', `Gas price too high (${current} > ${max} gwei) - skipping`,
            { current, max }, '⛽');
    }

    lowEthBalance(balance: string): void {
        this.log('warn', `Low ETH balance for gas fees: ${balance} ETH`, { balance }, '⚠️');
    }

    belowMinStake(amount: string, minimum: string, symbol: string): void {
        this.log('warn', `Amount below minimum stake threshold (${amount} < ${minimum} ${symbol})`,
            { amount, minimum, symbol }, '📏');
    }

    retrying(attempt: number, maxAttempts: number, operation: string): void {
        this.log('warn', `${operation} failed - retrying (${attempt}/${maxAttempts})`,
            { attempt, maxAttempts, operation }, '🔄');
    }

    operationFailed(operation: string, error: string): void {
        this.log('error', `${operation} failed: ${error}`, { operation, error }, '❌');
    }

    criticalError(error: string): void {
        this.log('error', `Critical error - stopping bot: ${error}`, { error }, '🛑');
    }

    botStopped(): void {
        this.log('info', 'Bot stopped gracefully', undefined, '⏹️');
    }

    metrics(metrics: any): void {
        const summary = `Successful: ${metrics.successfulCycles}, Failed: ${metrics.failedCycles}, ` +
            `Total Claimed: ${metrics.totalClaimed}, Total Staked: ${metrics.totalStaked}`;
        this.log('info', `Bot metrics - ${summary}`, metrics, '📊');
    }

    transactionWaiting(hash: string): void {
        this.log('info', `Waiting for transaction confirmation...`, { hash }, '⏳');
    }

    transactionConfirmed(hash: string, gasUsed: string): void {
        this.log('success', `Transaction confirmed (gas: ${gasUsed})`, { hash, gasUsed }, '✅');
    }

    // Стандартные методы логирования (для обратной совместимости)
    info(message: string, data?: any): void {
        this.log('info', message, data, 'ℹ️');
    }

    success(message: string, data?: any): void {
        this.log('success', message, data, '✅');
    }

    warn(message: string, data?: any): void {
        this.log('warn', message, data, '⚠️');
    }

    error(message: string, data?: any): void {
        this.log('error', message, data, '❌');
    }

    debug(message: string, data?: any): void {
        if (process.env.DEBUG === 'true') {
            this.log('debug', message, data, '🐛');
        }
    }
}
