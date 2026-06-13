import { z } from "zod";

const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const HexColor = z
  .string()
  .regex(hexColorRegex, "must be hex color: #rgb / #rrggbb / #rrggbbaa");
export type HexColor = z.infer<typeof HexColor>;

export const UrlString = z
  .string()
  .min(1)
  .refine((s) => /^(https?:\/\/|\/|#|mailto:|tel:)/.test(s), {
    message: "must be absolute URL, root-relative path, fragment, mailto:, or tel:",
  });
export type UrlString = z.infer<typeof UrlString>;

export const MarkdownString = z.string().brand<"Markdown">();
export type MarkdownString = z.infer<typeof MarkdownString>;

export const EnumValue = z.string().brand<"EnumValue">();
export type EnumValue = z.infer<typeof EnumValue>;

export const AssetRef = z.object({
  id: z.string().min(1),
  src: z.string().min(1),
  alt: z.string(),
  focalPoint: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
    })
    .optional(),
});
export type AssetRef = z.infer<typeof AssetRef>;

export type ContentValue =
  | string
  | number
  | boolean
  | null
  | AssetRef
  | ContentValue[]
  | { [key: string]: ContentValue };

export const ContentValue: z.ZodType<ContentValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    AssetRef,
    z.array(ContentValue),
    z.record(z.string(), ContentValue),
  ]),
);

export const ModuleContent = z.record(z.string(), ContentValue);
export type ModuleContent = z.infer<typeof ModuleContent>;

export const Dials = z.record(z.string(), z.string());
export type Dials = z.infer<typeof Dials>;

export const PaletteTokens = z.object({
  bg: HexColor,
  surface: HexColor,
  surfaceSubtle: HexColor,
  surfaceInverse: HexColor,
  text: HexColor,
  muted: HexColor,
  primary: HexColor,
  accent: HexColor,
  border: HexColor,
});
export type PaletteTokens = z.infer<typeof PaletteTokens>;

export const TypographyTokens = z.object({
  family: z.object({
    heading: z.string().min(1),
    body: z.string().min(1),
  }),
  scale: z.object({
    xs: z.string().min(1),
    sm: z.string().min(1),
    base: z.string().min(1),
    lg: z.string().min(1),
    xl: z.string().min(1),
    "2xl": z.string().min(1),
    "3xl": z.string().min(1),
    "4xl": z.string().min(1),
    "5xl": z.string().min(1),
  }),
  weights: z.object({
    regular: z.string().min(1),
    medium: z.string().min(1),
    semibold: z.string().min(1),
    bold: z.string().min(1),
    black: z.string().min(1),
  }),
  lineHeights: z.object({
    tight: z.string().min(1),
    normal: z.string().min(1),
    relaxed: z.string().min(1),
  }),
});
export type TypographyTokens = z.infer<typeof TypographyTokens>;

export const SpacingTokens = z.object({
  "0": z.string().min(1),
  "1": z.string().min(1),
  "2": z.string().min(1),
  "3": z.string().min(1),
  "4": z.string().min(1),
  "6": z.string().min(1),
  "8": z.string().min(1),
  "12": z.string().min(1),
  "16": z.string().min(1),
  "24": z.string().min(1),
});
export type SpacingTokens = z.infer<typeof SpacingTokens>;

export const RadiusTokens = z.object({
  none: z.string().min(1),
  sm: z.string().min(1),
  md: z.string().min(1),
  lg: z.string().min(1),
  full: z.string().min(1),
});
export type RadiusTokens = z.infer<typeof RadiusTokens>;

export const ShadowTokens = z.object({
  none: z.string(),
  sm: z.string().min(1),
  md: z.string().min(1),
  lg: z.string().min(1),
});
export type ShadowTokens = z.infer<typeof ShadowTokens>;

export const ContainerTokens = z.object({
  narrow: z.string().min(1),
  default: z.string().min(1),
  wide: z.string().min(1),
  bleed: z.string().min(1),
});
export type ContainerTokens = z.infer<typeof ContainerTokens>;

export const BreakpointTokens = z.object({
  sm: z.string().min(1),
  md: z.string().min(1),
  lg: z.string().min(1),
  xl: z.string().min(1),
});
export type BreakpointTokens = z.infer<typeof BreakpointTokens>;

export const ThemeTokens = z.object({
  palette: PaletteTokens,
  typography: TypographyTokens,
  spacing: SpacingTokens,
  radius: RadiusTokens,
  shadow: ShadowTokens,
  container: ContainerTokens,
  breakpoints: BreakpointTokens,
});
export type ThemeTokens = z.infer<typeof ThemeTokens>;

export const NavPattern = z.enum([
  "in-page-anchors",
  "top-tabs",
  "top-tabs-dropdown",
  "hamburger",
  "footer-only",
]);
export type NavPattern = z.infer<typeof NavPattern>;

const NavTargetPage = z.object({
  kind: z.literal("page"),
  pageId: z.string().min(1),
});

const NavTargetAnchor = z.object({
  kind: z.literal("anchor"),
  pageId: z.string().min(1),
  moduleId: z.string().min(1),
});

const NavTargetUrl = z.object({
  kind: z.literal("url"),
  href: UrlString,
});

export const NavTarget = z.discriminatedUnion("kind", [
  NavTargetPage,
  NavTargetAnchor,
  NavTargetUrl,
]);
export type NavTarget = z.infer<typeof NavTarget>;

export const NavEntry = z.object({
  label: z.string().min(1),
  target: NavTarget,
});
export type NavEntry = z.infer<typeof NavEntry>;

export const NavConfig = z.object({
  pattern: NavPattern,
  entries: z.array(NavEntry),
});
export type NavConfig = z.infer<typeof NavConfig>;

export const SeoMeta = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  ogImage: z.string().optional(),
});
export type SeoMeta = z.infer<typeof SeoMeta>;

export const SiteConfig = z
  .object({
    businessName: z.string().min(1),
    tagline: z.string().optional(),
    contact: z
      .object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      })
      .optional(),
    hours: z.record(z.string(), z.string()).optional(),
    integrations: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type SiteConfig = z.infer<typeof SiteConfig>;

export const ModuleInstance = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  version: z.number().int().positive(),
  variant: z.string().min(1).optional(),
  dials: Dials.optional(),
  content: ModuleContent.optional(),
});
export type ModuleInstance = z.infer<typeof ModuleInstance>;

export const Page = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
    seoMeta: SeoMeta.optional(),
    modules: z.array(ModuleInstance),
  })
  .superRefine((page, ctx) => {
    const seen = new Set<string>();
    page.modules.forEach((m, idx) => {
      if (seen.has(m.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["modules", idx, "id"],
          message: `duplicate module id '${m.id}' (must be unique within page)`,
        });
      }
      seen.add(m.id);
    });
  });
export type Page = z.infer<typeof Page>;

export const Site = z
  .object({
    config: SiteConfig,
    theme: ThemeTokens,
    nav: NavConfig,
    pages: z.array(Page).min(1),
    assets: z.array(AssetRef).optional(),
  })
  .superRefine((site, ctx) => {
    const slugs = new Set<string>();
    site.pages.forEach((p, idx) => {
      if (slugs.has(p.slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pages", idx, "slug"],
          message: `duplicate page slug '${p.slug}' (must be unique within site)`,
        });
      }
      slugs.add(p.slug);
    });
  });
export type Site = z.infer<typeof Site>;
