# AI Website Caretaker Platform - Product Definition

## Vision

Build an AI-powered platform for creating and operating small-business web presences.

The goal is not to compete with enterprise marketing agencies or full-featured CRM suites. The goal is to provide solo founders and small businesses with a complete digital presence solution at a dramatically lower cost through extensive automation.

Target pricing is approximately $50/month rather than the $150-$400/month commonly charged by agencies and marketing service providers.

The platform also serves as a public demonstration of XGD architecture and autonomous software stewardship principles.

---

# Product Positioning

## Not

* Website hosting
* Website builder
* Marketing agency
* ERP
* Accounting system

## Is

An AI Website Caretaker.

The platform is responsible for:

* Creating websites
* Maintaining websites
* Capturing leads
* Managing customer interactions
* Helping customers collect payments
* Operating a small business's digital presence

The customer value proposition is:

> Stop worrying about your website.

---

# Architectural Principles

## JAMStack Native

Customer websites are JAMStack sites.

Benefits:

* Low hosting cost
* High performance
* High reliability
* Strong security
* Cloudflare-friendly deployment

The management platform itself is also a JAMStack application backed by Cloudflare services.

---

## Configuration and Content Driven

Customer sites should not contain significant custom code.

A site should primarily consist of:

* Configuration
* Content
* Assets
* Theme settings

A shared rendering engine generates the final site.

### Desired Structure

```text
Site Definition
├── Configuration
├── Content
├── Assets
└── Theme

Shared Platform
├── Layouts
├── Components
├── Sections
├── Forms
├── SEO
└── Rendering Engine
```

---

## Structured Changes

AI should modify structured site definitions rather than arbitrary HTML/CSS.

Examples:

* Change color palette
* Add page
* Reorder sections
* Add contact form
* Add gallery

This reduces risk and improves reliability.

---

# MVP Product Scope

## 1. Modular JAMStack Website Framework

Features:

* Component-based architecture
* Reusable sections
* Theme system
* Responsive layouts
* Static generation
* Cloudflare deployment

Target industries:

* Caterers
* Consultants
* Coaches
* Tradespeople
* Photographers
* Other solo businesses

Industry templates should exist at the business workflow level rather than purely visual level.

---

## 2. Chat-Based Website Builder

Primary user interface.

Users interact via conversation.

Examples:

* "Create a catering website."
* "Move testimonials higher."
* "Add a wedding package."
* "Make the site feel more premium."

The platform should progressively build the site while the user watches.

Preferred experience:

```text
Chat Window
+
Live Preview
```

The onboarding process becomes part website creation and part business consultation.

---

## 3. CRM Lite

Goal:

Track leads and customer interactions.

Internally implemented using the XGD ticket model.

Possible lead states:

* New Inquiry
* Contacted
* Quote Needed
* Quote Sent
* Follow Up
* Booked
* Lost

The user should not see tickets.

The user sees:

* Leads
* Customers
* Follow Ups
* Conversations

---

## 4. Invoicing and Payments

Supported:

* Quotes
* Invoices
* Stripe payment links
* Payment tracking

Not supported:

* Accounting
* Payroll
* Inventory
* ERP

The platform should stop at the point where money is collected.

---

## 5. User Portal and Subscription Support

Support:

* Customer login
* Subscription management
* Invoice history
* Payment history
* Account management

This functionality is expected to be shared with the broader XGD ecosystem.

---

# Monitoring MVP

Monitoring should focus on business outcomes rather than technical metrics.

Initial monitoring:

* Website availability
* SSL validity
* Domain health
* Contact form testing
* Lead capture verification
* Broken links
* Missing assets
* Basic SEO checks

Future additions:

* AI visibility monitoring
* Newsletter effectiveness
* Lead funnel monitoring
* SEM support

---

# Deliberate Exclusions

The following are intentionally excluded from the initial product:

* ERP
* Inventory management
* Shipping
* Fulfillment
* Advanced accounting
* Complex marketing automation
* Enterprise CRM functionality

These may be supported later through integrations.

---

# Business Strategy

Primary customer:

* Solo founders
* Small service businesses
* Businesses that need a steady lead flow rather than sophisticated marketing operations

The platform is intended to occupy the gap between:

```text
DIY Website Builder
($10-$30/month)

and

Agency / Marketing Platform
($150-$500+/month)
```

Target position:

```text
AI Website Caretaker
(~$50/month)
```

---

# Strategic Relationship to XGD

This platform serves as:

1. A revenue-generating product.
2. A demonstration of XGD architecture.
3. A proof point for autonomous software stewardship.
4. A testbed for AI-driven support and maintenance.
5. A future foundation for broader business automation.

The platform should be built using the same architectural principles it demonstrates.

---

# Future Expansion Opportunities

These are intentionally deferred until customer demand justifies them:

## Marketing

* Newsletter campaigns
* Mailing list management
* AI-assisted content creation
* SEO recommendations
* AI visibility optimization
* SEM campaign assistance

## Customer Communication

* Unified inbox
* Email integration
* SMS integration
* Website chat
* AI-assisted customer support

## Business Automation

* Appointment booking
* Quote generation
* Automated follow-up workflows
* Lead nurturing
* Customer onboarding

## Platform Vision

Long-term the system may evolve from:

```text
Website Platform
```

into:

```text
Digital Presence Operating System
```

for solo founders and small businesses.

The core philosophy remains:

> Build an architecture capable of supporting future capabilities, but only implement features when customers demonstrate a need for them.
