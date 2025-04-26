import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import dbConnect from '@/lib/mongodb';
import { SmartSession } from '@/models/SmartSession';

// Environment variables for Privy configuration
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || '';

// Helper function to extract the ID from the URL
function getIdFromUrl(url: string): string {
  const pathParts = new URL(url).pathname.split('/');
  return pathParts[pathParts.length - 1]; // Get the ID from the path
}

// GET handler to fetch a specific session by ID
export async function GET(req: NextRequest) {
  try {
    const id = getIdFromUrl(req.url);
    
    // Authenticate the user with Privy
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Bearer token missing' }, { status: 401 });
    }

    const privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    try {
      const verifiedClaims = await privyClient.verifyAuthToken(token);
      if (!verifiedClaims || !verifiedClaims.userId) {
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
      }
      
      // Get user's wallet address - we'll use the userId as the address
      // This needs to be adjusted based on your actual user/wallet management
      const userAddress = verifiedClaims.userId;

      // Connect to the database
      await dbConnect();

      // Fetch the session by ID
      const session = await SmartSession.findById(id);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Check if user is authorized to view this session
      if (session.owner !== userAddress && session.redeemer !== userAddress) {
        return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
      }

      return NextResponse.json({ session });
    } catch (error) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

// PUT handler to update session status (revoke, update limits, etc.)
export async function PUT(req: NextRequest) {
  try {
    const id = getIdFromUrl(req.url);
    
    // Authenticate the user with Privy
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Bearer token missing' }, { status: 401 });
    }

    const privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    try {
      const verifiedClaims = await privyClient.verifyAuthToken(token);
      if (!verifiedClaims || !verifiedClaims.userId) {
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
      }
      
      // Get user's wallet address - we'll use the userId as the address
      // This needs to be adjusted based on your actual user/wallet management
      const userAddress = verifiedClaims.userId;

      // Connect to the database
      await dbConnect();

      // Fetch the session by ID
      const session = await SmartSession.findById(id);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Only the owner can update session details
      if (session.owner !== userAddress) {
        return NextResponse.json({ error: 'Only the session owner can update it' }, { status: 403 });
      }

      // Parse request body
      const body = await req.json();
      const { isRevoked, name, expiresAt, maxUsageCount } = body;

      // Update fields if provided
      if (isRevoked !== undefined) {
        session.isRevoked = isRevoked;
      }
      if (name) {
        session.name = name;
      }
      if (expiresAt !== undefined) {
        session.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }
      if (maxUsageCount !== undefined) {
        session.maxUsageCount = maxUsageCount;
      }

      // Save the updated session
      await session.save();

      return NextResponse.json({ 
        message: 'Session updated successfully', 
        session 
      });
    } catch (error) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// DELETE handler to delete a session
export async function DELETE(req: NextRequest) {
  try {
    const id = getIdFromUrl(req.url);
    
    // Authenticate the user with Privy
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Bearer token missing' }, { status: 401 });
    }

    const privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    try {
      const verifiedClaims = await privyClient.verifyAuthToken(token);
      if (!verifiedClaims || !verifiedClaims.userId) {
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
      }
      
      // Get user's wallet address - we'll use the userId as the address
      // This needs to be adjusted based on your actual user/wallet management
      const userAddress = verifiedClaims.userId;

      // Connect to the database
      await dbConnect();

      // Fetch the session by ID
      const session = await SmartSession.findById(id);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Only the owner can delete the session
      if (session.owner !== userAddress) {
        return NextResponse.json({ error: 'Only the session owner can delete it' }, { status: 403 });
      }

      // Delete the session
      await SmartSession.findByIdAndDelete(id);

      return NextResponse.json({ 
        message: 'Session deleted successfully' 
      });
    } catch (error) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}