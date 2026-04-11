# Bot Implementation Summary

## Overview

Successfully implemented a complete bot system for the Zotero Plugin Registry that automates:


- Plugin metadata validation
- Remote update.json fetching and parsing
- Version merging (remote + patched versions)
- Compatibility detection
- Output file generation (meta.generated.json, latest.json)
- GitHub integration for CI/CD

## Implementation Completed

### 1. Type System & Shared Package ✅


**[shared/src/types.ts](shared/src/types.ts)**

- Extended `PluginMeta` with `updateUrl` (new), `update_json` (deprecated), and `patchedVersions` fields
- Added `GeneratedMeta` for output with stats and compatibility info
- Added `LatestVersionInfo` for quick-access version indexing
- Added `ProcessResult` and `PluginError` types for error tracking
- Regenerated `meta.schema.json` via `pnpm run -C shared generate-schema`

### 2. Data Loaders ✅


**[bot/src/loaders/meta.ts](bot/src/loaders/meta.ts)**

- Validates `meta.json` schema and required fields (id, updateUrl/update_json)
- Checks ID matches directory name
- Validates tags against predefined enum

- Throws descriptive errors for validation failures

**[bot/src/loaders/update-json.ts](bot/src/loaders/update-json.ts)**

- Fetches remote `update.json` from provided URL
- Parses Zotero manifest format: `addons[pluginId].updates`
- Extracts version, update_link, update_hash fields
- Handles version compatibility: Zotero 7+ (`zotero`) and Zotero 6 (`gecko`)
- Returns strongly-typed Version array


### 3. HTTP & XPI Utilities ✅

**[bot/src/utils/http.ts](bot/src/utils/http.ts)**

- Axios-based HTTP client with automatic GitHub authentication

- Detects GitHub domains and applies Bearer token from GITHUB_TOKEN env var
- 10-second timeout for all requests
- Supports multiple response types (json, arraybuffer)

**[bot/src/utils/xpi.ts](bot/src/utils/xpi.ts)**


- `downloadXpi()`: Stream downloads with optional progress callback (30-second timeout)
- `extractXpiInfo()`: Parses manifest.json from XPI (ZIP) files
- `verifyXpi()`: Validates XPI structure and ID matching


**[bot/src/utils/git.ts](bot/src/utils/git.ts)**

- `detectChangedPlugins()`: Uses simple-git to find modified plugin directories in PR diffs

### 4. Version Merging & Compatibility ✅

**[bot/src/merger.ts](bot/src/merger.ts)**

- `mergeVersions()`: Combines remote + patched versions with intelligent override
  - Remote versions added first
  - Patched versions override on conflict (allows manual fixes)

  - Sorted by semantic version (desc) with fallback to string comparison
- `extractCompatibility()`: Determines min/max Zotero versions
  - Handles both semver (Zotero 7+) and non-semver (Firefox legacy) versions
  - Graceful fallback to string comparison for non-semver entries

### 5. Core Processor ✅

**[bot/src/processor.ts](bot/src/processor.ts)**

- 7-step pipeline:
  1. Load & validate meta.json
  2. Fetch remote update.json
  3. Merge versions with patched versions
  4. Extract compatibility constraints
  5. Generate meta.generated.json (full metadata + versions + compatibility)

  6. Generate latest.json (quick-access latest version only)
  7. Update .cache.json with timestamp
- Detailed consola logging at each step
- Graceful error handling with stage identification
- Processes multiple plugins with individual error tracking

### 6. CLI & Commands ✅

**[bot/src/cli.ts](bot/src/cli.ts)**


- Commander-based CLI with help text
- Commands:
  - `zbot build [plugins...]`: Default, build all or specific plugins
  - `zbot check [plugins...]`: PR validation mode
- Options:
  - `--all`: Build all plugins (explicit flag)
  - `--help`: Display help
  - `--version`: Display version


**[bot/src/build.ts](bot/src/build.ts)**

- `buildPlugins()`: Orchestrates full build process
  - Auto-discovers all plugins if none specified
  - Processes with error collection
  - Exits with code 1 on failure

- `checkPlugins()`: PR validation mode (TODO: git change detection)

### 7. GitHub Integration ✅

**[bot/src/github-reporter.ts](bot/src/github-reporter.ts)**

- `commentOnPR()`: Posts validation errors as PR comments via Octokit
- `reportToIssue()`: Creates/updates GitHub issue with error summary
- Respects GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_NAME env vars

- Graceful fallback if GitHub integration unavailable

**[bot/src/report.ts](bot/src/report.ts)**

- Unified reporting to console and GitHub
- Routes output basd on CI environment:

  - Local: console only
  - CI + PR: console + PR comment
  - CI + Scheduled: console + GitHub issue

## Test Results

✅ Successfully processed test plugin: `zotero-format-metadata@northword.cn`

- Loaded 2 remote versions from GitHub
- Merged versions correctly
- Detected compatibility: Zotero 6.999-8.*
- Generated both output files

### Generated Files

- `meta.generated.json`: Full metadata + 2 versions + compatibility
- `latest.json`: Latest version (1.26.0) for quick lookup
- `.cache.json`: Processing timestamp for incremental updates

## Code Quality

✅ All linting passed (ESLint with @antfu/eslint-config)
✅ No TypeScript errors
✅ Proper import ordering (builtin → external → type → local)
✅ No unused imports or variables
✅ ESM module system with .js file extensions

## Dependencies Added

- `semver`: Version comparison (7.7.3)
- `simple-git`: Git operations (3.30.0)
- `consola`: Pretty console output (already present)
- `axios`: HTTP client (already present)
- `octokit`: GitHub API (already present)

## Configuration Files Updated

- `.github/copilot-instructions.md`: Complete bot architecture guide for AI agents
- `eslint.config.mjs`: Added .md files to ignore list
- `shared/src/types.ts`: Extended with new interfaces
- `bot/package.json`: Added new dependencies

## Next Steps / TODO

1. **XPI Validation**: Uncomment XPI download/verify in processor for strict validation
2. **GitHub Workflow**: Add .github/workflows/sync.yml for scheduled builds
3. **Testing**: Add unit tests for merger logic and error scenarios
4. **Caching**: Implement HTTP cache directory (.cache/http-cache.json)
5. **Incremental Builds**: Use ETag/Last-Modified headers for bandwidth optimization

## Usage Examples

```bash
# Build all plugins
pnpm exec tsx bot/src/cli.ts

# Build specific plugins
pnpm exec tsx bot/src/cli.ts build plugin-id-1 plugin-id-2

# Check mode for PR validation
pnpm exec tsx bot/src/cli.ts check

# Display help
pnpm exec tsx bot/src/cli.ts --help
```

## File Structure Reference

```
bot/src/
├── cli.ts                    # Commander CLI entry
├── build.ts                  # Build orchestration (buildPlugins, checkPlugins)
├── processor.ts              # Single plugin processing pipeline
├── merger.ts                 # Version merging & compatibility
├── report.ts                 # Console & GitHub reporting
├── github-reporter.ts        # Octokit GitHub API integration
├── loaders/
│   ├── index.ts              # Re-exports
│   ├── meta.ts               # Load & validate meta.json
│   └── update-json.ts        # Parse remote update.json
└── utils/
    ├── index.ts              # Re-exports
    ├── http.ts               # Axios with GitHub auth
    ├── xpi.ts                # XPI download & parsing
    └── git.ts                # Git change detection
```

---

**Status**: ✅ Implementation Complete
**Last Updated**: 2026-01-11
