import antfu from "@antfu/eslint-config";

export default antfu({
  stylistic: false,
  javascript: {
    overrides: {
      "no-console": "off",
    },
  },
});

// TODO: sort meta.json
