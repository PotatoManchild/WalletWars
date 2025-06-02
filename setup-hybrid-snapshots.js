// setup-hybrid-snapshots.js - OPTIMIZED EVENT-DRIVEN VERSION
// Setup script for the optimized hybrid snapshot system

console.log('🚀 Initializing Optimized Hybrid Snapshot System...');

async function setupHybridSnapshots() {
    try {
        console.log('📋 Optimized Hybrid Snapshot System Setup');
        console.log('=====================================');
        
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
        
        // Step 2: Update Helius API key configuration
        console.log('\n2️⃣ Configuring new Helius API key...');
        
        if (window.enhancedWalletService.config && window.enhancedWalletService.config.backup) {
            // Update with new API key
            window.enhancedWalletService.config.backup.rpcUrl = 
                'https://mainnet.helius-rpc.com/?api-key=cbfd228c-6be2-4493-ae67-5df7dc20a3e8';
            console.log('✅ New Helius API key configured');
        }
        
        // Step 3: Test wallet service with new key
        console.log('\n3️⃣ Testing wallet service with new API key...');
        
        const testWallet = 'So11111111111111111111111111111111111111112';
        const snapshot = await window.enhancedWalletService.getFullWalletSnapshot(testWallet);
        console.log(`✅ Wallet service working - Test balance: ${snapshot.solBalance} SOL`);
        
        // Step 4: Initialize automation system
        console.log('\n4️⃣ Initializing event-driven tournament automation...');
        
        await window.tournamentAutomation.initialize();
        console.log('✅ Tournament automation initialized');
        
        // Step 5: Schedule existing tournaments
        console.log('\n5️⃣ Scheduling tournaments for event-driven processing...');
        
        await window.tournamentAutomation.scheduleUpcomingTournaments();
        
        // Step 6: Summary
        console.log('\n✅ OPTIMIZED HYBRID SNAPSHOT SYSTEM READY!');
        console.log('==========================================');
        console.log('📸 Snapshots will ONLY be taken at:');
        console.log('   • Tournament start (all participants)');
        console.log('   • Tournament end (all participants)');
        console.log('\n💰 API Usage Efficiency:');
        console.log('   • EXACTLY 2 API calls per participant per tournament');
        console.log('   • NO continuous monitoring or polling');
        console.log('   • Event-driven architecture based on tournament times');
        console.log('\n🔋 API Budget Protection:');
        console.log('   • Hourly limit: 100 calls (configurable)');
        console.log('   • Daily limit: 1000 calls (configurable)');
        console.log('   • Automatic postponement if limits reached');
        console.log('\n🤖 Automation Features:');
        console.log('   • Precise tournament state transitions');
        console.log('   • Scheduled events based on tournament times');
        console.log('   • No wasteful periodic checking');
        console.log('   • Automatic prize distribution');
        
        // Show current status
        const status = window.tournamentAutomation.getStatus();
        console.log('\n📊 Current Status:', status);
        
        return true;
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        return false;
    }
}

// Enhanced test functions for development
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
    
    // View scheduled tournaments
    viewSchedule() {
        window.tournamentAutomation.showScheduleSummary();
    },
    
    // Clear all schedules (emergency stop)
    emergencyStop() {
        window.tournamentAutomation.clearAllSchedules();
        console.log('🛑 All tournament schedules cleared');
    },
    
    // Reschedule tournaments
    async reschedule() {
        console.log('🔄 Rescheduling all tournaments...');
        window.tournamentAutomation.clearAllSchedules();
        await window.tournamentAutomation.scheduleUpcomingTournaments();
        console.log('✅ Tournaments rescheduled');
    },
    
    // Check API usage
    checkApiUsage() {
        const status = window.tournamentAutomation.getStatus();
        console.log('📊 API Usage:', status.apiUsage);
        return status.apiUsage;
    }
};

// API Usage Monitor
window.apiUsageMonitor = {
    // Get current usage stats
    getUsage() {
        if (!window.tournamentAutomation) {
            console.error('Tournament automation not initialized');
            return null;
        }
        
        const tracker = window.tournamentAutomation.apiUsageTracker;
        return {
            hourly: {
                used: tracker.hourly,
                limit: tracker.limits.hourly,
                percentage: (tracker.hourly / tracker.limits.hourly * 100).toFixed(1) + '%'
            },
            daily: {
                used: tracker.daily,
                limit: tracker.limits.daily,
                percentage: (tracker.daily / tracker.limits.daily * 100).toFixed(1) + '%'
            },
            lastReset: new Date(tracker.lastReset).toLocaleString()
        };
    },
    
    // Update API limits (based on your Helius plan)
    updateLimits(hourly, daily) {
        if (!window.tournamentAutomation) {
            console.error('Tournament automation not initialized');
            return;
        }
        
        window.tournamentAutomation.apiUsageTracker.limits.hourly = hourly;
        window.tournamentAutomation.apiUsageTracker.limits.daily = daily;
        console.log(`✅ API limits updated - Hourly: ${hourly}, Daily: ${daily}`);
    },
    
    // Show usage report
    showReport() {
        const usage = this.getUsage();
        if (!usage) return;
        
        console.log('📊 API Usage Report');
        console.log('==================');
        console.log(`Hourly: ${usage.hourly.used}/${usage.hourly.limit} (${usage.hourly.percentage})`);
        console.log(`Daily: ${usage.daily.used}/${usage.daily.limit} (${usage.daily.percentage})`);
        console.log(`Last Reset: ${usage.lastReset}`);
    }
};

// Auto-run setup if all dependencies are loaded
let autoRunAttempted = false;
setTimeout(() => {
    if (!autoRunAttempted && window.tournamentSnapshotManager && window.tournamentAutomation) {
        autoRunAttempted = true;
        console.log('🔄 Dependencies detected, optimized hybrid snapshot setup ready');
        console.log('💡 Run setupHybridSnapshots() when ready to initialize');
        console.log('🔑 New Helius API key ready: cbfd228c-6be2-4493-ae67-5df7dc20a3e8');
    }
}, 2000);

console.log('✅ Optimized Hybrid Snapshot Setup Script loaded!');
console.log('🚀 Run setupHybridSnapshots() to initialize the event-driven system');
console.log('📊 Use apiUsageMonitor.showReport() to check API usage');
console.log('⏰ Use testHybridSystem.viewSchedule() to see scheduled tournaments');
