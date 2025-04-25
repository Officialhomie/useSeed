import mongoose, { Schema, Document } from 'mongoose';

// Define the structure of the session details object
interface SessionAction {
  actionTarget: string;
  actionTargetSelector: string;
  actionPolicies: any[];
}

export interface ISmartSession extends Document {
  owner: string;                    // Smart account address that created the session
  redeemer: string;                 // Address granted permission to use the session
  actions: SessionAction[];         // Actions permitted by this session
  sessionDetails: object;           // Full session details from Biconomy
  createdAt: Date;                  // When the session was created
  expiresAt: Date | null;           // Optional expiration date
  maxUsageCount: number | null;     // Maximum number of times this can be used (null = unlimited)
  currentUsageCount: number;        // How many times it's been used
  isRevoked: boolean;               // Whether the session has been revoked
  lastUsedAt: Date | null;          // When the session was last used
  usageHistory: {                   // History of session usage
    timestamp: Date;
    txHash: string;
    status: 'success' | 'failed';
    message?: string;
  }[];
  name: string;                     // User-friendly name for the session
  status: 'active' | 'expired' | 'revoked' | 'usage_limit_reached';
}

const SmartSessionSchema: Schema = new Schema({
  owner: { 
    type: String, 
    required: true, 
    index: true 
  },
  redeemer: { 
    type: String, 
    required: true, 
    index: true 
  },
  actions: [{
    actionTarget: { type: String, required: true },
    actionTargetSelector: { type: String, required: true },
    actionPolicies: [{ type: Schema.Types.Mixed }]
  }],
  sessionDetails: { 
    type: Schema.Types.Mixed, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date, 
    default: null 
  },
  maxUsageCount: { 
    type: Number, 
    default: null 
  },
  currentUsageCount: { 
    type: Number, 
    default: 0 
  },
  isRevoked: { 
    type: Boolean, 
    default: false 
  },
  lastUsedAt: { 
    type: Date, 
    default: null 
  },
  usageHistory: [{
    timestamp: { type: Date, default: Date.now },
    txHash: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['success', 'failed'], 
      default: 'success' 
    },
    message: { type: String }
  }],
  name: { 
    type: String, 
    default: 'Unnamed Session' 
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked', 'usage_limit_reached'],
    default: 'active'
  }
});

// Middleware to update status based on other fields
SmartSessionSchema.pre<ISmartSession>('save', function(next) {
  if (this.isRevoked) {
    this.status = 'revoked';
  } else if (this.expiresAt && this.expiresAt < new Date()) {
    this.status = 'expired';
  } else if (this.maxUsageCount !== null && this.currentUsageCount >= this.maxUsageCount) {
    this.status = 'usage_limit_reached';
  } else {
    this.status = 'active';
  }
  next();
});

// Method to check if the session is usable
SmartSessionSchema.methods.isUsable = function(this: ISmartSession): boolean {
  return (
    !this.isRevoked &&
    (this.expiresAt === null || this.expiresAt > new Date()) &&
    (this.maxUsageCount === null || this.currentUsageCount < this.maxUsageCount)
  );
};

// Create the model
export const SmartSession = mongoose.models.SmartSession || 
  mongoose.model<ISmartSession>('SmartSession', SmartSessionSchema);

export default SmartSession;