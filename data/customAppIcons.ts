/**
 * Custom icon configuration for non-featured apps.
 * Keys can be:
 * - Domain (e.g., "friend.space" or "app.friend.space")
 * - App name (case-insensitive)
 *
 * This allows overriding the default Google favicon service for apps
 * that have better custom icons available.
 */
export interface CustomAppIconConfig {
  /** The icon URL (can be absolute or relative to public folder) */
  url: string;
  /** If true, the icon needs a dark background (e.g., white icons) */
  needsDarkBg?: boolean;
}

export const customAppIcons: Record<string, CustomAppIconConfig> = {
  "app.friend.space": {
    url: "/images/appIcons/friendspace.jpg",
  },
};

/**
 * Gets a custom icon config for a domain or app name if one exists.
 * @param identifier - Domain (e.g., "friend.space") or app name
 * @returns The custom icon config if found, undefined otherwise
 */
export function getCustomAppIconConfig(
  identifier: string
): CustomAppIconConfig | undefined {
  if (!identifier) return undefined;

  // Direct lookup
  const directMatch = customAppIcons[identifier.toLowerCase()];
  if (directMatch) return directMatch;

  // Try without protocol/path (for full URLs)
  try {
    const url = new URL(
      identifier.startsWith("http") ? identifier : `https://${identifier}`
    );
    const hostname = url.hostname.toLowerCase();

    // Try exact hostname
    if (customAppIcons[hostname]) {
      return customAppIcons[hostname];
    }

    // Try without subdomain (e.g., "app.friend.space" -> "friend.space")
    const parts = hostname.split(".");
    if (parts.length > 2) {
      const baseDomain = parts.slice(-2).join(".");
      if (customAppIcons[baseDomain]) {
        return customAppIcons[baseDomain];
      }
    }
  } catch {
    // Not a valid URL, that's fine
  }

  return undefined;
}

/**
 * Gets a custom icon URL for a domain or app name if one exists.
 * @param identifier - Domain (e.g., "friend.space") or app name
 * @returns The custom icon URL if found, undefined otherwise
 */
export function getCustomAppIcon(identifier: string): string | undefined {
  const config = getCustomAppIconConfig(identifier);
  return config?.url;
}
