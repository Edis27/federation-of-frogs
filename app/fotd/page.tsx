"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddressSync,
} from '@solana/spl-token';

interface FrogData {
    _id: string;
    walletAddress: string;
    imageData: string;
    rarity: {
        score: number;
        rank: string;
    };
    mintedAt: string;
    signature: string;
}

interface FOTDData {
    currentFrog: FrogData | null;
    periodEndsAt: string;
    timeRemaining: number;
}

const RIBBIT_MINT_ADDRESS = new PublicKey("8aW5vwBWQP3vTqqHGSGs6MSqnRkSvHnti96b55ygpump");
const TREASURY_WALLET = new PublicKey("6hNozPrcywMv5Lyx6VuqaSooWCsNsvQyoXie9W4u8RTK");
const PRIZE_PERCENTAGE = 0.25;

export default function FOTDPage() {
    const router = useRouter();
    const { connection } = useConnection();

    const [fotdData, setFotdData] = useState<FOTDData | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [prizePool, setPrizePool] = useState<string>('0');
    const [isPrizeLoading, setIsPrizeLoading] = useState(true);

    const fetchPrizePool = async () => {
        setIsPrizeLoading(true);
        try {
            const ata2022 = getAssociatedTokenAddressSync(
                RIBBIT_MINT_ADDRESS,
                TREASURY_WALLET,
                false,
                TOKEN_2022_PROGRAM_ID
            );

            try {
                const info2022 = await connection.getTokenAccountBalance(ata2022);
                if (info2022?.value?.uiAmount != null) {
                    const prizeAmount = info2022.value.uiAmount * PRIZE_PERCENTAGE;
                    setPrizePool(prizeAmount.toFixed(2));
                    setIsPrizeLoading(false);
                    return;
                }
            } catch (e) { }

            const ataSpl = getAssociatedTokenAddressSync(
                RIBBIT_MINT_ADDRESS,
                TREASURY_WALLET,
                false,
                TOKEN_PROGRAM_ID
            );

            try {
                const infoSpl = await connection.getTokenAccountBalance(ataSpl);
                if (infoSpl?.value?.uiAmount != null) {
                    const prizeAmount = infoSpl.value.uiAmount * PRIZE_PERCENTAGE;
                    setPrizePool(prizeAmount.toFixed(2));
                    setIsPrizeLoading(false);
                    return;
                }
            } catch (e) { }

            setPrizePool('0');
        } catch (error) {
            console.error("❌ Error fetching prize pool:", error);
            setPrizePool('0');
        } finally {
            setIsPrizeLoading(false);
        }
    };

    const fetchFOTDData = async () => {
        try {
            const response = await fetch('/api/frogs/fotd');
            const data = await response.json();

            if (data.success) {
                setFotdData(data);
                if (!data.periodEndsAt) {
                    setIsProcessing(true);
                } else {
                    setIsProcessing(false);
                }
            }
        } catch (error) {
            console.error('Error fetching FOTD:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTimeRemaining = (milliseconds: number): string => {
        if (milliseconds <= 0) return '00:00:00';

        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    useEffect(() => {
        if (!fotdData || !fotdData.periodEndsAt) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const endTime = new Date(fotdData.periodEndsAt).getTime();
            const remaining = endTime - now;

            if (remaining <= 0) {
                setTimeLeft('00:00:00');
                setIsProcessing(true);
                const aggressivePoll = setInterval(() => {
                    fetchFOTDData();
                }, 5000);
                
                setTimeout(() => clearInterval(aggressivePoll), 120000);
            } else {
                setTimeLeft(formatTimeRemaining(remaining));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [fotdData]);

    useEffect(() => {
        fetchFOTDData();
        fetchPrizePool();

        const pollInterval = setInterval(() => {
            fetchFOTDData();
            fetchPrizePool();
        }, 10000);

        return () => clearInterval(pollInterval);
    }, []);

    const hasFrog = !isLoading && fotdData?.currentFrog;

    return (
        <main
            className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 text-white"
            style={{
                backgroundImage: "url('/fotd-background.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="absolute inset-0 bg-black/40" />

            {/* NAVIGATION - Mobile Responsive */}
            <div className="absolute top-4 left-4 z-20 flex flex-col md:flex-row gap-2 md:gap-6">
                <button onClick={() => router.push('/')} className="nav-link text-[8px] md:text-xs">
                    HOME
                </button>
                <button onClick={() => router.push('/mint')} className="nav-link text-[8px] md:text-xs">
                    FROG FOREST
                </button>
                <button onClick={() => router.push('/fotd')} className="nav-link text-[8px] md:text-xs">
                    F.O.T.D
                </button>
                <button onClick={() => router.push('/hall-of-fame')} className="nav-link text-[8px] md:text-xs">
                    HALL OF FAME
                </button>
            </div>

            {/* Timer Display - Top Right on Desktop ONLY */}
            {hasFrog && !isProcessing && (
                <div className="hidden md:block absolute top-6 right-6 z-20 w-64 bg-gray-800 p-3 rounded-xl border-4 border-gray-700 transition-all duration-500">
                    <p
                        className="text-green-300 text-center mb-2 text-[8px]"
                        style={{ fontFamily: "'Press Start 2P', cursive" }}
                    >
                        TIME REMAINING
                    </p>
                    <div className="bg-black p-2 rounded-lg border-2 border-gray-900">
                        <p
                            className="text-xl text-yellow-400 font-bold text-center"
                            style={{ fontFamily: "'Press Start 2P', cursive" }}
                        >
                            {isLoading ? '...' : timeLeft}
                        </p>
                    </div>
                    {/* Prize Info */}
                    <div
                        className="mt-2 bg-black p-2 rounded-lg border-2 border-gray-900"
                        style={{ boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)' }}
                    >
                        <p
                            className="text-[8px] text-yellow-400 font-bold text-center"
                            style={{ fontFamily: "'Press Start 2P', cursive" }}
                        >
                            $Ribbit Prize Pool:
                        </p>
                        <p
                            className="text-[10px] text-green-400 font-bold text-center mt-1"
                            style={{ fontFamily: "'Press Start 2P', cursive" }}
                        >
                            {isPrizeLoading ? '...' : `${parseFloat(prizePool).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `}
                        </p>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="relative z-10 max-w-4xl w-full flex flex-col items-center gap-4 mt-20 md:mt-0">
                {/* Title */}
                <h1 className="text-3xl sm:text-4xl md:text-6xl mt-10 text-center pixel-3d px-4" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                    FROG OF THE DAY
                </h1>

                {/* Timer Display - Below Title on Mobile, Hidden on Desktop when frog exists */}
                {hasFrog && !isProcessing && (
                    <div className="md:hidden w-full max-w-md bg-gray-800 p-3 rounded-xl border-4 border-gray-700 transition-all duration-500 mb-4">
                        <p
                            className="text-green-300 text-center mb-2 text-[8px]"
                            style={{ fontFamily: "'Press Start 2P', cursive" }}
                        >
                            TIME REMAINING
                        </p>
                        <div className="bg-black p-2 rounded-lg border-2 border-gray-900">
                            <p
                                className="text-xl text-yellow-400 font-bold text-center"
                                style={{ fontFamily: "'Press Start 2P', cursive" }}
                            >
                                {isLoading ? '...' : timeLeft}
                            </p>
                        </div>
                        {/* Prize Info */}
                        <div
                            className="mt-2 bg-black p-2 rounded-lg border-2 border-gray-900"
                            style={{ boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)' }}
                        >
                            <p
                                className="text-[8px] text-yellow-400 font-bold text-center"
                                style={{ fontFamily: "'Press Start 2P', cursive" }}
                            >
                                $Ribbit Prize Pool:
                            </p>
                            <p
                                className="text-[10px] text-green-400 font-bold text-center mt-1"
                                style={{ fontFamily: "'Press Start 2P', cursive" }}
                            >
                                {isPrizeLoading ? '...' : `${parseFloat(prizePool).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `}
                            </p>
                        </div>
                    </div>
                )}

                {/* Processing State */}
                {isProcessing && (
                    <div className="w-full max-w-md bg-gray-800 p-6 rounded-xl border-4 border-yellow-500 animate-pulse">
                        <p className="text-yellow-300 text-center mb-3 text-sm" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                            ⚡ PROCESSING WINNER ⚡
                        </p>
                        <div className="bg-black p-6 rounded-lg border-2 border-yellow-600">
                            <p className="text-2xl text-yellow-400 font-bold text-center" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                                NEXT PERIOD STARTING SOON...
                            </p>
                        </div>
                        <p className="text-gray-400 text-center mt-4 text-xs" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                            (Usually takes less than 60 seconds)
                        </p>
                    </div>
                )}

                {/* Timer Display - Only shown in center when NO frog AND not processing */}
                {!hasFrog && !isProcessing && (
                    <div className="w-full max-w-md bg-gray-800 p-6 rounded-xl border-4 border-gray-700">
                        <p className="text-green-300 text-center mb-3 text-xs" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                            TIME REMAINING
                        </p>
                        <div className="bg-black p-6 rounded-lg border-2 border-gray-900">
                            <p className="text-4xl text-yellow-400 font-bold text-center" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                                {isLoading ? '...' : timeLeft}
                            </p>
                        </div>
                        {/* Prize Info */}
                        <div className="mt-4 bg-black p-6 rounded-lg border-2 border-gray-900" style={{ boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)' }}>
                            <p className="text-xs text-yellow-400 font-bold text-center mb-2" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                                $Ribbit Prize Pool:
                            </p>
                            <p className="text-2xl text-green-400 font-bold text-center" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                                {isPrizeLoading ? '...' : `${parseFloat(prizePool).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `}
                            </p>
                        </div>
                    </div>
                )}

                {/* Current Leading Frog - Only show when not processing */}
                {!isProcessing && (
                    isLoading ? (
                        <div className="text-center text-xl" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                            LOADING...
                        </div>
                    ) : fotdData?.currentFrog ? (
                        <div className="w-full max-w-md bg-gray-800 p-6 rounded-xl border-4 border-gray-700">
                            {/* Frog Image */}
                            <div className="mb-4">
                                <img
                                    src={fotdData.currentFrog.imageData}
                                    alt="Leading Frog"
                                    className="w-full h-auto border-4 border-gray-800 rounded-lg"
                                    style={{ imageRendering: 'pixelated' }}
                                />
                            </div>

                            {/* Rarity Score */}
                            <div className="bg-black p-2 rounded-md border border-gray-900 mb-2">
                                <p
                                    className="text-center text-lg"
                                    style={{
                                        fontFamily: "'Press Start 2P', cursive",
                                        color:
                                            fotdData.currentFrog.rarity.rank === 'LEGENDARY' ? '#ff6b35' :
                                                fotdData.currentFrog.rarity.rank === 'EPIC' ? '#a855f7' :
                                                    '#6ade8a'
                                    }}
                                >
                                    RARITY: {fotdData.currentFrog.rarity.score}
                                </p>
                            </div>

                            {/* Wallet Address */}
                            <div className="bg-black p-2 rounded-md border border-gray-900">
                                <p className="text-green-300 text-center text-xs mb-2" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                                    OWNER
                                </p>
                                <p className="text-white text-center text-xs break-all" style={{ fontFamily: "'Courier New', monospace" }}>
                                    {fotdData.currentFrog.walletAddress}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl border-4 border-gray-700">
                            <p className="text-center text-lg" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                                NO FROGS MINTED YET
                            </p>
                            <p className="text-center text-sm mt-4 text-gray-400" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                                BE THE FIRST!
                            </p>
                        </div>
                    )
                )}
            </div>
        </main>
    );
}