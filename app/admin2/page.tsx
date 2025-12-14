"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const router = useRouter();
    const [isClearing, setIsClearing] = useState(false);
    const [message, setMessage] = useState('');

    const handleClearFrogs = async () => {
        if (!confirm('⚠️ Are you sure you want to delete ALL frogs from the database? This cannot be undone!')) {
            return;
        }

        setIsClearing(true);
        setMessage('');

        try {
            const response = await fetch('/api/frogs/clear', {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                setMessage(`✅ Successfully deleted ${data.deletedCount} frogs!`);
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch (error) {
            setMessage(`❌ Error: ${error.message}`);
            console.error('Error clearing frogs:', error);
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <main className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 text-white font-mono bg-gray-900">
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
                <button onClick={() => router.push('/admin')} className="nav-link">
                    ADMIN
                </button>
            </div>

            {/* Main Content */}
            <div className="max-w-2xl w-full bg-gray-800 p-8 rounded-xl border-4 border-gray-700">
                <h1 
                    className="text-4xl text-center mb-8 text-red-500"
                    style={{ fontFamily: "'Press Start 2P', cursive" }}
                >
                    ADMIN PANEL
                </h1>

                <div className="bg-gray-900 p-6 rounded-lg border-2 border-gray-700 mb-6">
                    <h2 
                        className="text-xl mb-4 text-yellow-400"
                        style={{ fontFamily: "'Press Start 2P', cursive" }}
                    >
                        Database Management
                    </h2>
                    
                    <p className="text-sm text-gray-400 mb-6" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                        ⚠️ Warning: This will permanently delete all frogs from the database!
                    </p>

                    <button
                        onClick={handleClearFrogs}
                        disabled={isClearing}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 border-4 border-red-800"
                        style={{ 
                            fontFamily: "'Press Start 2P', cursive",
                            boxShadow: '6px 6px 0 0 rgba(0, 0, 0, 0.3)'
                        }}
                    >
                        {isClearing ? 'CLEARING...' : '🗑️ CLEAR ALL FROGS'}
                    </button>
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`bg-black p-4 rounded-lg border-2 ${message.includes('✅') ? 'border-green-500' : 'border-red-500'}`}>
                        <p 
                            className="text-center text-sm"
                            style={{ fontFamily: "'Press Start 2P', cursive" }}
                        >
                            {message}
                        </p>
                    </div>
                )}

                {/* Info Box */}
                <div className="mt-6 bg-blue-900 bg-opacity-30 p-4 rounded-lg border-2 border-blue-700">
                    <p className="text-xs text-blue-300" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                        💡 Tip: Use this to clear old frogs when testing the new traits system.
                    </p>
                </div>
            </div>
        </main>
    );
}