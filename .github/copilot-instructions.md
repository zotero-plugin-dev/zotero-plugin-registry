# Zotero Plugin Registry - AI Agent Instructions

## Architecture Overview

**Monorepo Structure**: pnpm workspace with four main packages:
- **bot**: CLI tool that processes plugins (fetches metadata, parses `update.json`)
- **shared**: Common types, schemas, and exports shared by bot and frontend
- **frontend**: (Vue/React app for displaying plugin listings)
- **plugins**: Directory containing plugin metadata files (`plugins/<plugin-id>/meta.json`)

**Data Flow**: `meta.json` (manual) → bot processes → generates `meta.generated.json` + `latest.json` → consumed by frontend/indexing

## Critical Knowledge

### Plugin Data Model
- **Plugin ID** (e.g., `zotero-format-metadata@northword.cn`): Unique identifier, used as directory name
- **meta.json**: Manual metadata containing `id`, `name`, `updateUrl` (or deprecated `update_json`), `description`, `homepage`, `tags`, optional `patchedVersions`
- **update.json**: Hosted by plugin developer, follows Zotero extension manifest format with version/compatibility data
- **Tags**: Predefined enum (`metadata`, `interface`, `attachment`, `notes`, `reader`, `productivity`, `visualization`, `integration`, `ai`, `writing`, `developer`, `favorite`, `others`)
- **patchedVersions**: Manual version list in meta.json for patching or supplementing remote versions
- See [shared/src/types.ts](shared/src/types.ts) for complete type definitions

### Bot Processing Pipeline
1. **CLI Entry** ([bot/src/cli.ts](bot/src/cli.ts)): `zbot build` (default) or `zbot check` (PR validation)
2. **Load Meta** ([bot/src/loaders/meta.ts](bot/src/loaders/meta.ts)): Validates `meta.json` schema and required fields
3. **Fetch Remote** ([bot/src/loaders/update-json.ts](bot/src/loaders/update-json.ts)): Fetches remote `update.json` and parses `addons[pluginId].updates` array
4. **Merge Versions** ([bot/src/merger.ts](bot/src/merger.ts)): Combines remote versions with `patchedVersions`, prioritizing patches, then sorts semantically
5. **Extract Compatibility** ([bot/src/merger.ts](bot/src/merger.ts)): Determines min/max Zotero versions from version list
6. **Generate Outputs** ([bot/src/processor.ts](bot/src/processor.ts)): Creates `meta.generated.json` and `latest.json`
7. **Report Results** ([bot/src/report.ts](bot/src/report.ts)): Logs to console or GitHub (PR comments, issues)

### Authentication & HTTP
- **GitHub Token**: `GITHUB_TOKEN` env var for GitHub API rate limits (Bearer auth on GitHub URLs)
- **HTTP Fetch** ([bot/src/utils/http.ts](bot/src/utils/http.ts)): Axios with auto-detection of GitHub domains
- **Timeout**: 10 seconds for fetch, 30 seconds for XPI download
- **XPI Handling** ([bot/src/utils/xpi.ts](bot/src/utils/xpi.ts)): Download and validate XPI structure (manifest.json)

## Directory Structure (Bot)

```
bot/src/
├── cli.ts              # Commander CLI entry point
├── build.ts            # Build orchestration (buildPlugins, checkPlugins)
├── processor.ts        # Single plugin processing pipeline
├── merger.ts           # Version merging and compatibility logic
├── report.ts           # Console/GitHub reporting
├── github-reporter.ts  # Octokit integration for PRs and issues
├── cache.ts            # (stub) Cache management
├── loaders/
│   ├── index.ts        # Re-exports
│   ├── meta.ts         # loadPluginMeta() with validation
│   └── update-json.ts  # loadUpdateJson() with parsing
└── utils/
    ├── index.ts        # Re-exports
    ├── http.ts         # fetchData() with GitHub auth
    ├── xpi.ts          # downloadXpi, extractXpiInfo, verifyXpi
    └── git.ts          # detectChangedPlugins() for PR mode
```

## Key Interfaces

**PluginMeta** (from shared): Core metadata with optional `patchedVersions` array
**Version**: `{ version, update_link, update_hash?, strict_min_version?, strict_max_version? }`
**GeneratedMeta**: Extended PluginMeta with merged versions, compatibility info, and stats
**ProcessResult**: `{ success: string[], errors: PluginError[] }`
**PluginError**: `{ pluginId, stage, message }` where stage is 'schema'|'fetch'|'xpi'|'merge'|'validation'

## Developer Workflows

### Build Commands
```bash
# Install dependencies (pnpm v10.24.0 required via corepack)
pnpm install

# Process all plugins
pnpm run build

# Process specific plugin(s)
pnpm run build plugin-id-1 plugin-id-2

# Check mode for PR validation
pnpm run check [changed-plugin-ids]

# Generate TypeScript schema from types
pnpm run -C shared generate-schema

# Linting
pnpm run lint:fix
```

### Adding New Plugins
1. Create `plugins/<plugin-id>/` directory
2. Add `meta.json` with required fields: `id`, `name`, `updateUrl`, plus optionally `description`, `homepage`, `tags`, `patchedVersions`
3. Run `pnpm run build` to generate outputs
4. Commit and open PR

### Testing & Validation
- Schema validation is automatic in `loadPluginMeta()`
- Version compatibility is computed in `extractCompatibility()`
- XPI verification can be added later (currently a TODO in processor)

## Project Conventions

### TypeScript Patterns
- **Monorepo imports**: Use workspace protocol, e.g., `@zotero-plugin-registry/shared`
- **Module system**: ESM (`"type": "module"` in all package.json files), use `.js` extensions in imports
- **Async/await**: Standard for all I/O operations
- **Error handling**: Throw early with descriptive messages, caught and reported in ProcessResult

### File Organization
- Shared types live in [shared/src/types.ts](shared/src/types.ts), exported via [shared/package.json](shared/package.json) exports
- Schema generation: Run `pnpm run -C shared generate-schema` to create `meta.schema.json`
- Bot modules are organized by concern: loaders, utils, core logic

### Import Ordering (ESLint enforced)
1. Node builtins (`node:*`)
2. External packages (alphabetically)
3. Type imports
4. Local imports (relative paths)

## Version Merging Strategy

When combining remote and patched versions:
1. Build a map indexed by version number
2. Add all remote versions first
3. Apply patched versions (override if exists, add new if missing)
4. Sort by semantic version (descending, using `semver` package)
5. Return final merged list

This allows teams to patch remote update.json errors without waiting for upstream fixes.

## External Dependencies

- **commander**: CLI argument parsing
- **consola**: Colored console output
- **axios**: HTTP requests
- **adm-zip**: XPI (ZIP) file parsing
- **semver**: Semantic version comparison
- **simple-git**: Git operations for PR detection
- **octokit**: GitHub API client
- **fs-extra**: Enhanced file system
- **globby**: File pattern matching

## CI/CD Considerations

- **GITHUB_TOKEN** must be available for authenticated requests
- **CI** env var distinguishes CI vs local environments
- **GITHUB_EVENT_NAME** = 'pull_request' for PR validation
- **GITHUB_REPOSITORY** = 'owner/repo' for API interactions
- Build fails (exit code 1) if any plugin has errors
- GitHub integration: PR comments on validation failure, issues for scheduled runs

## Common Task Patterns

**Modifying processor logic**: Edit [bot/src/processor.ts](bot/src/processor.ts), ensure ProcessResult properly tracks successes/errors

**Extending metadata support**: Update [shared/src/types.ts](shared/src/types.ts) interface, then regenerate schema

**Adding new loader**: Create module in `loaders/`, export from [bot/src/loaders/index.ts](bot/src/loaders/index.ts)

**GitHub integration**: Use [bot/src/github-reporter.ts](bot/src/github-reporter.ts) for API calls via Octokit

**Debugging plugin processing**: Check `.cache.json` in plugin directory and verify URL accessibility
