// TODO: Report error
// PR: comment on pr
// CI and not pr: open an issue
// Default: console

import type { ProcessResult } from "./processor.js";

export function report(result: ProcessResult) {
  const { success, errors } = result;

  if (success.length !== 0) {
    console.log(`\nProcessed ${success.length} plugins successfully.`);
  }

  if (errors.length > 0) {
    console.error(`\nEncountered errors in ${errors.length} plugins:`);
    errors.forEach((e) => {
      console.error(`- ${e.pluginId}: ${e.error.message}`);
    });
  }
}
