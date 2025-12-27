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

// Delete the model from mongoose cache if it exists to ensure schema updates are applied
if (mongoose.models.Transaction) {
  delete mongoose.models.Transaction;
}

const Transaction = mongoose.model<ITransaction>("Transaction", TransactionSchema);

export { Transaction };