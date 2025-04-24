'use client'

import { useEffect, useState } from 'react';
import { http } from "viem";
import { baseSepolia } from "viem/chains";
import { createSmartAccountClient, NexusClient } from "@biconomy/abstractjs";
import { useWallets, usePrivy } from '@privy-io/react-auth';

export default function Home() {
    const { login, logout, authenticated, user } = usePrivy();
    const { wallets } = useWallets();
    const [address, setAddress] = useState<string | null>(null);
    const [embeddedWalletAddress, setEmbeddedWalletAddress] = useState<string | null>(null);
    const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [balance, setBalance] = useState<string | null>(null);

    // Function to format address for display
    const formatAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    useEffect(() => {
        const initializeWallets = async () => {
            if (!wallets || wallets.length === 0) return;
            
            try {
                setIsLoading(true);
                setError(null);

                // Find the embedded wallet (created by Privy)
                const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === 'privy');
                
                if (embeddedWallet) {
                    // Set the embedded wallet address
                    const walletAddress = await embeddedWallet.address;
                    setEmbeddedWalletAddress(walletAddress);
                    
                    // Get embedded wallet balance
                    const provider = await embeddedWallet.getEthereumProvider();
                    const balance = await provider.request({
                        method: 'eth_getBalance',
                        params: [walletAddress, 'latest']
                    });
                    setBalance(parseInt(balance as string, 16).toString());

                    // For demo purposes using a mock implementation
                    // In production uncomment the code below for actual Biconomy integration
                    setSmartAccountAddress(`0x${walletAddress.substring(4)}`);
                }
                
                // Set the primary wallet address (could be external or embedded)
                if (wallets[0]) {
                    setAddress(wallets[0].address);
                }

            } catch (err) {
                console.error("Error initializing wallets:", err);
                setError("Failed to initialize wallets. See console for details.");
            } finally {
                setIsLoading(false);
            }
        };

        if (authenticated && wallets?.length > 0) {
            initializeWallets();
        }
    }, [wallets, authenticated]);

    return (
        <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="max-w-lg mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Biconomy Nexus with Privy</h1>
                    {authenticated && user && (
                        <p className="text-gray-600">Welcome, {user.email?.address || 'Wallet User'}</p>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                        <p>{error}</p>
                    </div>
                )}

                {isLoading && (
                    <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-700 mr-2"></div>
                            <p>Initializing wallets...</p>
                        </div>
                    </div>
                )}

                {authenticated ? (
                    <div className="space-y-4">
                        {address && (
                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-lg font-semibold mb-4">Primary Wallet</h2>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600">Address</label>
                                        <div className="mt-1 flex items-center">
                                            <code className="block bg-gray-50 p-2 rounded text-sm flex-1">
                                                {formatAddress(address)}
                                            </code>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(address)}
                                                className="ml-2 p-2 text-gray-500 hover:text-gray-700"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {embeddedWalletAddress && (
                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-lg font-semibold mb-4">Embedded Wallet</h2>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600">Address</label>
                                        <div className="mt-1 flex items-center">
                                            <code className="block bg-gray-50 p-2 rounded text-sm flex-1">
                                                {formatAddress(embeddedWalletAddress)}
                                            </code>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(embeddedWalletAddress)}
                                                className="ml-2 p-2 text-gray-500 hover:text-gray-700"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    </div>
                                    {balance && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600">Balance</label>
                                            <div className="mt-1">
                                                <code className="block bg-gray-50 p-2 rounded text-sm">
                                                    {(parseInt(balance) / 1e18).toFixed(4)} ETH
                                                </code>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {smartAccountAddress && (
                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-lg font-semibold mb-4">Smart Account</h2>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600">Address</label>
                                        <div className="mt-1 flex items-center">
                                            <code className="block bg-gray-50 p-2 rounded text-sm flex-1">
                                                {formatAddress(smartAccountAddress)}
                                            </code>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(smartAccountAddress)}
                                                className="ml-2 p-2 text-gray-500 hover:text-gray-700"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={logout}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Disconnect Wallet
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <button
                            onClick={login}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Connect Wallet
                        </button>
                        <p className="mt-4 text-sm text-gray-500">
                            Connect your wallet to get started with Biconomy Nexus
                        </p>
                    </div>
                )}

                {authenticated && (
                    <div className="mt-8 bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4">Connected Wallets</h2>
                        <div className="space-y-4">
                            {wallets.map((wallet) => (
                                <div key={wallet.address} className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{wallet.walletClientType}</p>
                                            <code className="text-sm text-gray-600">
                                                {formatAddress(wallet.address)}
                                            </code>
                                        </div>
                                        {wallet.walletClientType === 'privy' && (
                                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                Embedded
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}