import type { ResponseType } from "axios";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import axios, { AxiosHeaders } from "axios";
import fs from "fs-extra";

function calculateHash(content: any): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
}

async function _isUpdateJsonChanged(
  pluginDir: string,
  currentData: any
): Promise<boolean> {
  const cachePath = path.join(pluginDir, ".cache.json");
  const currentHash = calculateHash(currentData);

  if (await fs.pathExists(cachePath)) {
    const cache = await fs.readJSON(cachePath);
    return cache.update_json_hash !== currentHash;
  }

  return true; // no cache exists
}

export async function fetchData<T = any>(
  url: string,
  responseType: ResponseType
): Promise<T> {
  const headers = new AxiosHeaders();

  // Set Authorization
  // Only set GitHub Token for github servers
  if (
    url.match("github.com") ||
    url.match("githubusercontent.com") ||
    url.match("githubassets.com")
  ) {
    headers.setAuthorization(`Bearer ${process.env.GITHUB_TOKEN}`);
  }

  const res = await axios.get<T>(url, {
    timeout: 10000,
    responseType,
    headers,
  });
  return res.data;
}
