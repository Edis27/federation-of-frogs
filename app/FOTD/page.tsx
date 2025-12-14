"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function FOTDPage() {
    const router = useRouter();
    const [fotdData, setFotdData] = useState<FOTDData | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // Fetch current FOTD data
    const fetchFOTDData = async () => {
        try {
            const response = await fetch('/api/frogs/fotd');
            const data = await response.json();

            if (data.success) {
                setFotdData(data);
            }
        } catch (error) {
            console.error('Error fetching FOTD:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Format time remaining
    const formatTimeRemaining = (milliseconds: number): string => {
        if (milliseconds <= 0) return '00:00:00';

        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // Update countdown timer
    useEffect(() => {
        if (!fotdData) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const endTime = new Date(fotdData.periodEndsAt).getTime();
            const remaining = endTime - now;

            if (remaining <= 0) {
                setTimeLeft('00:00:00');
                // Refresh data when timer ends
                fetchFOTDData();
            } else {
                setTimeLeft(formatTimeRemaining(remaining));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [fotdData]);

    // Initial data fetch
    useEffect(() => {
        fetchFOTDData();
        // Poll for updates every 10 seconds
        const pollInterval = setInterval(fetchFOTDData, 10000);
        return () => clearInterval(pollInterval);
    }, []);

    const hasFrog = !isLoading && fotdData?.currentFrog;

    return (
        <main
            className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 text-white"
            style={{
                backgroundImage: 'url(/landing-background.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
            }}
        >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/40" />

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

            {/* Timer Display - Conditionally positioned (only when frog exists) */}
            {hasFrog && (
                <div className="absolute top-6 right-6 z-20 w-64 bg-gray-800 p-3 rounded-xl border-4 border-gray-700 transition-all duration-500">
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
                            Prize Pool: (link)
                        </p>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="relative z-10 max-w-4xl w-full flex flex-col items-center gap-8">
                {/* Title */}
                <h1 className="text-4xl md:text-6xl text-center pixel-3d" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                    FROG OF THE DAY
                </h1>

                {/* Timer Display - Only shown in center when NO frog */}
                {!hasFrog && (
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
                            <p className="text-l text-yellow-400 font-bold text-center" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                                Prize Pool: (link)
                            </p>
                        </div>
                    </div>
                )}

                {/* Current Leading Frog or No Frog Message */}
                {isLoading ? (
                    <div className="text-center text-xl" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                        LOADING...
                    </div>
                ) : fotdData?.currentFrog ? (
                    <div className="w-full max-w-md bg-gray-800 p-6 rounded-xl border-4 border-gray-700">
                        <h2 className="text-2xl text-center mb-4 pixel-3d" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                            CURRENT LEADER
                        </h2>

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
                                MINTER
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
                )}
            </div>
        </main>
    );
}