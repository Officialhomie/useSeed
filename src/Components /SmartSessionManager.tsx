'use client'

import { useState } from 'react';
import { useBiconomy } from '@/providers/BiconomyProvider';
import { 
  smartSessionActions, 
  getSudoPolicy,
  toSmartSessionsModule
} from '@biconomy/abstractjs';
import { usePrivy } from '@privy-io/react-auth';

interface SmartSessionManagerProps {
  onSessionCreated?: (sessionDetails: any) => void;
}

export default function SmartSessionManager({ onSessionCreated }: SmartSessionManagerProps) {
  const { nexusClient, smartAccountAddress, isInitializing, error: biconomyError } = useBiconomy();
  const { user } = usePrivy();
  
  const [isModuleInstalled, setIsModuleInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [redeemerAddress, setRedeemerAddress] = useState('');
  const [targetContractAddress, setTargetContractAddress] = useState('');
  const [functionSelector, setFunctionSelector] = useState('');

  // Install the Smart Sessions module
  const installSmartSessionsModule = async () => {
    if (!nexusClient) {
      setError('Nexus client not initialized');
      return;
    }

    try {
      setIsInstalling(true);
      setError(null);

      // Create the Smart Sessions module using the helper function
      // This follows the documentation approach
      const smartSessionsModule = await toSmartSessionsModule({ 
        signer: nexusClient.account.signer
      });
      
      // Install the module
      const hash = await nexusClient.installModule({
        module: smartSessionsModule
      });
      
      console.log('Module installation transaction hash:', hash);
      
      // Wait for the transaction to be mined
      const { success } = await nexusClient.waitForUserOperationReceipt({ hash });
      
      if (success) {
        console.log('Smart Sessions module installed successfully');
        setIsModuleInstalled(true);
      } else {
        throw new Error('Failed to install Smart Sessions module');
      }
    } catch (err) {
      console.error('Error installing Smart Sessions module:', err);
      setError(err instanceof Error ? err.message : 'Installation failed');
    } finally {
      setIsInstalling(false);
    }
  };

  // Validates input fields
  const validateInputs = () => {
    // Check if addresses are properly formatted
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    const selectorRegex = /^(0x)?[a-fA-F0-9]{8}$/;
    
    if (!redeemerAddress || !addressRegex.test(redeemerAddress)) {
      setError('Please enter a valid Ethereum address for the redeemer');
      return false;
    }
    
    if (!targetContractAddress || !addressRegex.test(targetContractAddress)) {
      setError('Please enter a valid Ethereum address for the target contract');
      return false;
    }
    
    if (!functionSelector || !selectorRegex.test(functionSelector)) {
      setError('Please enter a valid function selector (e.g., 0x273ea3e3)');
      return false;
    }
    
    return true;
  };

  // Grant permission to a redeemer address
  const grantPermission = async () => {
    if (!nexusClient || !isModuleInstalled) {
      setError('Nexus client not initialized or module not installed');
      return;
    }

    if (!validateInputs()) {
      return;
    }

    try {
      setIsGranting(true);
      setError(null);

      // Format function selector with 0x prefix if needed
      const formattedSelector = functionSelector.startsWith('0x') 
        ? functionSelector as `0x${string}` 
        : `0x${functionSelector}` as `0x${string}`;

      // Extend the client with Smart Sessions actions
      const nexusSessionClient = nexusClient.extend(smartSessionActions());
      
      // Grant permission to the specified redeemer
      const response = await nexusSessionClient.grantPermission({
        redeemer: redeemerAddress as `0x${string}`,
        actions: [
          {
            actionTarget: targetContractAddress as `0x${string}`,
            actionTargetSelector: formattedSelector,
            actionPolicies: [getSudoPolicy()] // Using sudo policy which grants full access for this function
          }
        ]
      });
      
      console.log('Permission granted:', response);
      setSessionDetails(response);
      
      // Callback if provided
      if (onSessionCreated) {
        onSessionCreated(response);
      }

      // Save session data to localStorage
      if (smartAccountAddress) {
        try {
          localStorage.setItem(
            `session_${smartAccountAddress}_${redeemerAddress}`, 
            JSON.stringify(response)
          );
        } catch (storageError) {
          console.warn('Failed to save session to localStorage:', storageError);
          // Non-critical error, don't show to user
        }
      }
      
    } catch (err) {
      console.error('Error granting permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to grant permission');
    } finally {
      setIsGranting(false);
    }
  };

  // Reset form and errors
  const resetForm = () => {
    setRedeemerAddress('');
    setTargetContractAddress('');
    setFunctionSelector('');
    setError(null);
  };

  if (isInitializing) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-700 dark:border-yellow-300 mr-2"></div>
          <p className="text-yellow-700 dark:text-yellow-200">Initializing Biconomy...</p>
        </div>
      </div>
    );
  }

  if (biconomyError) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg">
        <p>Biconomy Error: {biconomyError}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Smart Session Manager</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-1 text-xs text-red-700 dark:text-red-200 underline"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {smartAccountAddress && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Your Smart Account Address:</div>
          <code className="block bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm text-gray-900 dark:text-gray-100 mt-1 overflow-auto">
            {smartAccountAddress}
          </code>
        </div>
      )}
      
      {!isModuleInstalled ? (
        <div className="mb-6">
          <button
            onClick={installSmartSessionsModule}
            disabled={isInstalling || !nexusClient}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInstalling ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Installing Smart Sessions Module...
              </span>
            ) : (
              'Install Smart Sessions Module'
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200 rounded-lg mb-4">
            Smart Sessions Module is installed
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="redeemer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Redeemer Address <span className="text-red-500">*</span>
              </label>
              <input
                id="redeemer"
                type="text"
                value={redeemerAddress}
                onChange={(e) => setRedeemerAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The Ethereum address that will be authorized to use this session
              </p>
            </div>
            
            <div>
              <label htmlFor="targetContract" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Contract Address <span className="text-red-500">*</span>
              </label>
              <input
                id="targetContract"
                type="text"
                value={targetContractAddress}
                onChange={(e) => setTargetContractAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The contract address that the redeemer is allowed to interact with
              </p>
            </div>
            
            <div>
              <label htmlFor="functionSelector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Function Selector <span className="text-red-500">*</span>
              </label>
              <input
                id="functionSelector"
                type="text"
                value={functionSelector}
                onChange={(e) => setFunctionSelector(e.target.value)}
                placeholder="0x273ea3e3"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The function selector the redeemer can call (e.g., 0x273ea3e3 for increment())
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={grantPermission}
                disabled={isGranting || !nexusClient}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGranting ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Granting Permission...
                  </span>
                ) : (
                  'Grant Permission'
                )}
              </button>
              
              <button
                onClick={resetForm}
                disabled={isGranting}
                className="py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
            </div>
          </div>
          
          {sessionDetails && (
            <div className="mt-4">
              <h3 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">Session Details</h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded overflow-auto max-h-48">
                <pre className="text-xs text-gray-900 dark:text-gray-100">
                  {JSON.stringify(sessionDetails, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}