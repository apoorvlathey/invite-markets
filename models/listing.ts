import mongoose, { Model } from "mongoose";

export type ListingType = "invite_link" | "access_code";

export interface IListing {
  slug: string;
  // Listing type: "invite_link" (default) or "access_code"
  listingType: ListingType;
  // For invite_link type: the private invite URL
  inviteUrl?: string;
  // For access_code type: public app URL (displayed before payment)
  appUrl?: string;
  // For access_code type: private access code (revealed after payment)
  accessCode?: string;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
  // For featured apps, appId will be set (e.g., "ethos", "base-app")
  // For custom apps, appName will be set (user input)
  appId?: string;
  appName?: string;
  // Chain ID for multi-network support (e.g., 84532 for Base Sepolia, 8453 for Base Mainnet)
  chainId: number;
  // Maximum number of times this listing can be purchased (default: 1, -1 for unlimited)
  maxUses: number;
  // Current number of completed purchases
  purchaseCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new mongoose.Schema<IListing>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    listingType: {
      type: String,
      enum: ["invite_link", "access_code"],
      default: "invite_link",
    },
    inviteUrl: {
      type: String,
      required: false, // Required for invite_link type, validated at API level
    },
    appUrl: {
      type: String,
      required: false, // Required for access_code type, validated at API level
    },
    accessCode: {
      type: String,
      required: false, // Required for access_code type, validated at API level
    },
    priceUsdc: {
      type: Number,
      required: true,
      min: 0,
    },
    sellerAddress: {
      type: String,
      required: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ["active", "sold", "cancelled"],
      default: "active",
    },
    appId: {
      type: String,
      required: false,
    },
    appName: {
      type: String,
      required: false,
    },
    chainId: {
      type: Number,
      required: true,
      index: true,
    },
    maxUses: {
      type: Number,
      required: false,
      default: 1,
      min: -1, // -1 represents unlimited
    },
    purchaseCount: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient chain-specific queries
ListingSchema.index({ chainId: 1, status: 1 });

const Listing: Model<IListing> =
  (mongoose.models.Listing as Model<IListing>) ||
  mongoose.model<IListing>("Listing", ListingSchema);

export { Listing };
