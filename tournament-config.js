// tournament-config.js
// Configuration for WalletWars tournament deployment system

const TOURNAMENT_CONFIG = {
    // Deployment schedule
    deploymentDays: ['monday', 'thursday'],
    deploymentTime: '14:00:00', // UTC (9 AM EST, 6 AM PST)
    
    // Tournament variants to create each deployment day
    tournamentVariants: [
        // Pure Wallet Tournaments
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
        
        // Open Trading Tournaments
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
    
    // Timing configuration
    timing: {
        registrationCloseBeforeStart: 10, // minutes
        minimumCheckTime: 10, // minutes before start
        advanceDeploymentDays: 28, // Deploy 4 weeks ahead
        tournamentsToMaintain: 8 // Always have 8 upcoming per variant
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
    }
};

// Make it available globally
window.TOURNAMENT_CONFIG = TOURNAMENT_CONFIG;