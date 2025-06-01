// setup-hybrid-snapshots.js
// Setup script for the hybrid snapshot system

console.log('🚀 Initializing Hybrid Snapshot System...');

async function setupHybridSnapshots() {
    try {
        console.log('📋 Hybrid Snapshot System Setup');
        console.log('================================');
        
        // Step 1: Load required scripts
        console.log('\n1️⃣ Loading required components...');
        
        const scriptsToLoad = [
            { name: 'Tournament Snapshot Manager', check: () => window.tournamentSnapshotManager },
            { name: 'Tournament Automation', check: () => window.tournamentAutomation },
            { name: 'Enhanced Wallet Service', check: () => window.enhancedWalletService },
            { name: 'WalletWars API', check: () => window.walletWarsAPI }
        ];
        
        let allLoaded = true;
        for (const script of scriptsToLoad) {
            if (script.check()) {
                console.log(`✅ ${script.name} loaded`);
            } else {
                console.log(`❌ ${script.name} not loaded`);
                allLoaded = false;
            }
        }
        
        if (!allLoaded) {
            throw new Error('Not all required components are loaded');
        }
        
        // Step 2: Check Helius API configuration
        console.log('\n2️⃣ Checking wallet service configuration...');
        
        // Check if Helius API key is configured by examining the config
        let heliusConfigured = false;
        try {
            if (window.enhancedWalletService.config && 
                window.enhancedWalletService.config.backup && 
                window.enhancedWalletService.config.backup.rpcUrl) {
                // Check if the Helius URL contains an API key
                const heliusUrl = window.enhancedWalletService.config.backup.rpcUrl;
                heliusConfigured = heliusUrl.includes('api-key=') && heliusUrl.includes('97322e35-59f5-424c-89f0-e6a826353c48');
                
                if (heliusConfigured) {
                    console.log('✅ Helius API key detected in configuration');
                }
            }
        } catch (configError) {
            console.warn('⚠️ Could not check Helius configuration:', configError);
        }
        
        if (!heliusConfigured) {
            console.warn('⚠️ Helius API key may not be configured properly');
            console.log('👉 The system will use public RPC endpoints as fallback');
        }
        
        console.log('✅ Wallet service ready (using available providers)');
        
        // Step 3: Test wallet service
        console.log('\n3️⃣ Testing wallet service...');
        
        const testWallet = 'So11111111111111111111111111111111111111112';
        const snapshot = await window.enhancedWalletService.getFullWalletSnapshot(testWallet);
        console.log(`✅ Wallet service working - Test balance: ${snapshot.solBalance} SOL`);
        
        // Step 4: Initialize automation system
        console.log('\n4️⃣ Initializing tournament automation...');
        
        await window.tournamentAutomation.initialize();
        console.log('✅ Tournament automation initialized');
        
        // Step 5: Summary
        console.log('\n✅ HYBRID SNAPSHOT SYSTEM READY!');
        console.log('================================');
        console.log('📸 Snapshots will only be taken at:');
        console.log('   • Tournament start (all participants)');
        console.log('   • Tournament end (all participants)');
        console.log('\n💰 API Usage Efficiency:');
        console.log('   • 2 API calls per participant per tournament');
        console.log('   • No continuous monitoring during tournaments');
        console.log('   • Anti-cheat detection at end only');
        console.log('\n🤖 Automation Features:');
        console.log('   • Automatic state transitions');
        console.log('   • Automatic snapshot capture');
        console.log('   • Automatic result calculation');
        console.log('   • Automatic prize distribution');
        
        // Show automation status
        const status = window.tournamentAutomation.getStatus();
        console.log('\n📊 Current Status:', status);
        
        return true;
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        return false;
    }
}

// Test functions for development
window.testHybridSystem = {
    // Manually process a tournament start
    async startTournament(tournamentId) {
        console.log(`🎮 Manually starting tournament ${tournamentId}...`);
        await window.tournamentAutomation.manualStartTournament(tournamentId);
    },
    
    // Manually process a tournament end
    async endTournament(tournamentId) {
        console.log(`🎮 Manually ending tournament ${tournamentId}...`);
        await window.tournamentAutomation.manualEndTournament(tournamentId);
    },
    
    // Test snapshot for a specific wallet
    async testSnapshot(walletAddress) {
        console.log(`📸 Testing snapshot for ${walletAddress}...`);
        const snapshot = await window.enhancedWalletService.getFullWalletSnapshot(walletAddress);
        console.log('Snapshot result:', snapshot);
        return snapshot;
    },
    
    // Check automation status
    checkStatus() {
        const status = window.tournamentAutomation.getStatus();
        console.log('🤖 Automation Status:', status);
        return status;
    },
    
    // Stop automation (for testing)
    stopAutomation() {
        window.tournamentAutomation.stopMonitoring();
        console.log('🛑 Automation stopped');
    },
    
    // Start automation
    startAutomation() {
        window.tournamentAutomation.startMonitoring();
        console.log('✅ Automation started');
    }
};

// Auto-run setup if all dependencies are loaded
let autoRunAttempted = false;
setTimeout(() => {
    if (!autoRunAttempted && window.tournamentSnapshotManager && window.tournamentAutomation) {
        autoRunAttempted = true;
        console.log('🔄 Dependencies detected, hybrid snapshot setup ready');
        console.log('💡 Run setupHybridSnapshots() when ready to initialize');
    }
}, 2000);

console.log('✅ Hybrid Snapshot Setup Script loaded!');
console.log('🚀 Run setupHybridSnapshots() to initialize the system');
