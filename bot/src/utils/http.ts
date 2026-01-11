import type { ResponseType } from 'axios'
import process from 'node:process'
import axios, { AxiosHeaders } from 'axios'

/**
 * Fetch data from a URL with GitHub authentication if applicable
 * @param url The URL to fetch from
 * @param responseType The expected response type (json, arraybuffer, etc.)
 * @returns The response data
 * @throws Error if the fetch fails
 */
export async function fetchData<T = any>(
  url: string,
  responseType: ResponseType = 'json',
): Promise<T> {
  const headers = new AxiosHeaders()

  // Set GitHub Bearer token for GitHub domains
  if (
    url.includes('github.com')
    || url.includes('githubusercontent.com')
    || url.includes('githubassets.com')
  ) {
    const token = process.env.GITHUB_TOKEN
    if (token) {
      headers.setAuthorization(`Bearer ${token}`)
    }
  }

  const response = await axios.get<T>(url, {
    timeout: 10_000,
    responseType,
    headers,
  })

  return response.data
}
