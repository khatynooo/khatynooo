# Khatinoo main site rebuild plan

## Non-negotiable rules
- Work only on `rebuild/main-site-ux-20261104`; never commit directly to `main`.
- Preserve product, price, inventory, order, payment, customer, and page-builder data.
- Do not hide runtime errors or silently replace failed API responses with apparently valid empty content.
- Never claim stock, delivery, payment, or order status is live unless the source confirms it.
- Keep customer storefront, customer account, POS, and site-admin permissions separated.

## Workstreams
1. **Storefront UX** — simplify header and category navigation, make search and filters predictable, improve mobile product discovery and cart clarity.
2. **Trust and checkout** — expose shipping/payment rules, validate address and phone fields, prevent duplicate submissions, and make order states explicit.
3. **Reliability** — surface API failures, add retry and empty/error/loading states, preserve errors in logs, and test network interruption.
4. **Admin IA** — group POS, inventory, orders, customer support, site content, and settings into clear work areas.
5. **Quality and security** — test auth boundaries, payment callbacks, inventory race conditions, responsive layouts, and production build.

## First pass completed
- Removed the global console/error/rejection suppression script so real faults are observable.
- Added a visible warning and retry action when one or more storefront data requests fail.
- Kept the existing product and order data model unchanged.

## Acceptance criteria
- API failures are visible and recoverable; they do not masquerade as a genuinely empty catalog.
- Customer journeys work on narrow mobile screens and desktop.
- No duplicate payment/order submission on repeat taps or slow networks.
- Price and stock values come from the current server response.
- All changed flows pass automated tests and production builds.
