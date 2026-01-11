import type { Version } from '@zotero-plugin-registry/shared'
import semver from 'semver'

/**
 * Merge version lists using patched versions as overrides
 * Patched versions take priority when merged
 *
 * Strategy:
 * 1. Create a map of all versions by version number
 * 2. Add remote versions first
 * 3. Patched versions override/supplement
 * 4. Sort by semantic version (descending)
 *
 * @param remoteVersions Versions fetched from remote update.json
 * @param patchedVersions Manual versions from meta.json
 * @returns Merged and sorted version list
 */
export function mergeVersions(
  remoteVersions: Version[] = [],
  patchedVersions: Version[] = [],
): Version[] {
  const versionMap = new Map<string, Version>()

  // Add remote versions first
  for (const version of remoteVersions) {
    versionMap.set(version.version, version)
  }

  // Patched versions override or supplement
  for (const version of patchedVersions) {
    versionMap.set(version.version, version)
  }

  // Convert to array and sort
  const merged = Array.from(versionMap.values())

  // Sort by semantic version (descending)
  merged.sort((a, b) => {
    try {
      // Try semantic version comparison
      const comparison = semver.compare(b.version, a.version)
      if (comparison !== 0)
        return comparison
    }
    catch {
      // Fall back to string comparison if not valid semver
      return b.version.localeCompare(a.version)
    }
    return 0
  })

  return merged
}

/**
 * Extract compatible app versions from a version list
 * Determines the minimum and maximum Zotero versions supported
 * @param versions The version list to analyze
 * @returns Min and max compatible versions
 */
export function extractCompatibility(versions: Version[]): {
  min?: string
  max?: string
} {
  if (versions.length === 0)
    return {}

  let minVersion: string | undefined
  let maxVersion: string | undefined

  for (const ver of versions) {
    const minStr = ver.strict_min_version
    const maxStr = ver.strict_max_version

    // Skip wildcard entries
    if (minStr && minStr !== '*') {
      if (!minVersion) {
        minVersion = minStr
      }
      else {
        try {
          const cmp = semver.compare(minStr, minVersion)
          if (cmp < 0) {
            minVersion = minStr
          }
        }
        catch {
          // Not valid semver, compare as strings
          if (minStr.localeCompare(minVersion) < 0) {
            minVersion = minStr
          }
        }
      }
    }

    if (maxStr && maxStr !== '*') {
      if (!maxVersion) {
        maxVersion = maxStr
      }
      else {
        try {
          const cmp = semver.compare(maxStr, maxVersion)
          if (cmp > 0) {
            maxVersion = maxStr
          }
        }
        catch {
          // Not valid semver, compare as strings
          if (maxStr.localeCompare(maxVersion) > 0) {
            maxVersion = maxStr
          }
        }
      }
    }
  }

  return { min: minVersion, max: maxVersion }
}
