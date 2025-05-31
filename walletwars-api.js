// walletwars-api.js - Simple Working Version
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

    // Create wallet hash for privacy
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

    // 🔧 FIXED: Simple connection test that actually works
    async testConnection() {
        try {
            console.log('🔌 Testing database connection...');
            
            // Simple query - just get one achievement to test connection
            const { data, error } = await this.supabase
                .from('achievement_definitions')
                .select('id')
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

    // 🔧 SIMPLIFIED: Basic champion creation
    async createChampion(walletAddress, championName, avatarEmoji = '🔥') {
        try {
            console.log(`🎯 Creating champion: ${championName} for wallet: ${walletAddress.substring(0, 8)}...`);
            
            const walletHash = this.createWalletHash(walletAddress);
            
            // Check if champion already exists
            const existing = await this.getChampionByWalletHash(walletHash);
            if (existing.success) {
                console.log('ℹ️ Champion already exists');
                return { 
                    success: false, 
                    error: 'Champion already exists for this wallet',
                    championId: existing.champion.id 
                };
            }

            // Create new champion
            const { data, error } = await this.supabase
                .from('champions')
                .insert([{
                    wallet_hash: walletHash,
                    champion_name: championName,
                    avatar_emoji: avatarEmoji
                }])
                .select()
                .single();

            if (error) {
                console.error('❌ Create champion error:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ Champion created successfully!', data);
            
            // Initialize champion stats
            await this.initializeChampionStats(data.id);
            
            return { 
                success: true, 
                championId: data.id,
                champion: data
            };

        } catch (error) {
            console.error('❌ Create champion exception:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔧 HELPER: Initialize champion stats
    async initializeChampionStats(championId) {
        try {
            const { error } = await this.supabase
                .from('champion_stats')
                .insert([{
                    champion_id: championId,
                    tournaments_played: 0,
                    tournaments_won: 0,
                    total_sol_earned: 0,
                    current_win_streak: 0,
                    achievements_unlocked: 0,
                    total_achievement_points: 0
                }]);

            if (error) {
                console.warn('⚠️ Failed to initialize champion stats:', error);
            } else {
                console.log('✅ Champion stats initialized');
            }
        } catch (error) {
            console.warn('⚠️ Champion stats initialization error:', error);
        }
    }

    // 🔧 HELPER: Get champion by wallet hash
    async getChampionByWalletHash(walletHash) {
        try {
            const { data, error } = await this.supabase
                .from('champions')
                .select(`
                    *,
                    champion_stats (*)
                `)
                .eq('wallet_hash', walletHash)
                .eq('is_active', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows found - this is expected for new users
                    return { success: false, error: 'No champion found' };
                }
                console.error('❌ Get champion error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, champion: data };
        } catch (error) {
            console.error('❌ Get champion exception:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔧 SIMPLIFIED: Get champion profile
    async getChampionProfile(walletAddress) {
        try {
            console.log('📋 Getting champion profile...');
            
            const walletHash = this.createWalletHash(walletAddress);
            const result = await this.getChampionByWalletHash(walletHash);
            
            if (!result.success) {
                console.log('ℹ️ No champion found for this wallet');
                return { success: false, error: 'No champion found' };
            }

            // Calculate win rate
            const stats = result.champion.champion_stats;
            const winRate = stats && stats.tournaments_played > 0 
                ? Math.round((stats.tournaments_won / stats.tournaments_played) * 100)
                : 0;

            const champion = {
                champion_id: result.champion.id,
                champion_name: result.champion.champion_name,
                avatar_emoji: result.champion.avatar_emoji,
                created_at: result.champion.created_at,
                tournaments_played: stats?.tournaments_played || 0,
                tournaments_won: stats?.tournaments_won || 0,
                total_sol_earned: stats?.total_sol_earned || 0,
                current_win_streak: stats?.current_win_streak || 0,
                achievements_unlocked: stats?.achievements_unlocked || 0,
                total_achievement_points: stats?.total_achievement_points || 0,
                win_rate: winRate
            };

            console.log('✅ Champion profile loaded:', champion);
            return { success: true, champion: champion };

        } catch (error) {
            console.error('❌ Get profile exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if champion exists (simplified)
    async championExists(walletAddress) {
        const result = await this.getChampionProfile(walletAddress);
        return {
            exists: result.success,
            champion: result.success ? result.champion : null
        };
    }

    // 🔧 WORKING: Get all achievement definitions
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

    // 🔧 SIMPLIFIED: Get leaderboard
    async getLeaderboard(limit = 100, offset = 0) {
        try {
            console.log('🏆 Loading leaderboard...');
            
            // Simple query - get champions with their stats
            const { data, error } = await this.supabase
                .from('champions')
                .select(`
                    champion_name,
                    avatar_emoji,
                    champion_stats (
                        tournaments_played,
                        tournaments_won,
                        total_sol_earned,
                        current_win_streak,
                        achievements_unlocked
                    )
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('❌ Get leaderboard error:', error);
                return { success: false, error: error.message };
            }

            // Process and rank the data
            const leaderboard = data
                .filter(champion => champion.champion_stats) // Only champions with stats
                .map((champion, index) => {
                    const stats = champion.champion_stats;
                    const winRate = stats.tournaments_played > 0 
                        ? Math.round((stats.tournaments_won / stats.tournaments_played) * 100)
                        : 0;

                    return {
                        rank: index + 1,
                        champion_name: champion.champion_name,
                        avatar_emoji: champion.avatar_emoji,
                        tournaments_played: stats.tournaments_played,
                        tournaments_won: stats.tournaments_won,
                        total_sol_earned: Number(stats.total_sol_earned),
                        current_win_streak: stats.current_win_streak,
                        achievements_unlocked: stats.achievements_unlocked,
                        win_rate: winRate
                    };
                })
                .sort((a, b) => {
                    // Sort by tournaments won first, then by SOL earned
                    if (b.tournaments_won !== a.tournaments_won) {
                        return b.tournaments_won - a.tournaments_won;
                    }
                    return b.total_sol_earned - a.total_sol_earned;
                })
                .map((champion, index) => ({
                    ...champion,
                    rank: index + 1
                }));

            console.log(`✅ Loaded leaderboard with ${leaderboard.length} champions`);
            return { success: true, leaderboard: leaderboard };
        } catch (error) {
            console.error('❌ Get leaderboard exception:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔧 HELPER: Get champion's achievement progress
    async getChampionAchievements(walletAddress) {
        try {
            console.log('🏆 Loading champion achievements...');
            
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
