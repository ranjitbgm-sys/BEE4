# BEE4 Firestore Security Specification

## 1. Data Invariants
1. **Default Deny Safety Net**: Every path not explicitly matched is denied for all reads and writes.
2. **Verified Identity & Anti-Spoofing**: All writes and private reads require `request.auth != null && request.auth.token.email_verified == true`. Admin checks require `email_verified == true` and either `exists(/databases/.../admins/$(uid))` or verified runtime bootstrap admin email `ranjitbgm@gmail.com`.
3. **PII Isolation (Split Strategy)**: Sensitive fields (`phone`, `email`, `address`, `pinCode`) are isolated inside `/users/{userId}/private/info`, `/users/{userId}/addresses/{addressId}`, `/orders/{orderNumber}`, and `/inquiries/{inquiryId}`. Only the verified owner (`uid == request.auth.uid`) or verified admin may read them.
4. **Master Gate & Atomic Subcollections**:
   - Creating `/users/{userId}/addresses/{addressId}` requires the parent `/users/{userId}` document to exist (`exists(...)`).
   - Creating `/orders/{orderNumber}` requires the order's items subcollection or atomic batch consistency (`itemCount >= 1 && itemCount <= 50`) and enforces `existsAfter(/databases/.../orders/$(orderNumber)/items/item_0)` on order creation so no empty order exists without line items.
   - Creating `/orders/{orderNumber}/items/{itemId}` checks `existsAfter(/databases/.../orders/$(orderNumber))` and verifies ownership (`getAfter` or owner match).
5. **Terminal State Locking**: Once an order reaches `'Delivered'` or `'Cancelled'` (or `'Shipped'` for customer actions), non-admin users cannot mutate it. Customers may only transition `'Confirmed'` or `'Preparing Shipment'` → `'Cancelled'`.
6. **Temporal Integrity & Immutability**: `createdAt == request.time` on creation and `createdAt == existing().createdAt` + `updatedAt == request.time` on update; owner `uid`/`userId` is immutable after creation.

## 2. "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Ghost Field / Shadow Update**: `users/{uid}/private/info` write including `{ isAdmin: true }` or `{ role: "admin" }`.
2. **Email Spoof (Unverified)**: Auth token with `email: "ranjitbgm@gmail.com"` and `email_verified: false` writing to `/products/prod-1`.
3. **PII Blanket Read / Scrape**: Authenticated non-admin user calling `get` or `list` on `/users/otherUid/private/info`, `/orders`, or `/inquiries`.
4. **Identity Spoofing on Order**: Authenticated user setting `userId: "victimUid"` on `/orders/BEE4-999999`.
5. **ID Poisoning (1.5KB ID)**: Writing to `/products/{1500-char-id}` or `/testimonials/bad$id`.
6. **Value Poisoning**: Customer updating `/orders/BEE4-1001` with `{ status: "Cancelled", total: 1 }` or a 10KB string in `giftMessage`.
7. **State Shortcutting**: Customer updating `/orders/BEE4-1001` from `'Confirmed'` directly to `'Delivered'`.
8. **Terminal State Violation**: Customer updating an already `'Delivered'` or `'Cancelled'` order back to `'Confirmed'`.
9. **Timestamp Forgery**: Client passing a custom past `createdAt` string instead of `request.time` server timestamp.
10. **Unbounded Wishlist Array**: Writing 51+ elements into `wishlistIds` or non-string element `[123]`.
11. **Privilege Escalation on `/admins/{uid}`**: Authenticated user trying to create `/admins/{myUid}`.
12. **Orphaned Address Write**: Writing to `/users/{uid}/addresses/addr-1` when `/users/{uid}` does not exist.
