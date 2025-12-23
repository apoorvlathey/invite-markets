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
  },
  {
    timestamps: true,
  }
);

let Listing: Model<IListing>;

// Delete the model from mongoose cache if it exists to ensure schema updates are applied
if (mongoose.models.Listing) {
  delete mongoose.models.Listing;
}

Listing = mongoose.model<IListing>("Listing", ListingSchema);

export { Listing };
