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
    const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [txHash, setTxHash] = useState<string | null>(null);
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        // Check if user has a theme preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    };

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

    const handleSendTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!embeddedWalletAddress || !recipientAddress || !amount) return;

        try {
            setIsLoading(true);
            setError(null);
            setTxStatus('pending');

            const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === 'privy');
            if (!embeddedWallet) throw new Error('Embedded wallet not found');

            const provider = await embeddedWallet.getEthereumProvider();
            
            const tx = {
                from: embeddedWalletAddress,
                to: recipientAddress,
                value: `0x${(parseFloat(amount) * 1e18).toString(16)}`,
            };

            const txHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [tx],
            });

            setTxHash(txHash as string);
            setTxStatus('success');
            
            // Reset form
            setRecipientAddress('');
            setAmount('');
            
            // Refresh balance
            const newBalance = await provider.request({
                method: 'eth_getBalance',
                params: [embeddedWalletAddress, 'latest']
            });
            setBalance(parseInt(newBalance as string, 16).toString());

        } catch (err) {
            console.error('Transaction error:', err);
            setError(err instanceof Error ? err.message : 'Failed to send transaction');
            setTxStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <div className="max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="text-center flex-1">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Biconomy Nexus with Privy</h1>
                        {authenticated && user && (
                            <p className="text-gray-600 dark:text-gray-300">Welcome, {user.email?.address || 'Wallet User'}</p>
                        )}
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                        aria-label="Toggle dark mode"
                    >
                        {isDarkMode ? (
                            <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg">
                        <p>{error}</p>
                    </div>
                )}

                {isLoading && (
                    <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-700 dark:border-yellow-300 mr-2"></div>
                            <p className="text-yellow-700 dark:text-yellow-200">Initializing wallets...</p>
                        </div>
                    </div>
                )}

                {authenticated ? (
                    <div className="space-y-4">
                        {address && (
                            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Primary Wallet</h2>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Address</label>
                                        <div className="mt-1 flex items-center">
                                            <code className="block bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm flex-1 text-gray-900 dark:text-gray-100">
                                                {formatAddress(address)}
                                            </code>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(address)}
                                                className="ml-2 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {embeddedWalletAddress && (
                            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Embedded Wallet</h2>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Address</label>
                                        <div className="mt-1 flex items-center">
                                            <code className="block bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm flex-1 text-gray-900 dark:text-gray-100">
                                                {formatAddress(embeddedWalletAddress)}
                                            </code>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(embeddedWalletAddress)}
                                                className="ml-2 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    </div>
                                    {balance && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Balance</label>
                                            <div className="mt-1">
                                                <code className="block bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm text-gray-900 dark:text-gray-100">
                                                    {(parseInt(balance) / 1e18).toFixed(4)} ETH
                                                </code>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {smartAccountAddress && (
                            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Smart Account</h2>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Address</label>
                                        <div className="mt-1 flex items-center">
                                            <code className="block bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm flex-1 text-gray-900 dark:text-gray-100">
                                                {formatAddress(smartAccountAddress)}
                                            </code>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(smartAccountAddress)}
                                                className="ml-2 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900"
                            >
                                Disconnect Wallet
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <button
                            onClick={login}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                        >
                            Connect Wallet
                        </button>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                            Connect your wallet to get started with Biconomy Nexus
                        </p>
                    </div>
                )}

                {authenticated && (
                    <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Connected Wallets</h2>
                        <div className="space-y-4">
                            {wallets.map((wallet) => (
                                <div key={wallet.address} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{wallet.walletClientType}</p>
                                            <code className="text-sm text-gray-600 dark:text-gray-300">
                                                {formatAddress(wallet.address)}
                                            </code>
                                        </div>
                                        {wallet.walletClientType === 'privy' && (
                                            <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-full">
                                                Embedded
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {authenticated && embeddedWalletAddress && (
                    <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Send Transaction</h2>
                        <form onSubmit={handleSendTransaction} className="space-y-4">
                            <div>
                                <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Recipient Address
                                </label>
                                <input
                                    type="text"
                                    id="recipient"
                                    value={recipientAddress}
                                    onChange={(e) => setRecipientAddress(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                                    placeholder="0x..."
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Amount (ETH)
                                </label>
                                <input
                                    type="number"
                                    id="amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                                    placeholder="0.0"
                                    step="0.0001"
                                    min="0"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || txStatus === 'pending'}
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Sending...
                                    </>
                                ) : (
                                    'Send Transaction'
                                )}
                            </button>
                        </form>

                        {txStatus === 'success' && txHash && (
                            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200 rounded-lg">
                                <p className="font-medium">Transaction Successful!</p>
                                <a
                                    href={`https://sepolia.basescan.org/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm underline mt-1 block"
                                >
                                    View on BaseScan
                                </a>
                            </div>
                        )}

                        {txStatus === 'error' && error && (
                            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg">
                                <p className="font-medium">Transaction Failed</p>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}