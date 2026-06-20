import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Banner from "../packages/framework/src/modules/banner/index.astro";
import Hero from "../packages/framework/src/modules/hero/index.astro";
import ServicesGrid from "../packages/framework/src/modules/services-grid/index.astro";
import SplitSection from "../packages/framework/src/modules/split-section/index.astro";
import Testimonials from "../packages/framework/src/modules/testimonials/index.astro";
import TextBlock from "../packages/framework/src/modules/text-block/index.astro";

const here = dirname(fileURLToPath(import.meta.url));
const moduleDir = resolve(here, "../packages/framework/src/modules");
const imgMd = '<p><img src="/assets/x.png" alt="x"></p>';

type Case = {
  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: Astro components vary.
  component: any;
  // biome-ignore lint/suspicious/noExplicitAny: per-module prop shapes.
  props: any;
  bodyClass: string;
  source: string;
};

const cases: Case[] = [
  {
    name: "hero subhead",
    component: Hero,
    props: { variant: "bg-color", heading: "H", subhead: imgMd },
    bodyClass: "fc-hero__subhead",
    source: `${moduleDir}/hero/index.astro`,
  },
  {
    name: "text-block body",
    component: TextBlock,
    props: { variant: "prose", body: imgMd },
    bodyClass: "fc-text-block__body",
    source: `${moduleDir}/text-block/index.astro`,
  },
  {
    name: "services-grid item body",
    component: ServicesGrid,
    props: {
      variant: "three-col",
      items: [
        { title: "T", body: imgMd },
        { title: "U", body: "<p>B</p>" },
      ],
    },
    bodyClass: "fc-services-grid__body",
    source: `${moduleDir}/services-grid/index.astro`,
  },
  {
    name: "services-grid subhead",
    component: ServicesGrid,
    props: {
      variant: "three-col",
      subhead: imgMd,
      items: [
        { title: "T", body: "<p>B</p>" },
        { title: "U", body: "<p>B</p>" },
      ],
    },
    bodyClass: "fc-services-grid__subhead",
    source: `${moduleDir}/services-grid/index.astro`,
  },
  {
    name: "split-section body",
    component: SplitSection,
    props: {
      variant: "image-left",
      image: { id: "i", src: "/assets/i.jpg", alt: "i" },
      heading: "H",
      body: imgMd,
    },
    bodyClass: "fc-split-section__body",
    source: `${moduleDir}/split-section/index.astro`,
  },
  {
    name: "testimonials quote",
    component: Testimonials,
    props: {
      variant: "single",
      items: [{ quote: imgMd, name: "A" }],
    },
    bodyClass: "fc-testimonials__quote",
    source: `${moduleDir}/testimonials/index.astro`,
  },
  {
    name: "banner subhead",
    component: Banner,
    props: { variant: "simple", heading: "H", subhead: imgMd },
    bodyClass: "fc-banner__subhead",
    source: `${moduleDir}/banner/index.astro`,
  },
];

describe("UAT FC REQ-47: markdown body <img> tags are constrained per module", () => {
  it.each(cases)(
    "$name renders the <img> inside the body container",
    async (c) => {
      const container = await AstroContainer.create();
      const html = await container.renderToString(c.component, {
        props: c.props,
      });
      expect(html).toContain(c.bodyClass);
      expect(html).toMatch(/<img[^>]*src="\/assets\/x\.png"/);
    },
  );

  it.each(cases)(
    "$name source declares a scoped CSS rule capping <img> width",
    (c) => {
      const src = readFileSync(c.source, "utf-8");
      // The module's .astro <style> block declares :global(img) under the
      // body container with max-width:100%. Tolerate whitespace and the
      // optional comma-grouped sibling subhead/body selector pair.
      const re = new RegExp(
        `\\.${c.bodyClass}[^{]*:global\\(img\\)[^}]*max-width\\s*:\\s*100%`,
        "s",
      );
      expect(src).toMatch(re);
    },
  );
});
