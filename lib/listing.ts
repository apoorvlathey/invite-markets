import { connectDB } from "./mongoose";
import { Listing } from "../models/listing";

export async function getListingBySlug(slug: string, getInvite: boolean) {
  await connectDB();

  const listing = await Listing.findOne({ slug });

  if (!listing) return null;

  return {
    slug: listing.slug,
    priceUsdc: listing.priceUsdc,
    sellerAddress: listing.sellerAddress,
    status: listing.status,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    inviteUrl: getInvite ? listing.inviteUrl : ""
  };
}

export async function markListingAsSold(slug: string) {
  return Listing.findOneAndUpdate(
    { slug },
    {
      status: "sold",
      updatedAt: new Date(),
    },
    { new: true }
  );
}
