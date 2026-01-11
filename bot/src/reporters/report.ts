import type { ProcessResult } from '@zotero-plugin-registry/shared'
import process from 'node:process'
import consola from 'consola'
import { commentOnPR, reportToIssue } from './github.ts'

/**
 * Report processing results to appropriate channel:
 * - Console output for local development
 * - GitHub issue for scheduled builds
 * - PR comment for pull request validation
 *
 * @param result The processing result
 */
export async function report(result: ProcessResult): Promise<void> {
  const { errors } = result
  const isCI = process.env.CI === 'true'
  const isPR = process.env.GITHUB_EVENT_NAME === 'pull_request'

  // Console output: only errors
  if (errors.length > 0) {
    errors.forEach((e) => {
      consola.error(`${e.pluginId} (${e.stage}): ${e.message}`)
    })
  }

  // GitHub CI integration
  if (isCI && errors.length > 0) {
    if (isPR) {
      // Comment on PR with errors
      const prMessage = `## ⚠️ Plugin Validation Failed\n\n${errors
        .map(e => `- **${e.pluginId}** (${e.stage}): ${e.message}`)
        .join('\n')}`

      await commentOnPR(prMessage)
    }
    else {
      // Create/update GitHub issue with error summary
      await reportToIssue(result)
    }
  }
}
