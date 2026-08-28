import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, '.artifacts', 'validation', 'broker-ui');
const BASE_URL = process.env.LOGICSIM_BASE_URL ?? 'http://127.0.0.1:5173';
const BROKER_BASE_URL = process.env.BROKER_BASE_URL ?? 'http://127.0.0.1:8787';
const BROKER_TEST_API_KEY =
  process.env.BROKER_TEST_API_KEY ?? 'sk-broker-test-1234567890';
const BROKER_RECOVERY_TEST_API_KEY =
  process.env.BROKER_RECOVERY_TEST_API_KEY ?? BROKER_TEST_API_KEY;
function readCliOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

const SCENARIO =
  readCliOption('--scenario') ??
  process.env.BROKER_UI_SMOKE_SCENARIO ??
  'happy-path';
const INVALID_BROKER_BASE_URL =
  process.env.BROKER_UI_SMOKE_INVALID_BASE_URL ?? 'ftp://127.0.0.1:8787';
const BLOCKED_CHAT_MESSAGE =
  process.env.BROKER_UI_SMOKE_BLOCKED_CHAT_MESSAGE ??
  'Please scan the repository and compare this circuit to all other projects in the workspace.';
const SESSION_KEY_RATE_LIMIT_EXPECTED_ATTEMPTS = 5;
const CHAT_REQUEST_RATE_LIMIT_EXPECTED_ATTEMPTS = 17;
const CHAT_RESET_RATE_LIMIT_EXPECTED_ATTEMPTS = 6;
const CIRCUIT_FILE =
  process.env.BROKER_UI_SMOKE_CIRCUIT_FILE ??
  path.join(
    ROOT,
    'validation',
    'fixtures',
    'golden-corpus',
    'gc_c1_basic_gates.lgsc.json',
  );

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeBrokerUiBaseUrl(rawValue) {
  const url = new URL(rawValue);
  const basePath = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
  url.pathname = basePath.endsWith('/v1') ? basePath : `${basePath}/v1`;
  return url.toString().replace(/\/$/, '');
}

const BROKER_UI_BASE_URL = normalizeBrokerUiBaseUrl(BROKER_BASE_URL);
const VERBOSE = process.env.BROKER_UI_SMOKE_VERBOSE === '1';

function logStep(message, details) {
  if (!VERBOSE) return;
  if (details === undefined) {
    process.stderr.write(`[broker-ui-smoke] ${message}\n`);
    return;
  }
  process.stderr.write(
    `[broker-ui-smoke] ${message} ${JSON.stringify(details)}\n`,
  );
}

async function loadCircuit(page, file) {
  const json = fs.readFileSync(file, 'utf8');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((value) => {
    sessionStorage.setItem('lgsim_autosave', value);
  }, json);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => document.body.textContent?.includes('Logic Simulator Studio'),
    { timeout: 15000 },
  );
}

async function clickVisibleByTestId(page, testId) {
  await page.waitForFunction(
    (value) => {
      const nodes = [...document.querySelectorAll(`[data-testid="${value}"]`)];
      return nodes.some((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    },
    { timeout: 15000 },
    testId,
  );

  await page.evaluate((value) => {
    const nodes = [...document.querySelectorAll(`[data-testid="${value}"]`)];
    const node = nodes.find((entry) => {
      const rect = entry.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (!(node instanceof HTMLElement)) {
      throw new Error(`visible data-testid not found: ${value}`);
    }
    node.click();
  }, testId);
}

async function clickByTestId(page, testId) {
  await page.waitForSelector(`[data-testid="${testId}"]`, {
    timeout: 15000,
  });
  await page.evaluate((value) => {
    const node = document.querySelector(`[data-testid="${value}"]`);
    if (!(node instanceof HTMLElement)) {
      throw new Error(`data-testid target is not clickable: ${value}`);
    }
    node.click();
  }, testId);
}

async function hasVisibleByTestId(page, testId) {
  return page.evaluate((value) => {
    const nodes = [...document.querySelectorAll(`[data-testid="${value}"]`)];
    return nodes.some((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }, testId);
}

async function setInputValue(page, testId, value) {
  await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 15000 });
  await page.$eval(
    `[data-testid="${testId}"]`,
    (node, nextValue) => {
      if (
        !(node instanceof HTMLInputElement) &&
        !(node instanceof HTMLTextAreaElement)
      ) {
        throw new Error(`data-testid target is not an input-like element: ${node.tagName}`);
      }
      const prototype =
        node instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      descriptor?.set?.call(node, nextValue);
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    },
    value,
  );
}

async function waitForTextContent(page, testId, predicate, timeout = 15000) {
  await page.waitForFunction(
    ({ value, expression }) => {
      const node = document.querySelector(`[data-testid="${value}"]`);
      if (!node) return false;
      const text = node.textContent?.trim() ?? '';
      switch (expression) {
        case 'non-empty':
          return text.length > 0;
        case 'not-default':
          return text.length > 0 && text !== 'noch keine';
        case 'default':
          return text === 'noch keine';
        case 'missing':
          return false;
        default:
          return text === expression;
      }
    },
    { timeout },
    { value: testId, expression: predicate },
  );
}

async function getTextContent(page, testId) {
  return page.$eval(
    `[data-testid="${testId}"]`,
    (node) => node.textContent?.trim() ?? '',
  );
}

async function getBrokerDebugState(page) {
  return page.evaluate(() => window.__LGSIM_BACKEND_BROKER__?.getState() ?? null);
}

async function waitForBrokerDebugState(
  page,
  predicate,
  description,
  timeout = 15000,
  intervalMs = 200,
) {
  const startedAt = Date.now();
  let lastState = null;

  while (Date.now() - startedAt < timeout) {
    lastState = await getBrokerDebugState(page);
    if (lastState && predicate(lastState)) {
      return lastState;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out waiting for broker debug state: ${description}. Last state: ${JSON.stringify(lastState)}`,
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const observedBrokerRequests = [];
  const unexpectedFetchHosts = [];
  const recentEvents = [];
  let currentStep = 'initializing';
  let finalSessionId = null;

  const recordEvent = (type, details) => {
    const entry = {
      at: new Date().toISOString(),
      type,
      ...details,
    };
    recentEvents.push(entry);
    if (recentEvents.length > 25) {
      recentEvents.shift();
    }
    logStep(`event:${type}`, details);
  };

  const markStep = (step, details) => {
    currentStep = step;
    logStep(`step:${step}`, details);
  };

  page.on('requestfinished', (request) => {
    if (!['fetch', 'xhr'].includes(request.resourceType())) {
      return;
    }
    const url = new URL(request.url());
    observedBrokerRequests.push({
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
    });
    const isBrokerCall = url.pathname.startsWith('/v1/');
    if (!isBrokerCall) {
      unexpectedFetchHosts.push(request.url());
    }
    recordEvent('requestfinished', {
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    });
  });
  page.on('requestfailed', (request) => {
    recordEvent('requestfailed', {
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      failure: request.failure()?.errorText ?? 'unknown',
    });
  });
  page.on('pageerror', (error) => {
    recordEvent('pageerror', {
      message: error.message,
    });
  });
  page.on('error', (error) => {
    recordEvent('page-crash', {
      message: error.message,
    });
  });
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      recordEvent('framenavigated', {
        url: frame.url(),
      });
    }
  });
  browser.on('disconnected', () => {
    recordEvent('browser-disconnected', {});
  });
  page.on('console', (message) => {
    const text = message.text();
    if (
      text.includes('backend-broker') ||
      text.includes('backend-sandbox-bridge') ||
      text.includes('Failed to load resource')
    ) {
      recordEvent('console', {
        level: message.type(),
        text,
      });
    }
  });

  try {
    markStep('load-circuit', {
      baseUrl: BASE_URL,
      brokerBaseUrl: BROKER_UI_BASE_URL,
      circuitFile: path.relative(ROOT, CIRCUIT_FILE).split(path.sep).join('/'),
      scenario: SCENARIO,
    });
    await loadCircuit(page, CIRCUIT_FILE);
    markStep('open-broker-modal');
    if (!(await hasVisibleByTestId(page, 'toolbar-broker-button'))) {
      markStep('open-overflow-menu');
      await clickVisibleByTestId(page, 'toolbar-overflow-button');
    }
    await clickVisibleByTestId(page, 'toolbar-broker-button');
    await page.waitForSelector('[data-testid="backend-broker-modal"]', {
      timeout: 15000,
    });
    markStep('broker-modal-opened');

    observedBrokerRequests.length = 0;
    unexpectedFetchHosts.length = 0;

    const connectBrokerSession = async (apiKey, stepLabel = 'connect-broker-session') => {
      markStep(stepLabel);
      await setInputValue(page, 'broker-base-url-input', BROKER_BASE_URL);
      await setInputValue(page, 'broker-api-key-input', apiKey);
      logStep(
        'connect-form-state',
        await page.evaluate(() => ({
          apiKeyLength:
            (
              document.querySelector('[data-testid="broker-api-key-input"]') ??
              { value: '' }
            ).value?.length ?? 0,
          brokerBaseUrl:
            (
              document.querySelector('[data-testid="broker-base-url-input"]') ??
              { value: '' }
            ).value ?? '',
          connectButtonDisabled:
            (
              document.querySelector('[data-testid="broker-connect-button"]') ??
              { disabled: true }
            ).disabled ?? true,
          connectButtonLabel:
            document
              .querySelector('[data-testid="broker-connect-button"]')
              ?.textContent?.trim() ?? '',
        })),
      );
      await clickByTestId(page, 'broker-connect-button');
      logStep(
        'connect-clicked',
        await page.evaluate(() => ({
          connectButtonDisabled:
            (
              document.querySelector('[data-testid="broker-connect-button"]') ??
              { disabled: true }
            ).disabled ?? true,
          visibleErrorTitle:
            document
              .querySelector('[data-testid="broker-error-title"]')
              ?.textContent?.trim() ?? null,
        })),
      );
      const debugStateAfterConnect = await waitForBrokerDebugState(
        page,
        (state) => state.hasActiveSession && state.phase === 'active',
        'active broker session after connect',
      );
      const postConnectState = await page.evaluate(() => ({
        sessionId:
          document
            .querySelector('[data-testid="broker-session-id"]')
            ?.textContent?.trim() ?? '',
        hasDisconnectButton: !!document.querySelector(
          '[data-testid="broker-disconnect-button"]',
        ),
        errorTitle:
          document
            .querySelector('[data-testid="broker-error-title"]')
            ?.textContent?.trim() ?? '',
        errorMessage:
          document
            .querySelector('[data-testid="broker-error-panel"] p')
            ?.textContent?.trim() ?? '',
      }));
      logStep('post-connect-state', postConnectState);
      logStep('post-connect-debug-state', debugStateAfterConnect);
      if (postConnectState.errorTitle) {
        throw new Error(
          `Broker connect failed in smoke: ${postConnectState.errorTitle} :: ${postConnectState.errorMessage}`,
        );
      }
      assert(
        postConnectState.hasDisconnectButton,
        `Broker session did not switch into the active-session dialog state: ${JSON.stringify(postConnectState)}`,
      );

      const sessionId =
        postConnectState.sessionId ||
        debugStateAfterConnect?.sessionId ||
        'session-active';
      finalSessionId = sessionId;
      markStep('session-established', { sessionId });
      assert(sessionId.length > 0, 'Expected a non-empty broker session id.');
      return { debugStateAfterConnect, postConnectState, sessionId };
    };

    const disconnectBrokerSession = async (description) => {
      markStep('delete-broker-key');
      await clickByTestId(page, 'broker-disconnect-button');
      await waitForBrokerDebugState(
        page,
        (state) =>
          state.phase === 'idle' &&
          !state.hasActiveSession &&
          state.messageCount === 0,
        description,
        20000,
      );
      markStep('broker-key-deleted');
    };

    const sendBrokerMessage = async ({
      message,
      stepLabel,
      description,
      predicate,
      timeout = 20000,
    }) => {
      markStep(stepLabel);
      await setInputValue(page, 'broker-message-input', message);
      await clickByTestId(page, 'broker-send-button');
      return waitForBrokerDebugState(page, predicate, description, timeout);
    };

    if (SCENARIO === 'config-invalid-base-url') {
      markStep('connect-broker-session-invalid-config');
      await setInputValue(page, 'broker-base-url-input', INVALID_BROKER_BASE_URL);
      await setInputValue(page, 'broker-api-key-input', BROKER_TEST_API_KEY);
      await clickByTestId(page, 'broker-connect-button');
      const invalidConfigState = await waitForBrokerDebugState(
        page,
        (state) =>
          state.phase === 'idle' &&
          !state.hasActiveSession &&
          state.lastErrorKind === 'request' &&
          state.lastErrorTitle === 'Broker-Base-URL ist ungueltig',
        'invalid base-url configuration reflected in broker debug state',
        20000,
      );
      const visibleState = await page.evaluate(() => ({
        errorPanelText:
          document
            .querySelector('[data-testid="broker-error-panel"]')
            ?.textContent?.replace(/\s+/g, ' ')
            .trim() ?? '',
        errorTitle:
          document
            .querySelector('[data-testid="broker-error-title"]')
            ?.textContent?.trim() ?? '',
        hasDisconnectButton: !!document.querySelector(
          '[data-testid="broker-disconnect-button"]',
        ),
      }));
      markStep('invalid-config-visible', {
        invalidConfigState,
        visibleState,
      });
      assert(
        visibleState.errorTitle === 'Broker-Base-URL ist ungueltig',
        `Expected visible invalid-base-url title, got ${JSON.stringify(visibleState)}`,
      );
      assert(
        !visibleState.hasDisconnectButton,
        `Did not expect an active session after invalid-base-url attempt, got ${JSON.stringify(visibleState)}`,
      );
      assert(
        observedBrokerRequests.length === 0,
        `Expected no broker requests for invalid base-url attempt, got ${JSON.stringify(observedBrokerRequests)}`,
      );

      await connectBrokerSession(
        BROKER_TEST_API_KEY,
        'connect-broker-session-after-invalid-config',
      );
      await disconnectBrokerSession(
        'session deletion reflected in broker debug state after invalid-config recovery flow',
      );
    } else if (SCENARIO === 'provider-upstream-unavailable') {
      await connectBrokerSession(
        BROKER_TEST_API_KEY,
        'connect-broker-session-before-provider-fault',
      );

      markStep('arm-dev-provider-fault');
      const faultResponse = await fetch(`${BROKER_UI_BASE_URL}/dev/provider-fault`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: 'timeout' }),
      });
      assert(
        faultResponse.ok,
        `Expected dev provider fault arm call to succeed, got ${faultResponse.status}.`,
      );

      const blockedState = await sendBrokerMessage({
        message: 'Beschreibe kurz die aktuell geoeffnete Schaltung.',
        stepLabel: 'send-broker-chat-provider-fault',
        description: 'provider-upstream failure reflected in broker debug state',
        predicate: (state) =>
          state.phase === 'active' &&
          state.hasActiveSession &&
          state.lastErrorKind === 'provider' &&
          state.messageCount === 0,
      });
      const visibleState = await page.evaluate(() => ({
        errorPanelText:
          document
            .querySelector('[data-testid="broker-error-panel"]')
            ?.textContent?.replace(/\s+/g, ' ')
            .trim() ?? '',
        errorTitle:
          document
            .querySelector('[data-testid="broker-error-title"]')
            ?.textContent?.trim() ?? '',
      }));
      markStep('provider-fault-visible', {
        blockedState,
        visibleState,
      });
      assert(
        visibleState.errorTitle === 'Broker-Chat konnte nicht zugestellt werden',
        `Expected visible provider-upstream title, got ${JSON.stringify(visibleState)}`,
      );

      const debugStateAfterRecoverySend = await sendBrokerMessage({
        message: 'Beschreibe kurz die aktuell geoeffnete Schaltung nach dem Upstream-Fehler.',
        stepLabel: 'send-broker-chat-after-provider-fault',
        description: 'chat response reflected in broker debug state after provider-upstream recovery',
        predicate: (state) =>
          state.phase === 'active' &&
          typeof state.conversationId === 'string' &&
          state.conversationId.length > 0 &&
          state.messageCount >= 2,
      });
      markStep('provider-fault-recovery-succeeded', {
        conversationId: debugStateAfterRecoverySend?.conversationId ?? null,
        messageCount: debugStateAfterRecoverySend?.messageCount ?? null,
      });

      await disconnectBrokerSession(
        'session deletion reflected in broker debug state after provider-upstream flow',
      );
    } else if (SCENARIO === 'policy-chat-blocked') {
      await connectBrokerSession(
        BROKER_TEST_API_KEY,
        'connect-broker-session-before-policy-block',
      );

      const blockedState = await sendBrokerMessage({
        message: BLOCKED_CHAT_MESSAGE,
        stepLabel: 'send-broker-chat-policy-blocked',
        description: 'policy-blocked chat reflected in broker debug state',
        predicate: (state) =>
          state.phase === 'active' &&
          state.hasActiveSession &&
          state.lastErrorKind === 'request' &&
          state.messageCount === 0,
      });
      const visibleState = await page.evaluate(() => ({
        errorPanelText:
          document
            .querySelector('[data-testid="broker-error-panel"]')
            ?.textContent?.replace(/\s+/g, ' ')
            .trim() ?? '',
        errorTitle:
          document
            .querySelector('[data-testid="broker-error-title"]')
            ?.textContent?.trim() ?? '',
      }));
      markStep('policy-chat-block-visible', {
        blockedState,
        visibleState,
      });
      assert(
        visibleState.errorTitle === 'Broker-Chat wurde abgelehnt',
        `Expected visible policy-block title, got ${JSON.stringify(visibleState)}`,
      );

      const debugStateAfterRecoverySend = await sendBrokerMessage({
        message: 'Beschreibe kurz die aktuell geoeffnete Schaltung.',
        stepLabel: 'send-broker-chat-after-policy-block',
        description: 'chat response reflected in broker debug state after policy-block recovery',
        predicate: (state) =>
          state.phase === 'active' &&
          typeof state.conversationId === 'string' &&
          state.conversationId.length > 0 &&
          state.messageCount >= 2,
      });
      markStep('policy-chat-recovery-succeeded', {
        conversationId: debugStateAfterRecoverySend?.conversationId ?? null,
        messageCount: debugStateAfterRecoverySend?.messageCount ?? null,
      });

      await disconnectBrokerSession(
        'session deletion reflected in broker debug state after policy-block flow',
      );
    } else if (SCENARIO === 'rate-limit-session-key') {
      for (let attempt = 1; attempt <= SESSION_KEY_RATE_LIMIT_EXPECTED_ATTEMPTS; attempt += 1) {
        if (attempt < SESSION_KEY_RATE_LIMIT_EXPECTED_ATTEMPTS) {
          await connectBrokerSession(
            BROKER_TEST_API_KEY,
            `connect-broker-session-attempt-${attempt}`,
          );
          await disconnectBrokerSession(
            `session deletion reflected in broker debug state after connect attempt ${attempt}`,
          );
        } else {
          markStep('connect-broker-session-rate-limited', { attempt });
          await setInputValue(page, 'broker-base-url-input', BROKER_BASE_URL);
          await setInputValue(page, 'broker-api-key-input', BROKER_TEST_API_KEY);
          await clickByTestId(page, 'broker-connect-button');
          const blockedState = await waitForBrokerDebugState(
            page,
            (state) =>
              state.phase === 'idle' &&
              !state.hasActiveSession &&
              state.lastErrorKind === 'rate-limit',
            'session-key rate-limit reflected in broker debug state',
            20000,
          );
          const visibleState = await page.evaluate(() => ({
            connectLabel:
              document
                .querySelector('[data-testid="broker-connect-button"]')
                ?.textContent?.trim() ?? '',
            errorPanelText:
              document
                .querySelector('[data-testid="broker-error-panel"]')
                ?.textContent?.replace(/\s+/g, ' ')
                .trim() ?? '',
            errorTitle:
              document
                .querySelector('[data-testid="broker-error-title"]')
                ?.textContent?.trim() ?? '',
          }));
          markStep('session-key-rate-limited', {
            blockedState,
            visibleState,
          });
          assert(
            visibleState.errorTitle === 'Broker-Key-Limit erreicht',
            `Expected visible session-key rate-limit title, got ${JSON.stringify(visibleState)}`,
          );
          assert(
            /^Warte \d+s$/.test(visibleState.connectLabel),
            `Expected connect button cooldown label after session-key rate-limit, got ${JSON.stringify(visibleState)}`,
          );
        }
      }
    } else {
      const { sessionId } = await connectBrokerSession(BROKER_TEST_API_KEY);
      if (SCENARIO === 'stale-session-recovery') {
      markStep('invalidate-session-externally', { sessionId });
      const invalidationResponse = await fetch(`${BROKER_UI_BASE_URL}/session/key`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
      assert(
        invalidationResponse.ok,
        `Expected external session invalidation to succeed, got ${invalidationResponse.status}.`,
      );

      const debugStateAfterInvalidation = await sendBrokerMessage({
        message: 'Pruefe die stale Session-Behandlung.',
        stepLabel: 'send-broker-chat-with-stale-session',
        description: 'session invalidation reflected in broker debug state after stale send',
        predicate: (state) =>
          state.phase === 'idle' &&
          !state.hasActiveSession &&
          state.messageCount === 0 &&
          state.lastErrorKind === 'session',
      });
      markStep('stale-session-detected', debugStateAfterInvalidation);

      assert(
        debugStateAfterInvalidation.lastErrorTitle?.includes('Broker-Sitzung') ?? false,
        `Expected a visible session error after stale session send, got ${JSON.stringify(debugStateAfterInvalidation)}`,
      );

      markStep('reconnect-after-stale-session');
      await setInputValue(
        page,
        'broker-api-key-input',
        BROKER_RECOVERY_TEST_API_KEY,
      );
      await clickByTestId(page, 'broker-connect-button');
      const debugStateAfterReconnect = await waitForBrokerDebugState(
        page,
        (state) => state.phase === 'active' && state.hasActiveSession,
        'active broker session after reconnect',
        20000,
      );
      markStep('reconnected', debugStateAfterReconnect);

      const debugStateAfterRecoverySend = await sendBrokerMessage({
        message: 'Beschreibe kurz die aktuell geoeffnete Schaltung.',
        stepLabel: 'send-broker-chat-after-reconnect',
        description: 'chat response reflected in broker debug state after reconnect',
        predicate: (state) =>
          state.phase === 'active' &&
          typeof state.conversationId === 'string' &&
          state.conversationId.length > 0 &&
          state.messageCount >= 2,
      });
      markStep('recovery-chat-response-received', {
        conversationId: debugStateAfterRecoverySend?.conversationId ?? null,
        messageCount: debugStateAfterRecoverySend?.messageCount ?? null,
      });

      await disconnectBrokerSession(
        'session deletion reflected in broker debug state after recovery flow',
      );
      } else if (SCENARIO === 'rate-limit-chat-request') {
        for (
          let attempt = 1;
          attempt <= CHAT_REQUEST_RATE_LIMIT_EXPECTED_ATTEMPTS;
          attempt += 1
        ) {
          if (attempt < CHAT_REQUEST_RATE_LIMIT_EXPECTED_ATTEMPTS) {
            const debugStateAfterSend = await sendBrokerMessage({
              message: `Beschreibe kurz die aktuell geoeffnete Schaltung. Versuch ${attempt}.`,
              stepLabel: `send-broker-chat-attempt-${attempt}`,
              description: `chat response reflected in broker debug state after send attempt ${attempt}`,
              predicate: (state) =>
                state.phase === 'active' &&
                typeof state.conversationId === 'string' &&
                state.conversationId.length > 0 &&
                state.messageCount >= attempt * 2,
            });
            markStep(`chat-response-received-attempt-${attempt}`, {
              conversationId: debugStateAfterSend?.conversationId ?? null,
              messageCount: debugStateAfterSend?.messageCount ?? null,
            });
          } else {
            const blockedState = await sendBrokerMessage({
              message: 'Beschreibe kurz die aktuell geoeffnete Schaltung. Rate-Limit-Test.',
              stepLabel: 'send-broker-chat-rate-limited',
              description: 'chat-request rate-limit reflected in broker debug state',
              predicate: (state) =>
                state.phase === 'active' &&
                state.hasActiveSession &&
                state.lastErrorKind === 'rate-limit' &&
                state.messageCount >= (attempt - 1) * 2,
            });
            const visibleState = await page.evaluate(() => ({
              errorPanelText:
                document
                  .querySelector('[data-testid="broker-error-panel"]')
                  ?.textContent?.replace(/\s+/g, ' ')
                  .trim() ?? '',
              errorTitle:
                document
                  .querySelector('[data-testid="broker-error-title"]')
                  ?.textContent?.trim() ?? '',
              sendLabel:
                document
                  .querySelector('[data-testid="broker-send-button"]')
                  ?.textContent?.trim() ?? '',
            }));
            markStep('chat-request-rate-limited', {
              blockedState,
              visibleState,
            });
            assert(
              visibleState.errorTitle === 'Broker-Chat-Limit erreicht',
              `Expected visible chat-request rate-limit title, got ${JSON.stringify(visibleState)}`,
            );
            assert(
              /^Sende in \d+s$/.test(visibleState.sendLabel),
              `Expected send button cooldown label after chat-request rate-limit, got ${JSON.stringify(visibleState)}`,
            );
          }
        }

        await disconnectBrokerSession(
          'session deletion reflected in broker debug state after chat-request rate-limit flow',
        );
      } else if (SCENARIO === 'rate-limit-chat-reset') {
        const debugStateAfterSeedSend = await sendBrokerMessage({
          message: 'Beschreibe kurz die aktuell geoeffnete Schaltung vor dem Reset-Limit-Test.',
          stepLabel: 'send-broker-chat-before-reset-rate-limit',
          description: 'chat response reflected in broker debug state before reset rate-limit test',
          predicate: (state) =>
            state.phase === 'active' &&
            typeof state.conversationId === 'string' &&
            state.conversationId.length > 0 &&
            state.messageCount >= 2,
        });
        markStep('chat-response-received-before-reset-rate-limit', {
          conversationId: debugStateAfterSeedSend?.conversationId ?? null,
          messageCount: debugStateAfterSeedSend?.messageCount ?? null,
        });

        for (
          let attempt = 1;
          attempt <= CHAT_RESET_RATE_LIMIT_EXPECTED_ATTEMPTS;
          attempt += 1
        ) {
          if (attempt < CHAT_RESET_RATE_LIMIT_EXPECTED_ATTEMPTS) {
            markStep(`reset-broker-conversation-attempt-${attempt}`);
            await clickByTestId(page, 'broker-reset-button');
            const debugStateAfterReset = await waitForBrokerDebugState(
              page,
              (state) =>
                state.phase === 'active' &&
                (!state.conversationId || state.conversationId.length === 0) &&
                state.messageCount === 0,
              `conversation reset reflected in broker debug state after reset attempt ${attempt}`,
              20000,
            );
            markStep(`conversation-reset-attempt-${attempt}`, {
              conversationId: debugStateAfterReset?.conversationId ?? null,
              messageCount: debugStateAfterReset?.messageCount ?? null,
            });
          } else {
            markStep('reset-broker-conversation-rate-limited');
            await clickByTestId(page, 'broker-reset-button');
            const blockedState = await waitForBrokerDebugState(
              page,
              (state) =>
                state.phase === 'active' &&
                state.hasActiveSession &&
                state.lastErrorKind === 'rate-limit' &&
                state.messageCount === 0,
              'chat-reset rate-limit reflected in broker debug state',
              20000,
            );
            const visibleState = await page.evaluate(() => ({
              errorPanelText:
                document
                  .querySelector('[data-testid="broker-error-panel"]')
                  ?.textContent?.replace(/\s+/g, ' ')
                  .trim() ?? '',
              errorTitle:
                document
                  .querySelector('[data-testid="broker-error-title"]')
                  ?.textContent?.trim() ?? '',
              resetLabel:
                document
                  .querySelector('[data-testid="broker-reset-button"]')
                  ?.textContent?.trim() ?? '',
            }));
            markStep('chat-reset-rate-limited', {
              blockedState,
              visibleState,
            });
            assert(
              visibleState.errorTitle === 'Broker-Reset-Limit erreicht',
              `Expected visible chat-reset rate-limit title, got ${JSON.stringify(visibleState)}`,
            );
            assert(
              /^Reset in \d+s$/.test(visibleState.resetLabel),
              `Expected reset button cooldown label after chat-reset rate-limit, got ${JSON.stringify(visibleState)}`,
            );
          }
        }

        await disconnectBrokerSession(
          'session deletion reflected in broker debug state after chat-reset rate-limit flow',
        );
      } else {
      const debugStateAfterSend = await sendBrokerMessage({
        message: 'Beschreibe kurz die aktuell geoeffnete Schaltung.',
        stepLabel: 'send-broker-chat',
        description: 'chat response reflected in broker debug state',
        predicate: (state) =>
          state.phase === 'active' &&
          typeof state.conversationId === 'string' &&
          state.conversationId.length > 0 &&
          state.messageCount >= 2,
      });
      markStep('chat-response-received', {
        conversationId: debugStateAfterSend?.conversationId ?? null,
        messageCount: debugStateAfterSend?.messageCount ?? null,
      });

      markStep('reset-broker-conversation');
      await clickByTestId(page, 'broker-reset-button');
      await waitForBrokerDebugState(
        page,
        (state) =>
          state.phase === 'active' &&
          (!state.conversationId || state.conversationId.length === 0) &&
          state.messageCount === 0,
        'conversation reset reflected in broker debug state',
        20000,
      );
      markStep('conversation-reset');

      await disconnectBrokerSession(
        'session deletion reflected in broker debug state',
      );
      }
    }

    const expectedBrokerOrigin = new URL(BROKER_UI_BASE_URL).origin;
    const invalidBrokerCalls = observedBrokerRequests.filter(({ url }) => {
      const parsed = new URL(url);
      return !parsed.pathname.startsWith('/v1/') || parsed.origin !== expectedBrokerOrigin;
    });

    assert(
      invalidBrokerCalls.length === 0,
      `Expected only broker requests against ${expectedBrokerOrigin}, got: ${invalidBrokerCalls
        .map((entry) => entry.url)
        .join(', ')}`,
    );

    assert(
      unexpectedFetchHosts.length === 0,
      `Unexpected non-broker fetch/xhr requests observed: ${unexpectedFetchHosts.join(', ')}`,
    );

    const brokerRequestPaths = observedBrokerRequests.map(({ method, url }) => {
      const parsed = new URL(url);
      return `${method} ${parsed.pathname}`;
    });

    assert(
      brokerRequestPaths.some((entry) => entry === 'POST /v1/session/key'),
      'Missing POST /v1/session/key broker request.',
    );
    if (SCENARIO === 'config-invalid-base-url') {
      const sessionKeyPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/session/key',
      ).length;
      const sessionKeyDeletes = brokerRequestPaths.filter(
        (entry) => entry === 'DELETE /v1/session/key',
      ).length;

      assert(
        sessionKeyPosts >= 1,
        `Expected at least one POST /v1/session/key broker request after config recovery, got ${sessionKeyPosts}.`,
      );
      assert(
        sessionKeyDeletes >= 1,
        `Expected at least one DELETE /v1/session/key broker request after config recovery, got ${sessionKeyDeletes}.`,
      );
    } else if (SCENARIO === 'provider-upstream-unavailable') {
      const sessionKeyPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/session/key',
      ).length;
      const chatRequestPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/chat/request',
      ).length;
      const sessionKeyDeletes = brokerRequestPaths.filter(
        (entry) => entry === 'DELETE /v1/session/key',
      ).length;

      assert(
        sessionKeyPosts >= 1,
        `Expected at least one POST /v1/session/key broker request for provider-upstream flow, got ${sessionKeyPosts}.`,
      );
      assert(
        chatRequestPosts >= 2,
        `Expected at least two POST /v1/chat/request broker requests for provider-upstream blocked + recovery flow, got ${chatRequestPosts}.`,
      );
      assert(
        sessionKeyDeletes >= 1,
        `Expected at least one DELETE /v1/session/key broker request for provider-upstream flow, got ${sessionKeyDeletes}.`,
      );
    } else if (SCENARIO === 'policy-chat-blocked') {
      const sessionKeyPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/session/key',
      ).length;
      const chatRequestPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/chat/request',
      ).length;
      const sessionKeyDeletes = brokerRequestPaths.filter(
        (entry) => entry === 'DELETE /v1/session/key',
      ).length;

      assert(
        sessionKeyPosts >= 1,
        `Expected at least one POST /v1/session/key broker request for policy-block flow, got ${sessionKeyPosts}.`,
      );
      assert(
        chatRequestPosts >= 2,
        `Expected at least two POST /v1/chat/request broker requests for blocked + recovery chat flow, got ${chatRequestPosts}.`,
      );
      assert(
        sessionKeyDeletes >= 1,
        `Expected at least one DELETE /v1/session/key broker request for policy-block flow, got ${sessionKeyDeletes}.`,
      );
    } else if (SCENARIO === 'rate-limit-session-key') {
      const sessionKeyPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/session/key',
      ).length;
      const sessionKeyDeletes = brokerRequestPaths.filter(
        (entry) => entry === 'DELETE /v1/session/key',
      ).length;

      assert(
        sessionKeyPosts >= SESSION_KEY_RATE_LIMIT_EXPECTED_ATTEMPTS,
        `Expected at least ${SESSION_KEY_RATE_LIMIT_EXPECTED_ATTEMPTS} POST /v1/session/key broker requests, got ${sessionKeyPosts}.`,
      );
      assert(
        sessionKeyDeletes >= SESSION_KEY_RATE_LIMIT_EXPECTED_ATTEMPTS - 1,
        `Expected at least ${SESSION_KEY_RATE_LIMIT_EXPECTED_ATTEMPTS - 1} DELETE /v1/session/key broker requests, got ${sessionKeyDeletes}.`,
      );
    } else if (SCENARIO === 'rate-limit-chat-request') {
      assert(
        brokerRequestPaths.some((entry) => entry === 'POST /v1/chat/request'),
        'Missing POST /v1/chat/request broker request.',
      );
      const chatRequestPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/chat/request',
      ).length;
      const sessionKeyPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/session/key',
      ).length;
      const sessionKeyDeletes = brokerRequestPaths.filter(
        (entry) => entry === 'DELETE /v1/session/key',
      ).length;

      assert(
        chatRequestPosts >= CHAT_REQUEST_RATE_LIMIT_EXPECTED_ATTEMPTS,
        `Expected at least ${CHAT_REQUEST_RATE_LIMIT_EXPECTED_ATTEMPTS} POST /v1/chat/request broker requests, got ${chatRequestPosts}.`,
      );
      assert(
        sessionKeyPosts >= 1,
        `Expected at least one POST /v1/session/key broker request, got ${sessionKeyPosts}.`,
      );
      assert(
        sessionKeyDeletes >= 1,
        `Expected at least one DELETE /v1/session/key broker request, got ${sessionKeyDeletes}.`,
      );
    } else if (SCENARIO === 'rate-limit-chat-reset') {
      assert(
        brokerRequestPaths.some((entry) => entry === 'POST /v1/chat/request'),
        'Missing POST /v1/chat/request broker request.',
      );
      assert(
        brokerRequestPaths.some((entry) => entry === 'POST /v1/chat/reset'),
        'Missing POST /v1/chat/reset broker request.',
      );
      const chatResetPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/chat/reset',
      ).length;
      const chatRequestPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/chat/request',
      ).length;
      const sessionKeyPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/session/key',
      ).length;
      const sessionKeyDeletes = brokerRequestPaths.filter(
        (entry) => entry === 'DELETE /v1/session/key',
      ).length;

      assert(
        chatResetPosts >= CHAT_RESET_RATE_LIMIT_EXPECTED_ATTEMPTS,
        `Expected at least ${CHAT_RESET_RATE_LIMIT_EXPECTED_ATTEMPTS} POST /v1/chat/reset broker requests, got ${chatResetPosts}.`,
      );
      assert(
        chatRequestPosts >= 1,
        `Expected at least one POST /v1/chat/request broker request, got ${chatRequestPosts}.`,
      );
      assert(
        sessionKeyPosts >= 1,
        `Expected at least one POST /v1/session/key broker request, got ${sessionKeyPosts}.`,
      );
      assert(
        sessionKeyDeletes >= 1,
        `Expected at least one DELETE /v1/session/key broker request, got ${sessionKeyDeletes}.`,
      );
    } else if (SCENARIO === 'stale-session-recovery') {
      assert(
        brokerRequestPaths.some((entry) => entry === 'POST /v1/chat/request'),
        'Missing POST /v1/chat/request broker request.',
      );
      const sessionKeyPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/session/key',
      ).length;
      const chatRequestPosts = brokerRequestPaths.filter(
        (entry) => entry === 'POST /v1/chat/request',
      ).length;
      const sessionKeyDeletes = brokerRequestPaths.filter(
        (entry) => entry === 'DELETE /v1/session/key',
      ).length;

      assert(
        sessionKeyPosts >= 2,
        `Expected at least two POST /v1/session/key broker requests, got ${sessionKeyPosts}.`,
      );
      assert(
        chatRequestPosts >= 2,
        `Expected at least two POST /v1/chat/request broker requests, got ${chatRequestPosts}.`,
      );
      assert(
        sessionKeyDeletes >= 1,
        `Expected at least one DELETE /v1/session/key broker request, got ${sessionKeyDeletes}.`,
      );
    } else {
      assert(
        brokerRequestPaths.some((entry) => entry === 'POST /v1/chat/request'),
        'Missing POST /v1/chat/request broker request.',
      );
      assert(
        brokerRequestPaths.some((entry) => entry === 'POST /v1/chat/reset'),
        'Missing POST /v1/chat/reset broker request.',
      );
      assert(
        brokerRequestPaths.some((entry) => entry === 'DELETE /v1/session/key'),
        'Missing DELETE /v1/session/key broker request.',
      );
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          brokerBaseUrl: BROKER_UI_BASE_URL,
          observedBrokerRequests: brokerRequestPaths,
          scenario: SCENARIO,
          sessionId: finalSessionId,
          circuitFile: path.relative(ROOT, CIRCUIT_FILE).split(path.sep).join('/'),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const screenshotFile = path.join(OUT_DIR, 'broker-ui-smoke-failure.png');
    let modalDomState = null;
    try {
      await page.screenshot({ path: screenshotFile, fullPage: true });
    } catch {
      // Ignore screenshot failures; the step/error text is the primary debug trail.
    }
    try {
      modalDomState = await page.evaluate(() => ({
        availableTestIds: [...document.querySelectorAll('[data-testid]')].map((node) =>
          node.getAttribute('data-testid'),
        ),
        conversationId:
          document
            .querySelector('[data-testid="broker-conversation-id"]')
            ?.textContent?.trim() ?? null,
        errorTitle:
          document
            .querySelector('[data-testid="broker-error-title"]')
            ?.textContent?.trim() ?? null,
        modalText:
          document
            .querySelector('[data-testid="backend-broker-modal"]')
            ?.textContent?.replace(/\s+/g, ' ')
            .trim() ?? null,
        sessionId:
          document
            .querySelector('[data-testid="broker-session-id"]')
            ?.textContent?.trim() ?? null,
      }));
    } catch {
      modalDomState = null;
    }
    process.stderr.write(
      `[broker-ui-smoke] failed during step ${currentStep}\n`,
    );
    process.stderr.write(
      `[broker-ui-smoke] failure screenshot: ${path.relative(ROOT, screenshotFile).split(path.sep).join('/')}\n`,
    );
    process.stderr.write(
      `[broker-ui-smoke] recent events: ${JSON.stringify(recentEvents, null, 2)}\n`,
    );
    process.stderr.write(
      `[broker-ui-smoke] modal dom state: ${JSON.stringify(modalDomState, null, 2)}\n`,
    );
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
