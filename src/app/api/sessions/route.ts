import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import dbConnect from '@/lib/mongodb';
import { SmartSession } from '@/models/SmartSession';

// Environment variables for Privy configuration
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || '';

// GET handler to fetch sessions for authenticated user
export async function GET(req: NextRequest) {
  try {
    // Authenticate the user with Privy
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Bearer token missing' }, { status: 401 });
    }

    // Verify the token with Privy
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

      // Parse query parameters
      const url = new URL(req.url);
      const type = url.searchParams.get('type') || 'owner';
      const status = url.searchParams.get('status') || 'active';

      let query: any = {};

      // Filter by owner or redeemer
      if (type === 'owner') {
        query.owner = userAddress;
      } else if (type === 'redeemer') {
        query.redeemer = userAddress;
      }

      // Filter by status if specified
      if (status !== 'all') {
        query.status = status;
      }

      // Fetch sessions from the database
      const sessions = await SmartSession.find(query).sort({ createdAt: -1 }).limit(100);

      return NextResponse.json({ sessions });
    } catch (error) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST handler to create a new session
export async function POST(req: NextRequest) {
  try {
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
      
      // Parse request body
      const body = await req.json();
      const { 
        sessionDetails, 
        name = 'Unnamed Session',
        expiresAt = null, 
        maxUsageCount = null 
      } = body;

      // Validate required fields
      if (!sessionDetails) {
        return NextResponse.json({ error: 'Session details are required' }, { status: 400 });
      }

      // Connect to the database
      await dbConnect();

      // Extract information from sessionDetails
      const { redeemer, actions } = sessionDetails;

      // Create the session
      const session = new SmartSession({
        owner: userAddress,
        redeemer,
        actions,
        sessionDetails,
        name,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUsageCount
      });

      // Save the session to the database
      await session.save();

      return NextResponse.json({ 
        message: 'Session created successfully', 
        session 
      });
    } catch (error) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}