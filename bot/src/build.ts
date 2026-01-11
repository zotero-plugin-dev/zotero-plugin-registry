import path from 'node:path'
import process from 'node:process'
import consola from 'consola'
import fs from 'fs-extra'
import { PluginsRoot } from './constant.ts'
import { processPlugins } from './processor.ts'
import { report } from './reporters/index.ts'

/**
 * Build all plugins or specific ones
 * @param ids Plugin IDs to process, or undefined to process all
 */
export async function buildPlugins(ids?: string[]): Promise<void> {
  try {
    let pluginIds = ids

    // If no IDs specified, discover all plugins
    if (!pluginIds || pluginIds.length === 0) {
      pluginIds = await fs.readdir(PluginsRoot)
      pluginIds = pluginIds.filter((id) => {
        const pluginPath = path.join(PluginsRoot, id)
        return fs.statSync(pluginPath).isDirectory()
      })
    }

    // Process plugins
    const result = await processPlugins(pluginIds)

    // Report results
    await report(result)

    // Exit with appropriate code
    if (result.errors.length > 0) {
      process.exit(1)
    }
  }
  catch (error) {
    consola.error('Build failed:', error)
    process.exit(1)
  }
}

/**
 * Check mode for PR validation
 * Only process changed plugins and validate them
 */
export async function checkPlugins(ids?: string[]): Promise<void> {
  try {
    let pluginIds = ids

    if (!pluginIds || pluginIds.length === 0) {
      // TODO: Use detectChangedPlugins() when git setup is available
      pluginIds = []
    }

    if (pluginIds.length === 0) {
      return
    }

    // Process plugins
    const result = await processPlugins(pluginIds)

    // Report results
    await report(result)

    // Exit with appropriate code
    if (result.errors.length > 0) {
      process.exit(1)
    }
  }
  catch (error) {
    consola.error('Check failed:', error)
    process.exit(1)
  }
}
