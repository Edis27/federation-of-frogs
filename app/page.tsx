"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
    const router = useRouter();

    const frogImages = [
        '/frog1.png',
        '/frog2.png',
        '/frog3.png',
        '/frog4.png',
        '/frog5.png',
        '/frog6.png',
        '/frog7.png',
        '/frog8.png',
    ];

    const duplicatedImages = [...frogImages, ...frogImages];

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

            {/* Social Links - Top Right - Mobile Responsive */}
            <div className="absolute top-4 right-4 z-20 flex gap-2 md:gap-4">
                <a
                    href="https://x.com/FedOfFrogs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-green-500 hover:border-green-400 transition-all hover:scale-110"
                    style={{ boxShadow: '0 0 20px rgba(106, 188, 58, 0.5)' }}
                >
                    <img
                        src="/Twitter.png"
                        alt="X/Twitter"
                        className="w-full h-full object-cover"
                    />
                </a>
                <a
                    href="https://pump.fun/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-green-500 hover:border-green-400 transition-all hover:scale-110"
                    style={{ boxShadow: '0 0 20px rgba(106, 188, 58, 0.5)' }}
                >
                    <img
                        src="/Pumpfun.png"
                        alt="Pump.fun"
                        className="w-full h-full object-cover"
                    />
                </a>
            </div>

            {/* Content Container - Mobile Responsive */}
            <div className="relative z-10 max-w-4xl w-full flex flex-col items-center gap-8 md:gap-12 mt-20 md:mt-0">
                {/* Title - Mobile Responsive */}
                <h1
                    className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl text-center pixel-3d px-4"
                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                >
                    FEDERATION OF FROGS
                </h1>

                {/* Scrolling Frog Gallery - Mobile Responsive */}
                <div className="w-full overflow-hidden py-4 md:py-8">
                    <div className="relative">
                        <div
                            className="flex gap-3 md:gap-6 animate-scroll"
                            style={{
                                width: 'fit-content',
                            }}
                        >
                            {duplicatedImages.map((img, index) => (
                                <div
                                    key={index}
                                    className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-gray-800 rounded-lg border-4 border-gray-800 overflow-hidden"
                                    style={{ boxShadow: '0 0 20px rgba(106, 188, 58, 0.5)' }}
                                >
                                    <img
                                        src={img}
                                        alt={`Frog ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mint Button - Mobile Responsive */}
                <button
                    onClick={() => router.push('/mint')}
                    className="pixel-button text-xs sm:text-sm md:text-base"
                    style={{
                        padding: '15px 30px',
                        minWidth: '200px',
                        maxWidth: '90%',
                    }}
                >
                    ENTER FROG FOREST
                </button>
            </div>
            {/* Copyright Statement - Bottom */}
            <div className="absolute bottom-4 left-0 right-0 z-20 text-center">
                <p
                    className="text-[8px] sm:text-[10px] md:text-xs text-gray-300"
                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                >
                    © 2025 FEDERATION OF FROGS. ALL RIGHTS RESERVED.
                </p>
            </div>
        </main>
    );
}