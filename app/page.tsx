"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
    const router = useRouter();

    // Array of frog image paths - update these with your actual image filenames
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

    // Duplicate the array for seamless loop
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
            {/* Dark overlay for better text readability */}
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


            {/* Social Links - Top Right */}
            <div className="absolute top-6 right-6 z-20 flex gap-4">
                <a
                    href="https://x.com/FedOfFrogs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-14 h-14 rounded-full overflow-hidden border-2 border-green-500 hover:border-green-400 transition-all hover:scale-110"
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
                    className="w-14 h-14 rounded-full overflow-hidden border-2 border-green-500 hover:border-green-400 transition-all hover:scale-110"
                    style={{ boxShadow: '0 0 20px rgba(106, 188, 58, 0.5)' }}
                >
                    <img
                        src="/Pumpfun.png"
                        alt="Pump.fun"
                        className="w-full h-full object-cover"
                    />
                </a>
            </div>



            {/* Content Container */}
            <div className="relative z-10 max-w-4xl w-full flex flex-col items-center gap-12">

                {/* Title */}
                <h1
                    className="text-4xl md:text-6xl lg:text-7xl text-center pixel-3d"
                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                >
                    FEDERATION OF FROGS
                </h1>



                {/* Scrolling Frog Gallery */}
                <div className="w-full overflow-hidden py-8">
                    <div className="relative">
                        <div
                            className="flex gap-6 animate-scroll"
                            style={{
                                width: 'fit-content',
                            }}
                        >
                            {duplicatedImages.map((img, index) => (
                                <div
                                    key={index}
                                    className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 bg-gray-800 rounded-lg border-4 border-gray-800 overflow-hidden"
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

                {/* Mint Button */}
                <button
                    onClick={() => router.push('/mint')}
                    className="pixel-button"
                    style={{
                        fontSize: '18px',
                        padding: '20px 60px',
                        minWidth: '300px',
                    }}
                >
                    ENTER MINTING BAY
                </button>
            </div>





        </main>
    );
}
