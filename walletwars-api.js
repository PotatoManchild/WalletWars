// Add this new method to your existing walletwars-api.js file

// NEW METHOD: Check if champion name already exists
async checkChampionNameExists(championName) {
    try {
        console.log(`🔍 Checking if champion name "${championName}" exists...`);
        
        // Query the database to check if the name already exists
        const { data, error } = await this.supabase
            .from('champions')
            .select('id, champion_name')
            .eq('champion_name', championName)
            .eq('is_active', true)
            .maybeSingle(); // Use maybeSingle to avoid errors when no match

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

// ENHANCED: Update the existing createChampion method with additional name checking
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
        
        // Check if champion already exists for this wallet
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
            
            // Check if the error is due to duplicate name (if you have a unique constraint)
            if (insertError.message && insertError.message.includes('duplicate') || 
                insertError.message.includes('unique') || 
                insertError.message.includes('champion_name')) {
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
