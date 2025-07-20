# https://github.com/vega/ts-json-schema-generator
pnpm ts-json-schema-generator \
  --path 'scripts/**/*.ts' \
  --type PluginMeta \
  --markdown-description \
  --out schemas/meta.schema.json
