# sites/1stcontact

The 1stcontact.io marketing site, defined as a structured site definition (the
same shape any customer site uses).

Dogfood: the public 1stcontact.io homepage is itself built by the 1stcontact
framework. This directory contains:

- `site.json` — the site definition (config, theme, nav, pages, module instances)
- `assets/` — image and file references attached to module instances
- `README.md` — this file

## Regenerate locally

From the repo root:

```sh
pnpm --filter @gendev/public-site build
```

This runs the generator (`tools/generate`) over this directory and writes the
static output into `apps/public-site/public/`, where the `public-site` Worker
serves it via Workers Static Assets.

To regenerate directly without going through the public-site package:

```sh
pnpm --filter @gendev/generate exec fc-generate \
  --site sites/1stcontact \
  --out apps/public-site/public \
  --clean
```

## Operator follow-ups

The first version uses placeholder copy authored at REQ-6 time. Items the
operator may want to revisit before launch:

- Hero / manifesto / services / founder-note copy
- Real assets (hero image, logo, founder portrait if used)
- Confirmed SEO metadata and og:image
