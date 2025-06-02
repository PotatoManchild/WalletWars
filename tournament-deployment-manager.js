// tournament-deployment-manager.js
// Manages automated tournament creation and scheduling

console.log('📅 Loading Tournament Deployment Manager...');

class TournamentDeploymentManager {
    constructor() {
        this.config = window.TOURNAMENT_CONFIG;
        this.deploymentSchedule = null;
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
     * Deploy tournaments for the next 4 weeks
     */
    async deployUpcomingTournaments() {
        console.log('📅 Checking tournament deployment needs...');
        
        const deploymentDates = this.getUpcomingDeploymentDates();
        
        for (const date of deploymentDates) {
            for (const variant of this.config.tournamentVariants) {
                await this.deployTournamentIfNeeded(date, variant);
            }
        }
        
        console.log('✅ Tournament deployment check complete');
    }
    
    /**
     * Get dates that need tournaments (next 4 weeks of Mondays and Thursdays)
     */
    getUpcomingDeploymentDates() {
        const dates = [];
        const today = new Date();
        
        for (let i = 0; i < this.config.timing.advanceDeploymentDays; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            
            const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
            
            if (this.config.deploymentDays.includes(dayName)) {
                // Set to deployment time
                const [hours, minutes, seconds] = this.config.deploymentTime.split(':');
                checkDate.setUTCHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
                dates.push(checkDate);
            }
        }
        
        return dates;
    }
    
    /**
     * Deploy a tournament if it doesn't already exist
     */
    async deployTournamentIfNeeded(startDate, variant) {
        // Check if tournament already exists
        const exists = await this.tournamentExists(startDate, variant);
        
        if (!exists) {
            await this.createTournament(startDate, variant);
        }
    }
    
    /**
     * Check if a tournament already exists for this date/variant
     */
    async tournamentExists(startDate, variant) {
        try {
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_instances')
                .select('id')
                .eq('tournament_name', variant.name)
                .eq('start_time', startDate.toISOString())
                .single();
            
            return !!data;
        } catch {
            return false;
        }
    }
    
    /**
     * Create a new tournament instance
     */
    async createTournament(startDate, variant) {
        console.log(`📋 Creating tournament: ${variant.name} for ${startDate.toLocaleDateString()}`);
        
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
            console.error('❌ Failed to get/create template');
            return null;
        }
        
        const tournamentData = {
            template_id: template.id,
            tournament_name: variant.name,
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
                deploymentBatch: `${startDate.toISOString().split('T')[0]}-${variant.tradingStyle}`
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
        
        console.log(`✅ Created tournament ${data.id}: ${variant.name}`);
        
        // Schedule lifecycle events
        await this.scheduleLifecycleEvents(data);
        
        return data;
    }
    
    /**
     * Get or create tournament template
     */
    async getOrCreateTemplate(variant) {
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
        
        return data;
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
}

// Make it available globally
window.TournamentDeploymentManager = TournamentDeploymentManager;

console.log('✅ Tournament Deployment Manager loaded!');