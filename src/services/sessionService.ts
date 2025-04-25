import { usePrivy } from '@privy-io/react-auth';

export interface SessionAction {
  actionTarget: string;
  actionTargetSelector: string;
  actionPolicies: any[];
}

export interface SessionDetails {
  redeemer: string;
  actions: SessionAction[];
  [key: string]: any;
}

export interface SmartSession {
  _id: string;
  owner: string;
  redeemer: string;
  actions: SessionAction[];
  sessionDetails: SessionDetails;
  createdAt: string;
  expiresAt: string | null;
  maxUsageCount: number | null;
  currentUsageCount: number;
  isRevoked: boolean;
  lastUsedAt: string | null;
  usageHistory: {
    timestamp: string;
    txHash: string;
    status: 'success' | 'failed';
    message?: string;
  }[];
  name: string;
  status: 'active' | 'expired' | 'revoked' | 'usage_limit_reached';
}

export interface CreateSessionParams {
  sessionDetails: SessionDetails;
  name?: string;
  expiresAt?: string | null;
  maxUsageCount?: number | null;
}

export interface UpdateSessionParams {
  isRevoked?: boolean;
  name?: string;
  expiresAt?: string | null;
  maxUsageCount?: number | null;
}

export interface RecordRedemptionParams {
  txHash: string;
  status?: 'success' | 'failed';
  message?: string;
}

// Hook to interact with the sessions API
export function useSessionService() {
  const { getAccessToken, authenticated } = usePrivy();

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    if (!authenticated) {
      throw new Error('User not authenticated');
    }
    
    const token = await getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Get all sessions for the current user
  const getSessions = async (type: 'owner' | 'redeemer' = 'owner', status: string = 'active') => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/sessions?type=${type}&status=${status}`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch sessions');
      }
      
      const data = await response.json();
      return data.sessions as SmartSession[];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  };

  // Get a specific session by ID
  const getSession = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch session');
      }
      
      const data = await response.json();
      return data.session as SmartSession;
    } catch (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
  };

  // Save session details to the backend
  const createSession = async (params: CreateSessionParams) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create session');
      }
      
      const data = await response.json();
      return data.session as SmartSession;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  };

  // Update a session
  const updateSession = async (id: string, params: UpdateSessionParams) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update session');
      }
      
      const data = await response.json();
      return data.session as SmartSession;
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  };

  // Delete a session
  const deleteSession = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete session');
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  };

  // Record a session redemption
  const recordRedemption = async (id: string, params: RecordRedemptionParams) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/sessions/${id}/redeem`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record redemption');
      }
      
      const data = await response.json();
      return data.session as SmartSession;
    } catch (error) {
      console.error('Error recording redemption:', error);
      throw error;
    }
  };

  // Revoke a session
  const revokeSession = async (id: string) => {
    return updateSession(id, { isRevoked: true });
  };

  return {
    getSessions,
    getSession,
    createSession,
    updateSession,
    deleteSession,
    recordRedemption,
    revokeSession,
  };
}