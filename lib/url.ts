import { featuredApps } from "@/data/featuredApps";
import { getCustomAppIconConfig } from "@/data/customAppIcons";

/**
 * Extracts the domain (with protocol and trailing slash) from a complete URL.
 * @param url - The complete URL to extract the domain from
 * @returns The domain with protocol and trailing slash (e.g., "https://invite.base.app/")
 * @example
 * getDomain("https://invite.base.app/code/1234") // returns "https://invite.base.app/"
 */
export function getDomain(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}/`;
}

export const getFaviconUrl = (url: string) => {
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${url}&size=128`;
};

export type ListingType = "invite_link" | "access_code";

export interface AppIconInfo {
  url: string;
  needsDarkBg?: boolean;
}

/**
 * Gets the app icon info for a listing.
 * Priority order:
 * 1. Featured app icon (if appId matches a featured app)
 * 2. Custom app icon (from customAppIcons mapping by domain or app name)
 * 3. Google favicon service (fallback for non-featured/non-custom apps)
 */
export function getAppIconInfo(listing: {
  appId?: string;
  appName?: string;
  inviteUrl?: string;
  appUrl?: string;
  listingType?: ListingType;
}): AppIconInfo {
  // 1. Check if this is a featured app
  if (listing.appId) {
    const featuredApp = featuredApps.find((app) => app.id === listing.appId);
    if (featuredApp) {
      return { url: featuredApp.appIconUrl };
    }
  }

  // Get the URL for non-featured apps
  // Use appUrl for access_code type, inviteUrl for invite_link type
  const url =
    listing.listingType === "access_code" ? listing.appUrl : listing.inviteUrl;

  // 2. Check for custom app icon by domain
  if (url) {
    try {
      const domain = getDomain(url);
      const customConfig = getCustomAppIconConfig(domain);
      if (customConfig) {
        return { url: customConfig.url, needsDarkBg: customConfig.needsDarkBg };
      }
    } catch {
      // URL parsing failed, continue to fallback
    }
  }

  // 3. Check for custom app icon by app name
  if (listing.appName) {
    const customConfig = getCustomAppIconConfig(listing.appName);
    if (customConfig) {
      return { url: customConfig.url, needsDarkBg: customConfig.needsDarkBg };
    }
  }

  // 4. Fallback to Google favicon service
  if (!url) {
    return { url: getFaviconUrl("") }; // Return default favicon
  }

  try {
    const domain = getDomain(url);
    return { url: getFaviconUrl(domain) };
  } catch {
    return { url: getFaviconUrl("") }; // Return default favicon
  }
}

/**
 * Gets the app icon URL for a listing (convenience wrapper).
 * Use getAppIconInfo if you also need to know about dark background requirements.
 */
export function getAppIconUrl(listing: {
  appId?: string;
  appName?: string;
  inviteUrl?: string;
  appUrl?: string;
  listingType?: ListingType;
}): string {
  return getAppIconInfo(listing).url;
}
