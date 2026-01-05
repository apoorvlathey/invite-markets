import mongoose, { Model } from "mongoose";

export interface IListing {
  slug: string;
  inviteUrl: string;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
  // For featured apps, appId will be set (e.g., "ethos", "base-app")
  // For custom apps, appName will be set (user input)
  appId?: string;
  appName?: string;
  // Chain ID for multi-network support (e.g., 84532 for Base Sepolia, 8453 for Base Mainnet)
  chainId: number;
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
    inviteUrl: {
      type: String,
      required: true,
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
