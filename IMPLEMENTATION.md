# Invite Markets Implementation

## Overview

A marketplace for buying and selling invite links with MongoDB backend and Next.js API routes.

## Database Structure

### MongoDB Configuration

- **Cluster**: Cluster0
- **Database**: InviteMarkets
- **Collection**: listings

### Listing Schema

```typescript
{
  slug: string (unique, indexed)
  inviteUrl: string
  priceUsdc: number
  sellerAddress: string (lowercase Ethereum address)
  status: "active" | "sold" | "cancelled"
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

### 3. API Endpoints

#### Create Listing - POST `/api/listings`

**File**: `app/api/listings/route.ts`

- Validates all required fields
- Validates Ethereum address format
- Generates unique slug using nanoid
- Returns created listing with 201 status

**Request Body**:

```json
{
  "inviteUrl": "https://...",
  "priceUsdc": 10.5,
  "sellerAddress": "0x..."
}
```

**Response**:

```json
{
  "success": true,
  "listing": {
    "slug": "abc123xy",
    "priceUsdc": 10.5,
    "sellerAddress": "0x...",
    "status": "active",
    "appId": "ethos",
    "appName": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

> **Note**: `inviteUrl` is intentionally omitted from the response for security. See [Invite URL Protection](#invite-url-protection) for details.

#### Get Listing - GET `/api/listings/[slug]`

**File**: `app/api/listings/[slug]/route.ts`

- Fetches listing by unique slug
- Returns 404 if not found
- Includes all listing details with timestamps
- **Does NOT include inviteUrl** (security measure)

#### Purchase Listing - POST `/api/purchase/[slug]`

**File**: `app/api/purchase/[slug]/route.ts`

This is the **only endpoint** that returns the `inviteUrl`, and only after successful x402 payment verification.

**Flow**:

1. Client sends request with `x-payment` header containing x402 payment data
2. Server calls `settlePayment()` to verify payment via thirdweb facilitator
3. If payment verification fails → Returns error (no inviteUrl)
4. If payment succeeds:
   - Creates transaction record
   - Marks listing as sold
   - Returns `inviteUrl` to buyer

**Request Headers**:

```
x-payment: <x402 payment data>
```

**Success Response** (only after verified payment):

```json
{
  "inviteUrl": "https://app.example.com/invite/abc123"
}
```

#### Get Seller Data - GET `/api/seller/[address]`

**File**: `app/api/seller/[address]/route.ts`

Returns seller statistics and listings. The `inviteUrl` is only included when the request is authenticated as the seller.

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
    { "slug": "...", "priceUsdc": 25, "status": "active", ... }
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
    { "slug": "...", "priceUsdc": 25, "inviteUrl": "https://...", "status": "active", ... }
  ]
}
```

### 4. User Interface

#### Sell Page - `/sell`

**File**: `app/sell/page.tsx`

- Form with 3 fields: Invite URL, Price (USDC), Wallet Address
- Client-side validation
- Success screen with link to listing page
- Option to create another listing

**Features**:

- URL validation for invite link
- Number input with decimal support for price
- Ethereum address pattern validation
- Loading states during submission
- Error handling with user-friendly messages

#### Listing Page - `/listing/[slug]`

**File**: `app/listing/[slug]/page.tsx`

- Displays full listing details
- Status badge with color coding
- Formatted dates and prices
- Back navigation to home
- Purchase button (placeholder for future implementation)

**Features**:

- Loading spinner while fetching
- Error state for invalid/missing listings
- Responsive design
- Clickable invite URL
- Status-based UI (active/sold/cancelled)

## User Flow

1. **Create Listing**:

   - Seller visits `/sell`
   - Fills form with invite URL, price, and wallet address
   - Submits form → POST to `/api/listings`
   - Server generates unique slug and saves to MongoDB
   - Success screen shows with link to listing page

2. **View Listing**:
   - Anyone visits `/listing/[slug]`
   - Page fetches data from `/api/listings/[slug]`
   - Displays all listing details
   - Purchase button available for active listings

## Technical Features

### Security

- Input validation on both client and server
- Ethereum address format validation
- MongoDB injection protection via Mongoose
- Error handling without exposing internals

#### Invite URL Protection

The `inviteUrl` field is the core asset being sold and is protected from public exposure. The **only** way to obtain an invite URL is through successful payment via x402.

**API Endpoint Security:**

| Endpoint                     | inviteUrl Exposure    | Notes                                       |
| ---------------------------- | --------------------- | ------------------------------------------- |
| `GET /api/listings`          | ❌ Never              | Public listing view                         |
| `GET /api/listings/[slug]`   | ❌ Never              | Single listing view                         |
| `POST /api/listings`         | ❌ Never              | Create listing (seller knows their own URL) |
| `PATCH /api/listings/update` | ❌ Never              | Update listing                              |
| `GET /api/seller/[address]`  | 🔐 Authenticated only | Seller can view their own URLs              |
| `POST /api/purchase/[slug]`  | ✅ After x402 payment | **Only way to get inviteUrl**               |

**Seller Authentication for `/api/seller/[address]`:**

Sellers can view their own invite URLs on their profile page through signature-based authentication:

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
   - Cannot view another user's invite URLs

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
5. If signature accepted → Fetch authenticated data → Open modal with inviteUrl

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

## Future Enhancements

- Purchase functionality with smart contracts
- Listing search and filtering
- User authentication
- Escrow system
- Rating/review system
- Activity history
- Email notifications

## Environment Variables Required

```env
MONGODB_URL=mongodb+srv://xxxxx.mongodb.net/?appName=Cluster0
```

## Dependencies Added

- `mongoose` - MongoDB ODM
- `nanoid` - Unique ID generation
