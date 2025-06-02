// tournament-config.js
// Improved configuration to prevent excessive tournament creation

const TOURNAMENT_CONFIG = {
    // Deployment schedule - Only Monday and Thursday
    deploymentDays: ['monday', 'thursday'],
    deploymentTime: '14:00:00', // UTC (9 AM EST, 6 AM PST)
    
    // Tournament variants to create each deployment day
    // EXACTLY 6 variants = 6 tournaments per deployment day
    tournamentVariants: [
        // Pure Wallet Tournaments (3 tiers)
        {
            name: 'Pure Wallet Bronze League',
            tradingStyle: 'pure_wallet',
            maxParticipants: 100,
            minParticipants: 10,
            entryFee: 0.01,
            duration: 7, // days
            prizePoolPercentage: 85
        },
        {
            name: 'Pure Wallet Silver League',
            tradingStyle: 'pure_wallet',
            maxParticipants: 500,
            minParticipants: 25,
            entryFee: 0.05,
            duration: 7,
            prizePoolPercentage: 85
        },
        {
            name: 'Pure Wallet Gold League',
            tradingStyle: 'pure_wallet',
            maxParticipants: 1000,
            minParticipants: 50,
            entryFee: 0.1,
            duration: 7,
            prizePoolPercentage: 85
        },
        
        // Open Trading Tournaments (3 tiers)
        {
            name: 'Open Trading Bronze Battle',
            tradingStyle: 'open_trading',
            maxParticipants: 100,
            minParticipants: 10,
            entryFee: 0.01,
            duration: 7,
            prizePoolPercentage: 80
        },
        {
            name: 'Open Trading Silver Storm',
            tradingStyle: 'open_trading',
            maxParticipants: 500,
            minParticipants: 25,
            entryFee: 0.05,
            duration: 7,
            prizePoolPercentage: 80
        },
        {
            name: 'Open Trading Gold Rush',
            tradingStyle: 'open_trading',
            maxParticipants: 1000,
            minParticipants: 50,
            entryFee: 0.1,
            duration: 7,
            prizePoolPercentage: 80
        }
    ],
    
    // Timing configuration - IMPROVED TO PREVENT OVER-CREATION
    timing: {
        registrationCloseBeforeStart: 10, // minutes
        minimumCheckTime: 10, // minutes before start
        advanceDeploymentDays: 21, // Deploy 3 weeks ahead (reduced from 28)
        maxTournamentsPerDate: 6, // Exact number we want per deployment date
        deploymentCooldown: 3600000, // 1 hour between deployment checks (in ms)
        maxUpcomingTournaments: 36 // 6 tournaments × 6 upcoming dates = max 36
    },
    
    // Deployment limits and validation
    limits: {
        maxTournamentsPerWeek: 12, // 2 deployment days × 6 tournaments
        maxActiveDeployments: 8, // Max 8 deployment dates ahead
        tournamentLifetime: 7, // Tournament duration in days
        bufferDays: 3 // Days between deployments
    },
    
    // Prize distribution based on participants
    prizeDistribution: {
        // For tournaments with 10-99 participants
        tier1: {
            minParticipants: 10,
            distribution: [50, 30, 20] // Top 3 winners
        },
        // For tournaments with 100-499 participants
        tier2: {
            minParticipants: 100,
            distribution: [35, 25, 15, 10, 8, 7] // Top 6 winners
        },
        // For tournaments with 500+ participants
        tier3: {
            minParticipants: 500,
            distribution: [30, 20, 15, 10, 8, 7, 5, 3, 2] // Top 9 winners
        }
    },
    
    // Validation rules
    validation: {
        // Ensure no duplicate tournaments on same day
        preventDuplicates: true,
        // Check for existing tournaments before creating
        checkExistence: true,
        // Maximum retries for failed deployments
        maxRetries: 3,
        // Minimum time between deployment attempts
        retryDelay: 300000 // 5 minutes
    }
};

// Validation function to ensure config integrity
function validateTournamentConfig() {
    const config = TOURNAMENT_CONFIG;
    const issues = [];
    
    // Check that we have the right number of variants
    if (config.tournamentVariants.length !== 6) {
        issues.push(`Expected exactly 6 tournament variants, found ${config.tournamentVariants.length}`);
    }
    
    // Check deployment days
    if (config.deploymentDays.length !== 2) {
        issues.push(`Expected exactly 2 deployment days, found ${config.deploymentDays.length}`);
    }
    
    // Check for duplicate variant names
    const names = config.tournamentVariants.map(v => v.name);
    const uniqueNames = [...new Set(names)];
    if (names.length !== uniqueNames.length) {
        issues.push('Duplicate tournament variant names detected');
    }
    
    // Check entry fee coverage (should have 0.01, 0.05, 0.1 for each trading style)
    const feesByStyle = {};
    config.tournamentVariants.forEach(v => {
        if (!feesByStyle[v.tradingStyle]) feesByStyle[v.tradingStyle] = [];
        feesByStyle[v.tradingStyle].push(v.entryFee);
    });
    
    const expectedFees = [0.01, 0.05, 0.1];
    Object.keys(feesByStyle).forEach(style => {
        const fees = feesByStyle[style].sort();
        if (JSON.stringify(fees) !== JSON.stringify(expectedFees)) {
            issues.push(`Trading style ${style} doesn't have expected fees [0.01, 0.05, 0.1]`);
        }
    });
    
    if (issues.length > 0) {
        console.error('❌ Tournament configuration validation failed:');
        issues.forEach(issue => console.error(`  - ${issue}`));
        return false;
    }
    
    console.log('✅ Tournament configuration validation passed');
    return true;
}

// Calculate expected tournaments per week
function getExpectedTournamentCount() {
    const deploymentsPerWeek = TOURNAMENT_CONFIG.deploymentDays.length; // 2 (Mon, Thu)
    const tournamentsPerDeployment = TOURNAMENT_CONFIG.tournamentVariants.length; // 6
    const totalPerWeek = deploymentsPerWeek * tournamentsPerDeployment; // 12
    
    console.log(`📊 Expected tournaments per week: ${totalPerWeek}`);
    console.log(`📊 Deployments per week: ${deploymentsPerWeek}`);
    console.log(`📊 Tournaments per deployment: ${tournamentsPerDeployment}`);
    
    return {
        totalPerWeek,
        deploymentsPerWeek,
        tournamentsPerDeployment
    };
}

// Make it available globally
window.TOURNAMENT_CONFIG = TOURNAMENT_CONFIG;
window.validateTournamentConfig = validateTournamentConfig;
window.getExpectedTournamentCount = getExpectedTournamentCount;

// Auto-validate on load
document.addEventListener('DOMContentLoaded', function() {
    validateTournamentConfig();
    getExpectedTournamentCount();
});

console.log('✅ Tournament Configuration (Improved) loaded!');
