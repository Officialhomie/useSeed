'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { http, TransactionRequest } from 'viem';
import { baseSepolia } from 'viem/chains';
import {
  createSmartAccountClient,
  toNexusAccount,
  NexusClient,
  createBicoPaymasterClient
} from '@biconomy/abstractjs';
import { useWallets, usePrivy } from '@privy-io/react-auth';

type BiconomyContextType = {
  nexusClient: NexusClient | null;
  smartAccountAddress: string | null;
  isInitializing: boolean;
  error: string | null;
};

const BiconomyContext = createContext<BiconomyContextType>({
  nexusClient: null,
  smartAccountAddress: null,
  isInitializing: false,
  error: null,
});

export const useBiconomy = () => useContext(BiconomyContext);

interface BiconomyProviderProps {
  children: ReactNode;
  rpcUrl?: string;
}

interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: string;
  salt?: string;
}

interface TypedDataTypes {
  [key: string]: Array<{ name: string; type: string }>;
}

export function BiconomyProvider({
  children,
  rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
}: BiconomyProviderProps) {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [nexusClient, setNexusClient] = useState<NexusClient | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeBiconomy = async () => {
      if (!authenticated || !wallets || wallets.length === 0) return;

      try {
        setIsInitializing(true);
        setError(null);

        const embeddedWallet = wallets.find(
          (wallet) => wallet.walletClientType === 'privy'
        );

        if (!embeddedWallet) {
          throw new Error('Embedded wallet not found. Make sure Privy is set up.');
        }

        const provider = await embeddedWallet.getEthereumProvider();

        const signer = {
          address: embeddedWallet.address as `0x${string}`,
          getAddress: async () => embeddedWallet.address,
          signMessage: async (message: string) => {
            return provider.request({
              method: 'personal_sign',
              params: [message, embeddedWallet.address],
            }) as Promise<string>;
          },
          signTransaction: async (transaction: TransactionRequest) => {
            return provider.request({
              method: 'eth_signTransaction',
              params: [transaction],
            }) as Promise<string>;
          },
          signTypedData: async (domain: TypedDataDomain, types: TypedDataTypes, value: Record<string, unknown>) => {
            return provider.request({
              method: 'eth_signTypedData_v4',
              params: [embeddedWallet.address, JSON.stringify({ domain, types, message: value })],
            }) as Promise<string>;
          },
          provider,
        };

        // Convert to Biconomy Nexus Account
        const nexusAccount = await toNexusAccount({
          signer,
          chain: baseSepolia,
          transport: http(rpcUrl),
        });

        const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_URL;
        const apiKey = process.env.NEXT_PUBLIC_BICONOMY_API_KEY;

        if (!bundlerUrl || !apiKey) {
          throw new Error('Bundler URL or API key is not set');
        }

        // Create Smart Account Client
        const client = await createSmartAccountClient({
          account: nexusAccount,
          transport: http(bundlerUrl),
          paymaster: apiKey ? createBicoPaymasterClient({
            paymasterUrl: apiKey
          }) : undefined
        });

        const accountAddress = await client.account.address;

        setNexusClient(client);
        setSmartAccountAddress(accountAddress);
      } catch (err) {
        console.error('Error initializing Biconomy:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Biconomy');
      } finally {
        setIsInitializing(false);
      }
    };

    if (authenticated && wallets.length > 0) {
      initializeBiconomy();
    }
  }, [authenticated, wallets, rpcUrl]);

  const value = {
    nexusClient,
    smartAccountAddress,
    isInitializing,
    error,
  };

  return (
    <BiconomyContext.Provider value={value}>
      {children}
    </BiconomyContext.Provider>
  );
}
