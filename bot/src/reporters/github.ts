import type { ProcessResult } from '@zotero-plugin-registry/shared'
import process from 'node:process'
import consola from 'consola'
import { Octokit } from 'octokit'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || ''

/**
 * GitHub reporter for CI/CD integration
 * Handles PR comments and issue creation
 */

/**
 * Parse GitHub repository from env var (format: owner/repo)
 */
function parseRepository(repo: string): { owner: string, repo: string } | null {
  const parts = repo.split('/')
  if (parts.length === 2) {
    return { owner: parts[0], repo: parts[1] }
  }
  return null
}

/**
 * Post a comment on the current pull request
 * @param body The comment text
 */
export async function commentOnPR(body: string): Promise<void> {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    consola.warn(
      'GitHub token or repository not configured, skipping PR comment',
    )
    return
  }

  const parsedRepo = parseRepository(GITHUB_REPOSITORY)
  if (!parsedRepo) {
    consola.error('Invalid GITHUB_REPOSITORY format')
    return
  }

  try {
    const octokit = new Octokit({ auth: GITHUB_TOKEN })
    const prNumber = Number.parseInt(
      process.env.GITHUB_REF?.split('/')[2] || '0',
      10,
    )

    if (prNumber === 0) {
      consola.warn('Could not determine PR number')
      return
    }

    await octokit.rest.issues.createComment({
      owner: parsedRepo.owner,
      repo: parsedRepo.repo,
      issue_number: prNumber,
      body,
    })

    consola.success('Posted comment on PR')
  }
  catch (error) {
    consola.error('Failed to post PR comment:', error)
  }
}

/**
 * Create or update a GitHub issue for build errors
 * @param result The process result
 */
export async function reportToIssue(result: ProcessResult): Promise<void> {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || result.errors.length === 0) {
    return
  }

  const parsedRepo = parseRepository(GITHUB_REPOSITORY)
  if (!parsedRepo) {
    return
  }

  try {
    const octokit = new Octokit({ auth: GITHUB_TOKEN })
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const issueTitle = `Plugin Sync Report [${dateStr}]`

    // Build error summary
    const errorDetails = result.errors
      .map(e => `- **${e.pluginId}** (${e.stage}): ${e.message}`)
      .join('\n')

    const issueBody = `# Plugin Sync Report\n\n**Date**: ${new Date().toISOString()}\n\n## Summary\n- ✅ Success: ${result.success.length}\n- ❌ Failed: ${result.errors.length}\n\n## Failed Plugins\n\n${errorDetails}`

    // Search for existing issue
    const issues = await octokit.rest.issues.listForRepo({
      owner: parsedRepo.owner,
      repo: parsedRepo.repo,
      state: 'open',
      labels: 'plugin-sync',
      per_page: 1,
    })

    if (issues.data.length > 0) {
      // Update existing issue
      await octokit.rest.issues.update({
        owner: parsedRepo.owner,
        repo: parsedRepo.repo,
        issue_number: issues.data[0].number,
        body: issueBody,
      })
      consola.success('Updated existing issue')
    }
    else {
      // Create new issue
      await octokit.rest.issues.create({
        owner: parsedRepo.owner,
        repo: parsedRepo.repo,
        title: issueTitle,
        body: issueBody,
        labels: ['plugin-sync', 'automated'],
      })
      consola.success('Created new issue')
    }
  }
  catch (error) {
    consola.error('Failed to report to issue:', error)
  }
}
