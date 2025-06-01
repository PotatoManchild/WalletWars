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
        
        if (!window.enhancedWalletService.isApiKeyConfigured()) {
            console.error('❌ Helius API key not configured!');
            console.log('👉 Please add your Helius API key to wallet-service.js');
            console.log('👉 Get your free key at https://dev.helius.xyz/');
            return;
        }
        
        console.log('✅ Wallet service configured');
        
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
setTimeout(() => {
    if (window.tournamentSnapshotManager && window.tournamentAutomation) {
        console.log('🔄 Auto-running hybrid snapshot setup...');
        setupHybridSnapshots();
    }
}, 2000);

console.log('✅ Hybrid Snapshot Setup Script loaded!');
console.log('🚀 Run setupHybridSnapshots() to initialize the system');