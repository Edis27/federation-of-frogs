"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface Frog {
    _id: string;
    walletAddress: string;
    imageData: string;
    rarity: {
        score: number;
        rank: string;
    };
    mintedAt: string;
}

export default function HallOfFame() {
    const router = useRouter();
    const [topFrogs, setTopFrogs] = useState<Frog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHallOfFame = async () => {
            try {
                const response = await fetch('/api/frogs/hall-of-fame');
                const data = await response.json();

                if (data.success) {
                    setTopFrogs(data.frogs);
                }
            } catch (error) {
                console.error('Error fetching hall of fame:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHallOfFame();
    }, []);

    const getMedalEmoji = (index: number) => {
        if (index === 0) return '1';
        if (index === 1) return '2';
        if (index === 2) return '3';
        return `${index + 1}`;
    };

    const getMedalColor = (index: number) => {
        if (index === 0) return '#FFD700'; // Gold
        if (index === 1) return '#C0C0C0'; // Silver
        if (index === 2) return '#CD7F32'; // Bronze
        return '#FFFFFF'; // White for rest
    };

    const getCardGlow = (index: number) => {
        if (index === 0) return '0 0 20px rgba(255, 215, 0, 0.6), 0 10px 25px -5px rgba(0, 0, 0, 0.8)';
        if (index === 1) return '0 0 20px rgba(192, 192, 192, 0.6), 0 10px 25px -5px rgba(0, 0, 0, 0.8)';
        if (index === 2) return '0 0 20px rgba(205, 127, 50, 0.6), 0 10px 25px -5px rgba(0, 0, 0, 0.8)';
        return '0 10px 25px -5px rgba(0, 0, 0, 0.8)';
    };

    return (
        <main className="min-h-screen w-full relative flex flex-col items-center p-4 text-white font-mono">
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

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl w-full mt-20 mb-8">
                <h1 className="text-5xl md:text-6xl text-center pixel-3d mb-8">
                    HALL OF FAME
                </h1>

                {isLoading ? (
                    <div className="text-center text-2xl" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                        Loading...
                    </div>
                ) : topFrogs.length === 0 ? (
                    <div className="text-center text-xl" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                        No frogs minted yet! Be the first!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {topFrogs.map((frog, index) => (
                            <div
                                key={frog._id}
                                className="bg-gray-800 p-2 rounded-lg border-2 border-gray-700 hover:border-green-500 transition-all"
                                style={{ boxShadow: getCardGlow(index) }}
                            >
                                {/* Rank Badge */}
                                <div className="flex items-center justify-between mb-1">
                                    <div
                                        className="text-2xl font-bold"
                                        style={{
                                            fontFamily: "'Press Start 2P', cursive",
                                            color: getMedalColor(index)
                                        }}
                                    >
                                        {getMedalEmoji(index)}
                                    </div>
                                </div>

                                {/* Frog Image */}
                                <div className="mb-1 flex justify-center">
                                    <img
                                        src={frog.imageData}
                                        alt={`Frog #${index + 1}`}
                                        className="w-3/4 h-auto border-2 border-gray-800 rounded"
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                </div>

                                {/* Rarity Score */}
                                <div className="bg-black p-1.5 rounded border border-gray-900 mb-1">
                                    <p
                                        className="text-center"
                                        style={{
                                            fontFamily: "'Press Start 2P', cursive",
                                            fontSize: '10px'
                                        }}
                                    >
                                        Rarity: {frog.rarity.score}
                                    </p>
                                </div>

                                {/* Owner */}
                                <div className="bg-black p-1.5 rounded border border-gray-900">
                                    <p className="text-[9px] text-gray-400 text-center break-all">
                                        Owner: {frog.walletAddress.slice(0, 4)}...{frog.walletAddress.slice(-4)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}