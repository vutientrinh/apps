import expoConfig from 'eslint-config-expo/flat.js';

export default [
  ...expoConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@web/*'],
              allowTypeImports: true,
              message: 'Imports from @web must be type-only; runtime code stays inside apps/.',
            },
          ],
        },
      ],
    },
  },
];
