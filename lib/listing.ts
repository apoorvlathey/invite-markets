import { connectDB } from "@/lib/mongoose";
import { Listing, type ListingType } from "@/models/listing";
import { getDomain, getFaviconUrl } from "@/lib/url";
import { featuredApps } from "@/data/featuredApps";
import { chainId } from "@/lib/chain";

/**
 * Gets the app icon URL for a listing.
 * For featured apps, uses the configured icon.
 * For non-featured apps, extracts the domain from the URL and generates a favicon URL.
 */
function getAppIconUrl(listing: {
  appId?: string;
  inviteUrl?: string;
  appUrl?: string;
  listingType?: ListingType;
}): string {
  // Check if this is a featured app
  if (listing.appId) {
    const featuredApp = featuredApps.find((app) => app.id === listing.appId);
    if (featuredApp) {
      return featuredApp.appIconUrl;
    }
  }

  // For non-featured apps, get favicon from the domain
  // Use appUrl for access_code type, inviteUrl for invite_link type
  const url =
    listing.listingType === "access_code" ? listing.appUrl : listing.inviteUrl;

  if (!url) {
    return getFaviconUrl(""); // Return default favicon
  }

  const domain = getDomain(url);
  return getFaviconUrl(domain);
}

export async function getListingBySlug(slug: string, includeSecrets: boolean) {
  await connectDB();

  const listing = await Listing.findOne({ slug, chainId });

  if (!listing) return null;

  const listingType: ListingType = listing.listingType || "invite_link";

  // Base response - public data only
  const response = {
    slug: listing.slug,
    listingType,
    priceUsdc: listing.priceUsdc,
    sellerAddress: listing.sellerAddress,
    status: listing.status,
    appId: listing.appId,
    appName: listing.appName,
    appIconUrl: getAppIconUrl(listing),
    // appUrl is public for access_code type
    appUrl: listingType === "access_code" ? listing.appUrl : undefined,
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

export async function markListingAsSold(slug: string) {
  return Listing.findOneAndUpdate(
    { slug, chainId },
    {
      status: "sold",
      updatedAt: new Date(),
    },
    { new: true }
  );
}
