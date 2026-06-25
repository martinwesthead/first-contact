---
uid: capability-8bfbe75a
id: CAP-31
type: capability
title: Platform Deployment Infrastructure
created_by: xgd
created_at: '2026-06-25T00:27:45.149678+00:00'
updated_at: '2026-06-25T00:27:45.149678+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: platform_deployment_infrastructure
---

# Platform Deployment Infrastructure

The foundational monorepo, Cloudflare Worker apps, and GitHub Actions
pipelines that allow the 1stcontact.io platform to be built, tested, and
deployed reproducibly.

This capability owns:
- Monorepo workspace shape (apps/, packages/, sites/, tools/, db/migrations/, tests/)
- The two Cloudflare Worker apps (public-site, control-app) at their initial scaffolding stage
- CI: PR validation (install, build, test, dry-run deploys)
- CD: automatic production deploy of both Workers on push to xgd-stable
- Identifier alignment to the `1stcontact` slug across all configuration surfaces
- Toolchain pinning (Node 20+, pnpm 9+ via corepack, frozen lockfile)

Subsequent feature capabilities (site schema, framework modules, generator,
public site, lead capture, builder SPA) build on this substrate.
