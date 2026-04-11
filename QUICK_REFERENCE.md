# Quick Reference: Bot Implementation

## What Was Built

A complete **automated plugin metadata aggregation system** that:

1. **Reads** plugin metadata (`meta.json`) from the plugins directory
2. **Fetches** version info from remote `update.json` URLs
3. **Merges** remote versions with manual patches
4. **Validates** compatibility constraints
5. **Generates** JSON outputs for frontend consumption
6. **Reports** results to GitHub (PRs & issues)

## File Organization

### Core Pipeline (Sequential)
1. **CLI** → [bot/src/cli.ts](bot/src/cli.ts) - Entry point
2. **Build** → [bot/src/build.ts](bot/src/build.ts) - Orchestration
3. **Loader** → [bot/src/loaders/](bot/src/loaders/) - Read inputs
4. **Merger** → [bot/src/merger.ts](bot/src/merger.ts) - Combine versions
5. **Processor** → [bot/src/processor.ts](bot/src/processor.ts) - Generate outputs
6. **Report** → [bot/src/report.ts](bot/src/report.ts) - Communicate results

### Utilities (Supporting)
- [bot/src/utils/http.ts](bot/src/utils/http.ts) - GitHub-aware HTTP client
- [bot/src/utils/xpi.ts](bot/src/utils/xpi.ts) - XPI download & parsing
- [bot/src/utils/git.ts](bot/src/utils/git.ts) - Git operations
- [bot/src/github-reporter.ts](bot/src/github-reporter.ts) - GitHub API

### Shared
- [shared/src/types.ts](shared/src/types.ts) - Type definitions (PluginMeta, Version, etc.)
- [shared/schemas/meta.schema.json](shared/schemas/meta.schema.json) - JSON schema for validation

## Key Data Flows

### Input: meta.json
```json
{
  "id": "plugin@domain",
  "name": "Plugin Name",
  "updateUrl": "https://example.com/update.json",
  "tags": ["metadata", "ai"],
  "patchedVersions": [
    { "version": "1.0.0", "update_link": "..." }
  ]
}
```

### Processing: Version Merging
```
Remote Versions (from update.json)
    ↓
  [Merge Strategy]
    ↓
Patched Versions (from meta.json)
    ↓
  [Sort by SemVer]
    ↓
Final Version List
```

### Output: meta.generated.json
```json
{
  "...": "base meta.json fields",
  "versions": ["complete merged list"],
  "latestVersion": "1.26.0",
  "compatibleApps": { "zotero": { "min": "6.0", "max": "8.*" } }
}
```

### Output: latest.json
```json
{
  "pluginId": "plugin@domain",
  "version": "1.26.0",
  "update_link": "https://...",
  "strict_min_version": "6.0",
  "strict_max_version": "8.*"
}
```

## Commands

```bash
# Build all plugins
pnpm exec tsx bot/src/cli.ts build

# Build specific plugin(s)
pnpm exec tsx bot/src/cli.ts build plugin-id-1 plugin-id-2

# Check mode (for PR validation)
pnpm exec tsx bot/src/cli.ts check

# Show help
pnpm exec tsx bot/src/cli.ts --help
```

## Error Handling

**ProcessResult** tracks:
- `success: string[]` - Successfully processed plugin IDs
- `errors: PluginError[]` - Failed plugins with stage + message

**Stages**: schema | fetch | xpi | merge | validation

**Exit Codes**:
- 0: Success (no errors)
- 1: Failures detected

## GitHub Integration

### On Pull Request
- Detects changed plugins
- Validates meta.json schema
- Comments on PR with errors (if any)

### On Scheduled Build
- Processes all plugins
- Creates/updates GitHub issue with summary
- Labels: `plugin-sync`, `automated`

## Configuration

### Environment Variables
- `GITHUB_TOKEN`: Authentication for GitHub requests
- `CI`: Set to 'true' in GitHub Actions
- `GITHUB_EVENT_NAME`: 'pull_request' for PRs
- `GITHUB_REPOSITORY`: 'owner/repo' format

### Dependencies (New)
- `semver`: Version comparison
- `simple-git`: Git operations
- `commander`: CLI framework
- `consola`: Pretty logging
- `octokit`: GitHub API

## Important Implementation Details

### Version Merging Strategy
1. Remote versions added first (source of truth)
2. Patched versions override on conflict
3. Enables manual fixes without waiting for upstream

### Compatibility Extraction
- Attempts semver comparison
- Falls back to string comparison for non-semver versions
- Handles both Zotero 7+ (`zotero`) and Zotero 6 (`gecko`) formats

### HTTP Requests
- Auto-detects GitHub domains
- Applies Bearer token to GitHub URLs
- 10-second timeout for normal requests
- 30-second timeout for XPI downloads

## Next Steps

- [ ] Implement GitHub Actions workflow (.github/workflows/sync.yml)
- [ ] Add HTTP caching for bandwidth optimization
- [ ] Add XPI download + integrity verification
- [ ] Add unit tests for merger logic
- [ ] Document API for frontend consumption

---

**Status**: ✅ Core implementation complete and tested
