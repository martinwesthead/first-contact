import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { runGenerate } from "./index.js";

interface Args {
  site: string;
  out: string;
  clean: boolean;
}

function parseCliArgs(argv: string[]): Args {
  const { values } = parseArgs({
    args: argv,
    options: {
      site: { type: "string", short: "s" },
      out: { type: "string", short: "o" },
      clean: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  if (!values.site || !values.out) {
    printUsage();
    process.exit(2);
  }

  return {
    site: resolve(values.site),
    out: resolve(values.out),
    clean: Boolean(values.clean),
  };
}

function printUsage(): void {
  process.stderr.write(
    "Usage: fc-generate --site <site-dir> --out <out-dir> [--clean]\n",
  );
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  try {
    const result = await runGenerate(args);
    process.stdout.write(
      `Generated ${result.pagesWritten.length} page(s) and ${result.assetsWritten.length} asset(s) to ${result.outDir}\n`,
    );
  } catch (err) {
    process.stderr.write(
      `Generation failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
}

await main();
