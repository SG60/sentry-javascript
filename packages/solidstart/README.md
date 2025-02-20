<p align="center">
  <a href="https://sentry.io/?utm_source=github&utm_medium=logo" target="_blank">
    <img src="https://sentry-brand.storage.googleapis.com/sentry-wordmark-dark-280x84.png" alt="Sentry" width="280" height="84">
  </a>
</p>

# Official Sentry SDK for SolidStart

[![npm version](https://img.shields.io/npm/v/@sentry/solidstart.svg)](https://www.npmjs.com/package/@sentry/solidstart)
[![npm dm](https://img.shields.io/npm/dm/@sentry/solidstart.svg)](https://www.npmjs.com/package/@sentry/solidstart)
[![npm dt](https://img.shields.io/npm/dt/@sentry/solidstart.svg)](https://www.npmjs.com/package/@sentry/solidstart)

This SDK is in **Beta**. The API is stable but updates may include minor changes in behavior. Please reach out on
[GitHub](https://github.com/getsentry/sentry-javascript/issues/new/choose) if you have any feedback or concerns. This
SDK is for [SolidStart](https://start.solidjs.com/). If you're using [Solid](https://www.solidjs.com/) see our
[Solid SDK here](https://github.com/getsentry/sentry-javascript/tree/develop/packages/solid).

## Links

- [Official SDK Docs](https://docs.sentry.io/platforms/javascript/guides/solidstart/)

## General

This package is a wrapper around `@sentry/node` for the server and `@sentry/solid` for the client side, with added
functionality related to SolidStart.

## Manual Setup

If the setup through the wizard doesn't work for you, you can also set up the SDK manually.

### 1. Prerequisites & Installation

Install the Sentry SolidStart SDK:

```bash
# Using npm
npm install @sentry/solidstart

# Using yarn
yarn add @sentry/solidstart
```

### 2. Client-side Setup

Initialize the SDK in `entry-client.jsx`

```jsx
import * as Sentry from '@sentry/solidstart';
import { solidRouterBrowserTracingIntegration } from '@sentry/solidstart/solidrouter';
import { mount, StartClient } from '@solidjs/start/client';

Sentry.init({
  dsn: '__PUBLIC_DSN__',
  integrations: [solidRouterBrowserTracingIntegration()],
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
});

mount(() => <StartClient />, document.getElementById('app'));
```

### 3. Server-side Setup

Create an instrument file named `src/instrument.server.ts` and add your initialization code for the server-side SDK.

```javascript
import * as Sentry from '@sentry/solidstart';

Sentry.init({
  dsn: '__PUBLIC_DSN__',
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
});
```

### 4. Server instrumentation

Complete the setup by adding the Sentry middleware to your `src/middleware.ts` file:

```typescript
import { sentryBeforeResponseMiddleware } from '@sentry/solidstart';
import { createMiddleware } from '@solidjs/start/middleware';

export default createMiddleware({
  onBeforeResponse: [
    sentryBeforeResponseMiddleware(),
    // Add your other middleware handlers after `sentryBeforeResponseMiddleware`
  ],
});
```

And don't forget to specify `./src/middleware.ts` in your `app.config.ts`:

```typescript
import { defineConfig } from '@solidjs/start/config';

export default defineConfig({
  // ...
  middleware: './src/middleware.ts',
});
```

The Sentry middleware enhances the data collected by Sentry on the server side by enabling distributed tracing between
the client and server.

### 5. Configure your application

For Sentry to work properly, SolidStart's `app.config.ts` has to be modified. Wrap your config with `withSentry` and
configure it to upload source maps.

If your `instrument.server.ts` file is not located in the `src` folder, you can specify the path via the
`instrumentation` option to `withSentry`.

To upload source maps, configure an auth token. Auth tokens can be passed explicitly with the `authToken` option, with a
`SENTRY_AUTH_TOKEN` environment variable, or with an `.env.sentry-build-plugin` file in the working directory when
building your project. We recommend adding the auth token to your CI/CD environment as an environment variable.

Learn more about configuring the plugin in our
[Sentry Vite Plugin documentation](https://www.npmjs.com/package/@sentry/vite-plugin).

```typescript
import { defineConfig } from '@solidjs/start/config';
import { withSentry } from '@sentry/solidstart';

export default defineConfig(
  withSentry(
    {
      // SolidStart config
      middleware: './src/middleware.ts',
    },
    {
      // Sentry `withSentry` options
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      debug: true,
      // optional: if your `instrument.server.ts` file is not located inside `src`
      instrumentation: './mypath/instrument.server.ts',
    },
  ),
);
```

### 6. Run your application

Then run your app

```bash
NODE_OPTIONS='--import=./.output/server/instrument.server.mjs' yarn start
```

⚠️ **Note build presets** ⚠️  
Depending on [build preset](https://nitro.unjs.io/deploy), the location of `instrument.server.mjs` differs. To find out
where `instrument.server.mjs` is located, monitor the build log output for

```bash
[Sentry SolidStart withSentry] Successfully created /my/project/path/.output/server/instrument.server.mjs.
```

⚠️ **Note for platforms without the ability to modify `NODE_OPTIONS` or use `--import`** ⚠️  
Depending on where the application is deployed to, it might not be possible to modify or use `NODE_OPTIONS` to import
`instrument.server.mjs`.

For such platforms, we offer the option `autoInjectServerSentry: 'top-level-import'` to add a top level import of
`instrument.server.mjs` to the server entry file.

```typescript
import { defineConfig } from '@solidjs/start/config';
import { withSentry } from '@sentry/solidstart';

export default defineConfig(
  withSentry(
    {
      // ...
      middleware: './src/middleware.ts',
    },
    {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      debug: true,
      // optional: if your `instrument.server.ts` file is not located inside `src`
      instrumentation: './mypath/instrument.server.ts',
      // optional: if NODE_OPTIONS or --import is not avaiable
      autoInjectServerSentry: 'top-level-import',
    },
  ),
);
```

This has a **fundamental restriction**: It only supports limited performance instrumentation. **Only basic http
instrumentation** will work, and no DB or framework-specific instrumentation will be available.

# Solid Router

The Solid Router instrumentation uses the Solid Router library to create navigation spans to ensure you collect
meaningful performance data about the health of your page loads and associated requests.

Wrap `Router`, `MemoryRouter` or `HashRouter` from `@solidjs/router` using `withSentryRouterRouting`. This creates a
higher order component, which will enable Sentry to reach your router context.

```js
import { withSentryRouterRouting } from '@sentry/solidstart/solidrouter';
import { Route, Router } from '@solidjs/router';

const SentryRouter = Sentry.withSentryRouterRouting(Router);

render(
  () => (
    <SentryRouter>
      <Route path="/" component={App} />
      ...
    </SentryRouter>
  ),
  document.getElementById('root'),
);
```

# Solid ErrorBoundary

To automatically capture exceptions from inside a component tree and render a fallback component, wrap the native Solid
JS `ErrorBoundary` component with `Sentry.withSentryErrorBoundary`.

```js
import * as Sentry from '@sentry/solidstart';
import { ErrorBoundary } from 'solid-js';

const SentryErrorBoundary = Sentry.withSentryErrorBoundary(ErrorBoundary);

render(
  () => (
    <SentryErrorBoundary fallback={err => <div>Error: {err.message}</div>}>
      <ProblematicComponent />
    </SentryErrorBoundary>
  ),
  document.getElementById('root'),
);
```
