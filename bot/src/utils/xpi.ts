import type { AxiosProgressEvent } from 'axios'
import path from 'node:path'
import AdmZip from 'adm-zip'
import axios from 'axios'
import fs from 'fs-extra'

interface ManifestInfo {
  id?: string
  name?: string
  version?: string
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
 * Verify XPI integrity by checking:
 * 1. File exists and is readable
 * 2. Can be parsed as ZIP
 * 3. Contains valid manifest.json
 * 4. Plugin ID matches expected ID
 * @param xpiPath Path to the XPI file
 * @param expectedPluginId The expected plugin ID
 */
export async function verifyXpi(
  xpiPath: string,
  expectedPluginId: string,
): Promise<boolean> {
  try {
    const manifest = await extractXpiInfo(xpiPath)
    return manifest.id === expectedPluginId
  }
  catch {
    return false
  }
}
