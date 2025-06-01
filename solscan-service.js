// solscan-service.js
// Solana blockchain data integration for WalletWars tournament tracking

console.log('🔗 Loading Solscan API Service...');

class SolscanService {
    constructor() {
        this.baseURL = 'https://api.solscan.io';
        this.rateLimiter = new RateLimiter(90, 60000); // 90 req/min (stay under 100)
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        
        console.log('✅ Solscan service initialized with rate limiting (90 req/min)');
    }

    /**
     * Get wallet SOL balance from Solscan
     * @param {string} address - Solana wallet address
     * @returns {Object} Balance data with SOL amount
     */
    async getWalletBalance(address) {
        await this.rateLimiter.wait();
        
        try {
            console.log(`💰 Fetching SOL balance for: ${address.substring(0, 8)}...`);
            
            const response = await fetch(`${this.baseURL}/account/${address}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Solscan API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            const solBalance = data.lamports ? data.lamports / 1000000000 : 0; // Convert lamports to SOL
            
            console.log(`✅ SOL Balance retrieved: ${solBalance} SOL`);
            
            return {
                solBalance: solBalance,
                account: data.account,
                owner: data.owner,
                lamports: data.lamports
            };
            
        } catch (error) {
            console.error(`❌ Solscan balance fetch error for ${address.substring(0, 8)}:`, error);
            throw error;
        }
    }

    /**
     * Get wallet token balances from Solscan
     * @param {string} address - Solana wallet address  
     * @returns {Array} Array of token holdings
     */
    async getTokenBalances(address) {
        await this.rateLimiter.wait();
        
        try {
            console.log(`🪙 Fetching token balances for: ${address.substring(0, 8)}...`);
            
            const response = await fetch(`${this.baseURL}/account/tokens?address=${address}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Solscan tokens API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const tokenBalances = data.data || [];
            
            console.log(`✅ Found ${tokenBalances.length} token holdings`);
            
            return tokenBalances;
            
        } catch (error) {
            console.error(`❌ Solscan tokens fetch error for ${address.substring(0, 8)}:`, error);
            // Return empty array on error - we can still track SOL balance
            return [];
        }
    }

    /**
     * Get complete wallet snapshot with all balances
     * @param {string} address - Solana wallet address
     * @returns {Object} Complete wallet state snapshot
     */
    async getFullWalletSnapshot(address) {
        try {
            console.log(`📸 Taking full wallet snapshot for: ${address.substring(0, 8)}...`);
            
            // Get both SOL balance and token balances concurrently
            const [balanceData, tokenData] = await Promise.all([
                this.getWalletBalance(address),
                this.getTokenBalances(address)
            ]);
            
            // Calculate total value (for now, just SOL - can add token values later)
            const totalValue = this.calculateTotalValue(balanceData.solBalance, tokenData);
            
            const snapshot = {
                address: address,
                solBalance: balanceData.solBalance,
                tokenBalances: tokenData,
                totalValueSol: totalValue,
                timestamp: new Date().toISOString(),
                raw: { 
                    balanceData, 
                    tokenData,
                    snapshotTime: Date.now()
                }
            };
            
            console.log(`✅ Wallet snapshot complete - Total value: ${totalValue} SOL`);
            
            return snapshot;
            
        } catch (error) {
            console.error(`❌ Failed to get wallet snapshot for ${address.substring(0, 8)}:`, error);
            throw error;
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
        //     if (token.tokenAddress === USDC_ADDRESS) {
        //         totalValue += token.amount * getUSDCToSOLRate();
        //     }
        // });
        
        return totalValue;
    }

    /**
     * Get transaction history for a wallet (for anti-cheat monitoring)
     * @param {string} address - Solana wallet address
     * @param {string} beforeHash - For pagination
     * @param {number} limit - Number of transactions to fetch
     * @returns {Array} Transaction history
     */
    async getTransactionHistory(address, beforeHash = '', limit = 50) {
        await this.rateLimiter.wait();
        
        try {
            console.log(`📋 Fetching transaction history for: ${address.substring(0, 8)}... (limit: ${limit})`);
            
            let url = `${this.baseURL}/account/transactions?address=${address}&limit=${limit}`;
            if (beforeHash) {
                url += `&beforeHash=${beforeHash}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Solscan transactions API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const transactions = data.data || [];
            
            console.log(`✅ Retrieved ${transactions.length} transactions`);
            
            return transactions;
            
        } catch (error) {
            console.error(`❌ Solscan transaction history error for ${address.substring(0, 8)}:`, error);
            throw error;
        }
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
     * Get current Solscan API status
     * @returns {Object} API health status
     */
    async getAPIStatus() {
        try {
            const response = await fetch(`${this.baseURL}/market/token/So11111111111111111111111111111111111111112`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            return {
                online: response.ok,
                status: response.status,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                online: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

/**
 * Rate limiter utility class to respect Solscan API limits
 */
class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
        
        console.log(`🚦 Rate limiter initialized: ${maxRequests} requests per ${timeWindow/1000}s`);
    }

    /**
     * Wait if necessary to respect rate limits
     */
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

    /**
     * Get current rate limit status
     */
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

// Initialize global Solscan service
console.log('🚀 Initializing global Solscan service...');
window.solscanService = new SolscanService();

// Test the service on initialization
window.solscanService.getAPIStatus().then(status => {
    if (status.online) {
        console.log('✅ Solscan API is online and ready');
    } else {
        console.warn('⚠️ Solscan API appears to be offline:', status.error);
    }
}).catch(error => {
    console.warn('⚠️ Could not check Solscan API status:', error);
});

console.log('✅ Solscan service ready for tournament tracking!');
