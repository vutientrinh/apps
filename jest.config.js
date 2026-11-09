module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  moduleNameMapper: {
    // lucide's `/icons` subpath resolves to an ESM-only build under Jest; use its CommonJS build instead.
    '^lucide-react-native/icons$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/index.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@web/(.*)$': '<rootDir>/../frontend/src/$1',
  },
  clearMocks: true,
};
