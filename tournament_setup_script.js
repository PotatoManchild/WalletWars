// tournament-setup.js
// Initial setup and testing script for WalletWars tournaments

console.log('🏗️ WalletWars Tournament Setup Script Starting...');

/**
 * Step 1: Setup Initial Tournament Templates
 */
async function setupInitialTournamentTemplates() {
    console.log('🏗️ Setting up initial tournament templates...');
    
    const templates = [
        // Pure Wallet Tournaments
        {
            name: "Rookie Pure Wallet - Monday",
            tournament_type: "weekly",
            trading_style: "pure_wallet",
            start_day: "monday",
            entry_fee: 0.01,
            max_participants: 500,
            prize_pool_percentage: 85.00
        },
        {
            name: "Rookie Pure Wallet - Wednesday",
            tournament_type: "weekly", 
            trading_style: "pure_wallet",
            start_day: "wednesday",
            entry_fee: 0.01,
            max_participants: 500,
            prize_pool_percentage: 85.00
        },
        {
            name: "Rookie Pure Wallet - Friday",
            tournament_type: "weekly",
            trading_style: "pure_wallet", 
            start_day: "friday",
            entry_fee: 0.01,
            max_participants: 500,
            prize_pool_percentage: 85.00
        },
        
        // Open Trading Tournaments
        {
            name: "Elite Open Trading - Monday", 
            tournament_type: "weekly",
            trading_style: "open_trading",
            start_day: "monday",
            entry_fee: 0.05,
            max_participants: 1000,
            prize_pool_percentage: 80.00
        },
        {
            name: "Elite Open Trading - Wednesday",
            tournament_type: "weekly",
            trading_style: "open_trading",
            start_day: "wednesday", 
            entry_fee: 0.05,
            max_participants: 1000,
            prize_pool_percentage: 80.00
        },
        {
            name: "Elite Open Trading - Friday",
            tournament_type: "weekly",
            trading_style: "open_trading",
            start_day: "friday",
            entry_fee: 0.05, 
            max_participants: 1000,
            prize_pool_percentage: 80.00
        },
        
        // Monthly Tournaments
        {
            name: "Monthly Pure Wallet Championship",
            tournament_type: "monthly",
            trading_style: "pure_wallet",
            start_day: "monday",
            entry_fee: 0.02,
            max_participants: 2000,
            prize_pool_percentage: 85.00
        },
        {
            name: "Monthly Open Trading Masters",
            tournament_type: "monthly", 
            trading_style: "open_trading",
            start_day: "monday",
            entry_fee: 0.1,
            max_participants: 2000,
            prize_pool_percentage: 75.00
        }
    ];
    
    let successCount = 0;
    let existingCount = 0;
    
    for (const templateData of templates) {
        try {
            const result = await window.walletWarsAPI.createTournamentTemplate(templateData);
            
            if (result.success) {
                console.log(`✅ Created template: ${templateData.name}`);
                successCount++;
            } else {
                if (result.error.includes('already exists') || result.error.includes('duplicate')) {
                    console.log(`ℹ️ Template already exists: ${templateData.name}`);
                    existingCount++;
                } else {
                    console.error(`❌ Failed to create template ${templateData.name}:`, result.error);
                }
            }
            
        } catch (error) {
            console.error(`❌ Exception creating template ${templateData.name}:`, error);
        }
    }
    
    console.log(`🏆 Template setup complete: ${successCount} created, ${existingCount} already existed`);
    return { created: successCount, existing: existingCount };
}

/**
 * Step 2: Test Solscan API Integration
 */
async function testSolscanIntegration() {
    console.log('🔗 Testing Solscan API integration...');
    
    try {
        // Test with a known Solana address (Solana Foundation)
        const testAddress = 'So11111111111111111111111111111111111111112'; // SOL token mint
        
        // Test API status
        const status = await window.solscanService.getAPIStatus();
        console.log('📊 Solscan API Status:', status);
        
        if (!status.online) {
            console.warn('⚠️ Solscan API appears to be offline');
            return { success: false, error: 'API offline' };
        }
        
        // Test rate limiter status
        const rateLimitStatus = window.solscanService.rateLimiter.getStatus();
        console.log('🚦 Rate Limiter Status:', rateLimitStatus);
        
        console.log('✅ Solscan integration test passed');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Solscan integration test failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Step 3: Create Sample Tournament Instance for Testing
 */
async function createSampleTournament() {
    console.log('🎮 Creating sample tournament for testing...');
    
    try {
        // Get the first template
        const templatesResult = await window.walletWarsAPI.getTournamentTemplates();
        
        if (!templatesResult.success || templatesResult.templates.length === 0) {
            throw new Error('No tournament templates found. Run setupInitialTournamentTemplates() first.');
        }
        
        const template = templatesResult.templates[0];
        console.log('📋 Using template:', template.name);
        
        // Calculate tournament times
        const now = new Date();
        const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Start in 24 hours
        const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
        const registrationOpens = new Date(now.getTime() + 1 * 60 * 60 * 1000); // Open in 1 hour
        const registrationCloses = new Date(startTime.getTime() - 1 * 60 * 60 * 1000); // Close 1 hour before start
        
        const instanceData = {
            template_id: template.id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            registration_opens: registrationOpens.toISOString(),
            registration_closes: registrationCloses.toISOString(),
            status: 'upcoming',
            participant_count: 0,
            total_prize_pool: 0
        };
        
        const result = await window.walletWarsAPI.createTournamentInstance(instanceData);
        
        if (result.success) {
            console.log('✅ Sample tournament created successfully');
            console.log('🎯 Tournament ID:', result.instance.id);
            console.log('📅 Registration opens:', registrationOpens);
            console.log('🚀 Tournament starts:', startTime);
            console.log('🏁 Tournament ends:', endTime);
            return result.instance;
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('❌ Failed to create sample tournament:', error);
        return null;
    }
}

/**
 * Step 4: Test Wallet Snapshot Functionality
 */
async function testWalletSnapshot(walletAddress = null) {
    console.log('📸 Testing wallet snapshot functionality...');
    
    try {
        // Use a test address if none provided
        const testAddress = walletAddress || 'So11111111111111111111111111111111111111112';
        
        console.log(`Testing snapshot for address: ${testAddress.substring(0, 8)}...`);
        
        // Test getting a wallet snapshot
        const snapshot = await window.solscanService.getFullWalletSnapshot(testAddress);
        
        console.log('✅ Wallet snapshot test results:');
        console.log('💰 SOL Balance:', snapshot.solBalance);
        console.log('🪙 Token Count:', snapshot.tokenBalances.length);
        console.log('💎 Total Value:', snapshot.totalValueSol, 'SOL');
        console.log('⏰ Timestamp:', snapshot.timestamp);
        
        return { success: true, snapshot: snapshot };
        
    } catch (error) {
        console.error('❌ Wallet snapshot test failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Step 5: Test Tournament Registration
 */
async function testTournamentRegistration(championId = null, tournamentId = null) {
    console.log('🎯 Testing tournament registration...');
    
    try {
        if (!championId) {
            console.log('⚠️ No champion ID provided - skipping registration test');
            return { success: false, error: 'No champion ID provided' };
        }
        
        if (!tournamentId) {
            // Get the first available tournament
            const tournamentsResult = await window.walletWarsAPI.getUpcomingTournaments(1);
            if (!tournamentsResult.success || tournamentsResult.tournaments.length === 0) {
                throw new Error('No upcoming tournaments found');
            }
            tournamentId = tournamentsResult.tournaments[0].id;
        }
        
        console.log(`Attempting to register champion ${championId} for tournament ${tournamentId}`);
        
        const result = await window.walletWarsAPI.registerForTournament(
            championId,
            tournamentId,
            'pure_wallet'
        );
        
        if (result.success) {
            console.log('✅ Tournament registration test successful');
            return result;
        } else {
            console.log('⚠️ Registration failed (expected if already registered):', result.error);
            return result;
        }
        
    } catch (error) {
        console.error('❌ Tournament registration test failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Main Setup Function
 */
async function runCompleteSetup() {
    console.log('🚀 Running complete WalletWars tournament setup...');
    
    // Wait for APIs to be ready
    if (!window.walletWarsAPI) {
        console.log('⏳ Waiting for WalletWars API...');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (!window.solscanService) {
        console.log('⏳ Waiting for Solscan service...');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    try {
        // Step 1: Setup tournament templates
        console.log('\n🔸 Step 1: Setting up tournament templates');
        await setupInitialTournamentTemplates();
        
        // Step 2: Test Solscan integration
        console.log('\n🔸 Step 2: Testing Solscan integration');
        const solscanTest = await testSolscanIntegration();
        
        // Step 3: Create sample tournament
        console.log('\n🔸 Step 3: Creating sample tournament');
        const sampleTournament = await createSampleTournament();
        
        // Step 4: Test wallet snapshot
        console.log('\n🔸 Step 4: Testing wallet snapshot');
        const snapshotTest = await testWalletSnapshot();
        
        // Step 5: Get upcoming tournaments
        console.log('\n🔸 Step 5: Fetching upcoming tournaments');
        const tournamentsResult = await window.walletWarsAPI.getUpcomingTournaments();
        
        if (tournamentsResult.success) {
            console.log(`✅ Found ${tournamentsResult.tournaments.length} upcoming tournaments`);
            tournamentsResult.tournaments.forEach(tournament => {
                console.log(`  🎮 ${tournament.tournament_templates.name} - ${tournament.status}`);
            });
        }
        
        console.log('\n🎉 Complete setup finished!');
        console.log('✅ Tournament system is ready for testing');
        
        return {
            success: true,
            solscanWorking: solscanTest.success,
            sampleTournament: sampleTournament,
            snapshotWorking: snapshotTest.success,
            upcomingTournaments: tournamentsResult.success ? tournamentsResult.tournaments.length : 0
        };
        
    } catch (error) {
        console.error('❌ Complete setup failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Quick Status Check
 */
async function checkSystemStatus() {
    console.log('🔍 Checking WalletWars tournament system status...');
    
    try {
        // Check database connection
        const dbConnected = await window.walletWarsAPI.testConnection();
        console.log(`📊 Database: ${dbConnected ? '✅ Connected' : '❌ Disconnected'}`);
        
        // Check Solscan API
        const solscanStatus = await window.solscanService.getAPIStatus();
        console.log(`🔗 Solscan API: ${solscanStatus.online ? '✅ Online' : '❌ Offline'}`);
        
        // Check rate limiter
        const rateLimitStatus = window.solscanService.rateLimiter.getStatus();
        console.log(`🚦 Rate Limiter: ${rateLimitStatus.available}/${rateLimitStatus.maxRequests} requests available`);
        
        // Check templates
        const templatesResult = await window.walletWarsAPI.getTournamentTemplates();
        console.log(`📋 Tournament Templates: ${templatesResult.success ? templatesResult.templates.length : 0} available`);
        
        // Check upcoming tournaments
        const tournamentsResult = await window.walletWarsAPI.getUpcomingTournaments();
        console.log(`🎮 Upcoming Tournaments: ${tournamentsResult.success ? tournamentsResult.tournaments.length : 0} scheduled`);
        
        return {
            database: dbConnected,
            solscan: solscanStatus.online,
            templates: templatesResult.success ? templatesResult.templates.length : 0,
            tournaments: tournamentsResult.success ? tournamentsResult.tournaments.length : 0,
            rateLimitAvailable: rateLimitStatus.available
        };
        
    } catch (error) {
        console.error('❌ Status check failed:', error);
        return { error: error.message };
    }
}

// Export functions to global scope for easy testing
window.tournamentSetup = {
    runCompleteSetup,
    setupInitialTournamentTemplates,
    testSolscanIntegration,
    createSampleTournament,
    testWalletSnapshot,
    testTournamentRegistration,
    checkSystemStatus
};

console.log('✅ Tournament setup script loaded!');
console.log('🎯 Run window.tournamentSetup.runCompleteSetup() to begin setup');
console.log('🔍 Run window.tournamentSetup.checkSystemStatus() to check current status');