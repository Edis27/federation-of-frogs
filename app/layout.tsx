// File: app/layout.tsx

"use client";

import './globals.css';
import React, { PropsWithChildren } from 'react';
import {
   ConnectionProvider,
   WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import '@solana/wallet-adapter-react-ui/styles.css';

// Try the standard Helius RPC format
const endpoint = 'https://rpc.helius.xyz/?api-key=7a3e3e81-3a09-4804-8148-e4b4c3f53d33';


const wallets = [
   new PhantomWalletAdapter(),
   new SolflareWalletAdapter(),
];

const WalletConnectProvider = ({ children }: PropsWithChildren<{}>) => (
   <ConnectionProvider 
       endpoint={endpoint}
       config={{
           commitment: 'confirmed',
           confirmTransactionInitialTimeout: 60000,
       }}
   >
       <WalletProvider wallets={wallets} autoConnect>
           <WalletModalProvider>
               {children}
           </WalletModalProvider>
       </WalletProvider>
   </ConnectionProvider>
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
   return (
       <html lang="en">
            <head>
               <title>Federation of Frogs</title>
               <meta name="description" content="Join the Federation and generate your frog today!" />
           </head>
           <body>
               <WalletConnectProvider>
                   {children}
               </WalletConnectProvider>
           </body>
       </html>
   );
}

