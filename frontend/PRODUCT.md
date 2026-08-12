# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the Jamval owner/operator, who uses the application mainly on a phone during visits to client locations. An administrator or support person may use it occasionally on a notebook for registrations, stock adjustments, financial review, or configuration.

## Product Purpose

Jamval is a private operational system for a small family business that sells electronic accessories, primarily through consignment. It replaces paper-based counting and manual calculations with a faster, more reliable workflow for visits, settlements, replenishment, payments, receivables, stock, and receipts.

Success means the operator can complete a client visit with fewer manual calculations and fewer recording errors, while preserving a trustworthy history of what was left, sold, returned, lost, paid, and still owed.

## Positioning

Jamval is a focused consignment-operations tool built around the real visit: count what remains at the client, automatically calculate the settlement, record payment status, replenish stock, and preserve the transaction as history and a shareable receipt.

## Operating Context

The operator leaves products at markets, shops, restaurants, and other partner locations, then returns approximately every 30–40 days. Clients generally do not track quantities sold, so the operator counts the remaining products on site, compares them with the previous consignment, settles the amount, and usually replenishes during the same visit.

The application is used in the field on a mobile device, with occasional desktop use for administration and review. The system is private and intended for the Jamval operation rather than public customer registration.

## Capabilities and Constraints

- Manage products, clients, client-specific catalogs, prices, and ideal quantities.
- Open and complete consignment or direct-sale visits.
- Calculate sold quantities from previous quantity, good remaining stock, defective returns, and losses.
- Record replenishment, central stock movements, payments, partial payments, pending balances, and receivables.
- Generate and locate PDF receipts containing visit and payment details; visit signatures are supported but are not mandatory.
- Provide operational dashboards and administrative financial, profit, stock, and receivables views.
- Preserve historical prices and completed visits for later reference.
- Use Portuguese terminology and a mobile-first interaction model with few taps and fast numeric entry.
- V1 does not include public signup, integrated invoice issuance, barcode scanning, advanced multi-user support, route optimization, or a customer portal.
- The current implementation uses React/Vite/TypeScript on the frontend and Fastify/Prisma/PostgreSQL on the backend with session-cookie authentication.

## Brand Commitments

- Product name: Jamval.
- Existing Jamval logo asset: `public/Jamval.svg`.
- Interface language: Brazilian Portuguese.
- The product should remain practical, clear, and trustworthy for a low-to-medium technical skill operator working under field conditions.

## Evidence on Hand

- Product overview, workflows, scope, and success criteria: `backend/PRD.md`.
- Business rules and visit calculations: `backend/RULES.md`.
- Current feature inventory, routes, screenshots, and operational rationale: `README.md`.
- Existing frontend implementation: `frontend/src/`.
- Existing company logo: `frontend/public/Jamval.svg`.
- No public customer testimonials, external proof, or confirmed marketing claims are available; future work must not fabricate them.

## Product Principles

- Make the real-world visit the center of the workflow.
- Replace arithmetic and paper reconciliation with reliable, visible calculations.
- Keep field operations fast and understandable on a phone.
- Preserve operational history so every settlement can be checked later.
- Support flexible payment outcomes without losing financial clarity.
