import mongoose, { Model } from "mongoose";

export interface IListing {
  slug: string;
  inviteUrl: string;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
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
  },
  {
    timestamps: true,
  }
);

let Listing: Model<IListing>;

try {
  Listing = mongoose.model<IListing>("Listing");
} catch {
  Listing = mongoose.model<IListing>("Listing", ListingSchema);
}

export { Listing };
