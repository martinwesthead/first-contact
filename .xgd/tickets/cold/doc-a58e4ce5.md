---
uid: doc-a58e4ce5
id: DOC-5
type: doc
title: Gendev Website Caretaker Architecture
created_by: xgd
created_at: '2026-06-12T19:41:00.138701+00:00'
updated_at: '2026-06-12T19:41:00.138701+00:00'
completed_at: null
last_field_updated: created_at
status: null
fields:
  doc_kind: architecture
---

# GenDev Labs Website Caretaker Platform - Architecture Decisions

## Purpose

This document captures the current architectural direction for the GenDev Labs AI Website Caretaker Platform.

The product is a JAMstack-native, AI-assisted platform for building and operating small-business websites. It combines a modular website framework, chat-based site builder, CRM Lite, invoicing/payments, monitoring, and a customer portal.

The guiding principle is:

> Build an architecture capable of supporting broader business automation, but only add customer-facing capabilities when customers need them.

---

# Core Architecture Decision

The platform should be hosted primarily on Cloudflare.

External dependencies should be limited to services that are clearly outside the platform's core competency, such as:

- AI model providers
- Stripe
- Email delivery
- SMS delivery, if needed later
- Domain registrar services, if needed later

The preferred backend model is:

```text
Cloudflare-hosted control plane
+
Cloudflare-hosted customer sites
+
external AI/payment/email providers
```

---

# Cloudflare Platform Components

## Workers

Cloudflare Workers provide the main backend API layer.

Responsibilities:

- Site builder API
- CRM API
- Portal API
- Form submission endpoints
- Stripe webhook handling
- Magic-link authentication
- AI orchestration
- Monitoring endpoints
- Public site dynamic endpoints

---

## Workers Static Assets

Used to host:

- The GenDev Labs control application frontend
- Customer JAMstack websites
- Preview builds

Customer websites should be static wherever possible.

---

## D1

D1 is the primary product database.

Use D1 for structured operational data such as:

- Users
- Organizations
- Sites
- Site configuration
- Pages
- Sections
- Theme tokens
- Leads
- Contacts
- Customers
- Invoices
- Payments
- Subscriptions
- Monitoring events
- Audit events
- Automation tickets
- Magic-link tokens

D1 should be the default database unless a clear limitation emerges.

---

## R2

R2 is used for blob and artifact storage.

Use R2 for:

- Uploaded images
- Generated images
- Customer assets
- Static build artifacts
- Site backups
- Site snapshots
- Large content exports
- Archived revision payloads

---

## KV

KV may be used for low-criticality, globally distributed values.

Possible uses:

- Public runtime config
- Cached site metadata
- Feature flags
- Rate-limit metadata
- Low-risk lookup data

KV should not be the source of truth for critical customer or billing data.

---

## Durable Objects

Durable Objects should be used where per-site or per-session coordination is needed.

Possible uses:

- Serializing builds per site
- Preventing concurrent conflicting publishes
- Live preview sessions
- Chat session coordination
- Long-lived per-site state machines

Use Durable Objects selectively rather than as the general data store.

---

## Queues, Cron Triggers, and Workflows

Cloudflare Queues and scheduled jobs should power background work.

Example jobs:

- Build site
- Deploy site
- Generate preview
- Run uptime checks
- Test contact forms
- Check broken links
- Run SEO checks
- Summarize monitoring reports
- Sync Stripe events
- Send newsletters
- Process AI maintenance tasks

---

# JAMstack Model

The database does not compromise the JAMstack architecture.

The distinction is:

```text
Authoring/control system uses a database.
Published customer site is static/generated.
```

The public site should be generated from structured data and served as static assets wherever possible.

---

# Site Definition Model

Customer sites should be mostly configuration and content around a fixed shared framework.

A customer site consists of:

```text
Site Definition
├── Business profile
├── Pages
├── Sections
├── Content
├── Theme tokens
├── Navigation
├── Forms
├── Integrations
└── Assets
```

The platform provides:

```text
Shared Framework
├── Layouts
├── Components
├── Section renderers
├── Form handlers
├── SEO generation
├── Responsive behavior
├── Accessibility rules
└── Static renderer
```

The customer-specific site should not require significant custom code.

---

# Rendering and Publishing

The publication pipeline should be:

```text
D1 site definition
+
R2 assets
    ↓
Static renderer
    ↓
Generated HTML/CSS/JS/assets
    ↓
Cloudflare static deployment
```

Dynamic features should be implemented with Worker endpoints only where needed.

Examples:

```text
Contact form → Worker API → D1 lead record
Newsletter signup → Worker API → subscriber record/provider
Invoice payment → Stripe hosted payment/payment link
Customer portal → dynamic control app
```

---

# Revision and Version Control Strategy

GitHub should not be required infrastructure for customer sites.

GitHub may be used for GenDev Labs' own platform development, but customer-site source of truth should live in Cloudflare storage.

Instead of requiring GitHub repositories per customer, use a Git-like revision model.

## Site Revisions

Every meaningful change creates a revision.

Example revision record:

```text
site_revisions
├── revision_id
├── site_id
├── parent_revision_id
├── author_type
├── author_id
├── change_summary
├── snapshot_ref
├── created_at
└── published_at
```

Benefits:

- Rollback
- Auditability
- Preview generation
- Change history
- AI accountability
- No GitHub dependency

Snapshots may be stored in D1 for small payloads or R2 for larger serialized site definitions.

---

# XGD Ticketing System Decision

Do not initially repurpose the full XGD ticketing implementation.

Instead:

- Borrow the ticket/event model.
- Implement a simpler product-native schema in D1.
- Preserve the idea that meaningful work becomes tickets/events.

Examples:

```text
Automation ticket
Monitoring issue
Lead follow-up
Website change request
Payment issue
Content review item
Support escalation
```

This preserves the XGD mental model without importing unnecessary implementation complexity.

---

# Operational Data Model

There are two major classes of data.

## 1. Site Definition Data

Used to generate the published JAMstack site.

Examples:

- Site config
- Pages
- Sections
- Content blocks
- Theme tokens
- Navigation
- SEO metadata
- Form definitions

This data changes through the builder and produces static output.

## 2. Business Operational Data

Used by the dynamic business system.

Examples:

- Leads
- Contacts
- Customers
- Messages
- Invoices
- Payments
- Subscriptions
- Monitoring results
- Audit events

This data remains dynamic in D1 and is surfaced through the portal/control app.

---

# CRM Lite Architecture

CRM Lite should be implemented directly in the platform database.

A lead is conceptually similar to a ticket.

Possible lead lifecycle:

```text
New Inquiry
→ Contacted
→ Quote Needed
→ Quote Sent
→ Follow Up
→ Booked
→ Lost
→ Archived
```

The user should not see the internal ticket abstraction.

The user sees:

- Leads
- Customers
- Follow-ups
- Conversations
- Quotes
- Invoices

---

# Payments and Invoicing

Stripe should handle payment processing.

The platform should support:

- Quotes
- Invoices
- Stripe payment links
- Payment status tracking
- Subscription payments for GenDev Labs customers
- Invoice/payment history in the portal

The platform should not store credit card data.

Store only:

- Stripe customer ID
- Stripe invoice/payment IDs
- Payment status
- Invoice metadata
- Subscription status

Deliberately avoid:

- Accounting
- Payroll
- Inventory
- ERP
- Fulfillment

The platform stops at collecting money.

---

# Identity and Authentication Decision

Use magic email links as the primary authentication model.

Do not use social login for MVP.

Do not use passwords for MVP.

Identity is anchored around verified email addresses.

---

# Magic-Link Authentication Model

## Business Owner Login

```text
Enter email
↓
Receive magic login link
↓
Click link
↓
Portal session created
```

Business owners access:

- Site dashboard
- Builder
- CRM Lite
- Invoices/payments
- Monitoring
- Subscription management
- Data export/deletion tools

---

## Lead-Level Access

Public website forms do not require login.

After a form submission:

```text
Visitor submits inquiry
↓
Confirmation email sent
↓
Email includes “Manage this inquiry” link
↓
Visitor can view/export/delete that specific submission
```

This avoids lead-capture friction while supporting privacy and deletion workflows.

---

## Customer Portal Access

If a lead becomes a customer, they may receive an invitation link.

```text
Business owner sends portal invitation
↓
Customer clicks magic link
↓
Customer session created
↓
Customer can view scoped records
```

Possible access:

- Quotes
- Invoices
- Payments
- Messages
- Booking details, if added later
- Data deletion/export controls

---

# Permission Model

Authentication and authorization should be separate.

A user identity proves access to an email inbox.

Permissions determine what that identity can access.

Possible access scopes:

```text
Organization owner
Site admin
Business staff
Lead record access
Customer portal access
GenDev Labs admin
```

A magic link can be scoped narrowly.

Examples:

- Login to full business owner portal
- Manage a specific inquiry
- View a specific invoice
- Accept a quote
- Pay an invoice
- Delete a specific lead record

---

# Privacy and PII Principles

The platform will store PII, especially for CRM Lite and customer inquiries.

Examples:

- Names
- Email addresses
- Phone numbers
- Messages
- Event details
- Quote/invoice records

Privacy principles:

1. Collect only necessary data.
2. Attach tenant/organization/site IDs to all customer records.
3. Avoid storing payment card data.
4. Use Stripe for payment processing.
5. Use provider-managed email/SMS delivery.
6. Provide export and deletion capabilities early.
7. Maintain audit events for significant actions.
8. Be transparent when customer data is sent to AI providers.

---

# Customer Portal as Trust Architecture

The customer portal is not merely a billing feature.

It supports:

- Trust
- Privacy
- Data control
- Billing transparency
- Monitoring transparency
- AI activity transparency
- Support reduction

Portal capabilities should include:

- View stored leads/customers
- Delete records
- Export records
- View invoices/payments
- Manage subscription
- View monitoring status
- View caretaker activity
- View AI-generated changes
- Roll back site changes, where appropriate

---

# Public Form Strategy

Public website forms should not require login.

Reason:

> Lead capture must be as frictionless as possible.

Spam should be handled through:

- Cloudflare Turnstile
- Rate limiting
- Honeypot fields
- AI spam detection
- Reputation checks

Do not solve spam by forcing visitors to create accounts.

---

# Basic Monitoring Architecture

Monitoring should focus on whether the website is doing its job.

Initial monitoring should include:

- Site availability
- SSL validity
- Domain/DNS health
- Contact form testing
- Lead capture verification
- Broken links
- Missing images/assets
- Basic SEO checks
- Sitemap/robots.txt checks
- Metadata presence
- Static build/deploy status

Failures should create internal events or automation tickets.

---

# AI Usage Architecture

AI should not freely rewrite arbitrary site code.

AI should translate user intent into structured changes.

Examples:

```text
“Make the background blue”
→ update theme token

“Move testimonials higher”
→ reorder page sections

“Add a wedding package”
→ add content block/page section

“Add a contact form”
→ add predefined form component
```

This keeps token usage, risk, and validation complexity under control.

Expensive AI usage is most likely during initial onboarding and site generation.

Routine maintenance should be cheap and structured.

---

# GitHub Decision

Do not make GitHub a required dependency for customer sites.

Use GitHub only for:

- GenDev Labs platform source code
- Internal CI/CD if helpful
- Optional future export/sync

Customer site history should be handled through the platform's own revision model.

This keeps the platform dependency footprint smaller and preserves the Cloudflare-native architecture.

---

# Initial System Shape

```text
GenDev Labs Website Caretaker Platform

Frontend
├── Control app static UI
├── Chat builder UI
├── Customer portal UI
└── Public customer sites

Backend
├── Cloudflare Workers API
├── D1 product database
├── R2 asset/build storage
├── Queues for jobs
├── Durable Objects for coordination
├── Magic-link authentication
├── Stripe integration
├── AI provider integration
└── Email provider integration
```

---

# Key Architectural Commitments

1. Cloudflare-first backend.
2. JAMstack public sites.
3. D1 as primary structured data store.
4. R2 for assets, snapshots, and build artifacts.
5. Git-like revisions instead of required GitHub repos.
6. XGD ticket model as inspiration, not imported implementation.
7. Magic links instead of passwords or social login.
8. Public forms remain login-free.
9. Portal provides privacy, billing, monitoring, and data control.
10. AI modifies structured configuration/content, not arbitrary site code.

---

# Open Architecture Questions

These remain to be resolved:

- Exact D1 schema
- Whether to store site snapshots in D1, R2, or both
- Build/deploy mechanics for customer sites
- Email provider selection
- Magic-link token lifetime and security model
- Stripe product/subscription design
- Monitoring job cadence
- AI provider and cost-control strategy
- Whether to build a custom renderer or use an existing static site framework internally
- First vertical template, such as catering, coaching, or healing practitioners

