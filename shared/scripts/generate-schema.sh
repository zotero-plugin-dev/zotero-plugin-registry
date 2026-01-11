# https://github.com/vega/ts-json-schema-generator
pnpm ts-json-schema-generator \
  --path 'src/index.ts' \
  --type PluginMetaInput \
  --markdown-description \
  --out schemas/meta.schema.json
