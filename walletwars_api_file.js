// walletwars-api.js - Your Database Connection
console.log('🎮 WalletWars API Loading...');

// ========================================
// SUPABASE CONFIGURATION
// ========================================

// ✅ CONFIGURED WITH YOUR ACTUAL SUPABASE PROJECT
const SUPABASE_URL = 'https://miwtcvcdpoqtqjbbvnxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pd3RjdmNkcG9xdHFqYmJ2bnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3Mjk4MTAsImV4cCI6MjA2NDMwNTgxMH0.5FCUjucAu2PxGEVc3X01dwa4wt4tHLewsjBO7s55Zt8';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase client initialized');

// ========================================
// WALLETWARS API CLASS
// ========================================

class WalletWarsAPI {
    constructor() {
        this.supabase = supabase;
        console.log('🏆 WalletWars API Ready!');
    }

    // Create wallet hash for privacy (same as your existing function)
    createWalletHash(walletAddress) {
        let hash = 0;
        const saltedAddress = walletAddress + 'walletwars_salt_2024';
        for (let i = 0; i < saltedAddress.length; i++) {
            const char = saltedAddress.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    // Test connection to database
    async testConnection() {
        try {
            console.log('🔌 Testing database connection...');
            const { data, error } = await this.supabase
                .from('achievement_definitions')
                .select('count(*)')
                .limit(1);
            
            if (error) {
                console.error('❌ Database connection failed:', error);
                return false;
            }
            
            console.log('✅ Database connection successful!');
            return true;
        } catch (error) {
            console.error('❌ Connection test error:', error);
            return false;
        }
    }

    // Create new champion
    async createChampion(walletAddress, championName, avatarEmoji = '🔥') {
        try {
            console.log(`🎯 Creating champion: ${championName}`);
            
            const walletHash = this.createWalletHash(walletAddress);
            
            const { data, error } = await this.supabase
                .rpc('create_champion', {
                    p_wallet_hash: walletHash,
                    p_champion_name: championName,
                    p_avatar_emoji: avatarEmoji
                });

            if (error) {
                console.error('❌ Create champion error:', error);
                return { success: false, error: error.message };
            }

            const result = data?.[0];
            if (result?.success) {
                console.log('✅ Champion created successfully!', result);
                return { success: true, championId: result.champion_id };
            } else {
                console.error('❌ Champion creation failed:', result?.message);
                return { success: false, error: result?.message };
            }
        } catch (error) {
            console.error('❌ Create champion exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Get champion profile
    async getChampionProfile(walletAddress) {
        try {
            console.log('📋 Getting champion profile...');
            
            const walletHash = this.createWalletHash(walletAddress);
            
            const { data, error } = await this.supabase
                .rpc('get_champion_profile', {
                    p_wallet_hash: walletHash
                });

            if (error) {
                console.error('❌ Get profile error:', error);
                return { success: false, error: error.message };
            }

            const profile = data?.[0];
            if (profile) {
                console.log('✅ Champion profile loaded:', profile);
                return { success: true, champion: profile };
            } else {
                console.log('ℹ️ No champion found for this wallet');
                return { success: false, error: 'No champion found' };
            }
        } catch (error) {
            console.error('❌ Get profile exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if champion exists
    async championExists(walletAddress) {
        const result = await this.getChampionProfile(walletAddress);
        return {
            exists: result.success,
            champion: result.success ? result.champion : null
        };
    }

    // Get all achievement definitions
    async getAchievementDefinitions() {
        try {
            console.log('🏆 Loading achievement definitions...');
            
            const { data, error } = await this.supabase
                .from('achievement_definitions')
                .select('*')
                .eq('is_active', true)
                .order('points', { ascending: true });

            if (error) {
                console.error('❌ Get achievements error:', error);
                return { success: false, error: error.message };
            }

            console.log(`✅ Loaded ${data.length} achievements`);
            return { success: true, achievements: data };
        } catch (error) {
            console.error('❌ Get achievements exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Get leaderboard
    async getLeaderboard(limit = 100, offset = 0) {
        try {
            console.log('🏆 Loading leaderboard...');
            
            const { data, error } = await this.supabase
                .rpc('get_leaderboard', {
                    p_limit: limit,
                    p_offset: offset
                });

            if (error) {
                console.error('❌ Get leaderboard error:', error);
                return { success: false, error: error.message };
            }

            console.log(`✅ Loaded leaderboard with ${data.length} champions`);
            return { success: true, leaderboard: data };
        } catch (error) {
            console.error('❌ Get leaderboard exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Get champion's achievement progress
    async getChampionAchievements(walletAddress) {
        try {
            console.log('🏆 Loading champion achievements...');
            
            const walletHash = this.createWalletHash(walletAddress);
            const championProfile = await this.getChampionProfile(walletAddress);
            
            if (!championProfile.success) {
                return { success: false, error: 'Champion not found' };
            }

            // Get unlocked achievements
            const { data: unlockedData, error: unlockedError } = await this.supabase
                .from('champion_achievements')
                .select(`
                    achievement_id,
                    unlocked_at,
                    achievement_definitions (
                        id,
                        name,
                        description,
                        category,
                        rarity,
                        icon_emoji,
                        points,
                        rewards
                    )
                `)
                .eq('champion_id', championProfile.champion.champion_id);

            if (unlockedError) {
                console.error('❌ Get unlocked achievements error:', unlockedError);
            }

            // Get achievement progress
            const { data: progressData, error: progressError } = await this.supabase
                .from('achievement_progress')
                .select(`
                    achievement_id,
                    current_progress,
                    required_progress,
                    achievement_definitions (
                        id,
                        name,
                        description,
                        category,
                        rarity,
                        icon_emoji,
                        points,
                        rewards
                    )
                `)
                .eq('champion_id', championProfile.champion.champion_id);

            if (progressError) {
                console.error('❌ Get achievement progress error:', progressError);
            }

            const unlocked = unlockedData || [];
            const progress = progressData || [];

            console.log(`✅ Loaded ${unlocked.length} unlocked achievements and ${progress.length} in progress`);
            return { 
                success: true, 
                unlocked: unlocked,
                progress: progress,
                champion: championProfile.champion
            };
        } catch (error) {
            console.error('❌ Get champion achievements exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Update champion stats (for tournament results)
    async updateChampionStats(walletAddress, tournamentData) {
        try {
            console.log('📊 Updating champion stats...');
            
            const championProfile = await this.getChampionProfile(walletAddress);
            
            if (!championProfile.success) {
                return { success: false, error: 'Champion not found' };
            }

            const { data, error } = await this.supabase
                .rpc('update_champion_stats', {
                    p_champion_id: championProfile.champion.champion_id,
                    p_tournament_won: tournamentData.won || false,
                    p_sol_earned: tournamentData.solEarned || 0,
                    p_performance_percent: tournamentData.performance || 0,
                    p_tournament_type: tournamentData.type || 'weekly',
                    p_tournament_frequency: tournamentData.frequency || 'weekly'
                });

            if (error) {
                console.error('❌ Update stats error:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ Champion stats updated successfully');
            
            // Check for new achievements
            const achievementCheck = await this.checkAchievements(walletAddress);
            
            return { 
                success: true, 
                newAchievements: achievementCheck.success ? achievementCheck.newAchievements : []
            };
        } catch (error) {
            console.error('❌ Update champion stats exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Check and unlock achievements
    async checkAchievements(walletAddress) {
        try {
            console.log('🎯 Checking for new achievements...');
            
            const championProfile = await this.getChampionProfile(walletAddress);
            
            if (!championProfile.success) {
                return { success: false, error: 'Champion not found' };
            }

            const { data, error } = await this.supabase
                .rpc('check_and_unlock_achievements', {
                    p_champion_id: championProfile.champion.champion_id
                });

            if (error) {
                console.error('❌ Check achievements error:', error);
                return { success: false, error: error.message };
            }

            const newlyUnlocked = data?.filter(achievement => achievement.newly_unlocked) || [];
            
            if (newlyUnlocked.length > 0) {
                console.log(`🏆 ${newlyUnlocked.length} new achievements unlocked!`, newlyUnlocked);
            } else {
                console.log('ℹ️ No new achievements unlocked');
            }

            return { 
                success: true, 
                newAchievements: newlyUnlocked,
                allProgress: data || []
            };
        } catch (error) {
            console.error('❌ Check achievements exception:', error);
            return { success: false, error: error.message };
        }
    }
}

// ========================================
// GLOBAL API INSTANCE
// ========================================

// Create the API instance that your website will use
window.walletWarsAPI = new WalletWarsAPI();

// Test the connection when the script loads
window.walletWarsAPI.testConnection().then(connected => {
    if (connected) {
        console.log('🎮 WalletWars database ready for champions!');
    } else {
        console.error('🚨 Database connection failed - check your configuration!');
    }
});

console.log('🚀 WalletWars API script loaded successfully!');
