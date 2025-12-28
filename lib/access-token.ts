import { createHmac, randomBytes } from "crypto";

const INVITE_ACCESS_CODE = process.env.INVITE_ACCESS_CODE;

// Create a signed token for the cookie
// Format: timestamp.nonce.signature
export function createAccessToken(): string {
  if (!INVITE_ACCESS_CODE) {
    throw new Error("INVITE_ACCESS_CODE not configured");
  }
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("hex"); // Random entropy
  const data = `${timestamp}.${nonce}`;
  const hmac = createHmac("sha256", INVITE_ACCESS_CODE);
  hmac.update(data);
  const signature = hmac.digest("hex");
  return `${timestamp}.${nonce}.${signature}`;
}

// Verify a signed token
export function verifyAccessToken(token: string): boolean {
  if (!INVITE_ACCESS_CODE || !token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [timestamp, nonce, signature] = parts;
  const data = `${timestamp}.${nonce}`;
  const hmac = createHmac("sha256", INVITE_ACCESS_CODE);
  hmac.update(data);
  const expectedSignature = hmac.digest("hex");

  return signature === expectedSignature;
}

