import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import dbConnect from '@/lib/mongodb';
import { SmartSession } from '@/models/SmartSession';

// Environment variables for Privy configuration
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || '';

// POST handler to record the redemption of a session
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
      const { txHash, status = 'success', message } = body;

      if (!txHash) {
        return NextResponse.json({ error: 'Transaction hash is required' }, { status: 400 });
      }

      // Connect to the database
      await dbConnect();

      // Fetch the session by ID
      const session = await SmartSession.findById(params.id);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Verify that the user is the redeemer of this session
      if (session.redeemer.toLowerCase() !== userAddress.toLowerCase()) {
        return NextResponse.json({ error: 'Only the redeemer can redeem this session' }, { status: 403 });
      }

      // Check if the session is usable
      if (!session.isUsable()) {
        return NextResponse.json({ 
          error: 'Session cannot be used', 
          status: session.status 
        }, { status: 400 });
      }

      // Update session usage statistics
      session.currentUsageCount += 1;
      session.lastUsedAt = new Date();
      
      // Add to usage history
      session.usageHistory.push({
        timestamp: new Date(),
        txHash,
        status: status === 'success' ? 'success' : 'failed',
        message
      });

      // Save the updated session
      await session.save();

      return NextResponse.json({
        message: 'Session redemption recorded successfully',
        session
      });
    } catch (error) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error redeeming session:', error);
    return NextResponse.json({ error: 'Failed to redeem session' }, { status: 500 });
  }
}