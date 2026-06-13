/// <reference types="vitest" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
  },
});
