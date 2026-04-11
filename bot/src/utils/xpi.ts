import type { AxiosProgressEvent } from 'axios'
import crypto from 'node:crypto'
import path from 'node:path'
import AdmZip from 'adm-zip'
import axios from 'axios'
import fs from 'fs-extra'

interface ManifestInfo {
  id?: string
  name?: string
  version?: string
  browser_specific_settings?: {
    gecko?: {
      id?: string
    }
  }
  applications?: {
    zotero?: {
      id?: string
    }
    gecko?: {
      id?: string
    }
  }
}

export interface XpiMetadata {
  version: string
  url: string
  hash?: string
  manifestId?: string
  downloadedAt?: string
}

/**
 * Download an XPI file from URL
 * @param url The XPI download URL
 * @param targetPath The local path to save the XPI
 * @param onProgress Optional progress callback
 */
export async function downloadXpi(
  url: string,
  targetPath: string,
  onProgress?: (progress: AxiosProgressEvent) => void,
): Promise<void> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30_000,
    onDownloadProgress: onProgress,
  })

  await fs.ensureDir(path.dirname(targetPath))
  await fs.writeFile(targetPath, response.data)
}

/**
 * Extract manifest information from an XPI file (Zotero extension)
 * XPI files are ZIP archives with manifest.json at root
 * Handles both manifest v2 (id field) and v3 (browser_specific_settings.gecko.id)
 * @param xpiPath Path to the XPI file
 * @returns Manifest info extracted from the XPI
 */
export async function extractXpiInfo(xpiPath: string): Promise<ManifestInfo> {
  if (!(await fs.pathExists(xpiPath))) {
    throw new Error(`XPI file not found: ${xpiPath}`)
  }

  try {
    const zip = new AdmZip(xpiPath)
    const manifestEntry = zip.getEntry('manifest.json')

    if (!manifestEntry) {
      throw new Error('No manifest.json found in XPI')
    }

    const manifestContent = zip.readAsText(manifestEntry)
    const manifest = JSON.parse(manifestContent) as ManifestInfo

    return manifest
  }
  catch (error) {
    throw new Error(
      `Failed to extract XPI info: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Extract the effective plugin ID from manifest
 * Supports multiple formats:
 * - Zotero manifest: applications.zotero.id
 * - Manifest v3: browser_specific_settings.gecko.id
 * - Manifest v2: id
 * @param manifest Manifest object
 * @returns Plugin ID or undefined
 */
function getManifestPluginId(manifest: ManifestInfo): string | undefined {
  // Try Zotero-specific format first
  return (
    manifest.applications?.zotero?.id
    || manifest.browser_specific_settings?.gecko?.id
    || manifest.applications?.gecko?.id
    || manifest.id
  )
}

/**
 * Verify XPI integrity by checking:
 * 1. File exists and is readable
 * 2. Can be parsed as ZIP
 * 3. Contains valid manifest.json
 * 4. Plugin ID matches expected ID (supports both manifest formats)
 * @param xpiPath Path to the XPI file
 * @param expectedPluginId The expected plugin ID
 */
export async function verifyXpi(
  xpiPath: string,
  expectedPluginId: string,
): Promise<boolean> {
  try {
    const manifest = await extractXpiInfo(xpiPath)
    const manifestId = getManifestPluginId(manifest)
    return manifestId === expectedPluginId
  }
  catch {
    return false
  }
}

/**
 * Calculate SHA256 hash of a file
 * @param filePath Path to the file
 * @returns Hex-encoded SHA256 hash
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  const fileContent = await fs.readFile(filePath)
  return crypto
    .createHash('sha256')
    .update(fileContent)
    .digest('hex')
}

/**
 * Get the path where XPI should be stored for a plugin
 * @param pluginDir Plugin directory (e.g., plugins/<plugin-id>)
 * @param version Plugin version (used in filename)
 * @returns Path to store the XPI file
 */
export function getXpiCachePath(pluginDir: string, version: string): string {
  return path.join(pluginDir, `${version}.xpi`)
}

/**
 * Save downloaded XPI to plugin cache directory
 * @param sourcePath Temporary path of downloaded XPI
 * @param pluginDir Plugin directory
 * @param version Plugin version
 * @param expectedPluginId Expected plugin ID for validation
 * @returns XpiMetadata containing cache info and hash
 */
export async function saveXpiCache(
  sourcePath: string,
  pluginDir: string,
  version: string,
  expectedPluginId: string,
): Promise<XpiMetadata> {
  // Verify XPI before saving
  const isValid = await verifyXpi(sourcePath, expectedPluginId)
  if (!isValid) {
    throw new Error(
      `XPI verification failed: plugin ID mismatch or invalid XPI structure`,
    )
  }

  // Calculate hash
  const hash = await calculateFileHash(sourcePath)

  // Save to cache
  const cachePath = getXpiCachePath(pluginDir, version)
  await fs.ensureDir(pluginDir)
  await fs.copy(sourcePath, cachePath)

  // Extract manifest for additional metadata
  const manifest = await extractXpiInfo(sourcePath)
  const manifestId = getManifestPluginId(manifest)

  return {
    version,
    url: cachePath,
    hash,
    manifestId,
    downloadedAt: new Date().toISOString(),
  }
}

/**
 * Check if cached XPI exists and validate it
 * @param pluginDir Plugin directory
 * @param version Version to check
 * @returns true if valid cache exists, false otherwise
 */
export async function validateCachedXpi(
  pluginDir: string,
  version: string,
): Promise<boolean> {
  const cachePath = getXpiCachePath(pluginDir, version)
  if (!(await fs.pathExists(cachePath))) {
    return false
  }

  try {
    // Try to read and parse as ZIP to ensure integrity
    const zip = new AdmZip(cachePath)
    const manifestEntry = zip.getEntry('manifest.json')
    return manifestEntry !== null
  }
  catch {
    return false
  }
}

/**
 * List all cached XPI files for a plugin
 * @param pluginDir Plugin directory
 * @returns Array of version strings that are cached
 */
export async function listCachedXpis(pluginDir: string): Promise<string[]> {
  if (!(await fs.pathExists(pluginDir))) {
    return []
  }

  try {
    const files = await fs.readdir(pluginDir)
    return files
      .filter(f => f.endsWith('.xpi'))
      .map(f => f.replace('.xpi', ''))
      .sort()
  }
  catch {
    return []
  }
}

/**
 * Clean up old cached XPI files, keeping only the latest N versions
 * @param pluginDir Plugin directory
 * @param keepCount Number of recent versions to keep (default: 3)
 */
export async function cleanupOldXpiCaches(
  pluginDir: string,
  keepCount: number = 3,
): Promise<void> {
  const cachedVersions = await listCachedXpis(pluginDir)

  if (cachedVersions.length > keepCount) {
    // Sort by version (newest first) using semver-like comparison
    const sorted = cachedVersions.sort((a, b) => {
      // Simple version comparison: split by '.', convert to numbers
      const aParts = a.split('.').map(p => Number.parseInt(p, 10))
      const bParts = b.split('.').map(p => Number.parseInt(p, 10))

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aN = aParts[i] || 0
        const bN = bParts[i] || 0

        if (aN !== bN) {
          return bN - aN // Descending order
        }
      }

      return 0
    })

    // Remove old versions
    const toRemove = sorted.slice(keepCount)
    for (const version of toRemove) {
      const filePath = getXpiCachePath(pluginDir, version)
      try {
        await fs.remove(filePath)
      }
      catch {
        // Ignore errors during cleanup
      }
    }
  }
}
