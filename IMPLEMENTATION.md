# Invite Markets Implementation

## Overview

A marketplace for buying and selling invite links and access codes with MongoDB backend and Next.js API routes.

**Supported Listing Types:**

- **Invite Link** (default): Single private URL revealed after payment
- **Access Code**: Public app URL (displayed before purchase) + private access code (revealed after payment)

## Database Structure

### MongoDB Configuration

- **Cluster**: Cluster0
- **Database**: InviteMarkets
- **Collection**: listings

### Listing Schema

```typescript
{
  slug: string (unique, indexed)
  listingType: "invite_link" | "access_code" (defaults to "invite_link")
  inviteUrl?: string              // For invite_link type - PRIVATE
  appUrl?: string                 // For access_code type - PUBLIC (displayed before payment)
  accessCode?: string             // For access_code type - PRIVATE (revealed after payment)
  priceUsdc: number
  sellerAddress: string (lowercase Ethereum address)
  status: "active" | "sold" | "cancelled"
  appId?: string                  // For featured apps
  appName?: string                // For custom apps
  chainId: number                 // Network ID (e.g., 8453 for Base Mainnet)
  maxUses?: number                // Maximum purchases allowed (-1 for unlimited, default: 1)
  purchaseCount?: number          // Current number of purchases (default: 0)
  createdAt: Date (auto-generated)
  updatedAt: Date (auto-generated)
}
```

## Implementation Details

### 1. Database Setup

**File**: `lib/mongoose.ts`

- Connection pooling with cached connections for Next.js hot reloading
- Auto-connects to `InviteMarkets` database
- Prevents multiple connections in development

### 2. Data Model

**File**: `models/listing.ts`

- Mongoose schema with TypeScript interface
- Unique slug generation (8-character alphanumeric)
- Timestamps enabled for automatic `createdAt` and `updatedAt`
- Status tracking for listing lifecycle
- Listing type support for both invite links and access codes

### 3. Featured Apps Configuration

**File**: `data/featuredApps.ts`

Featured apps are pre-configured apps that appear prominently in the UI. Each app specifies which chains it's available on.

```typescript
{
  id: string;           // Unique identifier (used as appId in listings)
  appName: string;      // Display name
  siteUrl: string;      // App website URL
  appIconUrl: string;   // Path to app icon
  description: string;  // App description
  chainIds: number[];   // Chains where this app is featured (e.g., [8453, 84532])
}
```

**Chain Filtering:**

The `getFeaturedAppsForChain()` helper filters featured apps based on the current `chainId` from `lib/chain.ts`:

- **Mainnet** (`chainId: 8453`): Shows apps with `8453` in their `chainIds` array
- **Testnet** (`chainId: 84532`): Shows apps with `84532` in their `chainIds` array

**Where filtering is applied:**

| Location                               | Usage                  |
| -------------------------------------- | ---------------------- |
| Homepage (`app/page.tsx`)              | Featured apps carousel |
| Sell page (`app/sell/sell-client.tsx`) | App selection dropdown |
| Apps API (`app/api/apps/route.ts`)     | Building apps list     |

**Note:** When looking up app info by ID (e.g., for displaying listing details), the full `featuredApps` array is used to ensure existing listings display correctly regardless of current chain.

### 4. EIP-712 Signatures

**File**: `lib/signature.ts`

All listing operations (create, update, delete) require EIP-712 typed data signatures for authentication.

**CreateListing Message:**

```typescript
{
  listingType: string,
  inviteUrl: string,
  appUrl: string,
  accessCode: string,
  priceUsdc: string,
  sellerAddress: address,
  appId: string,
  appName: string,
  nonce: uint256,
  maxUses: string              // "-1" for unlimited, "1" for single-use (default), or any positive number
}
```

**UpdateListing Message:**

```typescript
{
  slug: string,
  listingType: string,
  inviteUrl: string,
  appUrl: string,
  accessCode: string,
  priceUsdc: string,
  sellerAddress: address,
  appName: string,
  nonce: uint256,
  maxUses: string              // Can only increase maxUses, not decrease
}
```

### 5. API Endpoints

#### Create Listing - POST `/api/listings`

**File**: `app/api/listings/route.ts`

- Validates all required fields based on listing type
- Validates Ethereum address format
- Verifies EIP-712 signature
- Generates unique slug using nanoid
- Returns created listing with 201 status

**Request Body (Invite Link type)**:

```json
{
  "listingType": "invite_link",
  "inviteUrl": "https://app.example.com/invite/abc123",
  "priceUsdc": 10.5,
  "sellerAddress": "0x...",
  "nonce": "1704067200000",
  "chainId": 8453,
  "signature": "0x...",
  "appId": "ethos",
  "maxUses": 1
}
```

**Request Body (Access Code type)**:

```json
{
  "listingType": "access_code",
  "appUrl": "https://app.example.com",
  "accessCode": "SECRET123",
  "priceUsdc": 10.5,
  "sellerAddress": "0x...",
  "nonce": "1704067200000",
  "chainId": 8453,
  "signature": "0x...",
  "appName": "Example App",
  "maxUses": -1
}
```

**Response**:

```json
{
  "success": true,
  "listing": {
    "slug": "abc123xy",
    "listingType": "access_code",
    "appUrl": "https://app.example.com",
    "priceUsdc": 10.5,
    "sellerAddress": "0x...",
    "status": "active",
    "appName": "Example App",
    "maxUses": -1,
    "purchaseCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

> **Note**: `inviteUrl` and `accessCode` are intentionally omitted from the response for security. See [Secret Data Protection](#secret-data-protection) for details.

#### Get Listing - GET `/api/listings/[slug]`

**File**: `app/api/listings/[slug]/route.ts`

- Fetches listing by unique slug
- Returns 404 if not found
- Includes `listingType` and `appUrl` (for access_code type)
- Includes `maxUses` and `purchaseCount` for inventory tracking
- **Does NOT include inviteUrl or accessCode** (security measure)

**Response**:

```json
{
  "success": true,
  "listing": {
    "slug": "abc123xy",
    "listingType": "access_code",
    "appUrl": "https://app.example.com",
    "priceUsdc": 10.5,
    "sellerAddress": "0x...",
    "status": "active",
    "appName": "Example App",
    "maxUses": 5,
    "purchaseCount": 2
  }
}
```

#### Purchase Listing - POST `/api/purchase/[slug]`

**File**: `app/api/purchase/[slug]/route.ts`

This is the **only endpoint** that returns the secret data (`inviteUrl` or `accessCode`), and only after successful x402 payment verification.

**Flow**:

1. Client sends request with `x-payment` header containing x402 payment data
2. Server checks listing availability (`purchaseCount < maxUses` or `maxUses === -1` for unlimited)
3. Server calls `settlePayment()` to verify payment via thirdweb facilitator
4. If payment verification fails → Returns error (no secret data)
5. If payment succeeds:
   - Creates transaction record
   - Increments `purchaseCount`
   - If `purchaseCount >= maxUses` (and not unlimited), marks listing as "sold"
   - Returns secret data to buyer based on listing type

**Request Headers**:

```
x-payment: <x402 payment data>
```

**Success Response (Invite Link type)**:

```json
{
  "listingType": "invite_link",
  "inviteUrl": "https://app.example.com/invite/abc123"
}
```

**Success Response (Access Code type)**:

```json
{
  "listingType": "access_code",
  "appUrl": "https://app.example.com",
  "accessCode": "SECRET123"
}
```

#### Get Seller Data - GET `/api/seller/[address]`

**File**: `app/api/seller/[address]/route.ts`

Returns seller statistics and listings. Secret data (`inviteUrl` and `accessCode`) is only included when the request is authenticated as the seller.

**Optional Authentication Headers**:

```
x-seller-signature: <wallet signature>
x-seller-message: <base64 encoded message>
```

**Response** (unauthenticated - public view):

```json
{
  "success": true,
  "isAuthenticated": false,
  "stats": { "salesCount": 5, "totalRevenue": 125.50 },
  "listings": [
    { "slug": "...", "listingType": "access_code", "appUrl": "https://...", "priceUsdc": 25, "status": "active", ... }
  ]
}
```

**Response** (authenticated - seller's own view):

```json
{
  "success": true,
  "isAuthenticated": true,
  "stats": { "salesCount": 5, "totalRevenue": 125.50 },
  "listings": [
    {
      "slug": "...",
      "listingType": "access_code",
      "appUrl": "https://...",
      "accessCode": "SECRET123",
      "priceUsdc": 25,
      "status": "active",
      ...
    }
  ]
}
```

#### Update Listing - PATCH `/api/listings/update`

**File**: `app/api/listings/update/route.ts`

- Requires EIP-712 signature verification
- Supports updating fields based on listing type
- Cannot change listing type after creation
- `maxUses` can only be increased (to add more inventory), never decreased

**Request Body (Access Code type)**:

```json
{
  "slug": "abc123xy",
  "sellerAddress": "0x...",
  "priceUsdc": 15.0,
  "appUrl": "https://newurl.example.com",
  "accessCode": "NEWSECRET456",
  "maxUses": 10,
  "nonce": "1704067200000",
  "chainId": 8453,
  "signature": "0x..."
}
```

### 6. User Interface

#### Sell Page - `/sell`

**File**: `app/sell/sell-client.tsx`

- **Listing Type Tabs**: Toggle between "Invite Link" and "Access Code" modes
- App name autocomplete with featured apps
- Different form fields based on listing type
- **Number of Uses**: Collapsible setting to configure multi-use listings

**Invite Link Mode:**

- App Name (with autocomplete)
- Invite URL (private)
- Price (USDC)
- Number of Uses (default: 1, expandable to edit)

**Access Code Mode:**

- App Name (with autocomplete)
- App URL (public - with warning notice)
- Access Code (private)
- Price (USDC)
- Number of Uses (default: 1, expandable to edit)

**Number of Uses Options:**

- **Single use (default)**: Listing becomes "sold" after one purchase
- **Multiple uses**: Specify exact number (e.g., 5, 10, 100)
- **Unlimited**: Toggle for infinite purchases (-1 internally)

**Features**:

- URL validation for links
- Number input with decimal support for price
- Ethereum address pattern validation
- Loading states during submission
- Error handling with user-friendly messages
- Warning that App URL is publicly visible (for access_code type)
- Collapsible "Number of Uses" section with edit button

#### Listing Page - `/listing/[slug]`

**File**: `app/listing/[slug]/listing-client.tsx`

- Displays full listing details
- Status badge with color coding
- Listing type badge (Invite Link / Access Code)
- For access_code type: Shows public App URL with link
- Formatted dates and prices
- Purchase button triggers x402 payment flow
- **Inventory display** for multi-use listings

**Features**:

- Loading spinner while fetching
- Error state for invalid/missing listings
- Responsive design
- Status-based UI (active/sold/cancelled)
- Different messaging based on listing type
- Inventory badge showing remaining uses (only for multi-use listings)
- "Sold Out" state when all uses consumed

#### Payment Success Modal

**File**: `app/components/PaymentSuccessModal.tsx`

Displays secret data after successful purchase:

**Invite Link type:**

- Shows "Your Invite Link:" with copy button

**Access Code type:**

- Shows "App Link:" as clickable external link
- Shows "Your Access Code:" with copy button

Both include:

- Warning that data is only shown once
- Confirmation dialog if closing without copying
- Option to rate seller on Ethos

#### Edit Listing Modal

**File**: `app/profile/[slug]/profile-client.tsx`

The edit modal adapts based on listing type:

**Invite Link type:**

- Price (USDC)
- Invite URL (masked, optional update)
- App Name (for custom apps)
- Number of Uses (can only increase)

**Access Code type:**

- Price (USDC)
- App URL (public)
- Access Code (masked, optional update)
- App Name (for custom apps)
- Number of Uses (can only increase)

**Inventory Display:**

- Shows "X of Y sold" for multi-use listings
- Shows "Unlimited · X sold" for unlimited listings
- Sellers can increase `maxUses` to add more inventory

## User Flow

### Creating a Listing

1. **Seller visits `/sell`**
2. **Selects listing type** (Invite Link or Access Code tab)
3. **Fills form**:
   - For Invite Link: App name, Invite URL, Price
   - For Access Code: App name, App URL (public), Access Code (private), Price
4. **Signs EIP-712 message** with wallet
5. **Submits form** → POST to `/api/listings`
6. **Server validates** signature and creates listing
7. **Success screen** shows with link to listing page

### Purchasing a Listing

1. **Buyer visits listing page** `/listing/[slug]`
2. **Views listing details**:
   - For access_code type: Can see App URL before purchase
   - For invite_link type: No URL visible
3. **Clicks Purchase** button
4. **x402 payment flow** initiates
5. **On success**:
   - For invite_link: Receives `inviteUrl`
   - For access_code: Receives `appUrl` + `accessCode`
6. **PaymentSuccessModal** displays secret data with copy buttons

## Technical Features

### Security

- Input validation on both client and server
- Ethereum address format validation
- MongoDB injection protection via Mongoose
- Error handling without exposing internals
- EIP-712 signature verification for all mutations
- Server-side chain ID validation

#### Chain ID Validation

The application operates on a specific network determined by the `NEXT_PUBLIC_IS_TESTNET` environment variable. To prevent listings from being created on the wrong chain:

**Server-Side Enforcement:**

All mutation endpoints (`POST /api/listings`, `PATCH /api/listings/update`, `DELETE /api/listings/delete`) validate that the client-provided `chainId` matches the server's configured chain:

```typescript
// Server imports the authoritative chainId from lib/chain.ts
import { chainId } from "@/lib/chain";

// Client-provided chainId is validated against server's expected chainId
if (clientChainId !== chainId) {
  return NextResponse.json(
    {
      error: `Invalid chain. Expected chainId ${chainId}, got ${clientChainId}. Please switch to the correct network.`,
    },
    { status: 400 }
  );
}
```

**Client-Side Configuration:**

Client components use the server-configured `chainId` from `lib/chain.ts` rather than the wallet's connected chain:

```typescript
// ✅ Correct: Use server-configured chainId
import { chainId } from "@/lib/chain";

// ❌ Wrong: Don't use wallet's chain (could be on wrong network)
const chainId = chain?.id ?? defaultChainId;
```

**Why This Matters:**

- Prevents listings from being stored with incorrect chainId even if user's wallet is connected to the wrong network
- Ensures all database queries filter by the correct chainId
- Signatures are verified against the server's expected chainId

#### Secret Data Protection

The `inviteUrl` and `accessCode` fields are the core assets being sold and are protected from public exposure. The **only** way to obtain these secrets is through successful payment via x402.

**API Endpoint Security:**

| Endpoint                     | `inviteUrl`           | `accessCode`          | `appUrl`  |
| ---------------------------- | --------------------- | --------------------- | --------- |
| `GET /api/listings`          | ❌ Never              | ❌ Never              | ✅ Always |
| `GET /api/listings/[slug]`   | ❌ Never              | ❌ Never              | ✅ Always |
| `POST /api/listings`         | ❌ Never              | ❌ Never              | ✅ Always |
| `PATCH /api/listings/update` | ❌ Never              | ❌ Never              | ✅ Always |
| `GET /api/seller/[address]`  | 🔐 Authenticated only | 🔐 Authenticated only | ✅ Always |
| `POST /api/purchase/[slug]`  | ✅ After x402 payment | ✅ After x402 payment | ✅ Always |

> **Note**: `appUrl` is public for access_code type listings because buyers need to know which app they're purchasing access to.

**Seller Authentication for `/api/seller/[address]`:**

Sellers can view their own secrets on their profile page through signature-based authentication:

1. Request headers required:

   - `x-seller-signature`: Wallet signature
   - `x-seller-message`: Base64-encoded signed message

2. Message format:

   ```
   Edit my listing on invite.markets
   Timestamp: {timestamp}
   Address: {walletAddress}
   ```

3. Validation:
   - Signature must match the seller's address
   - Timestamp must be within 5 minutes (prevents replay attacks)
   - Cannot view another user's secrets

**Frontend Signature Caching:**

To improve UX, the frontend caches the seller's signature for 5 minutes:

```typescript
authDataRef = {
  signature: string, // The wallet signature
  message: string, // The signed message
  walletAddress: string, // Which wallet signed (for validation)
  createdAt: number, // Timestamp (for expiry check)
};
```

Cache validation:

- Same wallet address as current connection
- Created within last 5 minutes
- Auto-cleared on wallet change

**Edit Flow:**

1. User clicks Edit button on their listing
2. If valid cached signature exists → Use it, open modal immediately
3. If no cache/expired → Request new signature
4. If signature rejected → Modal doesn't open
5. If signature accepted → Fetch authenticated data → Open modal with secrets

### Performance

- Connection pooling for database
- Client-side loading states
- Server-side data validation

### UX

- Immediate feedback on form submission
- Clear error messages
- Loading indicators
- Success confirmation with next steps
- Easy navigation between pages
- Listing type tabs with smooth transitions

### Multi-Use Listings

Listings can be configured to allow multiple purchases of the same invite/code:

**Configuration Options:**

- **Single use** (`maxUses: 1`): Default behavior, listing becomes "sold" after one purchase
- **Multiple uses** (`maxUses: N`): Allows N total purchases before "sold out"
- **Unlimited** (`maxUses: -1`): Infinite purchases allowed

**Availability Logic:**

```typescript
function isListingAvailable(listing) {
  if (listing.status !== "active") return false;
  if (listing.maxUses === -1) return true; // Unlimited
  return listing.purchaseCount < listing.maxUses;
}
```

**UI Display Rules:**

- Single-use listings: No inventory badge shown
- Multi-use listings: Shows "X left" badge (yellow when only 1 remaining)
- Unlimited listings: Shows "∞" badge in blue
- Sold out: Purchase button disabled, "Sold Out" state

**Seller Restrictions:**

- `maxUses` can only be increased via update (to add inventory)
- Cannot decrease `maxUses` to prevent reducing promised availability
- `purchaseCount` is system-managed and cannot be manually changed

## Migration Strategy

- Existing listings without `listingType` are treated as `"invite_link"`
- New fields (`listingType`, `appUrl`, `accessCode`) are optional in schema
- Existing listings without `maxUses` default to `1` (single-use)
- Existing listings without `purchaseCount` default to `0`
- No database migration required for backward compatibility

## Future Enhancements

- Listing search and filtering by type
- User authentication
- Escrow system
- Rating/review system
- Activity history
- Email notifications

## Environment Variables Required

```env
MONGODB_URL=mongodb+srv://xxxxx.mongodb.net/?appName=Cluster0
SECRET_KEY=<thirdweb secret key>
SERVER_WALLET=<x402 facilitator wallet address>
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=<thirdweb client id>
NEXT_PUBLIC_IS_TESTNET=true|false
```

## Dependencies Added

- `mongoose` - MongoDB ODM
- `nanoid` - Unique ID generation
- `thirdweb` - Wallet connection, signatures, and x402 payments
- `viem` - Ethereum utilities and signature verification
