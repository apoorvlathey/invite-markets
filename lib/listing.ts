import { connectDB } from "@/lib/mongoose";
import { Listing } from "@/models/listing";
import { getDomain, getFaviconUrl } from "@/lib/url";
import { featuredApps } from "@/data/featuredApps";

/**
 * Gets the app icon URL for a listing.
 * For featured apps, uses the configured icon.
 * For non-featured apps, extracts the domain from the invite URL (without the invite code)
 * and generates a favicon URL.
 */
function getAppIconUrl(listing: { appId?: string; inviteUrl: string }): string {
  // Check if this is a featured app
  if (listing.appId) {
    const featuredApp = featuredApps.find((app) => app.id === listing.appId);
    if (featuredApp) {
      return featuredApp.appIconUrl;
    }
  }

  // For non-featured apps, get favicon from the domain (strips invite code)
  const domain = getDomain(listing.inviteUrl);
  return getFaviconUrl(domain);
}

export async function getListingBySlug(slug: string, getInvite: boolean) {
  await connectDB();

  const listing = await Listing.findOne({ slug });

  if (!listing) return null;

  return {
    slug: listing.slug,
    priceUsdc: listing.priceUsdc,
    sellerAddress: listing.sellerAddress,
    status: listing.status,
    appId: listing.appId,
    appName: listing.appName,
    appIconUrl: getAppIconUrl(listing),
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    inviteUrl: getInvite ? listing.inviteUrl : "",
  };
}

export async function getSoldListingsBySlug(slug: string) {
  await connectDB();

  const sales = await Listing.find({
    appId: slug,
    status: "sold",
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
    { slug },
    {
      status: "sold",
      updatedAt: new Date(),
    },
    { new: true }
  );
}
