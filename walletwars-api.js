// walletwars-api.js - ENHANCED VERSION WITH TOURNAMENT TRACKING
console.log('🎮 WalletWars API Loading with Tournament Support...');

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
// WALLETWARS API CLASS WITH TOURNAMENTS
// ========================================

class WalletWarsAPI {
    constructor() {
        this.supabase = supabase;
        console.log('🏆 WalletWars API Ready with Tournament Support!');
    }

    // ========================================
    // EXISTING METHODS (unchanged)
    // ========================================

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

    // Check if champion name already exists
    async checkChampionNameExists(championName) {
        try {
            console.log(`🔍 Checking if champion name "${championName}" exists...`);
            
            const { data, error } = await this.supabase
                .from('champions')
                .select('champion_name')
                .eq('is_active', true);

            if (error) {
                console.error('❌ Name check error:', error);
                return { success: false, error: error.message };
            }

            if (!data) {
                return { success: true, exists: false, championName: championName };
            }

            const matches = data.filter(champion => 
                champion.champion_name && 
                champion.champion_name.toLowerCase() === championName.toLowerCase()
            );

            const exists = matches.length > 0;
            
            console.log(`${exists ? '❌' : '✅'} Champion name "${championName}" ${exists ? 'already exists' : 'is available'}`);
            
            return { success: true, exists: exists, championName: championName };

        } catch (error) {
            console.error('❌ Name check exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Create new champion
    async createChampion(walletAddress, championName, avatarEmoji = '🔥') {
        try {
            console.log(`🎯 Creating champion: ${championName}`);
            
            const walletHash = this.createWalletHash(walletAddress);
            
            // Check if name is still available
            const nameCheck = await this.checkChampionNameExists(championName);
            if (nameCheck.success && nameCheck.exists) {
                return { 
                    success: false, 
                    error: `Champion name "${championName}" is already taken.`
                };
            }
            
            // Check if champion already exists for this wallet
            const { data: existingChampion, error: checkError } = await this.supabase
                .from('champions')
                .select('id, champion_name, avatar_emoji')
                .eq('wallet_hash', walletHash)
                .single();

            if (existingChampion && !checkError) {
                return { 
                    success: false, 
                    error: 'Champion already exists for this wallet',
                    championId: existingChampion.id,
                    existingChampion: existingChampion
                };
            }

            // Create new champion
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
            }

            return { 
                success: true, 
                championId: newChampion.id,
                champion: newChampion
            };

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
            
            const { data: champion, error: championError } = await this.supabase
                .from('champions')
                .select('*')
                .eq('wallet_hash', walletHash)
                .eq('is_active', true)
                .maybeSingle();

            if (championError) {
                console.error('❌ Get champion error:', championError);
                return { success: false, error: championError.message };
            }

            if (!champion) {
                return { success: false, error: 'No champion found' };
            }

            // Get stats separately
            const { data: stats, error: statsError } = await this.supabase
                .from('champion_stats')
                .select('*')
                .eq('champion_id', champion.id)
                .maybeSingle();

            if (statsError) {
                console.warn('⚠️ Could not load champion stats:', statsError);
            }

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

    // Get leaderboard
    async getLeaderboard(limit = 100, offset = 0) {
        try {
            console.log('🏆 Loading leaderboard...');
            
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

            const leaderboard = data
                .filter(champion => champion.champion_stats)
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

    // ========================================
    // NEW TOURNAMENT METHODS
    // ========================================

    // Create tournament template
    async createTournamentTemplate(templateData) {
        try {
            console.log('🏆 Creating tournament template:', templateData.name);
            
            const { data, error } = await this.supabase
                .from('tournament_templates')
                .insert([templateData])
                .select()
                .single();

            if (error) {
                console.error('❌ Create template error:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ Tournament template created successfully');
            return { success: true, template: data };
            
        } catch (error) {
            console.error('❌ Create template exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all active tournament templates
    async getTournamentTemplates() {
        try {
            const { data, error } = await this.supabase
                .from('tournament_templates')
                .select('*')
                .eq('is_active', true)
                .order('tournament_type', { ascending: true })
                .order('start_day', { ascending: true });

            if (error) {
                console.error('❌ Get templates error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, templates: data };
        } catch (error) {
            console.error('❌ Get templates exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Create tournament instance from template
    async createTournamentInstance(instanceData) {
        try {
            console.log('🎮 Creating tournament instance');
            
            const { data, error } = await this.supabase
                .from('tournament_instances')
                .insert([instanceData])
                .select()
                .single();

            if (error) {
                console.error('❌ Create instance error:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ Tournament instance created successfully');
            return { success: true, instance: data };
            
        } catch (error) {
            console.error('❌ Create instance exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Get upcoming tournaments for display
    async getUpcomingTournaments(limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('tournament_instances')
                .select(`
                    *,
                    tournament_templates (
                        name,
                        tournament_type,
                        trading_style,
                        start_day,
                        entry_fee,
                        max_participants
                    )
                `)
                .in('status', ['upcoming', 'registering'])
                .order('start_time', { ascending: true })
                .limit(limit);

            if (error) {
                console.error('❌ Get upcoming tournaments error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, tournaments: data };
        } catch (error) {
            console.error('❌ Get upcoming tournaments exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Register champion for tournament
    async registerForTournament(championId, tournamentInstanceId, tradingStyle) {
        try {
            console.log(`🎯 Registering champion ${championId} for tournament ${tournamentInstanceId}`);
            
            // Get tournament details
            const tournamentResult = await this.supabase
                .from('tournament_instances')
                .select(`
                    *,
                    tournament_templates (*)
                `)
                .eq('id', tournamentInstanceId)
                .single();

            if (tournamentResult.error) {
                return { success: false, error: 'Tournament not found' };
            }

            const tournament = tournamentResult.data;
            
            // Validate registration is open
            if (tournament.status !== 'registering') {
                return { success: false, error: 'Registration is not open for this tournament' };
            }

            // Check if champion is already registered
            const existingEntry = await this.supabase
                .from('tournament_entries')
                .select('id')
                .eq('tournament_instance_id', tournamentInstanceId)
                .eq('champion_id', championId)
                .single();

            if (existingEntry.data) {
                return { success: false, error: 'Already registered for this tournament' };
            }

            // Get champion details
            const championResult = await this.supabase
                .from('champions')
                .select('wallet_hash')
                .eq('id', championId)
                .single();

            if (championResult.error) {
                return { success: false, error: 'Champion not found' };
            }

            // Create tournament entry
            const entryData = {
                tournament_instance_id: tournamentInstanceId,
                champion_id: championId,
                wallet_address: championResult.data.wallet_hash,
                entry_fee_paid: tournament.tournament_templates.entry_fee,
                trading_style_declared: tradingStyle,
                status: 'registered'
            };

            const { data, error } = await this.supabase
                .from('tournament_entries')
                .insert([entryData])
                .select()
                .single();

            if (error) {
                console.error('❌ Registration error:', error);
                return { success: false, error: error.message };
            }

            // Update tournament participant count
            await this.supabase
                .from('tournament_instances')
                .update({ 
                    participant_count: tournament.participant_count + 1,
                    total_prize_pool: (tournament.participant_count + 1) * tournament.tournament_templates.entry_fee * (tournament.tournament_templates.prize_pool_percentage / 100)
                })
                .eq('id', tournamentInstanceId);

            console.log('✅ Tournament registration successful');
            return { success: true, entry: data };
            
        } catch (error) {
            console.error('❌ Registration exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Take wallet snapshot for tournament tracking
    async takeWalletSnapshot(walletAddress, tournamentEntryId, snapshotType) {
        try {
            console.log(`📸 Taking ${snapshotType} snapshot for wallet: ${walletAddress.substring(0, 8)}...`);
            
            // Ensure Solscan service is available
            if (!window.solscanService) {
                throw new Error('Solscan service not available');
            }

            // Get wallet data from Solscan
            const walletSnapshot = await window.solscanService.getFullWalletSnapshot(walletAddress);
            
            // Store in database
            const { data, error } = await this.supabase
                .from('wallet_snapshots')
                .insert([{
                    wallet_address: walletAddress,
                    tournament_entry_id: tournamentEntryId,
                    snapshot_type: snapshotType,
                    sol_balance: walletSnapshot.solBalance,
                    token_balances: walletSnapshot.tokenBalances,
                    total_value_sol: walletSnapshot.totalValueSol,
                    api_response: walletSnapshot.raw
                }])
                .select()
                .single();

            if (error) {
                console.error('❌ Failed to save snapshot:', error);
                return { success: false, error: error.message };
            }

            console.log(`✅ ${snapshotType} snapshot saved successfully`);
            return { success: true, snapshot: data };
            
        } catch (error) {
            console.error('❌ Snapshot error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get tournament entries that need snapshots
    async getTournamentEntries(tournamentInstanceId) {
        try {
            const { data, error } = await this.supabase
                .from('tournament_entries')
                .select(`
                    *,
                    champions (
                        wallet_hash,
                        champion_name
                    )
                `)
                .eq('tournament_instance_id', tournamentInstanceId)
                .eq('status', 'registered');

            if (error) {
                console.error('❌ Get tournament entries error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, entries: data };
        } catch (error) {
            console.error('❌ Get tournament entries exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Update tournament entry with snapshot reference
    async updateTournamentEntrySnapshot(entryId, snapshotType, snapshotId) {
        try {
            const updateField = `${snapshotType}_snapshot_id`;
            
            const { data, error } = await this.supabase
                .from('tournament_entries')
                .update({ [updateField]: snapshotId })
                .eq('id', entryId)
                .select()
                .single();

            if (error) {
                console.error('❌ Update entry snapshot error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, entry: data };
        } catch (error) {
            console.error('❌ Update entry snapshot exception:', error);
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
        console.log('🎮 WalletWars database ready for tournaments!');
    } else {
        console.error('🚨 Database connection failed - check your configuration!');
    }
});

console.log('🚀 WalletWars API with Tournament Support loaded successfully!');
