import type { PluginMeta, UpdateJSON, Version } from "./types.js";
import path from "node:path";
import fs from "fs-extra";
import { fetchData } from "./utils.js";

const PluginsRoot = "plugins";

export interface PluginError {
  pluginId: string;
  error: Error;
}

export interface ProcessResult {
  success: string[];
  errors: PluginError[];
}

async function _updateJson(url: string, id: string): Promise<Version[]> {
  const data = await fetchData<UpdateJSON>(url, "json");

  const addonData = data.addons?.[id];
  if (
    !addonData ||
    !Array.isArray(addonData.updates) ||
    addonData.updates.length === 0
  ) {
    throw new Error(`Invalid or missing "updates" for plugin ${id}`);
  }

  const updates = addonData.updates;
  const versions: Version[] = [];

  for (const u of updates) {
    const { version, update_link, update_hash = "" } = u;
    if (!version)
      throw new Error(`Invalid or missing "version" for plugin ${id}`);
    if (!update_link)
      throw new Error(`Invalid or missing "update_link" for plugin ${id}`);
    const strict_min_version = u.applications.zotero.strict_min_version ?? "*";
    const strict_max_version = u.applications.zotero.strict_max_version ?? "*";

    versions.push({
      version,
      update_link,
      update_hash,
      strict_min_version,
      strict_max_version,
    });
  }

  return versions;
}

async function _xpi(uri: string, id: string) {
  console.log(uri, id);
}

/**
 * Process a single plugin: fetch update.json, parse, generate meta.generated.json and latest.json
 */
async function processPlugin(id: string): Promise<void> {
  const pluginDir = path.join(PluginsRoot, id);

  // Read basic meta
  const metaPath = path.join(pluginDir, "meta.json");
  const meta: PluginMeta = await fs.readJSON(metaPath);

  // Fetch and parse update.json
  const updateJsonUrl = meta.update_json;
  if (!updateJsonUrl) throw new Error('Missing "update_json" URL in meta.json');
  const versions = await _updateJson(updateJsonUrl, meta.id);

  // Cache
  const cacheFile = path.join(pluginDir, "versions.json");
  const cachedData = await fs.readFile(cacheFile, { encoding: "utf-8" });
  if (cachedData === JSON.stringify(versions)) {
    return;
  } else {
    await fs.writeJSON(cacheFile, versions, { spaces: 2 });
  }

  // TODO: Parse XPI
  for (const version of versions) {
    _xpi(version.update_link, meta.id);
  }

  // Generate finally meta
  const generatedMeta = {
    ...meta,
    versions,
  };

  // Write generated files
  const updateJsonPath = path.join(pluginDir, "meta.generated.json");
  await fs.writeJSON(updateJsonPath, generatedMeta, { spaces: 2 });
}

/**
 * Process all plugins under a given root folder.
 * Returns list of successful and failed plugin IDs.
 */
export async function processPlugins(
  pluginIds: string[]
): Promise<ProcessResult> {
  const success: string[] = [];
  const errors: PluginError[] = [];

  for (const id of pluginIds) {
    try {
      await processPlugin(id);
      success.push(id);
      console.log(`✅ Processed plugin ${id}`);
    } catch (error) {
      errors.push({
        pluginId: id,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      console.error(`❌ Failed plugin ${id}: ${(error as Error).message}`);
    }
  }

  return { success, errors };
}
