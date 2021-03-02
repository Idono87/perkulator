const isIntegrationTest = Boolean(process.env.INTEGRATION_TEST);
const spec = isIntegrationTest
  ? 'dist/src/__tests__/integration/**/*.test.js'
  : 'src/__tests__/unit/**/*.test.ts';

/* Don't use ts-node during integration tests */
const requireModules = isIntegrationTest
  ? undefined
  : ['ts-node/register', 'tsconfig-paths/register'];

module.exports = {
  allowUncaught: false,
  bail: false,
  delay: false,
  ui: 'bdd',
  timeout: 5000,
  recursive: true,
  exit: true,
  useStrict: true,
  extensions: ['.ts'],
  require: requireModules,
  reporter: 'min',
  spec,
};
