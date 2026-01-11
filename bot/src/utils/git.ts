import { simpleGit } from 'simple-git'

/**
 * Detect which plugins have changed by comparing with origin/main
 * @returns Array of plugin IDs that have been modified
 */
export async function detectChangedPlugins(): Promise<string[]> {
  try {
    const git = simpleGit()
    const diff = await git.diff(['origin/main...HEAD', '--name-only'])

    const changedPlugins = new Set<string>()
    const lines = diff.split('\n')

    for (const line of lines) {
      // Look for plugins/<plugin-id>/* changes
      const match = line.match(/^plugins\/([^/]+)\//)
      if (match) {
        changedPlugins.add(match[1])
      }
    }

    return Array.from(changedPlugins)
  }
  catch (error) {
    console.error('Failed to detect changed plugins:', error)
    return []
  }
}
