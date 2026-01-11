import type {
  GeneratedMeta,
  LatestVersionInfo,
  PluginError,
  ProcessResult,
  Version,
} from '@zotero-plugin-registry/shared'
import path from 'node:path'
import consola from 'consola'
import fs from 'fs-extra'
import { PluginsRoot } from './constant.ts'
import { loadPluginMeta, loadUpdateJson } from './loaders/index.ts'
import { extractCompatibility, mergeVersions } from './merger.ts'

/**
 * Process a single plugin through the complete pipeline:
 * 1. Schema validation
 * 2. Fetch remote update.json
 * 3. Merge versions with patched versions
 * 4. Extract compatibility
 * 5. Generate output files
 */
async function processPlugin(pluginId: string): Promise<void> {
  const pluginDir = path.join(PluginsRoot, pluginId)

  // Load meta.json
  const meta = await loadPluginMeta(pluginId)

  // Fetch remote update.json
  let remoteVersions: Version[] = []
  try {
    remoteVersions = await loadUpdateJson(meta.updateUrl, meta.id)
  }
  catch (error) {
    consola.warn(`Failed to fetch remote versions: ${error instanceof Error ? error.message : String(error)}`)
    // Continue anyway - we may have patched versions
  }

  // Merge versions (remote + patched)
  const mergedVersions = mergeVersions(remoteVersions, meta.patchedVersions)

  if (mergedVersions.length === 0) {
    throw new Error('No versions found (neither remote nor patched)')
  }

  // Extract compatibility
  const compatibility = extractCompatibility(mergedVersions)

  // Generate output files
  const generatedMeta: GeneratedMeta = {
    ...meta,
    versions: mergedVersions,
    latestVersion: mergedVersions[0]?.version,
    compatibleApps: {
      zotero: compatibility,
    },
  }

  const metaGeneratedPath = path.join(pluginDir, 'meta.generated.json')
  await fs.writeJSON(metaGeneratedPath, generatedMeta, { spaces: 2 })

  // Generate latest.json
  if (mergedVersions.length > 0) {
    const latestInfo: LatestVersionInfo = {
      pluginId: meta.id,
      version: mergedVersions[0].version,
      update_link: mergedVersions[0].update_link,
      update_hash: mergedVersions[0].update_hash,
      strict_min_version: mergedVersions[0].strict_min_version,
      strict_max_version: mergedVersions[0].strict_max_version,
    }

    const latestPath = path.join(pluginDir, 'latest.json')
    await fs.writeJSON(latestPath, latestInfo, { spaces: 2 })
  }

  // Update cache
  const cachePath = path.join(pluginDir, '.cache.json')
  await fs.writeJSON(cachePath, {
    timestamp: new Date().toISOString(),
    update_json_hash: JSON.stringify(mergedVersions),
  })
}

/**
 * Process multiple plugins
 * @param pluginIds Array of plugin IDs to process
 * @returns ProcessResult with success and error lists
 */
export async function processPlugins(
  pluginIds: string[],
): Promise<ProcessResult> {
  const success: string[] = []
  const errors: PluginError[] = []

  for (const id of pluginIds) {
    try {
      await processPlugin(id)
      success.push(id)
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push({
        pluginId: id,
        stage: 'fetch',
        message: errorMsg,
      })
    }
  }

  return { success, errors }
}
