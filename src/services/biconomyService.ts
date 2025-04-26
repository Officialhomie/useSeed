import { 
    toNexusAccount, 
    createSmartAccountClient, 
    smartSessionActions 
  } from '@biconomy/abstractjs';
  import { http } from 'viem';
  import { baseSepolia } from 'viem/chains';
  import { usePrivy, useWallets } from '@privy-io/react-auth';
  import { SmartSession } from './sessionService';
  
  
  // Types for session redemption
  export interface RedemptionCall {
    to: `0x${string}`;
    data: `0x${string}`;
  }
  
  export interface RedemptionResult {
    userOpHash: `0x${string}`;
    success: boolean;
    error?: string;
  }
  
  // Define the BiconomySessionDetails interface
  export interface BiconomySessionDetails {
    sessionID: string;
    sessionPublicKey: string;
    sessionKeyData: {
      permissionIDs: string[];
    };
    [key: string]: any; // For any additional properties
  }
  
  // Hook to manage session redemption
  export function useBiconomyRedemption() {
    const { authenticated, user } = usePrivy();
    const { wallets } = useWallets();
  
    // Helper to get the signer from wallets
    const getSigner = async () => {
      if (!authenticated || !wallets.length) {
        throw new Error('User not authenticated or no wallets available');
      }
  
      // Find the embedded wallet (created by Privy)
      const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
      if (!embeddedWallet) {
        throw new Error('Embedded wallet not found');
      }
  
      const provider = await embeddedWallet.getEthereumProvider();
      const address = embeddedWallet.address;
  
      // Create a signer object for Biconomy
      const signer = {
        address: address as `0x${string}`,
        getAddress: async () => address,
        signMessage: async (message: string) => {
          return provider.request({
            method: 'personal_sign',
            params: [message, address],
          }) as Promise<string>;
        },
        signTransaction: async (transaction: any) => {
          return provider.request({
            method: 'eth_signTransaction',
            params: [transaction],
          }) as Promise<string>;
        },
        signTypedData: async (domain: any, types: any, value: any) => {
          return provider.request({
            method: 'eth_signTypedData_v4',
            params: [address, JSON.stringify({ domain, types, message: value })],
          }) as Promise<string>;
        },
        provider,
      };
  
      return signer;
    };
  
    // Function to redeem a session
    const redeemSession = async (
      session: SmartSession, 
      calls: RedemptionCall[],
      isFirstUsage: boolean = false
    ): Promise<RedemptionResult> => {
      try {
        if (!authenticated) {
          throw new Error('User not authenticated');
        }
  
        // Get the signer
        const signer = await getSigner();
  
        // Default RPC URL for Base Sepolia
        const rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
        
        // Create an emulated account pointing to the owner's smart account address
        const emulatedAccount = await toNexusAccount({
          accountAddress: session.owner as `0x${string}`,
          signer,
          chain: baseSepolia,
          transport: http(rpcUrl)
        });
  
        // Create a client for the emulated account
        const emulatedClient = createSmartAccountClient({
          account: emulatedAccount,
          transport: http(rpcUrl),
          mock: false // Set to false in production
        });
  
        // Extend the client with Smart Sessions actions
        const smartSessionsClient = emulatedClient.extend(smartSessionActions());
  
        // Use the permission
        const userOpHash = await smartSessionsClient.usePermission({
            sessionDetails: session.sessionDetails as any, // Force type assertion to bypass TypeScript check
            calls,
            mode: session.currentUsageCount === 0 ? "ENABLE_AND_USE" : "USE" // Explicitly provide mode parameter
        });
  
        // Wait for the transaction to be processed
        const receipt = await emulatedClient.waitForUserOperationReceipt({
          hash: userOpHash
        });
  
        if (!receipt.success) {
          throw new Error("Smart sessions module validation failed");
        }
  
        return {
          userOpHash,
          success: true
        };
      } catch (error) {
        console.error('Error redeeming session:', error);
        return {
          userOpHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    };
  
    // Helper function to encode function data
    const encodeFunctionData = (functionSelector: string, ...params: any[]): `0x${string}` => {
      // This is a simplified version - in a real implementation, you'd want to use 
      // ethers.js or viem to properly encode function data with parameters
      return functionSelector as `0x${string}`;
    };
  
    return {
      redeemSession,
      encodeFunctionData
    };
  }