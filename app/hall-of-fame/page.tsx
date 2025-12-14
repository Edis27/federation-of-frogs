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
    traits?: {
        background: { path: string; weight: number };
        type: { path: string; weight: number };
        head: { path: string; weight: number };
        body: { path: string; weight: number };
        eyes: { path: string; weight: number };
        mouth: { path: string; weight: number };
        accessory: { path: string; weight: number };
    };
}

export default function HallOfFame() {
    const router = useRouter();
    const [topFrogs, setTopFrogs] = useState<Frog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFrog, setSelectedFrog] = useState<Frog | null>(null);

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

    // Helper function to get trait name from path
    const getTraitName = (path: string): string => {
        const name = path.split('/').pop()?.replace('.png', '').replace('background-', '').replace('body-', '').replace('head-', '') || '';
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    // Helper function to calculate rarity percentage from weight
    const getRarityPercentage = (weight: number): string => {
        // Total weights: BACKGROUNDS (100), BODIES (100), HEADS (100)
        // Percentage = (weight / total) * 100
        return `${weight}%`;
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
                <h1 className="text-5xl md:text-6xl text-center pixel-3d mb-16">
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
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                        {topFrogs.map((frog, index) => {
                            // Determine glow color based on rank
                            let glowColor = '';
                            if (index === 0) glowColor = '0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.5)'; // Gold
                            else if (index === 1) glowColor = '0 0 30px rgba(192, 192, 192, 0.8), 0 0 60px rgba(192, 192, 192, 0.5)'; // Silver
                            else if (index === 2) glowColor = '0 0 30px rgba(205, 127, 50, 0.8), 0 0 60px rgba(205, 127, 50, 0.5)'; // Bronze

                            return (
                                <div 
                                    key={frog._id} 
                                    className="cursor-pointer relative"
                                    onClick={() => setSelectedFrog(frog)}
                                >
                                    {/* Just the Frog Image with depth effect */}
                                    <img
                                        src={frog.imageData}
                                        alt={`Frog #${index + 1}`}
                                        className="w-full h-auto rounded-lg transition-all duration-300 hover:scale-110 hover:translate-x-[-2px] hover:translate-y-[-2px] relative z-10"
                                        style={{ 
                                            imageRendering: 'pixelated',
                                            boxShadow: glowColor 
                                                ? `6px 6px 0 0 rgba(0, 0, 0, 0.3), ${glowColor}`
                                                : '6px 6px 0 0 rgba(0, 0, 0, 0.3)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (glowColor) {
                                                e.currentTarget.style.boxShadow = `8px 8px 0 0 rgba(34, 197, 94, 0.6), ${glowColor}`;
                                            } else {
                                                e.currentTarget.style.boxShadow = '8px 8px 0 0 rgba(34, 197, 94, 0.6)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (glowColor) {
                                                e.currentTarget.style.boxShadow = `6px 6px 0 0 rgba(0, 0, 0, 0.3), ${glowColor}`;
                                            } else {
                                                e.currentTarget.style.boxShadow = '6px 6px 0 0 rgba(0, 0, 0, 0.3)';
                                            }
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* FROG DETAIL MODAL */}
            {selectedFrog && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedFrog(null)}
                >
                    <div 
                        className="bg-gray-900 rounded-xl max-w-4xl w-full p-8 relative"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedFrog(null)}
                            className="absolute top-4 right-4 text-white text-2xl hover:text-red-500 transition-colors"
                            style={{ fontFamily: "'Press Start 2P', cursive" }}
                        >
                            ✕
                        </button>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                            {/* Left Side - Frog Image */}
                            <div>
                                <img
                                    src={selectedFrog.imageData}
                                    alt="Selected Frog"
                                    className="w-full h-auto rounded-lg border-4 border-gray-700"
                                    style={{ imageRendering: 'pixelated' }}
                                />
                                
                                {/* Rarity Score Below Image */}
                                <div className="mt-4 bg-black p-4 rounded-lg border-2 border-gray-800">
                                    <p 
                                        className="text-center text-xl"
                                        style={{
                                            fontFamily: "'Press Start 2P', cursive",
                                            color:
                                                selectedFrog.rarity.rank === 'LEGENDARY' ? '#ff6b35' :
                                                    selectedFrog.rarity.rank === 'EPIC' ? '#a855f7' :
                                                        '#6ade8a'
                                        }}
                                    >
                                        {selectedFrog.rarity.rank}
                                    </p>
                                    <p 
                                        className="text-center text-sm mt-2 text-gray-400"
                                        style={{ fontFamily: "'Press Start 2P', cursive" }}
                                    >
                                        Rarity: {selectedFrog.rarity.score}
                                    </p>
                                </div>
                            </div>

                            {/* Right Side - Traits */}
                            <div>
                                <h2 
                                    className="text-2xl mb-6 text-white"
                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                >
                                    Traits
                                </h2>

                                {selectedFrog.traits ? (
                                    <div className="space-y-4">
                                        {/* Background Trait */}
                                        <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <p 
                                                    className="text-sm text-gray-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    BACKGROUND
                                                </p>
                                                <p 
                                                    className="text-sm text-purple-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    {getRarityPercentage(selectedFrog.traits.background.weight)}
                                                </p>
                                            </div>
                                            <p 
                                                className="text-lg text-white"
                                                style={{ fontFamily: "'Press Start 2P', cursive" }}
                                            >
                                                {getTraitName(selectedFrog.traits.background.path)}
                                            </p>
                                        </div>

                                        {/* Type Trait */}
                                        <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <p 
                                                    className="text-sm text-gray-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    TYPE
                                                </p>
                                                <p 
                                                    className="text-sm text-purple-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    {getRarityPercentage(selectedFrog.traits.type.weight)}
                                                </p>
                                            </div>
                                            <p 
                                                className="text-lg text-white"
                                                style={{ fontFamily: "'Press Start 2P', cursive" }}
                                            >
                                                {getTraitName(selectedFrog.traits.type.path)}
                                            </p>
                                        </div>

                                        {/* Head Trait */}
                                        <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <p 
                                                    className="text-sm text-gray-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    HEAD
                                                </p>
                                                <p 
                                                    className="text-sm text-purple-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    {getRarityPercentage(selectedFrog.traits.head.weight)}
                                                </p>
                                            </div>
                                            <p 
                                                className="text-lg text-white"
                                                style={{ fontFamily: "'Press Start 2P', cursive" }}
                                            >
                                                {getTraitName(selectedFrog.traits.head.path)}
                                            </p>
                                        </div>

                                        {/* Body Trait */}
                                        <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <p 
                                                    className="text-sm text-gray-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    BODY
                                                </p>
                                                <p 
                                                    className="text-sm text-purple-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    {getRarityPercentage(selectedFrog.traits.body.weight)}
                                                </p>
                                            </div>
                                            <p 
                                                className="text-lg text-white"
                                                style={{ fontFamily: "'Press Start 2P', cursive" }}
                                            >
                                                {getTraitName(selectedFrog.traits.body.path)}
                                            </p>
                                        </div>

                                        {/* Eyes Trait */}
                                        <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <p 
                                                    className="text-sm text-gray-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    EYES
                                                </p>
                                                <p 
                                                    className="text-sm text-purple-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    {getRarityPercentage(selectedFrog.traits.eyes.weight)}
                                                </p>
                                            </div>
                                            <p 
                                                className="text-lg text-white"
                                                style={{ fontFamily: "'Press Start 2P', cursive" }}
                                            >
                                                {getTraitName(selectedFrog.traits.eyes.path)}
                                            </p>
                                        </div>

                                        {/* Mouth Trait */}
                                        <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <p 
                                                    className="text-sm text-gray-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    MOUTH
                                                </p>
                                                <p 
                                                    className="text-sm text-purple-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    {getRarityPercentage(selectedFrog.traits.mouth.weight)}
                                                </p>
                                            </div>
                                            <p 
                                                className="text-lg text-white"
                                                style={{ fontFamily: "'Press Start 2P', cursive" }}
                                            >
                                                {getTraitName(selectedFrog.traits.mouth.path)}
                                            </p>
                                        </div>

                                        {/* Accessory Trait */}
                                        <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <p 
                                                    className="text-sm text-gray-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    ACCESSORY
                                                </p>
                                                <p 
                                                    className="text-sm text-purple-400"
                                                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                                                >
                                                    {getRarityPercentage(selectedFrog.traits.accessory.weight)}
                                                </p>
                                            </div>
                                            <p 
                                                className="text-lg text-white"
                                                style={{ fontFamily: "'Press Start 2P', cursive" }}
                                            >
                                                {getTraitName(selectedFrog.traits.accessory.path)}
                                            </p>
                                        </div>

                                        {/* Owner */}
                                        <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-700 mt-6">
                                            <p 
                                                className="text-sm text-gray-400 mb-2"
                                                style={{ fontFamily: "'Press Start 2P', cursive" }}
                                            >
                                                OWNED BY
                                            </p>
                                            <p 
                                                className="text-xs text-white break-all"
                                                style={{ fontFamily: "'Courier New', monospace" }}
                                            >
                                                {selectedFrog.walletAddress}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-800 p-6 rounded-lg border-2 border-gray-700">
                                        <p 
                                            className="text-center text-gray-400"
                                            style={{ fontFamily: "'Press Start 2P', cursive" }}
                                        >
                                            No trait data available
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}