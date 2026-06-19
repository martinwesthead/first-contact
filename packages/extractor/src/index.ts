export {
  AssetClassification,
  AssetKind,
  AssetRecord,
  Commentary,
  ContentTree,
  FormField,
  HeadingNode,
  ImagerySignals,
  LayoutBias,
  LayoutDensity,
  LayoutSignals,
  NavLink,
  NOT_DETECTED,
  PaletteSignals,
  PrimaryPair,
  ReferenceDigest,
  SCHEMA_VERSION,
  ScreenshotKeys,
  Signals,
  TypeStyle,
  TypographySignals,
} from "./schema.js";
export type { NotDetected } from "./schema.js";

export { resolveUrl } from "./dom.js";
export { parsePalette } from "./parse-palette.js";
export { parseTypography } from "./parse-typography.js";
export { parseLayout } from "./parse-layout.js";
export { parseImagery, type ImageryResult } from "./parse-imagery.js";
export { parseContent } from "./parse-content.js";
export { extractSignals, deriveWhatsMissing } from "./extract.js";
export { renderDigestMarkdown } from "./render-markdown.js";
export {
  shouldEscalateToRendered,
  type EscalationDecision,
  type EscalationInput,
  type EscalationReason,
} from "./escalate.js";
export {
  renderedFetch,
  DEFAULT_VIEWPORTS,
  COMPUTED_EXTRACTION_SCRIPT,
  type BrowserDriver,
  type ComputedBackgroundAsset,
  type ComputedStyles,
  type ComputedTypeStyle,
  type DriverResult,
  type RenderedFetchOptions,
  type Viewport,
  type ViewportName,
} from "./rendered-fetch.js";
export { mergeComputedSignals } from "./merge.js";
export {
  uploadScreenshots,
  type R2BucketLike,
  type ScreenshotDrop,
  type UploadResult,
  type UploadScreenshotsArgs,
  SCREENSHOT_BYTES_CAP,
} from "./upload-screenshots.js";
