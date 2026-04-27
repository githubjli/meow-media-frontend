# PAYMENT_QR_PROTOCOL

## Purpose

This document defines how payment QR payloads are handled by the frontend for product orders.

## Short signed QR payload (current preferred format)

```json
{ "v": 1, "t": "product_payment", "o": "<order_no>", "s": "<signature>" }
```

- `v`: payload version
- `t`: type, must be `product_payment`
- `o`: order number
- `s`: backend-verifiable signature

## Resolver flow

1. User scans/decodes QR text (camera, upload image, or manual paste fallback).
2. Frontend detects short signed payload shape.
3. Frontend calls:
   - `POST /api/payment-qr/resolve/`
   - body: `{ "payload": "<rawQrText>" }`
4. Frontend uses resolver response to populate Product Payment Confirmation UI.

## Backward compatibility

- Older full JSON QR payloads are still supported.
- If payload already contains full payment fields (for example address/amount/order fields), frontend continues existing parse path.
- Short signed payloads are preferred when shape matches.

## Data exposure constraints

### Must NOT be exposed in QR payload

- Internal wallet/account identifiers
- Funding/change account IDs
- Internal debug metadata
- Any secrets/tokens/private keys

### Must NOT be exposed in user-facing UI errors

- Raw backend debug dumps
- Internal field names that leak implementation details

## UI behavior notes

- QR JSON is not shown by default in payment confirmation UI.
- Payment state should reflect backend verification status (including submitted/confirming behavior when txid exists).
