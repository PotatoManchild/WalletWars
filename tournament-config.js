// tournament-config.js
// Tiered Escalating Stakes + Mega Monthly System

const TOURNAMENT_CONFIG = {
    // Deployment schedule
    deploymentDays: ['monday', 'thursday'],
    deploymentTime: '14:00:00', // UTC
    
    // Weekly tournament tiers - escalating stakes system
    weeklyTiers: {
        bronze: {
            entryFee: 0.01,
            maxParticipants: 500,
            minParticipants: 25, // Must have 25 to start
            prizePoolPercentage: 85,
            targetPrizePool: 5, // SOL when full
            winnerShare: 50 // Winner gets 50% of prize pool
        },
        silver: {
            entryFee: 0.05,
            maxParticipants: 400,
            minParticipants: 20,
            prizePoolPercentage: 85,
            targetPrizePool: 20,
            winnerShare: 50
        },
        gold: {
            entryFee: 0.1,
            maxParticipants: 300,
            minParticipants: 15,
            prizePoolPercentage: 85,
            targetPrizePool: 30,
            winnerShare: 45 // Slightly more distributed for bigger tournaments
        },
        diamond: {
            entryFee: 0.25,
            maxParticipants: 200,
            minParticipants: 10,
            prizePoolPercentage: 90,
            targetPrizePool: 50,
            winnerShare: 40 // More distributed for elite tournaments
        }
    },
    
    // Weekly tier schedule - ensures all tiers get used
    weeklySchedule: {
        monday: ['bronze', 'gold'],    // Beginner-friendly + High-stakes
        thursday: ['silver', 'diamond'] // Mid-tier + Elite
    },
    
    // Tournament type variations within each tier
    tournamentTypes: {
        pure_wallet: {
            bronze: [
                {
                    name: 'Pure Wallet Rookie Rally',
                    theme: 'rookie',
                    description: 'Perfect for new traders to learn the ropes'
                },
                {
                    name: 'Pure Wallet Bronze Blitz',
                    theme: 'blitz',
                    description: 'Fast-paced bronze tier competition'
                },
                {
                    name: 'Pure Wallet Starter Storm',
                    theme: 'starter',
                    description: 'Entry-level pure wallet challenge'
                }
            ],
            silver: [
                {
                    name: 'Pure Wallet Silver Strike',
                    theme: 'strike',
                    description: 'Intermediate skill showcase'
                },
                {
                    name: 'Pure Wallet Market Mastery',
                    theme: 'mastery',
                    description: 'Prove your market knowledge'
                },
                {
                    name: 'Pure Wallet Rising Stars',
                    theme: 'rising',
                    description: 'For traders ready to level up'
                }
            ],
            gold: [
                {
                    name: 'Pure Wallet Gold Rush',
                    theme: 'rush',
                    description: 'High-stakes pure wallet warfare'
                },
                {
                    name: 'Pure Wallet Elite Challenge',
                    theme: 'elite',
                    description: 'Premium tier competition'
                },
                {
                    name: 'Pure Wallet Champions Cup',
                    theme: 'champions',
                    description: 'Where legends are made'
                }
            ],
            diamond: [
                {
                    name: 'Pure Wallet Diamond Dynasty',
                    theme: 'dynasty',
                    description: 'Ultimate pure wallet mastery'
                },
                {
                    name: 'Pure Wallet Titan Tournament',
                    theme: 'titan',
                    description: 'For trading titans only'
                },
                {
                    name: 'Pure Wallet Apex Arena',
                    theme: 'apex',
                    description: 'The pinnacle of pure trading'
                }
            ]
        },
        open_trading: {
            bronze: [
                {
                    name: 'Open Trading Bronze Battle',
                    theme: 'battle',
                    description: 'All strategies welcome'
                },
                {
                    name: 'Open Trading Chaos Cup',
                    theme: 'chaos',
                    description: 'Anything goes trading mayhem'
                },
                {
                    name: 'Open Trading Freedom Fight',
                    theme: 'freedom',
                    description: 'Trade however you want'
                }
            ],
            silver: [
                {
                    name: 'Open Trading Silver Storm',
                    theme: 'storm',
                    description: 'Mid-tier open market warfare'
                },
                {
                    name: 'Open Trading Strategy Showdown',
                    theme: 'strategy',
                    description: 'Best strategy wins'
                },
                {
                    name: 'Open Trading Power Play',
                    theme: 'power',
                    description: 'Unleash your trading power'
                }
            ],
            gold: [
                {
                    name: 'Open Trading Gold Gauntlet',
                    theme: 'gauntlet',
                    description: 'Survive the trading gauntlet'
                },
                {
                    name: 'Open Trading Mega Mayhem',
                    theme: 'mega',
                    description: 'Maximum trading chaos'
                },
                {
                    name: 'Open Trading Supreme Clash',
                    theme: 'supreme',
                    description: 'Supreme trading showdown'
                }
            ],
            diamond: [
                {
                    name: 'Open Trading Diamond Duel',
                    theme: 'duel',
                    description: 'Elite traders face off'
                },
                {
                    name: 'Open Trading Master Class',
                    theme: 'master',
                    description: 'Master-level competition'
                },
                {
                    name: 'Open Trading Infinite Wars',
                    theme: 'infinite',
                    description: 'No limits, no mercy'
                }
            ]
        }
    },
    
    // Monthly mega tournaments - special events
    monthlyMegaTournaments: {
        pure_wallet: [
            {
                name: 'Pure Wallet Monthly Championship',
                entryFee: 0.5,
                maxParticipants: 1000,
                minParticipants: 100,
                duration: 30, // 30 days
                prizePoolPercentage: 90,
                targetPrizePool: 500, // 500 SOL = ~$75k
                winnerShare: 25, // 25% to winner = ~$18k
                description: 'The ultimate monthly pure wallet challenge'
            },
            {
                name: 'Pure Wallet Legends League',
                entryFee: 1.0,
                maxParticipants: 500,
                minParticipants: 50,
                duration: 30,
                prizePoolPercentage: 95,
                targetPrizePool: 500,
                winnerShare: 30,
                description: 'For the legends of pure trading'
            }
        ],
        open_trading: [
            {
                name: 'Open Trading World Championship',
                entryFee: 0.5,
                maxParticipants: 1000,
                minParticipants: 100,
                duration: 30,
                prizePoolPercentage: 85, // Slightly lower due to complexity
                targetPrizePool: 500,
                winnerShare: 25,
                description: 'Global open trading supremacy'
            },
            {
                name: 'Open Trading Ultimate Arena',
                entryFee: 1.0,
                maxParticipants: 500,
                minParticipants: 50,
                duration: 30,
                prizePoolPercentage: 85,
                targetPrizePool: 500,
                winnerShare: 30,
                description: 'The ultimate trading arena'
            }
        ]
    },
    
    // Platform economics
    platformFees: {
        weekly: 15, // 15% platform fee for weekly tournaments
        monthly: 10, // 10% platform fee for monthly (volume discount)
        minimumFee: 0.001 // Minimum platform fee in SOL
    },
    
    // Timing configuration
    timing: {
        registrationCloseBeforeStart: 10, // minutes
        minimumCheckTime: 10,
        advanceDeploymentDays: 21,
        maxTournamentsPerDate: 2,
        deploymentCooldown: 3600000,
        
        // Monthly tournament timing
        monthlyDeploymentDay: 1, // 1st of each month
        monthlyRegistrationDays: 7, // Registration open for 7 days
        monthlyStartDay: 8 // Start on 8th of month
    },
    
    // Prize distribution templates
    prizeDistribution: {
        // For bronze/silver (smaller tournaments)
        small: {
            minParticipants: 10,
            distribution: [50, 30, 20] // Top 3
        },
        // For gold tournaments
        medium: {
            minParticipants: 50,
            distribution: [45, 25, 15, 10, 5] // Top 5
        },
        // For diamond tournaments
        large: {
            minParticipants: 100,
            distribution: [40, 25, 15, 10, 5, 3, 2] // Top 7
        },
        // For monthly mega tournaments
        mega: {
            minParticipants: 100,
            distribution: [25, 18, 12, 10, 8, 6, 5, 4, 3, 2, 2, 2, 1, 1, 1] // Top 15
        }
    },
    
    // User progression incentives
    progression: {
        // Tier unlock requirements (optional future feature)
        unlockRequirements: {
            bronze: { gamesPlayed: 0 }, // Always available
            silver: { gamesPlayed: 3 },
            gold: { gamesPlayed: 10, topFinishes: 1 },
            diamond: { gamesPlayed: 25, topFinishes: 3 }
        },
        
        // Achievement bonuses
        achievementBonuses: {
            firstWin: 0.01, // Bonus SOL for first tournament win
            consecutiveWins: 0.005, // Bonus per consecutive win
            tierProgression: 0.02 // Bonus for winning in each tier
        }
    }
};

// Tournament selection logic for tiered system
class TieredTournamentSelector {
    constructor() {
        this.recentSelections = [];
    }
    
    /**
     * Select tournaments for a deployment date based on tier schedule
     */
    selectTournamentsForDeployment(deploymentDate) {
        const dayName = deploymentDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
        const requiredTiers = TOURNAMENT_CONFIG.weeklySchedule[dayName];
        
        if (!requiredTiers) {
            console.error(`❌ No tier schedule found for ${dayName}`);
            return [];
        }
        
        const selected = [];
        const tradingStyles = ['pure_wallet', 'open_trading'];
        
        // Select one tournament per trading style, using the required tiers
        tradingStyles.forEach((style, index) => {
            const tier = requiredTiers[index];
            const tournament = this.selectTournamentFromTier(style, tier, deploymentDate);
            
            if (tournament) {
                selected.push({
                    ...tournament,
                    tradingStyle: style,
                    tier: tier,
                    duration: 7, // Weekly tournaments are 7 days
                    tierConfig: TOURNAMENT_CONFIG.weeklyTiers[tier]
                });
            }
        });
        
        console.log(`🎯 Selected tiered tournaments for ${dayName}:`, 
                   selected.map(t => `${t.name} (${t.tier})`));
        
        return selected;
    }
    
    /**
     * Select a random tournament from a specific tier and trading style
     */
    selectTournamentFromTier(tradingStyle, tier, deploymentDate) {
        const pool = TOURNAMENT_CONFIG.tournamentTypes[tradingStyle][tier];
        
        if (!pool || pool.length === 0) {
            console.error(`❌ No tournaments available for ${tradingStyle} ${tier}`);
            return null;
        }
        
        // Avoid recent repeats
        const recentKey = `${tradingStyle}-${tier}`;
        const recentNames = this.recentSelections
            .filter(r => r.key === recentKey)
            .slice(-2) // Avoid last 2 selections in this tier/style
            .map(r => r.name);
        
        let availableOptions = pool.filter(t => !recentNames.includes(t.name));
        
        // If all have been used recently, use all options
        if (availableOptions.length === 0) {
            availableOptions = [...pool];
        }
        
        // Select random tournament
        const randomIndex = Math.floor(Math.random() * availableOptions.length);
        const selected = availableOptions[randomIndex];
        
        // Track selection
        this.recentSelections.push({
            key: recentKey,
            name: selected.name,
            tier,
            tradingStyle,
            deploymentDate: deploymentDate.toISOString(),
            selectedAt: new Date().toISOString()
        });
        
        // Keep recent selections manageable
        if (this.recentSelections.length > 20) {
            this.recentSelections = this.recentSelections.slice(-20);
        }
        
        console.log(`🎲 Selected "${selected.name}" from ${tier} ${tradingStyle} (${availableOptions.length} options)`);
        return selected;
    }
    
    /**
     * Get monthly tournament for deployment
     */
    selectMonthlyTournament(month, year) {
        const tradingStyles = Object.keys(TOURNAMENT_CONFIG.monthlyMegaTournaments);
        const randomStyle = tradingStyles[Math.floor(Math.random() * tradingStyles.length)];
        const pool = TOURNAMENT_CONFIG.monthlyMegaTournaments[randomStyle];
        
        const selected = pool[Math.floor(Math.random() * pool.length)];
        
        return {
            ...selected,
            tradingStyle: randomStyle,
            type: 'monthly_mega',
            month,
            year
        };
    }
}

// Calculate expected revenue and costs
function calculateTournamentEconomics() {
    const weekly = TOURNAMENT_CONFIG.weeklyTiers;
    const platform = TOURNAMENT_CONFIG.platformFees;
    
    // Calculate weekly revenue potential (if all tournaments fill)
    let weeklyRevenue = 0;
    let weeklyPrizePools = 0;
    
    Object.values(weekly).forEach(tier => {
        const fullPool = tier.entryFee * tier.maxParticipants;
        const platformFee = fullPool * (platform.weekly / 100);
        const prizePool = fullPool - platformFee;
        
        weeklyRevenue += platformFee * 2; // Used twice per week
        weeklyPrizePools += prizePool * 2;
    });
    
    console.log(`💰 Weekly Economics (if all tournaments fill):`);
    console.log(`  Platform Revenue: ${weeklyRevenue.toFixed(2)} SOL (~$${(weeklyRevenue * 150).toLocaleString()})`);
    console.log(`  Total Prize Pools: ${weeklyPrizePools.toFixed(2)} SOL (~$${(weeklyPrizePools * 150).toLocaleString()})`);
    
    return { weeklyRevenue, weeklyPrizePools };
}

// Make available globally
window.TOURNAMENT_CONFIG = TOURNAMENT_CONFIG;
window.TieredTournamentSelector = TieredTournamentSelector;
window.calculateTournamentEconomics = calculateTournamentEconomics;

console.log('✅ Tiered Tournament Configuration loaded!');

// Auto-calculate economics on load
document.addEventListener('DOMContentLoaded', function() {
    calculateTournamentEconomics();
});
