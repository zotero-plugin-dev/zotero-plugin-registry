import type { PluginMetaInput } from '@zotero-plugin-registry/shared'
import path from 'node:path'
import fs from 'fs-extra'
import { PluginsRoot } from '../constant.ts'

/**
 * Load and validate plugin meta.json
 * @param pluginId The plugin directory name
 * @returns Plugin metadata object
 * @throws Error if meta.json is invalid or not found
 */
export async function loadPluginMeta(pluginId: string): Promise<PluginMetaInput> {
  const pluginDir = path.join(PluginsRoot, pluginId)
  const metaPath = path.join(pluginDir, 'meta.json')

  if (!(await fs.pathExists(metaPath))) {
    throw new Error(`meta.json not found for plugin ${pluginId}`)
  }

  const meta = (await fs.readJSON(metaPath)) as PluginMetaInput

  // Validate required fields
  if (!meta.id) {
    throw new Error(`meta.json missing required field: id`)
  }

  if (meta.id !== pluginId) {
    throw new Error(
      `Plugin ID mismatch: meta.json has "${meta.id}" but directory is "${pluginId}"`,
    )
  }

  // Check for updateUrl (required field)
  if (!meta.updateUrl) {
    throw new Error(`meta.json missing required field: updateUrl`)
  }

  // Validate tags if present
  if (meta.tags && Array.isArray(meta.tags)) {
    const validTags = new Set([
      'favorite',
      'metadata',
      'interface',
      'attachment',
      'notes',
      'reader',
      'productivity',
      'visualization',
      'integration',
      'ai',
      'writing',
      'developer',
      'others',
    ])

    for (const tag of meta.tags) {
      if (!validTags.has(tag)) {
        throw new Error(`Invalid tag: ${tag}`)
      }
    }
  }

  return meta
}
