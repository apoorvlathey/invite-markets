import { createHmac } from "crypto";

const INVITE_ACCESS_CODE = process.env.INVITE_ACCESS_CODE;

// Create a signed token for the cookie
export function createAccessToken(): string {
  if (!INVITE_ACCESS_CODE) {
    throw new Error("INVITE_ACCESS_CODE not configured");
  }
  const timestamp = Date.now().toString();
  const hmac = createHmac("sha256", INVITE_ACCESS_CODE);
  hmac.update(timestamp);
  const signature = hmac.digest("hex");
  return `${timestamp}.${signature}`;
}

// Verify a signed token
export function verifyAccessToken(token: string): boolean {
  if (!INVITE_ACCESS_CODE || !token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [timestamp, signature] = parts;
  const hmac = createHmac("sha256", INVITE_ACCESS_CODE);
  hmac.update(timestamp);
  const expectedSignature = hmac.digest("hex");

  return signature === expectedSignature;
}

