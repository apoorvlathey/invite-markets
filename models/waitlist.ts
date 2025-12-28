import mongoose, { Model } from "mongoose";

export interface IWaitlist {
  email: string;
  xUsername?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistSchema = new mongoose.Schema<IWaitlist>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    xUsername: {
      type: String,
      required: false,
      trim: true,
    },
    ipAddress: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique email entries
WaitlistSchema.index({ email: 1 }, { unique: true });

const Waitlist: Model<IWaitlist> =
  (mongoose.models.Waitlist as Model<IWaitlist>) ||
  mongoose.model<IWaitlist>("Waitlist", WaitlistSchema);

export { Waitlist };

