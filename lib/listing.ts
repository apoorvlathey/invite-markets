import { connectDB } from "@/lib/mongoose";
import { Listing, type ListingType } from "@/models/listing";
import { getAppIconInfo } from "@/lib/url";
import { chainId } from "@/lib/chain";

export async function getListingBySlug(slug: string, includeSecrets: boolean) {
  await connectDB();

  const listing = await Listing.findOne({ slug, chainId });

  if (!listing) return null;

  const listingType: ListingType = listing.listingType || "invite_link";

  // Default values for backward compatibility
  const maxUses = listing.maxUses ?? 1;
  const purchaseCount = listing.purchaseCount ?? 0;

  // Get icon info including dark background flag
  const iconInfo = getAppIconInfo(listing);

  // Base response - public data only
  const response = {
    slug: listing.slug,
    listingType,
    priceUsdc: listing.priceUsdc,
    sellerAddress: listing.sellerAddress,
    status: listing.status,
    appId: listing.appId,
    appName: listing.appName,
    appIconUrl: iconInfo.url,
    iconNeedsDarkBg: iconInfo.needsDarkBg || false,
    // appUrl is public for access_code type
    appUrl: listingType === "access_code" ? listing.appUrl : undefined,
    // Multi-use listing fields
    maxUses,
    purchaseCount,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    // Private fields - only included when includeSecrets is true
    inviteUrl: includeSecrets && listingType === "invite_link" ? listing.inviteUrl : undefined,
    accessCode: includeSecrets && listingType === "access_code" ? listing.accessCode : undefined,
  };

  return response;
}

export async function getSoldListingsBySlug(slug: string) {
  await connectDB();

  const sales = await Listing.find({
    appId: slug,
    status: "sold",
    chainId,
  })
    .sort({ completedAt: -1 })
    .limit(100)
    .select("priceUsdc updatedAt appId")
    .lean();

  const formattedSales = sales.map((sale) => ({
    timestamp: sale.updatedAt,
    priceUsdc: sale.priceUsdc,
    appId: sale.appId,
  }));

  return formattedSales;
}

/**
 * Increments the purchase count for a listing and marks it as sold if all uses are consumed.
 * Returns the updated listing.
 */
export async function incrementPurchaseCount(slug: string) {
  await connectDB();

  // First, get the current listing to check maxUses
  const listing = await Listing.findOne({ slug, chainId });
  if (!listing) return null;

  const maxUses = listing.maxUses ?? 1;
  const currentCount = listing.purchaseCount ?? 0;
  const newCount = currentCount + 1;

  // Determine if we should mark as sold
  // -1 means unlimited, so never mark as sold based on count
  const shouldMarkSold = maxUses !== -1 && newCount >= maxUses;

  return Listing.findOneAndUpdate(
    { slug, chainId },
    {
      purchaseCount: newCount,
      ...(shouldMarkSold ? { status: "sold" } : {}),
      updatedAt: new Date(),
    },
    { new: true }
  );
}

/**
 * @deprecated Use incrementPurchaseCount instead for multi-use listings support.
 * This function is kept for backward compatibility but now internally uses incrementPurchaseCount.
 */
export async function markListingAsSold(slug: string) {
  return incrementPurchaseCount(slug);
}

/**
 * Checks if a listing is available for purchase.
 * A listing is available if:
 * - status is "active"
 * - AND (maxUses is unlimited (-1) OR purchaseCount < maxUses)
 */
export function isListingAvailable(listing: {
  status: string;
  maxUses?: number;
  purchaseCount?: number;
}): boolean {
  if (listing.status !== "active") return false;

  const maxUses = listing.maxUses ?? 1;
  const purchaseCount = listing.purchaseCount ?? 0;

  // -1 means unlimited
  if (maxUses === -1) return true;

  return purchaseCount < maxUses;
}
