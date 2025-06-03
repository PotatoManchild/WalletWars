// walletwars-escrow-integration.js
// Complete integration for WalletWars escrow system with deployed program
// Program ID: AXMwpemCzKXiozQhcMtxajPGQwiz4SWfb3xvH42RXuT7

import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, utils } from '@project-serum/anchor';

// DEPLOYED PROGRAM CONFIGURATION
const PROGRAM_ID = new PublicKey('AXMwpemCzKXiozQhcMtxajPGQwiz4SWfb3xvH42RXuT7');
const PLATFORM_WALLET = new PublicKey('5RLDuPHsa7ohaKUSNc5iYvtgveL1qrCcVdxVHXPeG3b8'); // TODO: Replace with your wallet

// You'll need to paste your IDL here after building
const IDL = {
  // Paste your program's IDL JSON here
  // Run `anchor build` and copy from target/idl/walletwars_escrow.json
};

class WalletWarsEscrowIntegration {
    constructor(wallet) {
        this.wallet = wallet;
        this.connection = new Connection(
            'https://api.devnet.solana.com',
            'confirmed'
        );
        this.provider = new AnchorProvider(
            this.connection,
            wallet,
            { commitment: 'confirmed' }
        );
        this.program = new Program(IDL, PROGRAM_ID, this.provider);
    }

    /**
     * Initialize a new tournament on-chain
     * This should be called when creating a tournament in your database
     */
    async initializeTournament(tournamentData) {
        const {
            tournamentId,    // Unique ID from your database
            entryFee,        // In SOL (e.g., 0.01)
            maxPlayers,      // Maximum participants
            platformFeePercentage = 10, // Platform fee (10-15%)
            startTime,       // Unix timestamp
            endTime          // Unix timestamp
        } = tournamentData;

        try {
            console.log(`🎮 Initializing tournament ${tournamentId} on-chain...`);

            // Generate PDAs (Program Derived Addresses)
            const [tournamentPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('tournament'), Buffer.from(tournamentId)],
                PROGRAM_ID
            );

            const [escrowPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('escrow'), Buffer.from(tournamentId)],
                PROGRAM_ID
            );

            // Convert entry fee to lamports
            const entryFeeLamports = new BN(entryFee * LAMPORTS_PER_SOL);

            // Create the transaction
            const tx = await this.program.methods
                .initializeTournament(
                    tournamentId,
                    entryFeeLamports,
                    maxPlayers,
                    platformFeePercentage,
                    new BN(startTime),
                    new BN(endTime)
                )
                .accounts({
                    tournament: tournamentPDA,
                    escrowAccount: escrowPDA,
                    authority: this.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('✅ Tournament initialized on-chain!');
            console.log('Transaction signature:', tx);
            console.log('Tournament PDA:', tournamentPDA.toString());
            console.log('Escrow PDA:', escrowPDA.toString());

            // Update your database with on-chain addresses
            await this.updateDatabaseWithOnChainData(tournamentId, {
                tournamentPDA: tournamentPDA.toString(),
                escrowPDA: escrowPDA.toString(),
                initTxSignature: tx,
                onChainStatus: 'initialized'
            });

            return {
                success: true,
                signature: tx,
                tournamentPDA: tournamentPDA.toString(),
                escrowPDA: escrowPDA.toString()
            };

        } catch (error) {
            console.error('❌ Failed to initialize tournament:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Register a player for a tournament
     * This collects the entry fee and stores it in escrow
     */
    async registerPlayer(tournamentId, playerWallet = null) {
        const player = playerWallet || this.wallet.publicKey;

        try {
            console.log(`📝 Registering player for tournament ${tournamentId}...`);

            // Generate PDAs
            const [tournamentPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('tournament'), Buffer.from(tournamentId)],
                PROGRAM_ID
            );

            const [escrowPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('escrow'), Buffer.from(tournamentId)],
                PROGRAM_ID
            );

            const [registrationPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('registration'), tournamentPDA.toBuffer(), player.toBuffer()],
                PROGRAM_ID
            );

            // Get tournament data to verify entry fee
            const tournament = await this.program.account.tournament.fetch(tournamentPDA);
            const entryFee = tournament.entryFee.toNumber();

            console.log(`💰 Entry fee: ${entryFee / LAMPORTS_PER_SOL} SOL`);

            // Check wallet balance
            const balance = await this.connection.getBalance(player);
            if (balance < entryFee) {
                throw new Error(`Insufficient balance. Need ${entryFee / LAMPORTS_PER_SOL} SOL`);
            }

            // Register player (this will transfer the entry fee to escrow)
            const tx = await this.program.methods
                .registerPlayer()
                .accounts({
                    tournament: tournamentPDA,
                    playerRegistration: registrationPDA,
                    escrowAccount: escrowPDA,
                    player: player,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('✅ Player registered successfully!');
            console.log('Transaction:', tx);
            console.log(`Entry fee of ${entryFee / LAMPORTS_PER_SOL} SOL transferred to escrow`);

            // Update database
            await this.updatePlayerRegistration(tournamentId, player.toString(), tx);

            return {
                success: true,
                signature: tx,
                registrationPDA: registrationPDA.toString(),
                entryFeePaid: entryFee / LAMPORTS_PER_SOL
            };

        } catch (error) {
            console.error('❌ Registration failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Finalize tournament and distribute prizes
     * Called after tournament ends and winners are determined
     */
    async finalizeTournamentAndDistributePrizes(tournamentId, winners) {
        try {
            console.log(`🏁 Finalizing tournament ${tournamentId}...`);

            const [tournamentPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('tournament'), Buffer.from(tournamentId)],
                PROGRAM_ID
            );

            const [escrowPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('escrow'), Buffer.from(tournamentId)],
                PROGRAM_ID
            );

            // Winners format: [{ address: 'pubkey', percentage: 50 }, ...]
            const winnerAddresses = winners.map(w => new PublicKey(w.address));
            const prizePercentages = winners.map(w => w.percentage);

            // Step 1: Finalize tournament
            console.log('📋 Marking tournament as finalized...');
            const finalizeTx = await this.program.methods
                .finalizeTournament(winnerAddresses, prizePercentages)
                .accounts({
                    tournament: tournamentPDA,
                    authority: this.wallet.publicKey,
                })
                .rpc();

            console.log('✅ Tournament finalized:', finalizeTx);

            // Step 2: Distribute prizes to each winner
            console.log('💰 Distributing prizes...');
            const distributions = [];

            for (let i = 0; i < winners.length; i++) {
                const winner = winners[i];
                console.log(`💸 Sending ${winner.percentage}% to ${winner.address.substring(0, 8)}...`);

                const distributeTx = await this.program.methods
                    .distributePrize(i, winner.percentage)
                    .accounts({
                        tournament: tournamentPDA,
                        escrowAccount: escrowPDA,
                        winner: new PublicKey(winner.address),
                        authority: this.wallet.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();

                distributions.push({
                    winner: winner.address,
                    percentage: winner.percentage,
                    tx: distributeTx
                });

                console.log(`✅ Prize distributed to winner ${i + 1}`);
            }

            // Step 3: Collect platform fees
            console.log('🏦 Collecting platform fees...');
            const feeTx = await this.program.methods
                .collectPlatformFees()
                .accounts({
                    tournament: tournamentPDA,
                    escrowAccount: escrowPDA,
                    platformWallet: PLATFORM_WALLET,
                    authority: this.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('✅ Platform fees collected:', feeTx);

            // Update database
            await this.updateTournamentCompletion(tournamentId, {
                finalizeTx,
                distributions,
                feeTx,
                completedAt: new Date().toISOString()
            });

            return {
                success: true,
                finalizeTx,
                distributions,
                feeTx
            };

        } catch (error) {
            console.error('❌ Failed to finalize tournament:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get tournament data from blockchain
     */
    async getTournamentOnChain(tournamentId) {
        try {
            const [tournamentPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('tournament'), Buffer.from(tournamentId)],
                PROGRAM_ID
            );

            const tournament = await this.program.account.tournament.fetch(tournamentPDA);

            return {
                success: true,
                data: {
                    authority: tournament.authority.toString(),
                    tournamentId: tournament.tournamentId,
                    entryFee: tournament.entryFee.toNumber() / LAMPORTS_PER_SOL,
                    maxPlayers: tournament.maxPlayers,
                    currentPlayers: tournament.currentPlayers,
                    platformFeePercentage: tournament.platformFeePercentage,
                    totalPrizePool: tournament.totalPrizePool.toNumber() / LAMPORTS_PER_SOL,
                    platformFeesCollected: tournament.platformFeesCollected.toNumber() / LAMPORTS_PER_SOL,
                    startTime: tournament.startTime.toNumber(),
                    endTime: tournament.endTime.toNumber(),
                    isActive: tournament.isActive,
                    isFinalized: tournament.isFinalized,
                    winners: tournament.winners.map(w => w.toString()),
                    prizePercentages: tournament.prizePercentages
                }
            };

        } catch (error) {
            console.error('❌ Failed to fetch tournament:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check escrow balance
     */
    async getEscrowBalance(tournamentId) {
        try {
            const [escrowPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('escrow'), Buffer.from(tournamentId)],
                PROGRAM_ID
            );

            const balance = await this.connection.getBalance(escrowPDA);
            const balanceSOL = balance / LAMPORTS_PER_SOL;

            console.log(`💰 Escrow balance for tournament ${tournamentId}: ${balanceSOL} SOL`);

            return {
                success: true,
                balance: balanceSOL,
                lamports: balance,
                escrowAddress: escrowPDA.toString()
            };

        } catch (error) {
            console.error('❌ Failed to get escrow balance:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Cancel tournament and enable refunds
     */
    async cancelTournament(tournamentId) {
        try {
            console.log(`❌ Cancelling tournament ${tournamentId}...`);

            const [tournamentPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('tournament'), Buffer.from(tournamentId)],
                PROGRAM_ID
            );

            const tx = await this.program.methods
                .cancelTournament()
                .accounts({
                    tournament: tournamentPDA,
                    authority: this.wallet.publicKey,
                })
                .rpc();

            console.log('✅ Tournament cancelled. Players can now claim refunds.');
            console.log('Transaction:', tx);

            // Get list of registered players for refund processing
            // You'll need to get this from your database
            const players = await this.getRegisteredPlayers(tournamentId);
            
            console.log(`📋 ${players.length} players eligible for refunds`);

            return {
                success: true,
                signature: tx,
                eligibleRefunds: players.length
            };

        } catch (error) {
            console.error('❌ Failed to cancel tournament:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Process refund for a player (after tournament cancellation)
     */
    async refundPlayer(tournamentId, playerAddress) {
        try {
            console.log(`💸 Processing refund for player ${playerAddress.substring(0, 8)}...`);

            const player = new PublicKey(playerAddress);

            const [tournamentPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('tournament'), Buffer.from(tournamentId)],
                PROGRAM_ID
            );

            const [escrowPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('escrow'), Buffer.from(tournamentId)],
                PROGRAM_ID
            );

            const [registrationPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('registration'), tournamentPDA.toBuffer(), player.toBuffer()],
                PROGRAM_ID
            );

            const tx = await this.program.methods
                .refundPlayer()
                .accounts({
                    tournament: tournamentPDA,
                    playerRegistration: registrationPDA,
                    escrowAccount: escrowPDA,
                    player: player,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('✅ Refund processed successfully!');
            console.log('Transaction:', tx);

            return {
                success: true,
                signature: tx,
                refundedTo: playerAddress
            };

        } catch (error) {
            console.error('❌ Failed to process refund:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // DATABASE INTEGRATION HELPERS
    // ========================================

    async updateDatabaseWithOnChainData(tournamentId, onChainData) {
        // Update your Supabase with on-chain data
        const { error } = await window.walletWarsAPI.supabase
            .from('tournament_instances')
            .update({
                tournament_pda: onChainData.tournamentPDA,
                escrow_pda: onChainData.escrowPDA,
                init_tx_signature: onChainData.initTxSignature,
                on_chain_status: onChainData.onChainStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', tournamentId);

        if (error) {
            console.error('Failed to update database:', error);
        }
    }

    async updatePlayerRegistration(tournamentId, playerAddress, txSignature) {
        // Update tournament entry in database
        const { error } = await window.walletWarsAPI.supabase
            .from('tournament_entries')
            .update({
                registration_tx: txSignature,
                on_chain_status: 'registered',
                updated_at: new Date().toISOString()
            })
            .eq('tournament_instance_id', tournamentId)
            .eq('wallet_address', playerAddress);

        if (error) {
            console.error('Failed to update registration:', error);
        }
    }

    async updateTournamentCompletion(tournamentId, completionData) {
        const { error } = await window.walletWarsAPI.supabase
            .from('tournament_instances')
            .update({
                finalize_tx: completionData.finalizeTx,
                fee_collection_tx: completionData.feeTx,
                prize_distributions: completionData.distributions,
                on_chain_status: 'completed',
                completed_at: completionData.completedAt
            })
            .eq('id', tournamentId);

        if (error) {
            console.error('Failed to update completion:', error);
        }
    }

    async getRegisteredPlayers(tournamentId) {
        const { data, error } = await window.walletWarsAPI.supabase
            .from('tournament_entries')
            .select('wallet_address')
            .eq('tournament_instance_id', tournamentId)
            .eq('status', 'registered');

        return data || [];
    }
}

// ========================================
// USAGE EXAMPLES AND INTEGRATION GUIDE
// ========================================

/**
 * Example: Complete tournament flow
 */
async function runCompleteTournamentFlow() {
    // Initialize escrow client
    const escrow = new WalletWarsEscrowIntegration(window.solana);

    // 1. Create tournament on-chain when creating in database
    const tournamentId = 'tournament_' + Date.now(); // Use your DB ID
    const tournamentResult = await escrow.initializeTournament({
        tournamentId: tournamentId,
        entryFee: 0.01, // 0.01 SOL entry fee
        maxPlayers: 100,
        platformFeePercentage: 10,
        startTime: Math.floor(Date.now() / 1000) + 3600, // Start in 1 hour
        endTime: Math.floor(Date.now() / 1000) + 86400   // End in 24 hours
    });

    if (!tournamentResult.success) {
        console.error('Failed to create tournament');
        return;
    }

    console.log('Tournament created:', tournamentResult);

    // 2. Register a player
    const registerResult = await escrow.registerPlayer(tournamentId);
    console.log('Registration result:', registerResult);

    // 3. Check escrow balance
    const balanceResult = await escrow.getEscrowBalance(tournamentId);
    console.log('Escrow balance:', balanceResult);

    // 4. After tournament ends, distribute prizes
    // Calculate winners based on your game logic
    const winners = [
        { address: 'winner1_wallet_address', percentage: 50 }, // 1st place: 50%
        { address: 'winner2_wallet_address', percentage: 30 }, // 2nd place: 30%
        { address: 'winner3_wallet_address', percentage: 20 }  // 3rd place: 20%
    ];

    const finalizeResult = await escrow.finalizeTournamentAndDistributePrizes(
        tournamentId,
        winners
    );
    console.log('Tournament finalized:', finalizeResult);
}

/**
 * Example: Integration with your tournament UI
 */
async function integrateWithTournamentUI() {
    // Add this to your tournament registration button handler
    const registerButton = document.getElementById('register-btn');
    registerButton.addEventListener('click', async () => {
        const tournamentId = 'your_tournament_id'; // Get from your UI
        const escrow = new WalletWarsEscrowIntegration(window.solana);
        
        // Show loading state
        registerButton.disabled = true;
        registerButton.textContent = 'Processing...';
        
        try {
            const result = await escrow.registerPlayer(tournamentId);
            
            if (result.success) {
                alert(`✅ Registration successful! Paid ${result.entryFeePaid} SOL`);
                // Update UI to show registered state
            } else {
                alert(`❌ Registration failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed. Please try again.');
        } finally {
            registerButton.disabled = false;
            registerButton.textContent = 'Register';
        }
    });
}

// Export for use
window.WalletWarsEscrowIntegration = WalletWarsEscrowIntegration;

console.log('✅ WalletWars Escrow Integration loaded!');
console.log('🎮 Program ID:', PROGRAM_ID.toString());
console.log('⚠️ Remember to:');
console.log('1. Replace PLATFORM_WALLET with your actual wallet');
console.log('2. Add your program IDL to this file');
console.log('3. Test on devnet before mainnet deployment');
