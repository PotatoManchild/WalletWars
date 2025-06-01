// tournament-automation.js
// Handles automated tournament lifecycle: registration → start → end → results
// Minimizes API calls by only taking snapshots at critical moments

console.log('🤖 Loading Tournament Automation System...');

class TournamentAutomation {
    constructor() {
        this.snapshotManager = null;
        this.api = null;
        this.checkInterval = 60000; // Check every minute
        this.activeChecks = new Map(); // Track active monitoring
        
        console.log('✅ Tournament Automation initialized');
    }

   /**
     * Initialize the automation system
     */
    async initialize() {
        // Wait for dependencies
        if (!window.tournamentSnapshotManager) {
            throw new Error('Tournament Snapshot Manager not available');
        }
        if (!window.walletWarsAPI) {
            throw new Error('WalletWars API not available');
        }
        
        this.snapshotManager = window.tournamentSnapshotManager;
        this.api = window.walletWarsAPI;
        
        // Initialize snapshot manager
        await this.snapshotManager.initialize();
        
        console.log('✅ Tournament Automation ready');
        
        // Don't automatically start monitoring - let the user control it
        console.log('💡 Call startMonitoring() to begin automatic tournament processing');
    }

    /**
     * Start monitoring tournaments for state changes
     */
    startMonitoring() {
        console.log('👁️ Starting tournament monitoring...');
        
        // Check tournaments immediately
        this.checkTournaments();
        
        // Then check periodically
        this.monitoringInterval = setInterval(() => {
            this.checkTournaments();
        }, this.checkInterval);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            console.log('🛑 Tournament monitoring stopped');
        }
    }

    /**
     * Check all tournaments and process state changes
     */
    async checkTournaments() {
        try {
            // Get all active tournaments
            const { data: tournaments, error } = await this.api.supabase
                .from('tournament_instances')
                .select(`
                    *,
                    tournament_templates (*)
                `)
                .in('status', ['upcoming', 'registering', 'active'])
                .order('start_time', { ascending: true });

            if (error) {
                console.error('❌ Failed to fetch tournaments:', error);
                return;
            }

            const now = new Date();
            
            for (const tournament of tournaments) {
                await this.processTournamentState(tournament, now);
            }
            
        } catch (error) {
            console.error('❌ Tournament check error:', error);
        }
    }

    /**
     * Process individual tournament state
     */
    async processTournamentState(tournament, currentTime) {
        const tournamentId = tournament.id;
        const startTime = new Date(tournament.start_time);
        const endTime = new Date(tournament.end_time);
        const registrationOpens = new Date(tournament.registration_opens);
        const registrationCloses = new Date(tournament.registration_closes);
        
        // State transitions based on time
        if (tournament.status === 'upcoming' && currentTime >= registrationOpens) {
            await this.transitionToRegistering(tournamentId);
        }
        else if (tournament.status === 'registering' && currentTime >= registrationCloses) {
            await this.closeRegistration(tournamentId);
        }
        else if (tournament.status === 'registering' && currentTime >= startTime) {
            await this.startTournament(tournamentId);
        }
        else if (tournament.status === 'active' && currentTime >= endTime) {
            await this.endTournament(tournamentId);
        }
    }

    /**
     * Transition tournament to registering state
     */
    async transitionToRegistering(tournamentId) {
        console.log(`📝 Opening registration for tournament ${tournamentId}`);
        
        try {
            const { error } = await this.api.supabase
                .from('tournament_instances')
                .update({ 
                    status: 'registering',
                    updated_at: new Date().toISOString()
                })
                .eq('id', tournamentId);

            if (error) throw error;
            
            console.log('✅ Registration opened');
            
        } catch (error) {
            console.error('❌ Failed to open registration:', error);
        }
    }

    /**
     * Close tournament registration
     */
    async closeRegistration(tournamentId) {
        console.log(`🚫 Closing registration for tournament ${tournamentId}`);
        
        try {
            // Check if we have minimum participants
            const { data: entries, error: countError } = await this.api.supabase
                .from('tournament_entries')
                .select('id')
                .eq('tournament_instance_id', tournamentId)
                .eq('status', 'registered');

            if (countError) throw countError;

            if (entries.length < 2) {
                console.log('⚠️ Not enough participants, cancelling tournament');
                await this.cancelTournament(tournamentId, 'Not enough participants');
                return;
            }

            // Close registration
            const { error } = await this.api.supabase
                .from('tournament_instances')
                .update({ 
                    status: 'registration_closed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', tournamentId);

            if (error) throw error;
            
            console.log(`✅ Registration closed with ${entries.length} participants`);
            
        } catch (error) {
            console.error('❌ Failed to close registration:', error);
        }
    }

    /**
     * Start tournament and take initial snapshots
     */
    async startTournament(tournamentId) {
        console.log(`🏁 Starting tournament ${tournamentId}`);
        
        // Prevent duplicate processing
        if (this.activeChecks.has(`start_${tournamentId}`)) {
            return;
        }
        
        this.activeChecks.set(`start_${tournamentId}`, true);
        
        try {
            // Update tournament status
            const { error: updateError } = await this.api.supabase
                .from('tournament_instances')
                .update({ 
                    status: 'active',
                    actual_start_time: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', tournamentId);

            if (updateError) throw updateError;

            // Take start snapshots for all participants
            console.log('📸 Taking start snapshots for all participants...');
            const snapshotResults = await this.snapshotManager.processTournamentStart(tournamentId);
            
            console.log(`✅ Tournament started! Snapshots: ${snapshotResults.successful} successful, ${snapshotResults.failed} failed`);
            
            // Notify participants (future feature)
            // await this.notifyParticipants(tournamentId, 'tournament_started');
            
        } catch (error) {
            console.error('❌ Failed to start tournament:', error);
            
            // Revert status on error
            await this.api.supabase
                .from('tournament_instances')
                .update({ status: 'registering' })
                .eq('id', tournamentId);
                
        } finally {
            this.activeChecks.delete(`start_${tournamentId}`);
        }
    }

    /**
     * End tournament and calculate results
     */
    async endTournament(tournamentId) {
        console.log(`🏁 Ending tournament ${tournamentId}`);
        
        // Prevent duplicate processing
        if (this.activeChecks.has(`end_${tournamentId}`)) {
            return;
        }
        
        this.activeChecks.set(`end_${tournamentId}`, true);
        
        try {
            // Update tournament status
            const { error: updateError } = await this.api.supabase
                .from('tournament_instances')
                .update({ 
                    status: 'ended',
                    actual_end_time: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', tournamentId);

            if (updateError) throw updateError;

            // Process end snapshots and calculate results
            console.log('📸 Taking end snapshots and calculating results...');
            const results = await this.snapshotManager.processTournamentEnd(tournamentId);
            
            if (results.success) {
                // Distribute prizes
                await this.distributePrizes(tournamentId, results.rankings);
                
                // Mark tournament as complete
                await this.api.supabase
                    .from('tournament_instances')
                    .update({ 
                        status: 'complete',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', tournamentId);
                
                console.log(`✅ Tournament completed! ${results.rankings.length} valid participants`);
                
                // Generate and store report
                const report = await this.snapshotManager.generateTournamentReport(tournamentId);
                await this.storeTournamentReport(tournamentId, report);
            }
            
        } catch (error) {
            console.error('❌ Failed to end tournament:', error);
            
            // Mark as needs_review instead of reverting
            await this.api.supabase
                .from('tournament_instances')
                .update({ status: 'needs_review' })
                .eq('id', tournamentId);
                
        } finally {
            this.activeChecks.delete(`end_${tournamentId}`);
        }
    }

    /**
     * Cancel tournament
     */
    async cancelTournament(tournamentId, reason) {
        console.log(`❌ Cancelling tournament ${tournamentId}: ${reason}`);
        
        try {
            // Update tournament status
            await this.api.supabase
                .from('tournament_instances')
                .update({ 
                    status: 'cancelled',
                    cancellation_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tournamentId);

            // Refund entry fees (future feature)
            // await this.refundEntryFees(tournamentId);
            
            console.log('✅ Tournament cancelled');
            
        } catch (error) {
            console.error('❌ Failed to cancel tournament:', error);
        }
    }

    /**
     * Distribute prizes to winners
     */
    async distributePrizes(tournamentId, rankings) {
        console.log(`💰 Distributing prizes for tournament ${tournamentId}`);
        
        try {
            // Get tournament details for prize pool
            const { data: tournament, error } = await this.api.supabase
                .from('tournament_instances')
                .select('*, tournament_templates(*)')
                .eq('id', tournamentId)
                .single();

            if (error) throw error;

            const totalPrizePool = parseFloat(tournament.total_prize_pool || 0);
            const prizeDistribution = this.calculatePrizeDistribution(totalPrizePool, rankings.length);
            
            // Record prize distributions
            const distributions = [];
            
            for (let i = 0; i < Math.min(rankings.length, prizeDistribution.length); i++) {
                const ranking = rankings[i];
                const prize = prizeDistribution[i];
                
                if (prize > 0) {
                    distributions.push({
                        tournament_instance_id: tournamentId,
                        champion_id: ranking.championId,
                        rank: ranking.rank,
                        prize_amount: prize,
                        performance_percentage: ranking.performance,
                        distributed_at: new Date().toISOString()
                    });
                    
                    // Update champion stats
                    await this.updateChampionStats(ranking.championId, {
                        tournamentsWon: ranking.rank === 1 ? 1 : 0,
                        solEarned: prize
                    });
                }
            }
            
            // Store prize distributions
            if (distributions.length > 0) {
                const { error: distError } = await this.api.supabase
                    .from('prize_distributions')
                    .insert(distributions);
                    
                if (distError) {
                    console.error('❌ Failed to record prize distributions:', distError);
                }
            }
            
            console.log(`✅ Distributed ${totalPrizePool} SOL to ${distributions.length} winners`);
            
        } catch (error) {
            console.error('❌ Failed to distribute prizes:', error);
        }
    }

    /**
     * Calculate prize distribution based on total pool and number of winners
     */
    calculatePrizeDistribution(totalPool, participants) {
        // Standard distribution percentages
        const distributions = {
            2: [70, 30],
            3: [50, 30, 20],
            5: [40, 25, 15, 12, 8],
            10: [30, 20, 15, 10, 8, 5, 4, 3, 3, 2],
            20: [25, 15, 10, 8, 6, 5, 4, 3, 3, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1]
        };
        
        // Find appropriate distribution
        let distribution = [100]; // Winner takes all by default
        
        for (const [minParticipants, dist] of Object.entries(distributions)) {
            if (participants >= parseInt(minParticipants)) {
                distribution = dist;
            }
        }
        
        // Calculate actual prize amounts
        return distribution.map(percentage => (totalPool * percentage) / 100);
    }

    /**
     * Update champion statistics
     */
    async updateChampionStats(championId, updates) {
        try {
            // Get current stats
            const { data: stats, error: fetchError } = await this.api.supabase
                .from('champion_stats')
                .select('*')
                .eq('champion_id', championId)
                .single();

            if (fetchError) {
                console.error('Failed to fetch champion stats:', fetchError);
                return;
            }

            // Update stats
            const { error: updateError } = await this.api.supabase
                .from('champion_stats')
                .update({
                    tournaments_played: stats.tournaments_played + 1,
                    tournaments_won: stats.tournaments_won + (updates.tournamentsWon || 0),
                    total_sol_earned: stats.total_sol_earned + (updates.solEarned || 0),
                    updated_at: new Date().toISOString()
                })
                .eq('champion_id', championId);

            if (updateError) {
                console.error('Failed to update champion stats:', updateError);
            }
            
        } catch (error) {
            console.error('Error updating champion stats:', error);
        }
    }

    /**
     * Store tournament report
     */
    async storeTournamentReport(tournamentId, report) {
        try {
            const { error } = await this.api.supabase
                .from('tournament_reports')
                .insert({
                    tournament_instance_id: tournamentId,
                    report_data: report,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('Failed to store tournament report:', error);
            }
            
        } catch (error) {
            console.error('Error storing tournament report:', error);
        }
    }

    /**
     * Manual tournament actions for testing
     */
    async manualStartTournament(tournamentId) {
        console.log(`🎮 Manually starting tournament ${tournamentId}`);
        await this.startTournament(tournamentId);
    }

    async manualEndTournament(tournamentId) {
        console.log(`🎮 Manually ending tournament ${tournamentId}`);
        await this.endTournament(tournamentId);
    }

    /**
     * Get automation status
     */
    getStatus() {
        return {
            monitoring: !!this.monitoringInterval,
            checkInterval: this.checkInterval,
            activeChecks: Array.from(this.activeChecks.keys()),
            initialized: !!(this.snapshotManager && this.api)
        };
    }
}

// Create global instance
window.tournamentAutomation = new TournamentAutomation();

// Export for use
window.TournamentAutomation = TournamentAutomation;

console.log('✅ Tournament Automation loaded!');
console.log('🤖 Tournaments will be automatically processed at start/end times');
