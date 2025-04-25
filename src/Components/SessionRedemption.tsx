'use client'

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSessionService, SmartSession } from '@/services/sessionService';
import { useBiconomyRedemption, RedemptionCall } from '@/services/biconomyService';

interface SessionRedemptionProps {
  onSessionRedeemed?: (sessionId: string, success: boolean) => void;
}

export default function SessionRedemption({ onSessionRedeemed }: SessionRedemptionProps) {
  const { authenticated, user } = usePrivy();
  const { getSessions, getSession, recordRedemption } = useSessionService();
  const { redeemSession, encodeFunctionData } = useBiconomyRedemption();
  
  const [sessions, setSessions] = useState<SmartSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SmartSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [customParams, setCustomParams] = useState<string>('');

  useEffect(() => {
    if (authenticated) {
      loadSessions();
    }
  }, [authenticated]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch sessions where current user is the redeemer
      const redeemableSessions = await getSessions('redeemer', 'active');
      setSessions(redeemableSessions);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const selectSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const session = await getSession(sessionId);
      setSelectedSession(session);
    } catch (err) {
      console.error('Error loading session details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!selectedSession) return;
    
    try {
      setIsRedeeming(true);
      setError(null);
      setRedemptionSuccess(false);
      setTransactionHash(null);
      
      // Extract the first action for demo purposes
      // In a real implementation, you might want to allow selecting which action to call
      const action = selectedSession.actions[0];
      
      // Prepare call data
      // Note: In a real app, you would parse parameters from a form or UI
      let functionData = action.actionTargetSelector as `0x${string}`;
      
      // If custom params are provided, attempt to encode them
      if (customParams.trim()) {
        try {
          // This is a simplified version - in a production app, you would properly parse and encode params
          // based on the function's ABI
          const params = JSON.parse(customParams);
          functionData = encodeFunctionData(action.actionTargetSelector, ...params);
        } catch (parseErr) {
          setError('Invalid parameters format. Please provide a valid JSON array.');
          setIsRedeeming(false);
          return;
        }
      }
      
      const calls: RedemptionCall[] = [
        {
          to: action.actionTarget as `0x${string}`,
          data: functionData
        }
      ];
      
      // Execute the redemption - sessionDetails contains all required info
      const result = await redeemSession(selectedSession, calls);
      
      if (result.success) {
        setRedemptionSuccess(true);
        setTransactionHash(result.userOpHash);
        
        // Record the redemption in our backend
        await recordRedemption(selectedSession._id, {
          txHash: result.userOpHash,
          status: 'success'
        });
        
        // Refresh the session
        const updatedSession = await getSession(selectedSession._id);
        setSelectedSession(updatedSession);
        
        // Refresh the sessions list
        await loadSessions();
        
        // Callback if provided
        if (onSessionRedeemed) {
          onSessionRedeemed(selectedSession._id, true);
        }
      } else {
        setError(result.error || 'Failed to redeem session');
        
        // Record the failed redemption if we have a hash
        if (result.userOpHash && result.userOpHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          await recordRedemption(selectedSession._id, {
            txHash: result.userOpHash,
            status: 'failed',
            message: result.error
          });
        }
        
        // Callback if provided
        if (onSessionRedeemed) {
          onSessionRedeemed(selectedSession._id, false);
        }
      }
    } catch (err) {
      console.error('Error redeeming session:', err);
      setError(err instanceof Error ? err.message : 'Failed to redeem session');
    } finally {
      setIsRedeeming(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg">
        <p className="text-yellow-700 dark:text-yellow-200">Please connect your wallet to view sessions.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Smart Session Redemption</h2>
      
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
      
      {redemptionSuccess && transactionHash && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200 rounded-lg">
          <p className="font-medium">Session redeemed successfully!</p>
          <a 
            href={`https://sepolia.basescan.org/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline mt-1 block"
          >
            View on BaseScan
          </a>
        </div>
      )}
      
      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          className={`py-2 px-4 font-medium border-b-2 ${
            activeTab === 'available'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('available')}
        >
          Available Sessions
        </button>
        <button
          className={`py-2 px-4 font-medium border-b-2 ${
            activeTab === 'history'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('history')}
        >
          Usage History
        </button>
      </div>
      
      {activeTab === 'available' ? (
        <>
          {isLoading && !selectedSession ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-300">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
              <p>No available sessions found.</p>
              <p className="text-sm mt-1">When someone grants you permission, it will appear here.</p>
            </div>
          ) : !selectedSession ? (
            <div className="space-y-3">
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">Select a session to redeem:</h3>
              {sessions.map((session) => (
                <div 
                  key={session._id}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => selectSession(session._id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{session.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        From: {session.owner.slice(0, 6)}...{session.owner.slice(-4)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Target: {session.actions[0]?.actionTarget.slice(0, 6)}...{session.actions[0]?.actionTarget.slice(-4)}
                      </p>
                    </div>
                    <div className="text-sm">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full">
                        {session.currentUsageCount > 0 ? 'Used' : 'New'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">Session Details</h3>
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Back to list
                </button>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                    <p className="text-gray-900 dark:text-white">{selectedSession.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        selectedSession.status === 'active' ? 'bg-green-500' :
                        selectedSession.status === 'expired' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></span>
                      <span className="capitalize">{selectedSession.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Owner</p>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {selectedSession.owner}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Redeemer</p>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {selectedSession.redeemer}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Target Contract</p>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {selectedSession.actions[0]?.actionTarget}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Function Selector</p>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {selectedSession.actions[0]?.actionTargetSelector}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Usage</p>
                    <p className="text-gray-900 dark:text-white">
                      {selectedSession.currentUsageCount} 
                      {selectedSession.maxUsageCount !== null ? ` / ${selectedSession.maxUsageCount}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(selectedSession.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {selectedSession.expiresAt && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Expires</p>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(selectedSession.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">Function Parameters (Optional)</h4>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Enter function parameters as a JSON array if needed
                  </p>
                  <textarea
                    value={customParams}
                    onChange={(e) => setCustomParams(e.target.value)}
                    placeholder='e.g. [123, "0x123..."]'
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    rows={3}
                  />
                </div>
              </div>
              
              <div>
                <button
                  onClick={handleRedeem}
                  disabled={isRedeeming || selectedSession.status !== 'active'}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRedeeming ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                      Redeeming Session...
                    </span>
                  ) : (
                    "Redeem Session"
                  )}
                </button>
                {selectedSession.status !== 'active' && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    This session cannot be redeemed because it is {selectedSession.status.replace('_', ' ')}.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* History tab content */
        <div className="space-y-4">
          {selectedSession ? (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">Usage History</h3>
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Back to list
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{selectedSession.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Used {selectedSession.currentUsageCount} time{selectedSession.currentUsageCount !== 1 ? 's' : ''}
                  </p>
                </div>
                
                {selectedSession.usageHistory.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">No usage history available.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedSession.usageHistory.map((usage, index) => (
                      <div key={index} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            usage.status === 'success' 
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' 
                              : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                          }`}>
                            {usage.status}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(usage.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-2 font-mono truncate">
                          Tx: {usage.txHash}
                        </p>
                        {usage.message && (
                          <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
                            {usage.message}
                          </p>
                        )}
                        <a 
                          href={`https://sepolia.basescan.org/tx/${usage.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                        >
                          View on BaseScan
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">Select a session to view history:</h3>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-300">Loading sessions...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                  <p>No sessions found.</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div 
                    key={session._id}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => selectSession(session._id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{session.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          From: {session.owner.slice(0, 6)}...{session.owner.slice(-4)}
                        </p>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600 dark:text-gray-300">
                          Used: {session.currentUsageCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}