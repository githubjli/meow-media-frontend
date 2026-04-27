# PRODUCT_ORDER_E2E_CHECKLIST

## Happy-path checklist

1. **Buyer places order**

   - Product selected
   - Shipping address selected
   - Order created successfully

2. **Buyer pays (QR / linked wallet)**

   - Buyer scans QR OR uploads QR image OR uses manual fallback
   - Product payment confirmation modal opens with correct order data
   - Linked wallet payment can be submitted when allowed

3. **Payment submitted / confirming**

   - txid appears when submitted
   - UI shows submitted/confirming state
   - duplicate payment submit is blocked when txid already exists

4. **Backend verifies payment**

   - Order/payment status updates to paid after confirmations

5. **Seller ships order**

   - Seller provides carrier + tracking number
   - Shipment fields appear in buyer detail

6. **Buyer confirms receipt**

   - Buyer confirms received after shipping
   - Order moves to completed

7. **Admin marks settled**
   - Admin confirms payout completion
   - Order moves to settled

## Negative / duplicate-case checklist

1. **Duplicate payment attempt**

   - second payment submit is blocked if txid already exists

2. **Duplicate shipment attempt**

   - shipment submission is blocked once already shipped/final state

3. **Duplicate confirm-received**

   - confirm-received action is blocked in completed/settled

4. **Duplicate settlement**

   - mark-settled action only available for completed orders

5. **Active refund blocks settlement**
   - settlement should not proceed when active refund policy/rule blocks it
   - verify UI/operator workflow reflects this constraint
