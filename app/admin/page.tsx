"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const processWinner = async () => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/frogs/fotd/process-winner', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 666f2d0b7ab2784289893e46bdb5debc37a3fed10c95a0b3edf5311e918beea0',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to process winner');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 text-white">
      <div className="absolute inset-0 bg-black/40" />

      {/* NAVIGATION */}
      <div className="absolute top-6 left-6 z-20 flex gap-6">
        <button onClick={() => router.push('/')} className="nav-link">
          HOME
        </button>
        <button onClick={() => router.push('/mint')} className="nav-link">
          MINTING BAY
        </button>
        <button onClick={() => router.push('/hall-of-fame')} className="nav-link">
          HALL OF FAME
        </button>
        <button onClick={() => router.push('/fotd')} className="nav-link">
          F.O.T.D
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center gap-8">
        <h1 className="text-4xl md:text-5xl text-center pixel-3d" style={{ fontFamily: "'Press Start 2P', cursive" }}>
          ADMIN PANEL
        </h1>

        <div className="w-full bg-gray-800 p-8 rounded-xl border-4 border-gray-700">
          <h2 className="text-2xl text-center mb-6" style={{ fontFamily: "'Press Start 2P', cursive" }}>
            MANUAL TESTING
          </h2>

          <button
            onClick={processWinner}
            disabled={isProcessing}
            className="pixel-button w-full mb-6"
          >
            {isProcessing ? 'PROCESSING...' : 'PROCESS WINNER NOW'}
          </button>

          {/* Result Display */}
          {result && (
            <div className="bg-green-900/50 border-2 border-green-500 rounded-lg p-6 mb-4">
              <p className="text-green-300 text-sm mb-3" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                ✅ SUCCESS
              </p>
              <div className="bg-black/50 p-4 rounded text-xs font-mono">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-6">
              <p className="text-red-300 text-sm mb-3" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                ❌ ERROR
              </p>
              <div className="bg-black/50 p-4 rounded text-xs font-mono">
                <p className="text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
            <p className="text-blue-200 text-xs leading-relaxed" style={{ fontFamily: "'Press Start 2P', cursive" }}>
              TESTING STEPS:
            </p>
            <ol className="text-blue-200 text-xs mt-3 space-y-2 font-mono">
              <li>1. Mint a frog in the Minting Bay</li>
              <li>2. Wait 3 minutes (period duration)</li>
              <li>3. Click "PROCESS WINNER NOW"</li>
              <li>4. Check FOTD page for results</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}