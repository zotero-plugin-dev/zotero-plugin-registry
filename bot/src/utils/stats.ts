import type { RepoStats } from '@zotero-plugin-registry/shared'
import process from 'node:process'
import axios from 'axios'

interface GitHubRepoResponse {
  stargazers_count?: number
  forks_count?: number
  pushed_at?: string
  description?: string
}

/**
 * Extract owner and repo from GitHub URL
 * @param url GitHub repository URL (e.g., https://github.com/owner/repo)
 * @returns [owner, repo] or null if not a valid GitHub URL
 */
function parseGitHubUrl(url: string): [string, string] | null {
  try {
    const urlObj = new URL(url)
    if (!urlObj.hostname.includes('github.com')) {
      return null
    }

    const parts = urlObj.pathname.split('/').filter(Boolean)
    if (parts.length < 2) {
      return null
    }

    const owner = parts[0]
    let repo = parts[1]

    // Remove .git suffix if present
    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4)
    }

    return [owner, repo]
  }
  catch {
    return null
  }
}

/**
 * Fetch repository statistics from GitHub API
 * @param repoUrl GitHub repository URL
 * @returns Repository statistics or null if fetch fails
 */
export async function fetchGitHubStats(repoUrl: string): Promise<RepoStats | null> {
  const parsed = parseGitHubUrl(repoUrl)
  if (!parsed) {
    return null
  }

  const [owner, repo] = parsed
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    }

    // Add GitHub Bearer token if available
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const response = await axios.get<GitHubRepoResponse>(apiUrl, {
      headers,
      timeout: 10_000,
    })

    const data = response.data

    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      lastPush: data.pushed_at,
      description: data.description,
    }
  }
  catch {
    // Silently fail - stats are optional
    return null
  }
}

/**
 * Fetch repository statistics from multiple sources
 * @param repoUrl Repository URL (GitHub/Gitee/etc)
 * @returns Repository statistics object or undefined if not available
 */
export async function fetchRepoStats(repoUrl: string | undefined): Promise<RepoStats | undefined> {
  if (!repoUrl) {
    return undefined
  }

  // Try GitHub API first
  if (repoUrl.includes('github.com')) {
    return (await fetchGitHubStats(repoUrl)) || undefined
  }

  // TODO: Add support for Gitee, GitLab, etc.
  return undefined
}
