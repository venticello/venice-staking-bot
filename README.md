# Venice Staking Bot 🤖

An automated staking bot for Base blockchain that periodically claims VVV rewards and automatically restakes them to maximize your staking returns.

## Features

🚀 **Automated Claiming**: Automatically claims pending rewards from staking contract
🤖 **Auto-Restaking**: Immediately stakes claimed rewards to compound returns
⛽ **Gas Price Protection**: Configurable maximum gas price to avoid high-fee transactions
🎯 **Fine-tuning**: Configuration with multiple parameters
♨️ **Health Monitoring**: Regular health checks to ensure bot stability
📊 **Comprehensive Metrics**: Tracks performance, gas usage, and success rates
🛡️ **Error Recovery**: Intelligent retry logic with exponential backoff
🔐 **Secure Key Storage**: Encrypted private key storage with password protection
⚡ **Graceful Shutdown**: Proper cleanup on termination signals
🐳 **Full Docker support** with multiple deployment options

## 📋 Prerequisites

- Node.js v18 or higher
- npm or yarn package manager
- Base network ETH for gas fees
- Tokens to stake in the VVV staking contract

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/venticello/venice-staking-bot.git
cd venice-staking-bot
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

## 🔐 Security Setup

### First-time Setup

1. **Setup encrypted private key storage**:
```bash
npm run build
node dist/index.js --setup
```

2. **Enter a strong password** when prompted (this will encrypt your private key)

3. **Enter your private key**

The bot will create an encrypted file `.env.encrypted` to store your private key securely.

## 🚀 Usage

### Basic Usage

```bash
npm run start
# or
node dist/index.js
```

## Running with Docker

You can build and run the bot using Docker for a fully isolated and reproducible environment.

### Build the Docker image

```bash
docker build -t venice-staking-bot .
# or
npm run docker:build
```

### Run the bot container

```bash
docker run -it --rm --name venice-staking-bot venice-staking-bot
# or
npm run docker:run 

# After entering password and seeing "✅ Wallet and contracts initialized"
# Press: Ctrl+P, then Ctrl+Q to detach
# or
# Press `Ctrl+C` in the terminal to stop the bot gracefully.

```

For advanced usage see the [RunInDocker.md](RunInDocker.md) file in the repository.
---
## ⚙️ Configuration

The bot uses a configuration object with the following options:

```typescript
interface Config {
    stakingContractAddress: Address;     // Staking contract address
    tokenContractAddress: Address;       // Token contract address
    intervalHours: number;               // Hours between claim/stake cycles
    maxRetries: number;                  // Maximum retry attempts
    baseDelay: number;                   // Base delay for retries (ms)
    gasLimitMultiplier: number;          // Gas limit multiplier
    rpcUrl?: string;                     // Custom RPC URL
    minStakeAmount?: string;             // Minimum amount to stake
    maxGasPrice?: string;                // Maximum gas price (gwei)
    healthCheckInterval?: number;        // Health check interval (minutes)
    enableMetrics?: boolean;             // Enable metrics collection
}
```

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
    stakingContractAddress: '0x321b7ff75154472B18EDb199033fF4D116F340Ff',
    tokenContractAddress: '0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf',
    intervalHours: 24,
    maxRetries: 3,
    baseDelay: 1000,
    gasLimitMultiplier: 1.2,
    rpcUrl: 'https://mainnet.base.org',
    minStakeAmount: '0.001',
    maxGasPrice: '50',
    healthCheckInterval: 60,
    enableMetrics: true
}
```

### Custom Configuration

```typescript
const bot = new VeniceStakingBot({
    intervalHours: 12,                    // Check every 12 hours
    minStakeAmount: '0.01',               // Minimum 0.01 tokens to stake
    maxGasPrice: '30',                    // Max 30 gwei gas price
    healthCheckInterval: 120,              // Health check every 2 hours
    tokenContractAddress: '0x...',        // Your token contract
    stakingContractAddress: '0x...'       // Your staking contract
});

await bot.start(privateKey);
```

## 📊 Monitoring

The bot provides comprehensive monitoring and metrics:

### Health Checks
- Network connectivity
- ETH balance for gas fees
- Token balance
- Contract status

### Metrics Tracked
- Total rewards claimed
- Total tokens staked
- Successful/failed cycles
- Average gas usage
- Total gas costs

### Logging
The bot provides detailed logs for:
- ✅ Successful operations
- ⚠️ Warnings and retries
- ❌ Errors and failures
- 📊 Metrics and statistics

## 🛡️ Error Handling

The bot handles various error types:

- **Network Errors**: Connection issues, timeouts
- **Contract Errors**: Contract reverts, invalid calls
- **Insufficient Balance**: Low ETH or token balance
- **Gas Price Too High**: Exceeds configured maximum
- **Unknown Errors**: Unexpected failures

### Retry Logic
- Exponential backoff for retries
- Smart categorization of errors
- Skip retries for critical errors (insufficient balance)

## 📈 Performance Tips

1. **Optimal Timing**: Run during low network activity (early morning UTC)
2. **Gas Settings**: Set reasonable gas price limits to avoid high fees
3. **Monitoring**: Check logs regularly for any issues
4. **Balance Management**: Maintain sufficient ETH for gas fees

## 🚨 Important Notes

### Security
- **Never share your private key** or encrypted key file
- **Use strong passwords** for key encryption
- **Keep backups** of your encrypted key file
- **Monitor bot activity** regularly

### Gas Costs
- Each cycle performs 2-3 transactions (claim, approve, stake)
- Typical gas usage: ~150,000-300,000 gas per cycle
- Monitor gas costs vs. rewards to ensure profitability

### Network Conditions
- Bot will skip execution if gas prices are too high
- Implements retry logic for network issues
- Automatically pauses if staking is disabled

## 🔍 Troubleshooting

### Common Issues

**"Insufficient funds for gas"**
- Ensure your wallet has enough ETH for transaction fees
- Check current gas prices on Base network

**"Transaction failed"**
- Verify contract addresses are correct
- Ensure sufficient token balance

**"Gas price too high"**
- Wait for lower gas prices
- Increase `maxGasPrice` in configuration
- Check Base network congestion

**"No pending rewards"**
- Rewards may not be available yet
- Check staking contract for reward schedule
- Verify you have staked tokens

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG=true npm run start
```

## 📝 Example Output

```
🚀 Starting Base Staking Bot...
✅ Wallet and contracts initialized
📊 Health check passed (ETH: 0.0215)
🎯 Starting claim and stake cycle
💰 Pending rewards detected: 1.234 VVV
⏳ Waiting for transaction confirmation...
✅ Transaction confirmed (gas: 98957)
✅ Rewards claimed successfully: 1.234 VVV
🔐 Token approval successful
🥩 Tokens staked successfully: 1.234 VVV
✅ Claim and stake cycle completed in 35s
⏰ Next execution in 24 hours
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## ⚠️ Disclaimer

This bot is provided as-is without warranties. Use at your own risk. Always:
- Test on testnets first
- Start with small amounts
- Monitor bot activity
- Understand the risks of automated staking

## 📄 License

[MIT](LICENSE)

---

**Happy automatic VVV staking!** 🎉