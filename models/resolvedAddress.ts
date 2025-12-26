import mongoose, { Model } from "mongoose";

export type ResolvedType = "farcaster" | "basename" | "ens";

export interface IResolvedAddress {
  address: string;
  displayName: string;
  avatarUrl: string | null;
  resolvedType: ResolvedType;
  resolvedAt: Date;
}

const ResolvedAddressSchema = new mongoose.Schema<IResolvedAddress>(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    resolvedType: {
      type: String,
      enum: ["farcaster", "basename", "ens"],
      required: true,
    },
    resolvedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Delete the model from mongoose cache if it exists to ensure schema updates are applied
if (mongoose.models.ResolvedAddress) {
  delete mongoose.models.ResolvedAddress;
}

const ResolvedAddress: Model<IResolvedAddress> =
  mongoose.model<IResolvedAddress>("ResolvedAddress", ResolvedAddressSchema);

export { ResolvedAddress };

