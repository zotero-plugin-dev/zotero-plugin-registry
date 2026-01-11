import antfu from '@antfu/eslint-config'

export default antfu({
  stylistic: true,
  javascript: {
    overrides: {
      'no-console': 'off',
    },
  },
  ignores: ['**/*.md'],
})

// TODO: sort meta.json
