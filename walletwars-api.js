// walletwars-api.js - COMPLETE FIXED VERSION WITH NAME CHECKING
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

    // Test connection to database
    async testConnection() {
        try {
            console.log('🔌 Testing database connection...');
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

    // NEW METHOD: Check if champion name already exists
    async checkChampionNameExists(championName) {
        try {
            console.log(`🔍 Checking if champion name "${championName}" exists...`);
            
            const { data, error } = await this.supabase
                .from('champions')
                .select('id, champion_name')
                .eq('champion_name', championName)
                .eq('is_active', true)
                .maybeSingle();

            if (error) {
                console.error('❌ Name check error:', error);
                return { success: false, error: error.message };
            }

            const exists = data !== null;
            
            console.log(`${exists ? '❌' : '✅'} Champion name "${championName}" ${exists ? 'already exists' : 'is available'}`);
            
            return { 
                success: true, 
                exists: exists,
                championName: championName
            };

        } catch (error) {
            console.error('❌ Name check exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Create new champion - ENHANCED VERSION WITH NAME CHECKING
    async createChampion(walletAddress, championName, avatarEmoji = '🔥') {
        try {
            console.log(`🎯 Creating champion: ${championName}`);
            
            const walletHash = this.createWalletHash(walletAddress);
            
            // ADDITIONAL CHECK: Verify name is still available before creation
            const nameCheck = await this.checkChampionNameExists(championName);
            if (nameCheck.success && nameCheck.exists) {
                console.error('❌ Champion name already taken during creation');
                return { 
                    success: false, 
                    error: `Champion name "${championName}" is already taken. Please choose a different name.`
                };
            }
            
            // First check if champion already exists using direct query
            const { data: existingChampion, error: checkError } = await this.supabase
                .from('champions')
                .select('id, champion_name, avatar_emoji')
                .eq('wallet_hash', walletHash)
                .single();

            if (existingChampion && !checkError) {
                console.log('ℹ️ Champion already exists for this wallet');
                return { 
                    success: false, 
                    error: 'Champion already exists for this wallet',
                    championId: existingChampion.id,
                    existingChampion: existingChampion
                };
            }

            // Create new champion using direct insert
            const { data: newChampion, error: insertError } = await this.supabase
                .from('champions')
                .insert([{
                    wallet_hash: walletHash,
                    champion_name: championName,
                    avatar_emoji: avatarEmoji
                }])
                .select()
                .single();

            if (insertError) {
                console.error('❌ Create champion error:', insertError);
                
                // Check if the error is due to duplicate name
                if (insertError.message && (insertError.message.includes('duplicate') || 
                                           insertError.message.includes('unique') || 
                                           insertError.message.includes('champion_name'))) {
                    return { 
                        success: false, 
                        error: `Champion name "${championName}" is already taken. Please choose a different name.`
                    };
                }
                
                return { success: false, error: insertError.message };
            }

            console.log('✅ Champion created successfully!', newChampion);

            // Initialize champion stats
            const { error: statsError } = await this.supabase
                .from('champion_stats')
                .insert([{
                    champion_id: newChampion.id,
                    tournaments_played: 0,
                    tournaments_won: 0,
                    total_sol_earned: 0,
                    current_win_streak: 0,
                    achievements_unlocked: 0,
                    total_achievement_points: 0
                }]);

            if (statsError) {
                console.warn('⚠️ Failed to initialize champion stats:', statsError);
                // Don't fail the whole creation for this
            } else {
                console.log('✅ Champion stats initialized');
            }

            return { 
                success: true, 
                championId: newChampion.id,
                champion: newChampion
            };

        } catch (error) {
            console.error('❌ Create champion exception:', error);
            
            // Check if the error is related to duplicate names
            if (error.message && (error.message.includes('duplicate') || 
                                 error.message.includes('unique') || 
                                 error.message.includes('champion_name'))) {
                return { 
                    success: false, 
                    error: `Champion name "${championName}" is already taken. Please choose a different name.`
                };
            }
            
            return { success: false, error: error.message };
        }
    }

    // Get champion profile - FIXED VERSION (no more 406 errors)
    async getChampionProfile(walletAddress) {
        try {
            console.log('📋 Getting champion profile...');
            
            const walletHash = this.createWalletHash(walletAddress);
            
            // Simple direct query without complex joins that cause 406 errors
            const { data: champion, error: championError } = await this.supabase
                .from('champions')
                .select('*')
                .eq('wallet_hash', walletHash)
                .eq('is_active', true)
                .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no data

            if (championError) {
                console.error('❌ Get champion error:', championError);
                return { success: false, error: championError.message };
            }

            if (!champion) {
                console.log('ℹ️ No champion found for this wallet');
                return { success: false, error: 'No champion found' };
            }

            // Get stats separately to avoid complex joins
            const { data: stats, error: statsError } = await this.supabase
                .from('champion_stats')
                .select('*')
                .eq('champion_id', champion.id)
                .maybeSingle();

            if (statsError) {
                console.warn('⚠️ Could not load champion stats:', statsError);
                // Continue without stats rather than failing
            }

            // Calculate win rate
            const winRate = stats && stats.tournaments_played > 0 
                ? Math.round((stats.tournaments_won / stats.tournaments_played) * 100)
                : 0;

            const profileData = {
                champion_id: champion.id,
                champion_name: champion.champion_name,
                avatar_emoji: champion.avatar_emoji,
                created_at: champion.created_at,
                tournaments_played: stats?.tournaments_played || 0,
                tournaments_won: stats?.tournaments_won || 0,
                total_sol_earned: stats?.total_sol_earned || 0,
                current_win_streak: stats?.current_win_streak || 0,
                achievements_unlocked: stats?.achievements_unlocked || 0,
                total_achievement_points: stats?.total_achievement_points || 0,
                win_rate: winRate
            };

            console.log('✅ Champion profile loaded:', profileData);
            return { success: true, champion: profileData };

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

    // Get leaderboard - SIMPLIFIED VERSION
    async getLeaderboard(limit = 100, offset = 0) {
        try {
            console.log('🏆 Loading leaderboard...');
            
            // Simple direct query instead of RPC function
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

    // Get champion's achievement progress
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
