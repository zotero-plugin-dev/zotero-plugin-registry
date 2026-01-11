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
- **meta.json**: Manual metadata containing `id`, `name`, `update_json` URL, `description`, `homepage`, `tags`
- **update.json**: Hosted by plugin developer, follows Zotero extension manifest format with version/compatibility data
- **Tags**: Predefined enum (`metadata`, `interface`, `attachment`, `notes`, `reader`, `productivity`, `visualization`, `integration`, `ai`, `writing`, `developer`, `favorite`, `others`)
- See [shared/src/types.ts](shared/src/types.ts) for complete type definitions

### Bot Processing Pipeline
1. **CLI Entry** ([bot/src/cli.ts](bot/src/cli.ts)): Accepts optional plugin ID, defaults to all plugins
2. **Process Plugins** ([bot/src/processor.ts](bot/src/processor.ts)): Reads `meta.json`, fetches remote `update.json`
3. **Parse Versions**: Extracts version data from `addons[pluginId].updates` array in update.json
4. **Extract Compatibility**: Maps `applications.zotero` and `applications.gecko` min/max versions
5. **Cache**: Stores hash in `.cache.json` to detect update.json changes
6. **Report**: ([bot/src/report.ts](bot/src/report.ts)) Handles GitHub integration and error reporting

### Authentication & External Access
- **GitHub Token**: Required environment variable `GITHUB_TOKEN` for API-rate-limited GitHub requests
- **HTTP Fetch** ([bot/src/utils.ts](bot/src/utils.ts)): 
  - Detects GitHub URLs and adds Bearer token
  - Used for fetching remote `update.json` files
  - 10-second timeout for all requests
  - Axios-based with response type support (json, arraybuffer, etc.)

## Developer Workflows

### Build Commands
```bash
# Install dependencies (pnpm v10.24.0 required via corepack)
pnpm install

# Process all plugins
pnpm run build

# Process specific plugin by ID
pnpm run --only zotero-format-metadata@northword.cn

# Generate TypeScript schema from types
pnpm run -C shared generate-schema
```

### Adding New Plugins
1. Create `plugins/<plugin-id>/` directory
2. Add `meta.json` with required fields: `id`, `name`, `update_json`, optionally `description`, `homepage`, `tags`
3. Run bot to generate `meta.generated.json` and `latest.json`
4. Commit and open PR

### Code Quality
- **Linting**: `eslint` with `@antfu/eslint-config`, allows `console` statements
- **Pre-commit**: Husky runs `lint-staged` on all changed files
- Fix linting: `pnpm run lint:fix`

## Project Conventions

### TypeScript Patterns
- **Monorepo imports**: Use workspace protocol, e.g., `@zotero-plugin-registry/shared`
- **Module system**: ESM (`"type": "module"` in all package.json files)
- **Async/await**: Standard for all I/O operations

### File Organization
- Shared types live in `shared/src/types.ts`, exported via package exports in `shared/package.json`
- Schema generation: Run `scripts/generate-schema.sh` to create `meta.schema.json` from types
- Plugin metadata format is validated against `meta.schema.json`

### Error Handling
- **ProcessResult**: Captures both `success: string[]` and `errors: PluginError[]`
- Continues processing remaining plugins even if one fails
- Exit code 1 when errors occur (for CI/CD)

## Integration Points

### External Dependencies
- **octokit**: GitHub API client (not actively used in current code but included)
- **axios**: HTTP requests with auth headers
- **adm-zip**: XPI file handling (structure for future use)
- **globby**: File globbing for plugin discovery
- **jsonc**: JSON with comments parsing
- **es-toolkit**: Utility library
- **fs-extra**: File system operations

### CI/CD Considerations
- GITHUB_TOKEN must be available in environment for GitHub URL requests
- Error reporting to GitHub issues/PRs (via `report.ts`, implementation details present)
- Build artifacts: `meta.generated.json` and `latest.json` files per plugin

## Common Task Patterns

**Adding features to processor**: Modify [bot/src/processor.ts](bot/src/processor.ts), ensure `ProcessResult` is properly populated with successes/errors

**Updating shared types**: Edit [shared/src/types.ts](shared/src/types.ts), then run schema generation to update validation

**Debugging plugin processing**: Check `.cache.json` in plugin directory to understand last-fetch state; verify `update_json` URL format matches Zotero manifest structure

**Working with pnpm**: Always use workspace commands: `pnpm run -C <package>` or `pnpm run --only <package>` for scoped tasks
