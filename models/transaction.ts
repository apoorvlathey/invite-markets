import mongoose from "mongoose";

export interface ITransaction {
  txHash: string;
  listingSlug: string;
  sellerAddress: string;
  buyerAddress: string;
  priceUsdc: number;
  appId: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new mongoose.Schema<ITransaction>(
  {
    listingSlug: {
      type: String,
      required: true,
      index: true,
    },
    sellerAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    buyerAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    priceUsdc: {
      type: Number,
      required: true,
      min: 0,
    },
    appId: {
        type: String,
        required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Transaction =
  (mongoose.models.Transaction as mongoose.Model<ITransaction>) ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);

export { Transaction };