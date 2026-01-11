import type { UpdateJSON, Version } from '@zotero-plugin-registry/shared'
import { fetchData } from '../utils/http.ts'

/**
 * Fetch and parse update.json from remote URL
 * @param url The update.json URL
 * @param pluginId The plugin ID to extract from the response
 * @returns Array of Version objects
 * @throws Error if fetch fails or format is invalid
 */
export async function loadUpdateJson(
  url: string,
  pluginId: string,
): Promise<Version[]> {
  const data = await fetchData<UpdateJSON>(url, 'json')

  const addonData = data.addons?.[pluginId]
  if (!addonData) {
    throw new Error(`Plugin ID "${pluginId}" not found in update.json`)
  }

  if (!Array.isArray(addonData.updates) || addonData.updates.length === 0) {
    throw new Error(`Invalid or missing "updates" array for plugin ${pluginId}`)
  }

  const versions: Version[] = []

  for (const u of addonData.updates) {
    const { version, update_link, update_hash = '' } = u

    if (!version) {
      throw new Error(`Missing "version" in update.json for plugin ${pluginId}`)
    }

    if (!update_link) {
      throw new Error(`Missing "update_link" for version ${version} in plugin ${pluginId}`)
    }

    const strict_min_version = u.applications.zotero
      ? u.applications.zotero.strict_min_version || '*'
      : u.applications.gecko
        ? (u.applications.gecko.strict_min_version ?? '60.0')
        : '*'

    const strict_max_version = u.applications.zotero
      ? u.applications.zotero.strict_max_version || '*'
      : u.applications.gecko
        ? (u.applications.gecko.strict_max_version ?? '60.999')
        : '*'

    versions.push({
      version,
      update_link,
      update_hash: update_hash || undefined,
      strict_min_version,
      strict_max_version,
    })
  }

  return versions
}
