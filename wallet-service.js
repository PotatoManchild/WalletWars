// wallet-service.js
// Enhanced wallet tracking service using Web3.js + Helius backup
// Replaces the failing Solscan integration

console.log('🚀 Loading Enhanced Wallet Service (Web3.js + Helius)...');

class EnhancedWalletService {
    constructor() {
        this.rateLimiter = new RateLimiter(100, 60000); // 100 req/min for free tiers
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        
        // Configuration
        this.config = {
            // Primary: Solana Web3.js with public RPC
            primary: {
                name: 'Solana Web3.js',
                rpcUrl: 'https://api.mainnet-beta.solana.com',
                type: 'web3js',
                priority: 1
            },
            // Backup: Helius (add API key when needed)
            backup: {
                name: 'Helius',
                rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=', // Add key when scaling
                type: 'helius',
                priority: 2
            },
            // Fallback: Alternative public RPC
            fallback: {
                name: 'Ankr Public',
                rpcUrl: 'https://rpc.ankr.com/solana',
                type: 'web3js',
                priority: 3
            }
        };
        
        this.currentProvider = this.config.primary;
        this.web3Connection = null;
        this.heliusConnection = null;
        
        this.initializeConnections();
        
        console.log('✅ Enhanced Wallet Service initialized with multi-provider support');
    }

    /**
     * Initialize Web3.js connections
     */
    initializeConnections() {
        try {
            // Import Web3.js if available
            if (typeof window !== 'undefined' && window.solanaWeb3) {
                this.Connection = window.solanaWeb3.Connection;
                this.PublicKey = window.solanaWeb3.PublicKey;
                this.LAMPORTS_PER_SOL = window.solanaWeb3.LAMPORTS_PER_SOL;
            } else {
                console.warn('⚠️ Solana Web3.js not loaded yet, will retry when needed');
            }
            
            this.createConnections();
            
        } catch (error) {
            console.error('❌ Error initializing connections:', error);
        }
    }

    /**
     * Create connection instances
     */
    createConnections() {
        try {
            if (this.Connection) {
                this.web3Connection = new this.Connection(this.config.primary.rpcUrl, 'confirmed');
                console.log('🔗 Primary Web3.js connection established');
                
                // Create backup connections
                this.ankrConnection = new this.Connection(this.config.fallback.rpcUrl, 'confirmed');
                console.log('🔗 Fallback Ankr connection established');
            }
        } catch (error) {
            console.error('❌ Error creating connections:', error);
        }
    }

    /**
     * Get wallet SOL balance using Web3.js
     * @param {string} walletAddress - Solana wallet address
     * @returns {Object} Balance data
     */
    async getWalletBalance(walletAddress) {
        await this.rateLimiter.wait();
        
        try {
            console.log(`💰 Fetching SOL balance for: ${walletAddress.substring(0, 8)}...`);
            
            // Ensure connections are ready
            if (!this.web3Connection) {
                this.createConnections();
            }
            
            if (!this.web3Connection || !this.PublicKey) {
                throw new Error('Web3.js not properly loaded');
            }
            
            // Create PublicKey instance
            const publicKey = new this.PublicKey(walletAddress);
            
            // Get balance in lamports
            const balanceInLamports = await this.web3Connection.getBalance(publicKey);
            
            // Convert to SOL
            const solBalance = balanceInLamports / this.LAMPORTS_PER_SOL;
            
            console.log(`✅ SOL Balance retrieved: ${solBalance} SOL`);
            
            return {
                solBalance: solBalance,
                lamports: balanceInLamports,
                provider: this.currentProvider.name,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ Web3.js balance fetch error for ${walletAddress.substring(0, 8)}:`, error);
            
            // Try fallback provider
            return await this.getBalanceWithFallback(walletAddress, error);
        }
    }

    /**
     * Get wallet token balances using enhanced APIs
     * @param {string} walletAddress - Solana wallet address
     * @returns {Array} Array of token holdings
     */
    async getTokenBalances(walletAddress) {
        await this.rateLimiter.wait();
        
        try {
            console.log(`🪙 Fetching token balances for: ${walletAddress.substring(0, 8)}...`);
            
            if (!this.web3Connection || !this.PublicKey) {
                throw new Error('Web3.js not properly loaded');
            }
            
            const publicKey = new this.PublicKey(walletAddress);
            
            // Get all token accounts owned by this wallet
            const tokenAccounts = await this.web3Connection.getParsedTokenAccountsByOwner(
                publicKey,
                {
                    programId: new this.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
                }
            );
            
            const tokenBalances = tokenAccounts.value.map(account => {
                const parsedInfo = account.account.data.parsed.info;
                return {
                    mint: parsedInfo.mint,
                    owner: parsedInfo.owner,
                    amount: parsedInfo.tokenAmount.amount,
                    decimals: parsedInfo.tokenAmount.decimals,
                    uiAmount: parsedInfo.tokenAmount.uiAmount,
                    uiAmountString: parsedInfo.tokenAmount.uiAmountString
                };
            });
            
            console.log(`✅ Found ${tokenBalances.length} token holdings`);
            
            return tokenBalances;
            
        } catch (error) {
            console.error(`❌ Token balance fetch error for ${walletAddress.substring(0, 8)}:`, error);
            // Return empty array on error - we can still track SOL balance
            return [];
        }
    }

    /**
     * Get complete wallet snapshot with all balances
     * @param {string} walletAddress - Solana wallet address
     * @returns {Object} Complete wallet state snapshot
     */
    async getFullWalletSnapshot(walletAddress) {
        try {
            console.log(`📸 Taking full wallet snapshot for: ${walletAddress.substring(0, 8)}...`);
            
            // Get both SOL balance and token balances
            const [balanceData, tokenData] = await Promise.all([
                this.getWalletBalance(walletAddress),
                this.getTokenBalances(walletAddress)
            ]);
            
            // Calculate total value (for now, just SOL - can add token values later)
            const totalValue = this.calculateTotalValue(balanceData.solBalance, tokenData);
            
            const snapshot = {
                address: walletAddress,
                solBalance: balanceData.solBalance,
                tokenBalances: tokenData,
                totalValueSol: totalValue,
                timestamp: new Date().toISOString(),
                provider: balanceData.provider,
                raw: { 
                    balanceData, 
                    tokenData,
                    snapshotTime: Date.now()
                }
            };
            
            console.log(`✅ Wallet snapshot complete - Total value: ${totalValue} SOL (Provider: ${balanceData.provider})`);
            
            return snapshot;
            
        } catch (error) {
            console.error(`❌ Failed to get wallet snapshot for ${walletAddress.substring(0, 8)}:`, error);
            throw error;
        }
    }

    /**
     * Fallback balance retrieval with alternative providers
     */
    async getBalanceWithFallback(walletAddress, originalError) {
        console.log('🔄 Attempting fallback providers...');
        
        try {
            // Try Ankr fallback
            if (this.ankrConnection) {
                console.log('🔄 Trying Ankr fallback...');
                
                const publicKey = new this.PublicKey(walletAddress);
                const balanceInLamports = await this.ankrConnection.getBalance(publicKey);
                const solBalance = balanceInLamports / this.LAMPORTS_PER_SOL;
                
                console.log(`✅ Ankr fallback successful: ${solBalance} SOL`);
                
                return {
                    solBalance: solBalance,
                    lamports: balanceInLamports,
                    provider: 'Ankr Fallback',
                    timestamp: new Date().toISOString()
                };
            }
            
            // If Helius API key is configured, try Helius
            if (this.config.backup.rpcUrl.includes('api-key=') && 
                this.config.backup.rpcUrl.split('api-key=')[1].length > 0) {
                
                console.log('🔄 Trying Helius backup...');
                
                const heliusConnection = new this.Connection(this.config.backup.rpcUrl, 'confirmed');
                const publicKey = new this.PublicKey(walletAddress);
                const balanceInLamports = await heliusConnection.getBalance(publicKey);
                const solBalance = balanceInLamports / this.LAMPORTS_PER_SOL;
                
                console.log(`✅ Helius backup successful: ${solBalance} SOL`);
                
                return {
                    solBalance: solBalance,
                    lamports: balanceInLamports,
                    provider: 'Helius Backup',
                    timestamp: new Date().toISOString()
                };
            }
            
            throw originalError;
            
        } catch (fallbackError) {
            console.error('❌ All providers failed:', fallbackError);
            throw new Error(`All wallet providers failed. Primary: ${originalError.message}, Fallback: ${fallbackError.message}`);
        }
    }

    /**
     * Calculate total wallet value in SOL terms
     * @param {number} solBalance - SOL balance
     * @param {Array} tokenBalances - Token holdings
     * @returns {number} Total value in SOL
     */
    calculateTotalValue(solBalance, tokenBalances) {
        let totalValue = solBalance;
        
        // For MVP, only count SOL
        // Later enhancement: add major token values (USDC, USDT, etc.)
        // Example future implementation:
        // tokenBalances.forEach(token => {
        //     if (token.mint === USDC_MINT_ADDRESS) {
        //         totalValue += token.uiAmount * getUSDCToSOLRate();
        //     }
        // });
        
        return totalValue;
    }

    /**
     * Validate that a wallet address is properly formatted
     * @param {string} address - Wallet address to validate
     * @returns {boolean} True if valid
     */
    isValidSolanaAddress(address) {
        if (!address || typeof address !== 'string') {
            return false;
        }
        
        // Basic Solana address validation (32-44 characters, base58)
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        return base58Regex.test(address);
    }

    /**
     * Get current service status
     * @returns {Object} Service health status
     */
    async getServiceStatus() {
        try {
            // Test primary connection
            const testAddress = 'So11111111111111111111111111111111111111112'; // SOL token mint
            const startTime = Date.now();
            
            await this.getWalletBalance(testAddress);
            
            const responseTime = Date.now() - startTime;
            
            return {
                online: true,
                provider: this.currentProvider.name,
                responseTime: responseTime,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                online: false,
                error: error.message,
                provider: this.currentProvider.name,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get transaction history for anti-cheat monitoring
     * @param {string} walletAddress - Solana wallet address
     * @param {number} limit - Number of transactions to fetch
     * @returns {Array} Transaction history
     */
    async getTransactionHistory(walletAddress, limit = 50) {
        await this.rateLimiter.wait();
        
        try {
            console.log(`📋 Fetching transaction history for: ${walletAddress.substring(0, 8)}... (limit: ${limit})`);
            
            if (!this.web3Connection || !this.PublicKey) {
                throw new Error('Web3.js not properly loaded');
            }
            
            const publicKey = new this.PublicKey(walletAddress);
            
            // Get confirmed signatures for this address
            const signatures = await this.web3Connection.getSignaturesForAddress(
                publicKey,
                { limit: limit }
            );
            
            console.log(`✅ Retrieved ${signatures.length} transaction signatures`);
            
            return signatures;
            
        } catch (error) {
            console.error(`❌ Transaction history error for ${walletAddress.substring(0, 8)}:`, error);
            throw error;
        }
    }

    /**
     * Enhanced API status with multiple providers
     */
    async getMultiProviderStatus() {
        const statuses = {};
        
        for (const [key, config] of Object.entries(this.config)) {
            try {
                const connection = new this.Connection(config.rpcUrl, 'confirmed');
                const testAddress = new this.PublicKey('So11111111111111111111111111111111111111112');
                
                const startTime = Date.now();
                await connection.getBalance(testAddress);
                const responseTime = Date.now() - startTime;
                
                statuses[key] = {
                    name: config.name,
                    online: true,
                    responseTime: responseTime,
                    priority: config.priority
                };
                
            } catch (error) {
                statuses[key] = {
                    name: config.name,
                    online: false,
                    error: error.message,
                    priority: config.priority
                };
            }
        }
        
        return statuses;
    }
}

/**
 * Rate limiter utility class (reused from original)
 */
class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
        
        console.log(`🚦 Rate limiter initialized: ${maxRequests} requests per ${timeWindow/1000}s`);
    }

    async wait() {
        const now = Date.now();
        
        // Remove old requests outside time window
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        // If we're at the limit, wait
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = Math.min(...this.requests);
            const waitTime = this.timeWindow - (now - oldestRequest) + 100; // Add 100ms buffer
            
            if (waitTime > 0) {
                console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return this.wait(); // Recursive call after waiting
            }
        }
        
        // Record this request
        this.requests.push(now);
    }

    getStatus() {
        const now = Date.now();
        const activeRequests = this.requests.filter(time => now - time < this.timeWindow);
        
        return {
            requestsInWindow: activeRequests.length,
            maxRequests: this.maxRequests,
            timeWindow: this.timeWindow,
            available: this.maxRequests - activeRequests.length,
            percentUsed: (activeRequests.length / this.maxRequests) * 100
        };
    }
}

// Create global instance and wait for Web3.js to load
let walletServiceInstance = null;

function initializeWalletService() {
    if (!walletServiceInstance) {
        walletServiceInstance = new EnhancedWalletService();
        window.enhancedWalletService = walletServiceInstance;
        console.log('🎯 Enhanced Wallet Service available globally as window.enhancedWalletService');
    }
    return walletServiceInstance;
}

// Initialize when Web3.js is available
if (typeof window !== 'undefined') {
    // Check if Web3.js is already loaded
    if (window.solanaWeb3) {
        initializeWalletService();
    } else {
        // Wait for Web3.js to load
        const checkForWeb3 = setInterval(() => {
            if (window.solanaWeb3) {
                clearInterval(checkForWeb3);
                initializeWalletService();
            }
        }, 500);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkForWeb3);
            if (!window.solanaWeb3) {
                console.warn('⚠️ Solana Web3.js not loaded within 10 seconds');
                // Initialize anyway for testing
                initializeWalletService();
            }
        }, 10000);
    }
}

console.log('✅ Enhanced Wallet Service module loaded!');