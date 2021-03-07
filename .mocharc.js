process.env.PERKULATOR_LOG_SILENT = true;

const isIntegrationTest = Boolean(process.env.INTEGRATION_TEST);
const spec = isIntegrationTest
  ? 'dist/__tests__/integration/**/*.test.js'
  : 'src/__tests__/unit/**/*.test.ts';

const config = {
  allowUncaught: false,
  bail: false,
  delay: false,
  ui: 'bdd',
  timeout: 5000,
  recursive: true,
  exit: true,
  useStrict: true,
  extensions: ['.ts'],
  reporter: 'min',
  spec,
};

/* Don't use ts-node during integration tests */
if (!isIntegrationTest)
  config.require = ['ts-node/register', 'tsconfig-paths/register'];

module.exports = config;
