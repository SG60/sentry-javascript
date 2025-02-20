import type { Integration, SentrySpan, Span, SpanAttributes, SpanTimeInput, StartSpanOptions } from '@sentry/core';
import { getClient, getCurrentScope, spanToJSON, startInactiveSpan, withActiveSpan } from '@sentry/core';
import { WINDOW } from '../types';

/**
 * Checks if a given value is a valid measurement value.
 */
export function isMeasurementValue(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value);
}

/**
 * Helper function to start child on transactions. This function will make sure that the transaction will
 * use the start timestamp of the created child span if it is earlier than the transactions actual
 * start timestamp.
 */
export function startAndEndSpan(
  parentSpan: Span,
  startTimeInSeconds: number,
  endTime: SpanTimeInput,
  { ...ctx }: StartSpanOptions,
): Span | undefined {
  const parentStartTime = spanToJSON(parentSpan).start_timestamp;
  if (parentStartTime && parentStartTime > startTimeInSeconds) {
    // We can only do this for SentrySpans...
    if (typeof (parentSpan as Partial<SentrySpan>).updateStartTime === 'function') {
      (parentSpan as SentrySpan).updateStartTime(startTimeInSeconds);
    }
  }

  // The return value only exists for tests
  return withActiveSpan(parentSpan, () => {
    const span = startInactiveSpan({
      startTime: startTimeInSeconds,
      ...ctx,
    });

    if (span) {
      span.end(endTime);
    }

    return span;
  });
}

interface StandaloneWebVitalSpanOptions {
  name: string;
  transaction?: string;
  attributes: SpanAttributes;
  startTime: number;
}

/**
 * Starts an inactive, standalone span used to send web vital values to Sentry.
 * DO NOT use this for arbitrary spans, as these spans require special handling
 * during ingestion to extract metrics.
 *
 * This function adds a bunch of attributes and data to the span that's shared
 * by all web vital standalone spans. However, you need to take care of adding
 * the actual web vital value as an event to the span. Also, you need to assign
 * a transaction name and some other values that are specific to the web vital.
 *
 * Ultimately, you also need to take care of ending the span to send it off.
 *
 * @param options
 *
 * @returns an inactive, standalone and NOT YET ended span
 */
export function startStandaloneWebVitalSpan(options: StandaloneWebVitalSpanOptions): Span | undefined {
  const client = getClient();
  if (!client) {
    return;
  }

  const { name, transaction, attributes: passedAttributes, startTime } = options;

  const { release, environment } = client.getOptions();
  // We need to get the replay, user, and activeTransaction from the current scope
  // so that we can associate replay id, profile id, and a user display to the span
  const replay = client.getIntegrationByName<Integration & { getReplayId: () => string }>('Replay');
  const replayId = replay?.getReplayId();

  const scope = getCurrentScope();

  const user = scope.getUser();
  const userDisplay = user !== undefined ? user.email || user.id || user.ip_address : undefined;

  let profileId: string | undefined;
  try {
    // @ts-expect-error skip optional chaining to save bundle size with try catch
    profileId = scope.getScopeData().contexts.profile.profile_id;
  } catch {
    // do nothing
  }

  const attributes: SpanAttributes = {
    release,
    environment,

    user: userDisplay || undefined,
    profile_id: profileId || undefined,
    replay_id: replayId || undefined,

    transaction,

    // Web vital score calculation relies on the user agent to account for different
    // browsers setting different thresholds for what is considered a good/meh/bad value.
    // For example: Chrome vs. Chrome Mobile
    'user_agent.original': WINDOW.navigator?.userAgent,

    // This tells Sentry to infer the IP address from the request
    'client.address': '{{auto}}',

    ...passedAttributes,
  };

  return startInactiveSpan({
    name,
    attributes,
    startTime,
    experimental: {
      standalone: true,
    },
  });
}

/** Get the browser performance API. */
export function getBrowserPerformanceAPI(): Performance | undefined {
  // @ts-expect-error we want to make sure all of these are available, even if TS is sure they are
  return WINDOW.addEventListener && WINDOW.performance;
}

/**
 * Converts from milliseconds to seconds
 * @param time time in ms
 */
export function msToSec(time: number): number {
  return time / 1000;
}
