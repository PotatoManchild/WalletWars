// tournament-deployment-manager.js
// Fixed version - prevents excessive tournament creation

console.log('📅 Loading Tournament Deployment Manager (Fixed)...');

class TournamentDeploymentManager {
    constructor() {
        this.config = window.TOURNAMENT_CONFIG;
        this.deploymentSchedule = null;
        this.lastDeploymentCheck = null;
    }
    
    /**
     * Start automated tournament deployment
     */
    async startAutomatedDeployment() {
        console.log('🚀 Starting automated tournament deployment system...');
        
        // Run initial deployment
        await this.deployUpcomingTournaments();
        
        // Schedule daily checks at 00:00 UTC
        this.deploymentSchedule = setInterval(async () => {
            await this.deployUpcomingTournaments();
        }, 24 * 60 * 60 * 1000); // Daily
        
        console.log('✅ Tournament deployment system active');
    }
    
    /**
     * Deploy tournaments for the next 4 weeks - FIXED VERSION
     */
    async deployUpcomingTournaments() {
        console.log('📅 Checking tournament deployment needs...');
        
        // Prevent multiple simultaneous deployments
        if (this.lastDeploymentCheck && (Date.now() - this.lastDeploymentCheck) < 60000) {
            console.log('⏭️ Skipping deployment - recent check already performed');
            return;
        }
        this.lastDeploymentCheck = Date.now();
        
        const deploymentDates = this.getUpcomingDeploymentDates();
        let totalCreated = 0;
        
        for (const date of deploymentDates) {
            console.log(`📅 Checking date: ${date.toLocaleDateString()}`);
            
            // Check existing tournaments for this date first
            const existingCount = await this.getExistingTournamentsForDate(date);
            console.log(`📊 Found ${existingCount} existing tournaments for ${date.toLocaleDateString()}`);
            
            // Only create if we don't have enough tournaments for this date
            if (existingCount < this.config.tournamentVariants.length) {
                const created = await this.deployTournamentsForDate(date);
                totalCreated += created;
            } else {
                console.log(`✅ Date ${date.toLocaleDateString()} already has sufficient tournaments (${existingCount})`);
            }
        }
        
        console.log(`✅ Tournament deployment complete - Created ${totalCreated} new tournaments`);
    }
    
    /**
     * Get dates that need tournaments (next 4 weeks of Mondays and Thursdays)
     */
    getUpcomingDeploymentDates() {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start from beginning of today
        
        // Look ahead for the configured number of days
        for (let i = 0; i < this.config.timing.advanceDeploymentDays; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            
            const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
            
            if (this.config.deploymentDays.includes(dayName)) {
                // Set to deployment time (14:00 UTC)
                const [hours, minutes, seconds] = this.config.deploymentTime.split(':');
                checkDate.setUTCHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
                
                // Only include future dates
                if (checkDate > new Date()) {
                    dates.push(checkDate);
                }
            }
        }
        
        console.log(`📅 Found ${dates.length} deployment dates in next ${this.config.timing.advanceDeploymentDays} days`);
        return dates.slice(0, 8); // Limit to next 8 deployment dates max
    }
    
    /**
     * Count existing tournaments for a specific date
     */
    async getExistingTournamentsForDate(targetDate) {
        try {
            // Create date range for the target day (start and end of day)
            const startOfDay = new Date(targetDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            
            const endOfDay = new Date(targetDate);
            endOfDay.setUTCHours(23, 59, 59, 999);
            
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_instances')
                .select('id, tournament_name, start_time')
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString())
                .not('status', 'eq', 'cancelled');
            
            if (error) {
                console.error('❌ Error checking existing tournaments:', error);
                return 0;
            }
            
            return data ? data.length : 0;
        } catch (error) {
            console.error('❌ Error in getExistingTournamentsForDate:', error);
            return 0;
        }
    }
    
    /**
     * Deploy all tournament variants for a specific date
     */
    async deployTournamentsForDate(targetDate) {
        let createdCount = 0;
        
        for (const variant of this.config.tournamentVariants) {
            const exists = await this.tournamentExistsExact(targetDate, variant);
            
            if (!exists) {
                const created = await this.createTournament(targetDate, variant);
                if (created) {
                    createdCount++;
                    // Add small delay between creations to prevent race conditions
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } else {
                console.log(`✅ Tournament already exists: ${variant.name} for ${targetDate.toLocaleDateString()}`);
            }
        }
        
        return createdCount;
    }
    
    /**
     * Check if a specific tournament variant already exists for exact date/time - FIXED VERSION
     */
    async tournamentExistsExact(startDate, variant) {
        try {
            // Create a more precise time window (±1 hour around target start time)
            const startWindow = new Date(startDate.getTime() - 60 * 60 * 1000); // 1 hour before
            const endWindow = new Date(startDate.getTime() + 60 * 60 * 1000);   // 1 hour after
            
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_instances')
                .select('id, tournament_name, start_time')
                .eq('tournament_name', variant.name)
                .gte('start_time', startWindow.toISOString())
                .lte('start_time', endWindow.toISOString())
                .not('status', 'eq', 'cancelled')
                .limit(1);
            
            if (error) {
                console.error('❌ Error checking tournament existence:', error);
                return false;
            }
            
            const exists = data && data.length > 0;
            if (exists) {
                console.log(`🔍 Found existing: ${variant.name} at ${data[0].start_time}`);
            }
            
            return exists;
        } catch (error) {
            console.error('❌ Error in tournamentExistsExact:', error);
            return false; // If we can't check, allow creation (but log the error)
        }
    }
    
    /**
     * Create a new tournament instance - IMPROVED VERSION
     */
    async createTournament(startDate, variant) {
        console.log(`📋 Creating tournament: ${variant.name} for ${startDate.toLocaleDateString()}`);
        
        try {
            // Calculate times
            const registrationOpens = new Date(startDate);
            registrationOpens.setDate(registrationOpens.getDate() - 3); // Open 3 days before
            
            const registrationCloses = new Date(startDate);
            registrationCloses.setMinutes(registrationCloses.getMinutes() - this.config.timing.registrationCloseBeforeStart);
            
            const endTime = new Date(startDate);
            endTime.setDate(endTime.getDate() + variant.duration);
            
            // First, get or create a template
            const template = await this.getOrCreateTemplate(variant);
            if (!template) {
                console.error('❌ Failed to get/create template for', variant.name);
                return null;
            }
            
            // Create unique tournament name with date to prevent conflicts
            const uniqueName = `${variant.name} - ${startDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            })}`;
            
            const tournamentData = {
                template_id: template.id,
                tournament_name: uniqueName, // Use unique name
                status: 'scheduled',
                start_time: startDate.toISOString(),
                end_time: endTime.toISOString(),
                registration_opens: registrationOpens.toISOString(),
                registration_closes: registrationCloses.toISOString(),
                participant_count: 0,
                total_prize_pool: 0,
                min_participants: variant.minParticipants,
                registration_opens_at: registrationOpens.toISOString(),
                registration_closes_at: registrationCloses.toISOString(),
                deployment_metadata: {
                    deployedAt: new Date().toISOString(),
                    variant: variant.name,
                    deploymentBatch: `${startDate.toISOString().split('T')[0]}-${variant.tradingStyle}`,
                    baseVariantName: variant.name // Store original variant name
                }
            };
            
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_instances')
                .insert([tournamentData])
                .select()
                .single();
            
            if (error) {
                console.error(`❌ Failed to create tournament: ${error.message}`);
                return null;
            }
            
            console.log(`✅ Created tournament ${data.id}: ${uniqueName}`);
            
            // Schedule lifecycle events
            await this.scheduleLifecycleEvents(data);
            
            return data;
            
        } catch (error) {
            console.error(`❌ Error creating tournament ${variant.name}:`, error);
            return null;
        }
    }
    
    /**
     * Get or create tournament template
     */
    async getOrCreateTemplate(variant) {
        try {
            // Check if template exists
            const { data: existing } = await window.walletWarsAPI.supabase
                .from('tournament_templates')
                .select('*')
                .eq('name', variant.name)
                .single();
            
            if (existing) {
                return existing;
            }
            
            // Create new template
            const templateData = {
                name: variant.name,
                tournament_type: 'weekly',
                trading_style: variant.tradingStyle,
                start_day: 'variable',
                entry_fee: variant.entryFee,
                max_participants: variant.maxParticipants,
                prize_pool_percentage: variant.prizePoolPercentage,
                is_active: true
            };
            
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_templates')
                .insert([templateData])
                .select()
                .single();
            
            if (error) {
                console.error('❌ Failed to create template:', error);
                return null;
            }
            
            console.log(`✅ Created new template: ${variant.name}`);
            return data;
            
        } catch (error) {
            console.error('❌ Error in getOrCreateTemplate:', error);
            return null;
        }
    }
    
    /**
     * Schedule automated lifecycle transitions
     */
    async scheduleLifecycleEvents(tournament) {
        const now = new Date();
        
        // Schedule registration open
        const registrationOpensAt = new Date(tournament.registration_opens_at);
        if (registrationOpensAt > now) {
            const delay = registrationOpensAt - now;
            setTimeout(async () => {
                if (window.tournamentLifecycleManager) {
                    await window.tournamentLifecycleManager.openRegistration(tournament.id);
                }
            }, delay);
        }
        
        // Schedule registration close and minimum check
        const registrationClosesAt = new Date(tournament.registration_closes_at);
        if (registrationClosesAt > now) {
            const delay = registrationClosesAt - now;
            setTimeout(async () => {
                if (window.tournamentLifecycleManager) {
                    await window.tournamentLifecycleManager.closeRegistrationAndCheck(tournament.id);
                }
            }, delay);
        }
        
        // Schedule tournament start
        const startTime = new Date(tournament.start_time);
        if (startTime > now) {
            const delay = startTime - now;
            setTimeout(async () => {
                if (window.tournamentLifecycleManager) {
                    await window.tournamentLifecycleManager.startTournament(tournament.id);
                }
            }, delay);
        }
        
        // Schedule tournament end
        const endTime = new Date(tournament.end_time);
        if (endTime > now) {
            const delay = endTime - now;
            setTimeout(async () => {
                if (window.tournamentLifecycleManager) {
                    await window.tournamentLifecycleManager.endTournament(tournament.id);
                }
            }, delay);
        }
    }
    
    /**
     * Get deployment status and statistics
     */
    async getDeploymentStatus() {
        try {
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_instances')
                .select('id, tournament_name, start_time, status')
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true });
            
            if (error) {
                console.error('❌ Error getting deployment status:', error);
                return null;
            }
            
            const upcoming = data.filter(t => t.status === 'scheduled');
            const registering = data.filter(t => t.status === 'registering');
            
            return {
                total: data.length,
                upcoming: upcoming.length,
                registering: registering.length,
                tournaments: data
            };
        } catch (error) {
            console.error('❌ Error in getDeploymentStatus:', error);
            return null;
        }
    }
    
    /**
     * Clean up old tournaments (optional maintenance function)
     */
    async cleanupOldTournaments() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // Remove tournaments older than 30 days
        
        try {
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_instances')
                .delete()
                .lt('end_time', cutoffDate.toISOString())
                .eq('status', 'complete');
            
            if (error) {
                console.error('❌ Error cleaning up tournaments:', error);
            } else {
                console.log(`🧹 Cleaned up old tournaments`);
            }
        } catch (error) {
            console.error('❌ Error in cleanupOldTournaments:', error);
        }
    }
}

// Make it available globally
window.TournamentDeploymentManager = TournamentDeploymentManager;

console.log('✅ Tournament Deployment Manager (Fixed) loaded!');
