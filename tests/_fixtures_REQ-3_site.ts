import type { Site, ThemeTokens } from "@1stcontact/site-schema";

export function makeThemeTokens(): ThemeTokens {
  return {
    palette: {
      bg: "#ffffff",
      surface: "#f5f5f5",
      surfaceSubtle: "#fafafa",
      surfaceInverse: "#0a0a0a",
      text: "#111111",
      muted: "#888888",
      primary: "#1a73e8",
      accent: "#ff6f61",
      border: "#dddddd",
    },
    typography: {
      family: {
        heading: "'Inter', sans-serif",
        body: "'Inter', sans-serif",
      },
      scale: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
        "5xl": "3rem",
      },
      weights: {
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        black: "900",
      },
      lineHeights: {
        tight: "1.2",
        normal: "1.5",
        relaxed: "1.75",
      },
    },
    spacing: {
      "0": "0",
      "1": "0.25rem",
      "2": "0.5rem",
      "3": "0.75rem",
      "4": "1rem",
      "6": "1.5rem",
      "8": "2rem",
      "12": "3rem",
      "16": "4rem",
      "24": "6rem",
    },
    radius: {
      none: "0",
      sm: "0.125rem",
      md: "0.375rem",
      lg: "0.75rem",
      full: "9999px",
    },
    shadow: {
      none: "none",
      sm: "0 1px 2px rgba(0,0,0,0.05)",
      md: "0 4px 6px rgba(0,0,0,0.1)",
      lg: "0 10px 15px rgba(0,0,0,0.1)",
    },
    container: {
      narrow: "45rem",
      default: "72rem",
      wide: "80rem",
      bleed: "100%",
    },
    breakpoints: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
  };
}

export function makeMinimalSite(): Site {
  return {
    config: { businessName: "Acme Co" },
    theme: makeThemeTokens(),
    nav: { pattern: "footer-only", entries: [] },
    pages: [
      {
        id: "home",
        slug: "/",
        title: "Home",
        modules: [
          {
            id: "hero-1",
            type: "hero",
            version: 1,
          },
        ],
      },
    ],
  };
}

export function makeFullSite(): Site {
  return {
    config: {
      businessName: "Acme Catering",
      tagline: "Bringing the feast",
      contact: {
        email: "hello@acme.example",
        phone: "+1-555-0100",
        address: "1 Main St, Anywhere",
      },
      hours: { mon: "9-5", tue: "9-5" },
      integrations: { stripe: { publicKey: "pk_test_x" } },
    },
    theme: makeThemeTokens(),
    nav: {
      pattern: "top-tabs",
      entries: [
        { label: "Home", target: { kind: "page", pageId: "home" } },
        {
          label: "Top of menu",
          target: { kind: "anchor", pageId: "menu", moduleId: "menu-hero" },
        },
        { label: "Blog", target: { kind: "url", href: "https://blog.example/" } },
      ],
    },
    pages: [
      {
        id: "home",
        slug: "/",
        title: "Home",
        seoMeta: {
          title: "Acme Catering | Home",
          description: "Bringing the feast",
          ogImage: "asset-og-home",
        },
        modules: [
          {
            id: "hero-1",
            type: "hero",
            version: 1,
            variant: "image-left",
            dials: { size: "lg", spacingTop: "xl" },
            content: {
              heading: "Welcome",
              body: "We cater events of all sizes.",
              image: {
                id: "img-hero",
                src: "/assets/hero.jpg",
                alt: "Catering team at work",
                focalPoint: { x: 0.5, y: 0.4 },
              },
            },
          },
          {
            id: "features-1",
            type: "feature-grid",
            version: 1,
            content: {
              items: ["Allergen-aware", "Vegan options", "On-site staff"],
            },
          },
        ],
      },
      {
        id: "menu",
        slug: "/menu",
        title: "Menu",
        modules: [
          { id: "menu-hero", type: "hero", version: 1 },
          { id: "menu-list", type: "text-block", version: 1 },
        ],
      },
    ],
    assets: [
      { id: "img-hero", src: "/assets/hero.jpg", alt: "Hero" },
      { id: "asset-og-home", src: "/assets/og-home.jpg", alt: "OG image" },
    ],
  };
}
