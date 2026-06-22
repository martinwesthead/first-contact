import type { AssetRef, NavTarget } from "@gendev/site-schema";

export function isAssetRef(value: unknown): value is AssetRef {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as AssetRef).src === "string" &&
    typeof (value as AssetRef).alt === "string" &&
    typeof (value as AssetRef).id === "string"
  );
}

export function hrefForTarget(target: NavTarget): string {
  switch (target.kind) {
    case "page":
      return target.pageId === "home" ? "/" : `/${target.pageId}`;
    case "anchor": {
      const base = target.pageId === "home" ? "" : `/${target.pageId}`;
      return `${base}#${target.moduleId}`;
    }
    case "url":
      return target.href;
  }
}
