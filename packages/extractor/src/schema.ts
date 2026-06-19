import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;

export const NOT_DETECTED = "not_detected" as const;
export type NotDetected = typeof NOT_DETECTED;

const StringOrNd = z.union([z.string().min(1), z.literal(NOT_DETECTED)]);
const NumberOrNd = z.union([z.number(), z.literal(NOT_DETECTED)]);

export const PaletteSignals = z.object({
  background: StringOrNd,
  body: StringOrNd,
  accent: StringOrNd,
  cta: StringOrNd,
  supporting: z.array(z.string()),
});
export type PaletteSignals = z.infer<typeof PaletteSignals>;

export const TypeStyle = z.object({
  family: StringOrNd,
  size: StringOrNd,
  weight: StringOrNd,
});
export type TypeStyle = z.infer<typeof TypeStyle>;

export const PrimaryPair = z.union([
  z.object({ heading: z.string(), body: z.string() }),
  z.literal(NOT_DETECTED),
]);
export type PrimaryPair = z.infer<typeof PrimaryPair>;

export const TypographySignals = z.object({
  body: TypeStyle,
  h1: TypeStyle,
  h2: TypeStyle,
  h3: TypeStyle,
  primaryPair: PrimaryPair,
});
export type TypographySignals = z.infer<typeof TypographySignals>;

export const LayoutBias = z.union([
  z.literal("centered"),
  z.literal("left"),
  z.literal(NOT_DETECTED),
]);
export type LayoutBias = z.infer<typeof LayoutBias>;

export const LayoutDensity = z.union([
  z.literal("sparse"),
  z.literal("balanced"),
  z.literal("dense"),
  z.literal(NOT_DETECTED),
]);
export type LayoutDensity = z.infer<typeof LayoutDensity>;

export const LayoutSignals = z.object({
  maxContentWidth: NumberOrNd,
  bias: LayoutBias,
  density: LayoutDensity,
});
export type LayoutSignals = z.infer<typeof LayoutSignals>;

export const ImagerySignals = z.object({
  imgCount: z.number().int().nonnegative(),
  backgroundCount: z.number().int().nonnegative(),
  videoCount: z.number().int().nonnegative(),
  heroDetected: z.boolean(),
});
export type ImagerySignals = z.infer<typeof ImagerySignals>;

export const HeadingNode = z.object({
  level: z.number().int().min(1).max(6),
  text: z.string(),
});
export type HeadingNode = z.infer<typeof HeadingNode>;

export const NavLink = z.object({ text: z.string(), href: z.string() });
export type NavLink = z.infer<typeof NavLink>;

export const FormField = z.object({ name: z.string(), kind: z.string() });
export type FormField = z.infer<typeof FormField>;

export const ContentTree = z.object({
  headings: z.array(HeadingNode),
  navLinks: z.array(NavLink),
  formFields: z.array(FormField),
  listGroupCount: z.number().int().nonnegative(),
  sectionCount: z.number().int().nonnegative(),
});
export type ContentTree = z.infer<typeof ContentTree>;

export const AssetClassification = z.enum([
  "hero",
  "product",
  "headshot",
  "testimonial",
  "decorative",
  "unknown",
]);
export type AssetClassification = z.infer<typeof AssetClassification>;

export const AssetKind = z.enum(["img", "background", "video"]);
export type AssetKind = z.infer<typeof AssetKind>;

export const AssetRecord = z.object({
  url: z.string(),
  kind: AssetKind,
  alt: z.string().optional(),
  classification: AssetClassification,
  width: z.number().optional(),
  height: z.number().optional(),
  references: z.number().int().min(1),
});
export type AssetRecord = z.infer<typeof AssetRecord>;

export const Signals = z.object({
  palette: PaletteSignals,
  typography: TypographySignals,
  layout: LayoutSignals,
  imagery: ImagerySignals,
  content: ContentTree,
  assetInventory: z.array(AssetRecord),
});
export type Signals = z.infer<typeof Signals>;

export const Commentary = z.object({
  perSection: z.record(z.string()),
  whatsMissing: z.array(z.string()),
});
export type Commentary = z.infer<typeof Commentary>;

export const ScreenshotKeys = z.object({
  mobile: z.string().optional(),
  tablet: z.string().optional(),
  desktop: z.string().optional(),
});
export type ScreenshotKeys = z.infer<typeof ScreenshotKeys>;

export const ReferenceDigest = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  sourceUrl: z.string(),
  fetchedAt: z.string(),
  fetchPath: z.enum(["static", "rendered"]),
  summary: z.string(),
  signals: Signals,
  commentary: Commentary,
  screenshotKeys: ScreenshotKeys,
});
export type ReferenceDigest = z.infer<typeof ReferenceDigest>;
