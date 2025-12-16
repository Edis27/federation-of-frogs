"use client";


import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import {
   PublicKey,
   Transaction,
} from '@solana/web3.js';
import {
   TOKEN_PROGRAM_ID,
   TOKEN_2022_PROGRAM_ID,
   getAssociatedTokenAddressSync,
   createTransferCheckedInstruction,
   createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';


// =========================================================================
// --- FEDERATION OF FROGS CONFIGURATION ---
// =========================================================================


const RIBBIT_MINT_ADDRESS = new PublicKey("8aW5vwBWQP3vTqqHGSGs6MSqnRkSvHnti96b55ygpump");
const TREASURY_WALLET = new PublicKey("6hNozPrcywMv5Lyx6VuqaSooWCsNsvQyoXie9W4u8RTK");
const MINT_COST_AMOUNT = 100;
const RIBBIT_TOKEN_DECIMALS = 6;


// =========================================================================
// --- FROG GENERATION TRAITS WITH RARITY WEIGHTS ---
// =========================================================================


const BACKGROUNDS = [
    { path: '/background-blue.png', weight: 200, rarityScore: 15 },
    { path: '/background-purple.png', weight: 200, rarityScore: 15 },
    { path: '/background-cocoa.png', weight: 200, rarityScore: 15 },
    { path: '/background-grey.png', weight: 200, rarityScore: 10 },
    { path: '/background-pink.png', weight: 200, rarityScore: 15 },
 ]; // Total: 1000
 
 const TYPES = [
    { path: '/type-solana.png', weight: 10, rarityScore: 1000 },      // Ultra rare!
    { path: '/type-alien.png', weight: 30, rarityScore: 800 },        // Super rare!
    { path: '/type-skeleton.png', weight: 50, rarityScore: 500 },     // Very rare
    { path: '/type-zombie.png', weight: 80, rarityScore: 350 },       // Rare
    { path: '/type-female.png', weight: 380, rarityScore: 15 },       // Common
    { path: '/type-male.png', weight: 450, rarityScore: 10 },         // Common
 ]; // Total: 1000
 
 const HEADS = [
    { path: '/head-for-a-king.png', weight: 1, rarityScore: 1500 },
    { path: '/head-watermelon.png', weight: 3, rarityScore: 1000 },
    { path: '/head-backwards-solana-cap.png', weight: 6, rarityScore: 800 },
    { path: '/head-halo.png', weight: 20, rarityScore: 500 },
    { path: '/head-police-hat.png', weight: 30, rarityScore: 350 },
    { path: '/head-head-band.png', weight: 40, rarityScore: 300 },
    { path: '/head-swamp-hat.png', weight: 50, rarityScore: 200 },
    { path: '/head-pirate-bandana.png', weight: 60, rarityScore: 150 },
    { path: '/head-lucky-hat.png', weight: 70, rarityScore: 120 },
    { path: '/head-red-punk-hair.png', weight: 85, rarityScore: 100 },
    { path: '/head-red-hair.png', weight: 95, rarityScore: 80 },
    { path: '/head-cowboy-hat.png', weight: 105, rarityScore: 60 },
    { path: '/head-beanie.png', weight: 115, rarityScore: 50 },
    { path: '/head-black-hair.png', weight: 130, rarityScore: 40 },
    { path: '/head-none.png', weight: 190, rarityScore: 5 },
 ]; // Total: 1000
 
 const BODIES = [
    { path: '/body-diamond-necklace.png', weight: 5, rarityScore: 1250 },
    { path: '/body-tuxedo.png', weight: 25, rarityScore: 600 },
    { path: '/body-pilot-jacket.png', weight: 50, rarityScore: 400 },
    { path: '/body-kimono.png', weight: 75, rarityScore: 180 },
    { path: '/body-referee-shirt.png', weight: 100, rarityScore: 125 },
    { path: '/body-safety-vest.png', weight: 125, rarityScore: 75 },
    { path: '/body-bathrobe.png', weight: 150, rarityScore: 60 },
    { path: '/body-hawaiian.png', weight: 170, rarityScore: 40 },
    { path: '/body-none.png', weight: 300, rarityScore: 5 },
 ]; // Total: 1000
 
 const EYES = [
    { path: '/eyes-solana-vipers.png', weight: 10, rarityScore: 750 },
    { path: '/eyes-cyclops-visor.png', weight: 20, rarityScore: 650 },
    { path: '/eyes-beach-sunglasses.png', weight: 30, rarityScore: 450 },
    { path: '/eyes-eye-mask.png', weight: 50, rarityScore: 250 },
    { path: '/eyes-3d-glasses.png', weight: 90, rarityScore: 125 },
    { path: '/eyes-cool-shades.png', weight: 150, rarityScore: 50 },
    { path: '/eyes-none.png', weight: 650, rarityScore: 5 },
 ]; // Total: 1000
 
 const MOUTHS = [
    { path: '/mouth-pipe.png', weight: 50, rarityScore: 75 },
    { path: '/mouth-cigarette.png', weight: 80, rarityScore: 50 },
    { path: '/mouth-vape.png', weight: 120, rarityScore: 25 },
    { path: '/mouth-none.png', weight: 750, rarityScore: 5 },
 ]; // Total: 1000
 
 const ACCESSORIES = [
    { path: '/accessory-gold-earring.png', weight: 30, rarityScore: 100 },
    { path: '/accessory-silver-earring.png', weight: 80, rarityScore: 25 },
    { path: '/accessory-none.png', weight: 890, rarityScore: 5 },
 ]; // Total: 1000


// =========================================================================
// --- WEIGHTED RANDOM SELECTION FUNCTION ---
// =========================================================================


const selectWeightedRandom = <T extends { path: string; weight: number; rarityScore: number }>(items: T[]): T => {
   const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
   let random = Math.random() * totalWeight;


   for (const item of items) {
       random -= item.weight;
       if (random <= 0) {
           return item;
       }
   }


   return items[0];
};


// =========================================================================
// --- RARITY CALCULATION ---
// =========================================================================


const calculateRarity = (
   background: { path: string; weight: number; rarityScore: number },
   type: { path: string; weight: number; rarityScore: number },
   head: { path: string; weight: number; rarityScore: number },
   body: { path: string; weight: number; rarityScore: number },
   eyes: { path: string; weight: number; rarityScore: number },
   mouth: { path: string; weight: number; rarityScore: number },
   accessory: { path: string; weight: number; rarityScore: number }
): { score: number; rank: string } => {
   // Sum up all the rarity scores
   const totalScore =
       background.rarityScore +
       type.rarityScore +
       head.rarityScore +
       body.rarityScore +
       eyes.rarityScore +
       mouth.rarityScore +
       accessory.rarityScore;


   // Determine rank based on total score
   let rank = '';
   if (totalScore >= 1500) rank = 'LEGENDARY';      // Extremely rare combinations
   else if (totalScore >= 800) rank = 'EPIC';      // Very rare combinations
   else if (totalScore >= 500) rank = 'RARE';      // Rare combinations
   else rank = 'COMMON';                            // Common combinations


   return { score: totalScore, rank };
};


// =========================================================================
// --- FROG GENERATION FUNCTION (NOW INCLUDES ALL TRAITS) ---
// =========================================================================


const generateFrogImage = async (): Promise<{
   image: string;
   rarity: { score: number; rank: string };
   traits: {
       background: { path: string; weight: number; rarityScore: number };
       type: { path: string; weight: number; rarityScore: number };
       head: { path: string; weight: number; rarityScore: number };
       body: { path: string; weight: number; rarityScore: number };
       eyes: { path: string; weight: number; rarityScore: number };
       mouth: { path: string; weight: number; rarityScore: number };
       accessory: { path: string; weight: number; rarityScore: number };
   }
}> => {
   return new Promise((resolve, reject) => {
       // Randomly select traits with weighted probabilities
       const background = selectWeightedRandom(BACKGROUNDS);
       const type = selectWeightedRandom(TYPES);
       const head = selectWeightedRandom(HEADS);
       const body = selectWeightedRandom(BODIES);
       const eyes = selectWeightedRandom(EYES);
       const mouth = selectWeightedRandom(MOUTHS);
       const accessory = selectWeightedRandom(ACCESSORIES);


       console.log('🎨 Generating frog with:', {
           background: background.path,
           type: type.path,
           head: head.path,
           body: body.path,
           eyes: eyes.path,
           mouth: mouth.path,
           accessory: accessory.path
       });


       // Calculate rarity
       const rarity = calculateRarity(
           background,
           type,
           head,
           body,
           eyes,
           mouth,
           accessory
       );
       console.log('✨ Rarity:', rarity);


       // Create canvas
       const canvas = document.createElement('canvas');
       canvas.width = 320; // 32 * 10
       canvas.height = 320; // 32 * 10
       const ctx = canvas.getContext('2d');


       if (!ctx) {
           reject(new Error('Could not get canvas context'));
           return;
       }


       // Disable image smoothing for crisp pixel art
       ctx.imageSmoothingEnabled = false;


       let loadedImages = 0;
       const totalImages = 7;


       const bgImg = new Image();
       const typeImg = new Image();
       const headImg = new Image();
       const bodyImg = new Image();
       const eyesImg = new Image();
       const mouthImg = new Image();
       const accessoryImg = new Image();


       const checkAllLoaded = () => {
           loadedImages++;
           if (loadedImages === totalImages) {
               // Draw layers in order: background -> type -> head -> body -> eyes -> mouth -> accessory
               ctx.drawImage(bgImg, 0, 0, 320, 320);
               ctx.drawImage(typeImg, 0, 0, 320, 320);
               ctx.drawImage(headImg, 0, 0, 320, 320);
               ctx.drawImage(bodyImg, 0, 0, 320, 320);
               ctx.drawImage(eyesImg, 0, 0, 320, 320);
               ctx.drawImage(mouthImg, 0, 0, 320, 320);
               ctx.drawImage(accessoryImg, 0, 0, 320, 320);


               // Convert to data URL
               const dataUrl = canvas.toDataURL('image/png');
               resolve({
                   image: dataUrl,
                   rarity,
                   traits: {
                       background,
                       type,
                       head,
                       body,
                       eyes,
                       mouth,
                       accessory
                   }
               });
           }
       };


       bgImg.onload = checkAllLoaded;
       bgImg.onerror = () => reject(new Error('Failed to load background'));
       bgImg.src = background.path;


       typeImg.onload = checkAllLoaded;
       typeImg.onerror = () => reject(new Error('Failed to load type'));
       typeImg.src = type.path;


       headImg.onload = checkAllLoaded;
       headImg.onerror = () => reject(new Error('Failed to load head'));
       headImg.src = head.path;


       bodyImg.onload = checkAllLoaded;
       bodyImg.onerror = () => reject(new Error('Failed to load body'));
       bodyImg.src = body.path;


       eyesImg.onload = checkAllLoaded;
       eyesImg.onerror = () => reject(new Error('Failed to load eyes'));
       eyesImg.src = eyes.path;


       mouthImg.onload = checkAllLoaded;
       mouthImg.onerror = () => reject(new Error('Failed to load mouth'));
       mouthImg.src = mouth.path;


       accessoryImg.onload = checkAllLoaded;
       accessoryImg.onerror = () => reject(new Error('Failed to load accessory'));
       accessoryImg.src = accessory.path;
   });
};


export default function Home() {
   const [isClient, setIsClient] = useState(false);
   const { publicKey, connected, sendTransaction } = useWallet();
   const { connection } = useConnection();
   const router = useRouter();


   const [ribbitBalance, setRibbitBalance] = useState('0');
   const [isBalanceLoading, setIsBalanceLoading] = useState(false);
   const [isMinting, setIsMinting] = useState(false);


   // Track which program the user's token belongs to (Standard or 2022)
   const [tokenProgramId, setTokenProgramId] = useState<PublicKey>(TOKEN_PROGRAM_ID);


   // Frog generation state (NOW INCLUDES ALL 7 TRAITS)
   const [generatedFrog, setGeneratedFrog] = useState<{
       image: string;
       rarity: { score: number; rank: string };
       traits: {
           background: { path: string; weight: number; rarityScore: number };
           type: { path: string; weight: number; rarityScore: number };
           head: { path: string; weight: number; rarityScore: number };
           body: { path: string; weight: number; rarityScore: number };
           eyes: { path: string; weight: number; rarityScore: number };
           mouth: { path: string; weight: number; rarityScore: number };
           accessory: { path: string; weight: number; rarityScore: number };
       }
   } | null>(null);


   useEffect(() => { setIsClient(true); }, []);


   // --- 1. Balance & Program Detection Logic ---
   useEffect(() => {
       if (!connected || !publicKey || !isClient) {
           setRibbitBalance('0');
           return;
       }


       const fetchRibbitBalance = async () => {
           setIsBalanceLoading(true);
           try {
               // STRATEGY: Try Token-2022 FIRST (Most likely based on logs)
               const ata2022 = getAssociatedTokenAddressSync(
                   RIBBIT_MINT_ADDRESS,
                   publicKey,
                   false,
                   TOKEN_2022_PROGRAM_ID
               );


               try {
                   const info2022 = await connection.getTokenAccountBalance(ata2022);
                   if (info2022?.value?.uiAmount != null) {
                       console.log("✅ Token-2022 account detected");
                       setRibbitBalance(info2022.value.uiAmount.toFixed(2));
                       setTokenProgramId(TOKEN_2022_PROGRAM_ID);
                       setIsBalanceLoading(false);
                       return;
                   }
               } catch (e) {
                   console.log("Token-2022 not found, trying standard...");
               }


               // Fallback: Try Standard Token Program
               const ataSpl = getAssociatedTokenAddressSync(
                   RIBBIT_MINT_ADDRESS,
                   publicKey,
                   false,
                   TOKEN_PROGRAM_ID
               );


               try {
                   const infoSpl = await connection.getTokenAccountBalance(ataSpl);
                   if (infoSpl?.value?.uiAmount != null) {
                       console.log("✅ Standard token account detected");
                       setRibbitBalance(infoSpl.value.uiAmount.toFixed(2));
                       setTokenProgramId(TOKEN_PROGRAM_ID);
                       setIsBalanceLoading(false);
                       return;
                   }
               } catch (e) {
                   console.log("Standard token not found either");
               }


               setRibbitBalance('0');
               console.warn("⚠️ No token account found for this wallet");


           } catch (error) {
               console.error("❌ Error fetching balance:", error);
               setRibbitBalance('0');
           } finally {
               setIsBalanceLoading(false);
           }
       };


       fetchRibbitBalance();
   }, [connected, publicKey, connection, isClient]);




   // =========================================================================
   // --- TRANSACTION LOGIC ---
   // =========================================================================


   const buildTransferTransaction = useCallback(async (feePayer: PublicKey) => {
       const { blockhash } = await connection.getLatestBlockhash('confirmed');
       const transaction = new Transaction({
           recentBlockhash: blockhash,
           feePayer: feePayer,
       });


       // 1. Calculate Source & Destination ATAs using detected program
       const userRibbitATA = getAssociatedTokenAddressSync(
           RIBBIT_MINT_ADDRESS,
           feePayer,
           false,
           tokenProgramId
       );


       const treasuryATA = getAssociatedTokenAddressSync(
           RIBBIT_MINT_ADDRESS,
           TREASURY_WALLET,
           false,
           tokenProgramId
       );


       // 2. Check if Treasury ATA exists - if not, create it
       try {
           const accountInfo = await connection.getAccountInfo(treasuryATA);
           if (!accountInfo) {
               transaction.add(
                   createAssociatedTokenAccountInstruction(
                       feePayer,
                       treasuryATA,
                       TREASURY_WALLET,
                       RIBBIT_MINT_ADDRESS,
                       tokenProgramId
                   )
               );
           }
       } catch (err) {
           console.error("Error checking treasury:", err);
       }


       // 3. Create the transfer instruction
       const amountInSmallestUnits = BigInt(MINT_COST_AMOUNT) * BigInt(10 ** RIBBIT_TOKEN_DECIMALS);


       const transferInstruction = createTransferCheckedInstruction(
           userRibbitATA,
           RIBBIT_MINT_ADDRESS,
           treasuryATA,
           feePayer,
           Number(amountInSmallestUnits),
           RIBBIT_TOKEN_DECIMALS,
           [],
           tokenProgramId
       );


       transaction.add(transferInstruction);


       return transaction;


   }, [connection, tokenProgramId]);


   const handleMint = useCallback(async () => {
       if (!connected || !publicKey || isMinting) return;


       setIsMinting(true);


       try {
           const transaction = await buildTransferTransaction(publicKey);


           console.log("📨 Requesting signature...");
           const signature = await sendTransaction(transaction, connection);


           console.log("📨 Transaction sent:", signature);
           console.log("⏳ Confirming transaction...");


           const confirmation = await connection.confirmTransaction({
               signature,
               blockhash: transaction.recentBlockhash!,
               lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
           }, 'confirmed');


           if (confirmation.value.err) {
               const errorMsg = typeof confirmation.value.err === 'object'
                   ? JSON.stringify(confirmation.value.err)
                   : String(confirmation.value.err);
               throw new Error(`Transaction failed: ${errorMsg}`);
           }


           console.log(`🎉 Success! TX: ${signature}`);


           // ✨ GENERATE THE FROG (NOW WITH ALL 7 TRAITS) ✨
           console.log('🐸 Generating your frog...');
           const frogData = await generateFrogImage();
           setGeneratedFrog(frogData);


           // 💾 SAVE FROG TO MONGODB (NOW INCLUDING ALL TRAITS)
           try {
               console.log('💾 Saving frog to database...');
               const saveResponse = await fetch('/api/frogs/save', {
                   method: 'POST',
                   headers: {
                       'Content-Type': 'application/json',
                   },
                   body: JSON.stringify({
                       walletAddress: publicKey.toString(),
                       frogData: frogData, // This now includes all 7 traits
                       signature: signature
                   })
               });


               const saveResult = await saveResponse.json();


               if (saveResult.success) {
                   console.log('✅ Frog saved to database!', saveResult.frogId);
               } else {
                   console.error('⚠️ Failed to save frog:', saveResult.error);
               }
           } catch (saveError) {
               console.error('⚠️ Error saving frog to database:', saveError);
               // Don't throw - we still want to show the frog even if save fails
           }


           // Refresh balance after 2 seconds
           setTimeout(() => {
               const fetchBalance = async () => {
                   try {
                       const ata2022 = getAssociatedTokenAddressSync(
                           RIBBIT_MINT_ADDRESS,
                           publicKey,
                           false,
                           TOKEN_2022_PROGRAM_ID
                       );


                       try {
                           const info2022 = await connection.getTokenAccountBalance(ata2022);
                           if (info2022?.value?.uiAmount != null) {
                               setRibbitBalance(info2022.value.uiAmount.toFixed(2));
                               return;
                           }
                       } catch (e) { }


                       const ataSpl = getAssociatedTokenAddressSync(
                           RIBBIT_MINT_ADDRESS,
                           publicKey,
                           false,
                           TOKEN_PROGRAM_ID
                       );


                       const infoSpl = await connection.getTokenAccountBalance(ataSpl);
                       if (infoSpl?.value?.uiAmount != null) {
                           setRibbitBalance(infoSpl.value.uiAmount.toFixed(2));
                       }
                   } catch (error) {
                       console.error("Error refreshing balance:", error);
                   }
               };
               fetchBalance();
           }, 2000);


       } catch (error) {
           console.error('❌ Transaction failed:', error);
       } finally {
           setIsMinting(false);
       }
   }, [connected, publicKey, sendTransaction, connection, isMinting, buildTransferTransaction]);


   const hasEnoughTokens = parseFloat(ribbitBalance) >= MINT_COST_AMOUNT;
   const isButtonDisabled = !connected || isBalanceLoading || !hasEnoughTokens || isMinting;


   let mintButtonText = 'Generate Frog';
   if (!connected) mintButtonText = 'Connect Wallet First';
   else if (isBalanceLoading) mintButtonText = 'Loading Balance...';
   else if (isMinting) mintButtonText = 'Generating Frog...';
   else if (!hasEnoughTokens) mintButtonText = `Need ${MINT_COST_AMOUNT} $RIBBIT`;
   else mintButtonText = `Generate Frog`;


   return (
       <main className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 text-white font-mono">
           {!isClient ? (
               <div className="text-center text-gray-500">
                   Loading...
               </div>
           ) : (
               <>
                   {/* NAVIGATION */}
                   <div className="absolute top-6 left-6 z-20 flex gap-6">
                       <button onClick={() => router.push('/')} className="nav-link">
                           HOME
                       </button>
                       <button onClick={() => router.push('/mint')} className="nav-link">
                           MINTING BAY
                       </button>
                       <button onClick={() => router.push('/fotd')} className="nav-link">
                           F.O.T.D
                       </button>
                       <button onClick={() => router.push('/hall-of-fame')} className="nav-link">
                           HALL OF FAME
                       </button>
                   </div>


                   {/* TOP RIGHT - WALLET BUTTON (ABSOLUTE POSITIONING) */}
                   <div className="absolute top-6 right-6 z-10">
                       <WalletMultiButton
                           style={{
                               borderRadius: '9999px',
                               background: 'linear-gradient(90deg, #9945FF 0%, #14F195 100%)',
                               boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                               transition: 'all 0.3s ease',
                           }}
                           onMouseEnter={(e) => {
                               e.currentTarget.style.transform = 'scale(1.05)';
                               e.currentTarget.style.boxShadow = '0 20px 25px -5px rgb(153 69 255 / 0.5), 0 8px 10px -6px rgb(153 69 255 / 0.5)';
                           }}
                           onMouseLeave={(e) => {
                               e.currentTarget.style.transform = 'scale(1)';
                               e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
                           }}
                       >
                           {connected ? 'Connected' : 'Connect Wallet'}
                       </WalletMultiButton>
                   </div>


                   {/* CENTERED CONTENT - MINTING INTERFACE WRAPPED IN GRAY BOX */}
                   <div className="max-w-xl w-full flex flex-col items-center gap-8 bg-gray-800 p-8 rounded-xl border-2 border-gray-800">
                       <h2 className="text-3xl md:text-5xl leading-loose pixel-3d text-center">
                           MINTING BAY
                       </h2>
                       {/* Balance Display (Only if connected) */}
                       {connected && (
                           <div className="w-full bg-gray-800 p-6 rounded-lg border-2 border-gray-700" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }}>
                               <p className="text-green-300 text-center mb-4 text-s" style={{ fontFamily: "'Press Start 2P', cursive" }}>Your $RIBBIT Balance:</p>
                               <div className="bg-black p-4 rounded-md border border-gray-900">
                                   <p className="text-xl text-yellow-400 font-bold text-center" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                                       {isBalanceLoading ? '...' : parseFloat(ribbitBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                   </p>
                               </div>
                           </div>
                       )}


                       {/* Mint Button */}
                       <div className="w-full">
                           <button
                               onClick={handleMint}
                               disabled={isButtonDisabled}
                               className="pixel-button w-full"
                           >
                               {mintButtonText}
                           </button>
                       </div>
                   </div>


                   {/* FROG DISPLAY OVERLAY */}
                   {generatedFrog && (
                       <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                           <div className="max-w-xl w-full flex flex-col items-center gap-8 bg-gray-800 p-8 rounded-xl border-2 border-gray-800 pointer-events-auto">
                               <h2 className="text-2xl md:text-3xl pixel-3d text-center">
                                   YOUR FROG
                               </h2>
                               <div className="w-full bg-gray-800 p-6 rounded-lg border-2 border-gray-700" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }}>
                                   <img
                                       src={generatedFrog.image}
                                       alt="Your Generated Frog"
                                       className="w-full h-auto border-4 border-gray-800 rounded-lg"
                                   />


                                   {/* RARITY DISPLAY */}
                                   <div>
                                       <div className="bg-black p-4 rounded-md border border-gray-900 mt-2">
                                           <p
                                               className="text-center text-sm"
                                               style={{
                                                   fontFamily: "'Press Start 2P', cursive",
                                                   color:
                                                       generatedFrog.rarity.rank === 'LEGENDARY' ? '#ff6b35' :
                                                           generatedFrog.rarity.rank === 'EPIC' ? '#a855f7' :
                                                               generatedFrog.rarity.rank === 'RARE' ? '#3b82f6' :
                                                                   '#6ade8a'
                                               }}
                                           >
                                               Rarity Score: {generatedFrog.rarity.score}
                                           </p>
                                       </div>
                                   </div>


                               </div>
                               <button
                                   onClick={() => setGeneratedFrog(null)}
                                   className="pixel-button w-full"
                               >
                                   Close
                               </button>
                           </div>
                       </div>
                   )}
               </>
           )}
       </main>
   );
}

