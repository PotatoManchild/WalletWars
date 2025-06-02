// tournament-deployment-manager.js
// Tiered tournament deployment with escalating stakes

console.log('📅 Loading Tiered Tournament Deployment Manager...');

class TieredTournamentDeploymentManager {
    constructor() {
        this.config = window.TOURNAMENT_CONFIG;
        this.deploymentSchedule = null;
        this.lastDeploymentCheck = null;
        this.tournamentSelector = new window.TieredTournamentSelector();
    }
    
    /**
     * Start automated tournament deployment
     */
    async startAutomatedDeployment() {
        console.log('🚀 Starting tiered tournament deployment system...');
        
        // Run initial deployment
        await this.deployUpcomingTournaments();
        
        // Schedule daily checks at 00:00 UTC
        this.deploymentSchedule = setInterval(async () => {
            await this.deployUpcomingTournaments();
        }, 24 * 60 * 60 * 1000); // Daily
        
        // Schedule monthly tournament deployment
        this.scheduleMonthlyDeployments();
        
        console.log('✅ Tiered tournament deployment system active');
    }
    
    /**
     * Deploy weekly tournaments with tier requirements
     */
    async deployUpcomingTournaments() {
        console.log('📅 Checking tiered tournament deployment needs...');
        
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
            
            // Check existing tournaments for this date
            const existingTournaments = await this.getExistingTournamentsForDate(date);
            console.log(`📊 Found ${existingTournaments.length} existing tournaments for ${date.toLocaleDateString()}`);
            
            // Check if we have the required tier coverage
            const needsDeployment = await this.checkTierCoverage(date, existingTournaments);
            
            if (needsDeployment.length > 0) {
                const created = await this.deployTieredTournamentsForDate(date, needsDeployment);
                totalCreated += created;
            } else {
                console.log(`✅ Date ${date.toLocaleDateString()} has complete tier coverage`);
            }
        }
        
        console.log(`✅ Tiered tournament deployment complete - Created ${totalCreated} new tournaments`);
    }
    
    /**
     * Check if date has proper tier coverage based on day schedule
     */
    async checkTierCoverage(targetDate, existingTournaments) {
        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
        const requiredTiers = this.config.weeklySchedule[dayName];
        
        if (!requiredTiers) {
            console.log(`📅 No tier schedule for ${dayName}`);
            return [];
        }
        
        console.log(`🎯 Required tiers for ${dayName}: ${requiredTiers.join(', ')}`);
        
        // Check which tiers are missing
        const missingTiers = [];
        const tradingStyles = ['pure_wallet', 'open_trading'];
        
        for (let i = 0; i < tradingStyles.length; i++) {
            const style = tradingStyles[i];
            const requiredTier = requiredTiers[i];
            
            // Check if we have a tournament for this style/tier combination
            const hasTournament = existingTournaments.some(tournament => {
                const metadata = tournament.deployment_metadata;
                return metadata && 
                       metadata.tradingStyle === style && 
                       metadata.tier === requiredTier;
            });
            
            if (!hasTournament) {
                missingTiers.push({ style, tier: requiredTier });
                console.log(`❌ Missing: ${style} ${requiredTier}`);
            } else {
                console.log(`✅ Found: ${style} ${requiredTier}`);
            }
        }
        
        return missingTiers;
    }
    
    /**
     * Get upcoming deployment dates
     */
    getUpcomingDeploymentDates() {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < this.config.timing.advanceDeploymentDays; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            
            const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
            
            if (this.config.deploymentDays.includes(dayName)) {
                const [hours, minutes, seconds] = this.config.deploymentTime.split(':');
                checkDate.setUTCHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
                
                if (checkDate > new Date()) {
                    dates.push(checkDate);
                }
            }
        }
        
        console.log(`📅 Found ${dates.length} deployment dates`);
        return dates.slice(0, 6);
    }
    
    /**
     * Get existing tournaments for a specific date with metadata
     */
    async getExistingTournamentsForDate(targetDate) {
        try {
            const startOfDay = new Date(targetDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            
            const endOfDay = new Date(targetDate);
            endOfDay.setUTCHours(23, 59, 59, 999);
            
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_instances')
                .select('id, tournament_name, start_time, deployment_metadata, tournament_templates(trading_style)')
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString())
                .not('status', 'eq', 'cancelled');
            
            if (error) {
                console.error('❌ Error checking existing tournaments:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Error in getExistingTournamentsForDate:', error);
            return [];
        }
    }
    
    /**
     * Deploy tiered tournaments for a specific date
     */
    async deployTieredTournamentsForDate(targetDate, missingTiers) {
        console.log(`🎲 Deploying missing tiers for ${targetDate.toLocaleDateString()}...`);
        
        let createdCount = 0;
        
        for (const { style, tier } of missingTiers) {
            const tournamentConfig = this.tournamentSelector.selectTournamentFromTier(style, tier, targetDate);
            
            if (tournamentConfig) {
                const created = await this.createTieredTournament(targetDate, tournamentConfig);
                if (created) {
                    createdCount++;
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }
        
        console.log(`🎯 Created ${createdCount} tiered tournaments for ${targetDate.toLocaleDateString()}`);
        return createdCount;
    }
    
    /**
     * Create a tiered tournament instance
     */
    async createTieredTournament(startDate, tournamentConfig) {
        console.log(`📋 Creating tiered tournament: ${tournamentConfig.name} (${tournamentConfig.tier}) for ${startDate.toLocaleDateString()}`);
        
        try {
            // Get tier configuration
            const tierConfig = tournamentConfig.tierConfig;
            
            // Calculate times
            const registrationOpens = new Date(startDate);
            registrationOpens.setDate(registrationOpens.getDate() - 3);
            
            const registrationCloses = new Date(startDate);
            registrationCloses.setMinutes(registrationCloses.getMinutes() - this.config.timing.registrationCloseBeforeStart);
            
            const endTime = new Date(startDate);
            endTime.setDate(endTime.getDate() + tournamentConfig.duration);
            
            // Create or get template for this tiered tournament
            const template = await this.getOrCreateTieredTemplate(tournamentConfig);
            if (!template) {
                console.error('❌ Failed to get/create tiered template');
                return null;
            }
            
            // Create unique tournament name
            const uniqueName = `${tournamentConfig.name} - ${startDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            })}`;
            
            // Calculate expected prize pool
            const maxPrizePool = tierConfig.entryFee * tierConfig.maxParticipants;
            const platformFee = maxPrizePool * (this.config.platformFees.weekly / 100);
            const expectedPrizePool = maxPrizePool - platformFee;
            
            const tournamentData = {
                template_id: template.id,
                tournament_name: uniqueName,
                status: 'scheduled',
                start_time: startDate.toISOString(),
                end_time: endTime.toISOString(),
                registration_opens: registrationOpens.toISOString(),
                registration_closes: registrationCloses.toISOString(),
                participant_count: 0,
                total_prize_pool: 0, // Will be calculated when participants register
                min_participants: tierConfig.minParticipants,
                registration_opens_at: registrationOpens.toISOString(),
                registration_closes_at: registrationCloses.toISOString(),
                deployment_metadata: {
                    deployedAt: new Date().toISOString(),
                    baseVariantName: tournamentConfig.name,
                    tradingStyle: tournamentConfig.tradingStyle,
                    tier: tournamentConfig.tier,
                    theme: tournamentConfig.theme,
                    entryFee: tierConfig.entryFee,
                    maxParticipants: tierConfig.maxParticipants,
                    expectedPrizePool: expectedPrizePool,
                    platformFeePercentage: this.config.platformFees.weekly,
                    tieredSystem: true,
                    deploymentBatch: `${startDate.toISOString().split('T')[0]}-tiered`
                }
            };
            
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_instances')
                .insert([tournamentData])
                .select()
                .single();
            
            if (error) {
                console.error(`❌ Failed to create tiered tournament: ${error.message}`);
                return null;
            }
            
            console.log(`✅ Created tiered tournament ${data.id}: ${uniqueName}`);
            console.log(`💰 Tier: ${tournamentConfig.tier} | Entry: ${tierConfig.entryFee} SOL | Max Prize: ${expectedPrizePool.toFixed(2)} SOL`);
            
            // Schedule lifecycle events
            await this.scheduleLifecycleEvents(data);
            
            return data;
            
        } catch (error) {
            console.error(`❌ Error creating tiered tournament:`, error);
            return null;
        }
    }
    
    /**
     * Get or create template for tiered tournament
     */
    async getOrCreateTieredTemplate(tournamentConfig) {
        try {
            const tierConfig = tournamentConfig.tierConfig;
            
            // Create template name that includes tier
            const templateName = `${tournamentConfig.tier.toUpperCase()} - ${tournamentConfig.name}`;
            
            // Check if template exists
            const { data: existing } = await window.walletWarsAPI.supabase
                .from('tournament_templates')
                .select('*')
                .eq('name', templateName)
                .eq('trading_style', tournamentConfig.tradingStyle)
                .single();
            
            if (existing) {
                return existing;
            }
            
            // Create new tiered template
            const templateData = {
                name: templateName,
                tournament_type: 'weekly',
                trading_style: tournamentConfig.tradingStyle,
                start_day: 'variable',
                entry_fee: tierConfig.entryFee,
                max_participants: tierConfig.maxParticipants,
                prize_pool_percentage: tierConfig.prizePoolPercentage,
                is_active: true,
                template_metadata: {
                    tier: tournamentConfig.tier,
                    theme: tournamentConfig.theme,
                    description: tournamentConfig.description,
                    tieredSystem: true,
                    createdAt: new Date().toISOString()
                }
            };
            
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_templates')
                .insert([templateData])
                .select()
                .single();
            
            if (error) {
                console.error('❌ Failed to create tiered template:', error);
                return null;
            }
            
            console.log(`✅ Created tiered template: ${templateName}`);
            return data;
            
        } catch (error) {
            console.error('❌ Error in getOrCreateTieredTemplate:', error);
            return null;
        }
    }
    
    /**
     * Schedule monthly mega tournaments
     */
    scheduleMonthlyDeployments() {
        // Deploy on the 1st of each month at 12:00 UTC
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 12, 0, 0);
        const timeUntilNextMonth = nextMonth - now;
        
        setTimeout(() => {
            this.deployMonthlyTournament();
            
            // Schedule monthly after that
            setInterval(() => {
                this.deployMonthlyTournament();
            }, 30 * 24 * 60 * 60 * 1000); // Approximately monthly
            
        }, timeUntilNextMonth);
        
        console.log(`📅 Monthly tournament scheduled for ${nextMonth.toLocaleDateString()}`);
    }
    
    /**
     * Deploy monthly mega tournament
     */
    async deployMonthlyTournament() {
        console.log('🏆 Deploying monthly mega tournament...');
        
        try {
            const now = new Date();
            const monthlyTournament = this.tournamentSelector.selectMonthlyTournament(now.getMonth() + 1, now.getFullYear());
            
            // Monthly tournaments start on the 8th of the month
            const startDate = new Date(now.getFullYear(), now.getMonth(), this.config.timing.monthlyStartDay, 14, 0, 0);
            const registrationOpens = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0); // 1st of month
            const registrationCloses = new Date(startDate.getTime() - 60 * 60 * 1000); // 1 hour before start
            const endTime = new Date(startDate);
            endTime.setDate(endTime.getDate() + monthlyTournament.duration);
            
            // Check if monthly tournament already exists for this month
            const existing = await this.checkExistingMonthlyTournament(now.getMonth() + 1, now.getFullYear());
            if (existing) {
                console.log('✅ Monthly tournament already exists for this month');
                return;
            }
            
            const template = await this.getOrCreateMonthlyTemplate(monthlyTournament);
            if (!template) {
                console.error('❌ Failed to create monthly template');
                return;
            }
            
            const uniqueName = `${monthlyTournament.name} - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
            
            const tournamentData = {
                template_id: template.id,
                tournament_name: uniqueName,
                status: 'scheduled',
                start_time: startDate.toISOString(),
                end_time: endTime.toISOString(),
                registration_opens: registrationOpens.toISOString(),
                registration_closes: registrationCloses.toISOString(),
                participant_count: 0,
                total_prize_pool: 0,
                min_participants: monthlyTournament.minParticipants,
                registration_opens_at: registrationOpens.toISOString(),
                registration_closes_at: registrationCloses.toISOString(),
                deployment_metadata: {
                    deployedAt: new Date().toISOString(),
                    type: 'monthly_mega',
                    tradingStyle: monthlyTournament.tradingStyle,
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                    entryFee: monthlyTournament.entryFee,
                    expectedPrizePool: monthlyTournament.targetPrizePool,
                    platformFeePercentage: this.config.platformFees.monthly
                }
            };
            
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_instances')
                .insert([tournamentData])
                .select()
                .single();
            
            if (error) {
                console.error('❌ Failed to create monthly tournament:', error);
                return;
            }
            
            console.log(`🏆 Created monthly mega tournament: ${uniqueName}`);
            await this.scheduleLifecycleEvents(data);
            
        } catch (error) {
            console.error('❌ Error deploying monthly tournament:', error);
        }
    }
    
    /**
     * Check if monthly tournament exists
     */
    async checkExistingMonthlyTournament(month, year) {
        try {
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_instances')
                .select('id')
                .eq('deployment_metadata->>type', 'monthly_mega')
                .eq('deployment_metadata->>month', month.toString())
                .eq('deployment_metadata->>year', year.toString())
                .limit(1);
            
            return data && data.length > 0;
        } catch (error) {
            console.error('❌ Error checking existing monthly tournament:', error);
            return false;
        }
    }
    
    /**
     * Create monthly tournament template
     */
    async getOrCreateMonthlyTemplate(monthlyTournament) {
        try {
            const templateName = `MONTHLY - ${monthlyTournament.name}`;
            
            const { data: existing } = await window.walletWarsAPI.supabase
                .from('tournament_templates')
                .select('*')
                .eq('name', templateName)
                .single();
            
            if (existing) return existing;
            
            const templateData = {
                name: templateName,
                tournament_type: 'monthly',
                trading_style: monthlyTournament.tradingStyle,
                start_day: 'variable',
                entry_fee: monthlyTournament.entryFee,
                max_participants: monthlyTournament.maxParticipants,
                prize_pool_percentage: monthlyTournament.prizePoolPercentage,
                is_active: true,
                template_metadata: {
                    type: 'monthly_mega',
                    description: monthlyTournament.description,
                    duration: monthlyTournament.duration,
                    winnerShare: monthlyTournament.winnerShare,
                    createdAt: new Date().toISOString()
                }
            };
            
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_templates')
                .insert([templateData])
                .select()
                .single();
            
            if (error) {
                console.error('❌ Failed to create monthly template:', error);
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('❌ Error in getOrCreateMonthlyTemplate:', error);
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
     * Get comprehensive deployment status
     */
    async getDeploymentStatus() {
        try {
            const { data, error } = await window.walletWarsAPI.supabase
                .from('tournament_instances')
                .select('id, tournament_name, start_time, status, deployment_metadata')
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true });
            
            if (error) {
                console.error('❌ Error getting deployment status:', error);
                return null;
            }
            
            const byTier = {};
            const byTradingStyle = {};
            const monthly = [];
            
            data.forEach(t => {
                const metadata = t.deployment_metadata;
                if (metadata) {
                    if (metadata.type === 'monthly_mega') {
                        monthly.push(t);
                    } else if (metadata.tier) {
                        if (!byTier[metadata.tier]) byTier[metadata.tier] = 0;
                        byTier[metadata.tier]++;
                    }
                    
                    if (metadata.tradingStyle) {
                        if (!byTradingStyle[metadata.tradingStyle]) byTradingStyle[metadata.tradingStyle] = 0;
                        byTradingStyle[metadata.tradingStyle]++;
                    }
                }
            });
            
            return {
                total: data.length,
                byTier,
                byTradingStyle,
                monthly: monthly.length,
                tournaments: data,
                selectionHistory: this.tournamentSelector.recentSelections
            };
        } catch (error) {
            console.error('❌ Error in getDeploymentStatus:', error);
            return null;
        }
    }
}

// Make it available globally
window.TieredTournamentDeploymentManager = TieredTournamentDeploymentManager;
window.TournamentDeploymentManager = TieredTournamentDeploymentManager; // Backward compatibility

console.log('✅ Tiered Tournament Deployment Manager loaded!');
