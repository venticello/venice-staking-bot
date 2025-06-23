import {
    createPublicClient,
    createWalletClient,
    formatEther,
    getContract,
    type Hash,
    http,
    parseUnits,
    type TransactionReceipt
} from 'viem';
import {base} from 'viem/chains';
import {privateKeyToAccount} from 'viem/accounts';
import {getPassword} from './console-tools';
import {Logger} from './logger';
import {KeyStorage} from "./key-storage";
import {BotError, BotMetrics, ErrorType, Config} from "./bot.types"
import {DEFAULT_CONFIG, ERC20_ABI, STAKING_ABI, config} from "./constants";

/**
 * The main class for the Venice Staking Bot, with enhanced features.
 */
class VeniceStakingBot {
    private config: Config;
    private logger: Logger;
    private publicClient: any;
    private walletClient: any;
    private account: any;
    private stakingContract: any;
    private tokenContract: any;
    private isRunning: boolean = false;
    private mainInterval?: NodeJS.Timeout | undefined;
    private healthCheckInterval?: NodeJS.Timeout | undefined;
    private metrics: BotMetrics;
    private tokenDecimals: number = 18;
    private tokenSymbol: string = '';

    constructor(configPartial: Partial<Config> = {}) {
        this.config = {...config, ...configPartial};
        this.logger = new Logger();
        this.metrics = this.initializeMetrics();
        this.setupClients();
    }

    private initializeMetrics(): BotMetrics {
        return {
            totalClaimed: 0n,
            totalStaked: 0n,
            successfulCycles: 0,
            failedCycles: 0,
            lastSuccessfulCycle: null,
            lastFailedCycle: null,
            averageGasUsed: 0n,
            totalGasCost: 0n
        };
    }

    private setupClients() {
        this.publicClient = createPublicClient({
            chain: base,
            transport: http(this.config.rpcUrl, {
                timeout: 30000, // 30-second timeout
                retryCount: 3,
                retryDelay: 1000
            })
        });
    }

    private async setupWallet(privateKey: string) {
        try {
            this.account = privateKeyToAccount(privateKey as `0x${string}`);

            this.walletClient = createWalletClient({
                account: this.account,
                chain: base,
                transport: http(this.config.rpcUrl, {
                    timeout: 30000,
                    retryCount: 3,
                    retryDelay: 1000
                })
            });

            this.stakingContract = getContract({
                address: this.config.stakingContractAddress,
                abi: STAKING_ABI,
                client: {public: this.publicClient, wallet: this.walletClient}
            });

            this.tokenContract = getContract({
                address: this.config.tokenContractAddress,
                abi: ERC20_ABI,
                client: {public: this.publicClient, wallet: this.walletClient}
            });

            // Get token information
            await this.initializeTokenInfo();

            this.logger.walletInitialized(this.account.address, this.tokenSymbol);
        } catch (error) {
            throw new BotError(
                ErrorType.CONTRACT_ERROR,
                `Failed to setup wallet: ${(error as Error).message}`,
                error as Error
            );
        }
    }

    private async initializeTokenInfo(): Promise<void> {
        try {
            [this.tokenDecimals, this.tokenSymbol] = await Promise.all([
                this.tokenContract.read.decimals(),
                this.tokenContract.read.symbol()
            ]);
        } catch (error) {
            this.logger.warn('Could not fetch token info, using defaults');
            this.tokenDecimals = 18;
            this.tokenSymbol = 'TOKEN';
        }
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private categorizeError(error: Error): ErrorType {
        const message = error.message.toLowerCase();

        if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
            return ErrorType.NETWORK_ERROR;
        }
        if (message.includes('insufficient') || message.includes('balance')) {
            return ErrorType.INSUFFICIENT_BALANCE;
        }
        if (message.includes('gas') || message.includes('fee')) {
            return ErrorType.GAS_PRICE_TOO_HIGH;
        }
        if (message.includes('revert') || message.includes('contract')) {
            return ErrorType.CONTRACT_ERROR;
        }

        return ErrorType.UNKNOWN_ERROR;
    }

    private async retryOperation<T>(
        operation: () => Promise<T>,
        operationName: string,
        maxRetries: number = this.config.maxRetries
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (attempt === 1) {
                    // Log only the first attempt to avoid cluttering the console
                } else {
                    this.logger.retrying(attempt, maxRetries, operationName);
                }
                const result = await operation();
                return result;
            } catch (error) {
                lastError = error as Error;
                const errorType = this.categorizeError(lastError);

                // Do not retry critical errors
                if (errorType === ErrorType.INSUFFICIENT_BALANCE) {
                    throw new BotError(errorType, lastError.message, lastError);
                }

                if (attempt < maxRetries) {
                    const delay = this.config.baseDelay * Math.pow(2, attempt - 1);
                    await this.sleep(delay);
                }
            }
        }

        throw new BotError(
            this.categorizeError(lastError!),
            `${operationName} failed after ${maxRetries} attempts: ${lastError!.message}`,
            lastError!
        );
    }

    private async checkGasPrice(): Promise<void> {
        if (!this.config.maxGasPrice) return;

        try {
            const gasPrice = await this.publicClient.getGasPrice();
            const maxGasPriceWei = parseUnits(this.config.maxGasPrice, 9); // gwei to wei

            if (gasPrice > maxGasPriceWei) {
                const currentGwei = formatEther(gasPrice * 1000000000n);
                this.logger.gasPriceTooHigh(currentGwei, this.config.maxGasPrice);
                throw new BotError(
                    ErrorType.GAS_PRICE_TOO_HIGH,
                    `Gas price too high: ${currentGwei} gwei > ${this.config.maxGasPrice} gwei`
                );
            }
        } catch (error) {
            if (error instanceof BotError) throw error;
            // Don't log as an error if we just couldn't check
        }
    }

    private async waitForTransaction(hash: Hash): Promise<TransactionReceipt> {
        try {
            this.logger.transactionWaiting(hash);
            const receipt = await this.publicClient.waitForTransactionReceipt({
                hash,
                timeout: 300000 // 5 minutes
            });

            if (receipt.status === 'success') {
                this.logger.transactionConfirmed(hash, receipt.gasUsed.toString());

                // Update metrics
                if (this.config.enableMetrics) {
                    this.updateGasMetrics(receipt.gasUsed, receipt.effectiveGasPrice || 0n);
                }
            } else {
                throw new Error('Transaction failed');
            }

            return receipt;
        } catch (error) {
            const err = error as Error;
            this.logger.operationFailed('Transaction', err.message);
            throw new BotError(ErrorType.NETWORK_ERROR, err.message, err);
        }
    }

    private updateGasMetrics(gasUsed: bigint, gasPrice: bigint): void {
        const gasCost = gasUsed * gasPrice;
        const totalTransactions = BigInt(this.metrics.successfulCycles);

        this.metrics.averageGasUsed = totalTransactions > 0n
            ? (this.metrics.averageGasUsed * totalTransactions + gasUsed) / (totalTransactions + 1n)
            : gasUsed;

        this.metrics.totalGasCost += gasCost;
    }

    private async getPendingRewards(): Promise<bigint> {
        try {
            return await this.stakingContract.read.pendingRewards([this.account.address]);
        } catch (error) {
            // If we can't get pending rewards, return 0
            return 0n;
        }
    }

    private formatTokenAmount(amount: bigint): string {
        return formatEther(amount * BigInt(10 ** (18 - this.tokenDecimals)));
    }

    private async claimRewards(): Promise<bigint> {
        try {
            // Check pending rewards
            const pendingRewards = await this.getPendingRewards();
            if (pendingRewards === 0n) {
                this.logger.noPendingRewards();
                return 0n;
            }

            this.logger.pendingRewardsDetected(
                this.formatTokenAmount(pendingRewards),
                this.tokenSymbol
            );

            // Check minimum amount
            if (this.config.minStakeAmount) {
                const minAmount = parseUnits(this.config.minStakeAmount, this.tokenDecimals);
                if (pendingRewards < minAmount) {
                    this.logger.belowMinStake(
                        this.formatTokenAmount(pendingRewards),
                        this.config.minStakeAmount,
                        this.tokenSymbol
                    );
                    return 0n;
                }
            }

            // Check gas price
            await this.checkGasPrice();

            const initialBalance = await this.tokenContract.read.balanceOf([this.account.address]);

            const hash = await this.retryOperation(async () => {
                return await this.stakingContract.write.claim();
            }, 'Claim rewards');

            await this.waitForTransaction(hash);

            const newBalance: bigint = await this.tokenContract.read.balanceOf([this.account.address]);
            const claimedAmount: bigint = newBalance - initialBalance;

            if (claimedAmount > 0n) {
                this.logger.rewardsClaimed(
                    this.formatTokenAmount(claimedAmount),
                    this.tokenSymbol,
                    hash
                );

                if (this.config.enableMetrics) {
                    this.metrics.totalClaimed += claimedAmount;
                }
            }

            return claimedAmount;
        } catch (error) {
            const err = error instanceof BotError ? error : new BotError(
                ErrorType.CONTRACT_ERROR,
                `Failed to claim rewards: ${(error as Error).message}`,
                error as Error
            );
            this.logger.operationFailed('Claim rewards', err.message);
            throw err;
        }
    }

    private async checkAndApproveAllowance(amount: bigint): Promise<void> {
        try {
            const currentAllowance = await this.tokenContract.read.allowance([
                this.account.address,
                this.config.stakingContractAddress
            ]);

            if (currentAllowance < amount) {
                await this.checkGasPrice();

                const hash = await this.retryOperation(async () => {
                    return await this.tokenContract.write.approve([
                        this.config.stakingContractAddress,
                        amount
                    ]);
                }, 'Approve tokens');

                await this.waitForTransaction(hash);

                this.logger.tokenApprovalSuccess(
                    this.formatTokenAmount(amount),
                    this.tokenSymbol,
                    hash
                );
            }
        } catch (error) {
            const err = error instanceof BotError ? error : new BotError(
                ErrorType.CONTRACT_ERROR,
                `Failed to approve tokens: ${(error as Error).message}`,
                error as Error
            );
            this.logger.operationFailed('Token approval', err.message);
            throw err;
        }
    }

    private async stakeTokens(amount: bigint): Promise<void> {
        try {
            if (amount <= 0n) {
                this.logger.warn('No tokens to stake');
                return;
            }

            // Check minimum amount
            if (this.config.minStakeAmount) {
                const minAmount = parseUnits(this.config.minStakeAmount, this.tokenDecimals);
                if (amount < minAmount) {
                    this.logger.belowMinStake(
                        this.formatTokenAmount(amount),
                        this.config.minStakeAmount,
                        this.tokenSymbol
                    );
                    return;
                }
            }
            // this.logger.cycleStarting();

            // this.logger.info('Starting stake process', {
            //     amount: this.formatTokenAmount(amount),
            //     symbol: this.tokenSymbol
            // });

            await this.checkGasPrice();

            const hash = await this.retryOperation(async () => {
                return await this.stakingContract.write.stake([this.account.address, amount]);
            }, 'Stake tokens');

            await this.waitForTransaction(hash);

            this.logger.tokensStaked(this.formatTokenAmount(amount), this.tokenSymbol, hash);

            // this.logger.success('Tokens staked successfully', {
            //     amount: this.formatTokenAmount(amount),
            //     symbol: this.tokenSymbol,
            //     transactionHash: hash
            // });

            if (this.config.enableMetrics) {
                this.metrics.totalStaked += amount;
            }
        } catch (error) {
            const err = error instanceof BotError ? error : new BotError(
                ErrorType.CONTRACT_ERROR,
                `Failed to stake tokens: ${(error as Error).message}`,
                error as Error
            );
            this.logger.error('Failed to stake tokens', {error: err.message, type: err.type});
            throw err;
        }
    }

    private async executeClaimAndStake(): Promise<void> {
        const startTime = Date.now();

        try {
            this.logger.cycleStarting();
            // this.logger.info('=== Starting claim and stake cycle ===');

            const claimedAmount = await this.claimRewards();

            if (claimedAmount > 0n) {
                await this.checkAndApproveAllowance(claimedAmount);
                await this.stakeTokens(claimedAmount);
            }

            // Update success metrics
            if (this.config.enableMetrics) {
                this.metrics.successfulCycles++;
                this.metrics.lastSuccessfulCycle = new Date();
            }

            const duration = Date.now() - startTime;
            // this.logger.success(`=== Claim and stake cycle completed in ${duration}ms ===`);
            this.logger.cycleCompleted(duration);
        } catch (error) {
            const err = error instanceof BotError ? error : new BotError(
                ErrorType.UNKNOWN_ERROR,
                `Claim and stake cycle failed: ${(error as Error).message}`,
                error as Error
            );

            // Update failure metrics
            if (this.config.enableMetrics) {
                this.metrics.failedCycles++;
                this.metrics.lastFailedCycle = new Date();
            }
            this.logger.operationFailed('Claim and stake cycle', err.message);
            // this.logger.error('Claim and stake cycle failed', {
            //     error: err.message,
            //     type: err.type,
            //     duration: Date.now() - startTime
            // });
            throw err;
        }
    }

    private async performHealthCheck(): Promise<void> {
        try {
            // Check network connection
            const blockNumber = await this.publicClient.getBlockNumber();

            // Check ETH balance for gas
            const ethBalance = await this.publicClient.getBalance({address: this.account.address});
            const minEthBalance = parseUnits('0.0005', 18); // Minimum 0.0005 ETH

            if (ethBalance < minEthBalance) {
                this.logger.lowEthBalance(formatEther(ethBalance));
                // this.logger.warn('Low ETH balance for gas fees', {
                //     balance: formatEther(ethBalance),
                //     minimum: '0.0005'
                // });
            }

            // Check token balance
            const tokenBalance = await this.tokenContract.read.balanceOf([this.account.address]);

            this.logger.healthCheckPassed({
                blockNumber: blockNumber.toString(),
                ethBalance: formatEther(ethBalance),
                tokenBalance: this.formatTokenAmount(tokenBalance),
                symbol: this.tokenSymbol
            })

            // this.logger.info('Health check passed', {
            //     blockNumber: blockNumber.toString(),
            //     ethBalance: formatEther(ethBalance),
            //     tokenBalance: this.formatTokenAmount(tokenBalance),
            //     symbol: this.tokenSymbol
            // });
        } catch (error) {
            this.logger.operationFailed('Health check', (error as Error).message);
            // this.logger.error('Health check failed', { error: (error as Error).message });
        }
    }

    private logMetrics(): void {
        if (!this.config.enableMetrics) return;

        this.logger.metrics({
            totalClaimed: this.formatTokenAmount(this.metrics.totalClaimed),
            totalStaked: this.formatTokenAmount(this.metrics.totalStaked),
            successfulCycles: this.metrics.successfulCycles,
            failedCycles: this.metrics.failedCycles,
            lastSuccessfulCycle: this.metrics.lastSuccessfulCycle?.toISOString(),
            averageGasUsed: this.metrics.averageGasUsed.toString(),
            totalGasCost: formatEther(this.metrics.totalGasCost),
            symbol: this.tokenSymbol
        });
    }

    /**
     * Starts the staking bot.
     * @param privateKey The private key of the wallet to use.
     */
    async start(privateKey: string): Promise<void> {
        try {
            if (this.isRunning) {
                this.logger.warn('Bot is already running');
                return;
            }

            this.logger.botStarting(this.config);

            await this.setupWallet(privateKey);
            this.isRunning = true;

            // Initial health check
            await this.performHealthCheck();

            // First execution
            await this.executeClaimAndStake();

            // Set up periodic tasks
            const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
            this.mainInterval = setInterval(async () => {
                if (!this.isRunning) return;

                try {
                    await this.executeClaimAndStake();
                } catch (error) {
                    const err = error as BotError;

                    // Stop the bot on critical errors
                    if (err.type === ErrorType.INSUFFICIENT_BALANCE) {
                        this.logger.criticalError(err.message);
                        // this.logger.error('Critical error - stopping bot', { error: err.message });
                        this.stop();
                    }
                }
            }, intervalMs);

            // Set up health checks
            if (this.config.healthCheckInterval) {
                const healthCheckMs = this.config.healthCheckInterval * 60 * 1000;
                this.healthCheckInterval = setInterval(async () => {
                    if (!this.isRunning) return;
                    await this.performHealthCheck();
                    this.logMetrics();
                }, healthCheckMs);
            }

            this.logger.nextExecution(this.config.intervalHours);

            // Handle termination signals
            const gracefulShutdown = () => {
                this.logger.botStopped();
                this.stop();
                this.logMetrics();
                process.exit(0);
            };

            process.on('SIGINT', gracefulShutdown);
            process.on('SIGTERM', gracefulShutdown);

        } catch (error) {
            const err = error instanceof BotError ? error : new BotError(
                ErrorType.UNKNOWN_ERROR,
                `Failed to start bot: ${(error as Error).message}`,
                error as Error
            );
            this.logger.operationFailed('Start bot', err.message)
            this.isRunning = false;
            throw err;
        }
    }

    /**
     * Stops the staking bot.
     */
    stop(): void {
        this.isRunning = false;

        if (this.mainInterval) {
            clearInterval(this.mainInterval);
            this.mainInterval = undefined;
        }

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }

        this.logger.info('Bot stopped');
    }

    /**
     * Gets the current bot metrics.
     * @returns The current metrics.
     */
    getMetrics(): BotMetrics {
        return {...this.metrics};
    }

    /**
     * Updates the bot configuration on the fly.
     * @param newConfig A partial configuration object to update.
     */
    updateConfig(newConfig: Partial<Config>): void {
        this.config = {...this.config, ...newConfig};
        this.logger.info('Configuration updated', newConfig);
    }

    /**
     * Sets up the encrypted private key.
     */
    static async setupPrivateKey(): Promise<void> {
        const password = await getPassword('🔐 Enter a password to encrypt your private key: ');
        const confirmPassword = await getPassword('🔐 Confirm password: ');
        if (password !== confirmPassword) {
            throw new Error('❌ Passwords do not match!');
        }

        const privateKey = await getPassword('Enter your private key: ');
        KeyStorage.encryptPrivateKey(privateKey, password);
        console.log('✅ Private key setup completed successfully!');
    }
}

/**
 * The main function to run the bot.
 */
async function main() {
    try {
        const args = process.argv.slice(2);

        if (args.includes('--setup')) {
            await VeniceStakingBot.setupPrivateKey();
            return;
        }

        const password = await getPassword('🔐 Enter master password to access: ');
        const privateKey = KeyStorage.decryptPrivateKey(password);

        // Create and start the bot
        const bot = new VeniceStakingBot();

        await bot.start(privateKey);

    } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to start bot:', err.message);
        process.exit(1);
    }
}

export {VeniceStakingBot, type Config, type BotMetrics, ErrorType, BotError};

if (require.main === module) {
    main().catch(console.error);
}