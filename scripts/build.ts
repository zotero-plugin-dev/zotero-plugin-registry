import path from "node:path";
import process from "node:process";
import fs from "fs-extra";
import { processPlugins } from "./processor.js";
import { report } from "./report.js";

// TODO: more args
// - `--dev` or no args: only fetch data, do not report to github
// - `--all`: build all, report to github
// - `--id xxx`: only build id
// - `--pr`: for pr, auto detect changed files
async function main() {
  let ids: string[] = [];

  const id = process.argv[2];
  if (id) {
    ids = [id];
  } else {
    const pluginsRoot = path.resolve("plugins");
    ids = await fs.readdir(pluginsRoot);
  }

  await buildAll(ids);
}

async function buildAll(ids: string[]) {
  const result = await processPlugins(ids);

  report(result);

  // exit
  if (result.errors.length !== 0) process.exit(1);
}

main();
