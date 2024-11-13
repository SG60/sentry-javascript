import * as Sentry from '@sentry/browser';
import { launchDarklyIntegration, buildLaunchDarklyFlagUsedHandler } from '@sentry/browser';

window.Sentry = Sentry;
window.sentryLDIntegration = launchDarklyIntegration();

Sentry.init({
  dsn: 'https://public@dsn.ingest.sentry.io/1337',
  sampleRate: 1.0,
  integrations: [window.sentryLDIntegration],
});

// Manually mocking this because LD only has mock test utils for the React SDK.
// Also, no SDK has mock utils for FlagUsedHandler's.
const MockLaunchDarkly = {
  initialize(_clientId, context, options) {
    const flagUsedHandler = (options && options.inspectors) ? options.inspectors[0].method : undefined;

    return {
      variation(key, defaultValue) {
        if (flagUsedHandler) {
          flagUsedHandler(key, { value: defaultValue }, context);
        }
        return defaultValue;
      },
    };
  },
};

window.ldClient = undefined;

window.initializeLD = () => {
  window.ldClient = MockLaunchDarkly.initialize(
    'example-client-id',
    { kind: 'user', key: 'example-context-key' },
    { inspectors: [buildLaunchDarklyFlagUsedHandler()] },
  );
  return window.ldClient;
};
