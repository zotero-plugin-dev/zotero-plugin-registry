import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'fs-extra'

/**
 * Calculate SHA256 hash of content
 */
function calculateHash(content: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex')
}

/**
 * Check if update.json has changed by comparing hash
 */
export async function isUpdateJsonChanged(
  pluginDir: string,
  currentData: any,
): Promise<boolean> {
  const cachePath = path.join(pluginDir, '.cache.json')
  const currentHash = calculateHash(currentData)

  if (await fs.pathExists(cachePath)) {
    const cache = await fs.readJSON(cachePath)
    return cache.update_json_hash !== currentHash
  }

  return true // no cache exists
}
