# Zotero Plugin Registry

> A self-hosted registry and store for Zotero plugins based on their `update.json` manifests.

## Overview

Zotero Plugin Registry is a self-hosted platform that aggregates Zotero plugins by collecting developers' self-hosted `update.json` files.  
It provides a unified service for users to browse, search, and get version and compatibility information about Zotero plugins.

## Project Structure

```plain
main/
└── plugins/
└── <plugin-id>/
  ├── meta.json # Base plugin metadata (manually maintained)
  ├── meta.generated.json # Generated metadata including versions
  ├── latest.json # Generated latest version info
  └── icon.png # Optional plugin icon
scripts/
└── build.ts # Build script to generate aggregated data
.gitignore # Ignore generated JSON files
package.json # Project config and dependencies
README.md # This document
```

## Quick Start

1. Clone the repository and install dependencies

   ```bash
   git clone https://github.com/zotero-plugin-dev/zotero-plugin-registry.git
   cd zotero-plugin-registry
   pnpm install
   ```

2. Add plugin metadata in `main/plugins/<plugin-id>/meta.json`, example:

   ```json
   {
     "id": "zotero-format-metadata@northword.cn",
     "name": "Zotero Format Metadata",
     "update_json": "https://example.com/path/to/update.json",
     "description": "A useful Zotero plugin.",
     "homepage": "https://github.com/northword/zotero-format-metadata",
     "tags": ["metadata"]
   }
   ```

3. Run the build script to generate aggregated data

   ```bash
   pnpm run build
   ```

4. After building, `meta.generated.json` and `latest.json` files will be created inside each plugin directory, ready for deployment or frontend consumption.

## Build Script Usage

- Build all plugins:

```bash
pnpm run build
```

- Build a specific plugin by ID:

```bash
pnpx ts-node scripts/build.ts --only zotero-format-metadata@northword.cn
```

## Contributing

Contributions of plugin metadata files are welcome!
Please keep the repository clean and comply with the MIT license.

## License

MIT © Northword

## Contact

For questions or suggestions, please open an issue on GitHub.
