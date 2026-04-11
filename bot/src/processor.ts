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
import { fetchRepoStats } from './utils/stats.ts'
import {
  cleanupOldXpiCaches,
  downloadXpi,
  saveXpiCache,
  validateCachedXpi,
} from './utils/xpi.ts'

/**
 * Download and save the latest XPI version to plugin cache
 * Downloads, verifies, and persists the XPI file to the plugin directory
 * @param version The version to download and cache
 * @param pluginId The plugin ID
 * @param pluginDir The plugin directory
 * @returns Metadata about the cached XPI (hash, path, timestamp)
 * @throws Error if download/verification fails
 */
async function downloadAndCacheLatestXpi(
  version: Version,
  pluginId: string,
  pluginDir: string,
): Promise<{ version: string, url: string, hash?: string }> {
  if (!version.update_link) {
    throw new Error('Version has no update_link')
  }

  // Check if already cached
  const isCached = await validateCachedXpi(pluginDir, version.version)
  if (isCached) {
    consola.debug(`XPI already cached for ${pluginId} v${version.version}`)
    // Return cached file info
    return {
      version: version.version,
      url: `${version.version}.xpi`,
      hash: version.update_hash,
    }
  }

  const tempXpiPath = path.join(pluginDir, `.temp-${version.version}.xpi`)

  try {
    consola.debug(`Downloading XPI: ${version.update_link}`)
    await downloadXpi(version.update_link, tempXpiPath, (progress) => {
      if (progress.total) {
        const percent = Math.round((progress.loaded / progress.total) * 100)
        consola.debug(`  Download progress: ${percent}%`)
      }
    })

    consola.debug(`Saving XPI to cache for ${pluginId} v${version.version}`)
    const xpiMetadata = await saveXpiCache(
      tempXpiPath,
      pluginDir,
      version.version,
      pluginId,
    )

    consola.debug(
      `XPI cached at ${xpiMetadata.url} (hash: ${xpiMetadata.hash?.slice(0, 12)}...)`,
    )

    return {
      version: xpiMetadata.version,
      url: `${xpiMetadata.version}.xpi`,
      hash: xpiMetadata.hash,
    }
  }
  finally {
    // Clean up temp file if exists
    if (await fs.pathExists(tempXpiPath)) {
      await fs.remove(tempXpiPath)
    }
  }
}

/**
 * Process a single plugin through the complete pipeline:
 * 1. Load and validate meta.json (schema validation)
 * 2. Fetch remote update.json
 * 3. Merge versions with patched versions
 * 4. Verify latest XPI (download + validate)
 * 5. Extract compatibility
 * 6. Fetch repository statistics
 * 7. Generate output files
 */
async function processPlugin(pluginId: string): Promise<void> {
  const pluginDir = path.join(PluginsRoot, pluginId)

  // Stage 1: Load meta.json
  consola.debug(`Loading meta.json for ${pluginId}`)
  const meta = await loadPluginMeta(pluginId)

  // Stage 2: Fetch remote update.json
  let remoteVersions: Version[] = []
  try {
    consola.debug(`Fetching remote update.json from ${meta.updateUrl}`)
    remoteVersions = await loadUpdateJson(meta.updateUrl, meta.id)
    consola.debug(`Fetched ${remoteVersions.length} remote versions`)
  }
  catch (error) {
    consola.warn(
      `Failed to fetch remote versions for ${pluginId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    // Continue anyway - we may have patched versions
  }

  // Stage 3: Merge versions (remote + patched)
  const mergedVersions = mergeVersions(remoteVersions, meta.patchedVersions)

  if (mergedVersions.length === 0) {
    throw new Error('No versions found (neither remote nor patched)')
  }

  consola.debug(`Merged to ${mergedVersions.length} total versions`)

  // Stage 4: Download and cache latest XPI
  let cachedXpiInfo: { version: string, url: string, hash?: string } | undefined
  try {
    const latestVersion = mergedVersions[0]
    if (latestVersion?.update_link) {
      cachedXpiInfo = await downloadAndCacheLatestXpi(
        latestVersion,
        pluginId,
        pluginDir,
      )
    }
  }
  catch (error) {
    consola.warn(
      `XPI download/cache failed for ${pluginId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    // Don't fail the entire plugin - XPI caching is optional
  }

  // Stage 5: Extract compatibility
  const compatibility = extractCompatibility(mergedVersions)

  // Stage 6: Fetch repository statistics
  let repoStats
  if (meta.repoUrl) {
    try {
      consola.debug(`Fetching stats for ${meta.repoUrl}`)
      repoStats = await fetchRepoStats(meta.repoUrl)
    }
    catch (error) {
      consola.warn(
        `Failed to fetch repo stats: ${error instanceof Error ? error.message : String(error)}`,
      )
      // Stats are optional, continue
    }
  }

  // Stage 7: Generate output files
  const generatedMeta: GeneratedMeta = {
    ...meta,
    versions: mergedVersions,
    latestVersion: mergedVersions[0]?.version,
    compatibleApps: {
      zotero: compatibility,
    },
    ...(repoStats && { stats: repoStats }),
  }

  const metaGeneratedPath = path.join(pluginDir, 'meta.generated.json')
  await fs.writeJSON(metaGeneratedPath, generatedMeta, { spaces: 2 })
  consola.debug(`Generated ${metaGeneratedPath}`)

  // Generate latest.json (quick reference for the latest version)
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
    consola.debug(`Generated ${latestPath}`)
  }

  // Update cache
  const cachePath = path.join(pluginDir, '.cache.json')
  await fs.writeJSON(cachePath, {
    timestamp: new Date().toISOString(),
    update_json_hash: JSON.stringify(mergedVersions),
    cachedXpi: cachedXpiInfo,
  })
  consola.debug(`Updated cache at ${cachePath}`)

  // Cleanup: Keep only the 3 most recent cached XPI versions
  try {
    await cleanupOldXpiCaches(pluginDir, 3)
  }
  catch (error) {
    consola.debug(
      `XPI cache cleanup skipped: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
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
      consola.info(`Processing plugin: ${id}`)
      await processPlugin(id)
      success.push(id)
      consola.success(`Successfully processed: ${id}`)
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      consola.error(`Failed to process ${id}: ${errorMsg}`)

      // Determine the stage where the error occurred
      let stage: 'schema' | 'fetch' | 'xpi' | 'merge' | 'validation' = 'fetch'
      if (errorMsg.includes('meta.json')) {
        stage = 'schema'
      }
      else if (errorMsg.includes('XPI')) {
        stage = 'xpi'
      }
      else if (errorMsg.includes('version')) {
        stage = 'merge'
      }

      errors.push({
        pluginId: id,
        stage,
        message: errorMsg,
      })
    }
  }

  return { success, errors }
}
