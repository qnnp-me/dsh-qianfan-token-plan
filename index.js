/**
 * Host half of `dsh-qianfan-token-plan`.
 *
 * Baidu Qianfan publishes no quota API for the Token Plan: the only programmable
 * numbers live behind the console's own `tokenPlanPersonal` endpoints, which need
 * a logged-in console session (a `bduss`-carrying Cookie). This Host half reads
 * that Cookie from the DSH credential store (or, zero-migration, from the
 * existing OpenChamber extension config file), queries the console, whitelists
 * the fields it is allowed to return, caches them for 60s and serves the result
 * on the authenticated `/api/qianfan-token-plan` route.
 *
 * Secrets never leave this process: the console Cookie stays in memory / the
 * credential store, and the `apiKey` field that `/resource` also reports for
 * every plan item is dropped by the field whitelist below.
 */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const API_BASE = 'https://console.bce.baidu.com/api/qianfan/charge/tokenPlanPersonal';
const CONSOLE_REFERER = 'https://console.bce.baidu.com/qianfan/resource/token-plan';
const CONSOLE_URL = 'https://console.bce.baidu.com/qianfan/resource/token-plan';

const DEFAULT_REF = 'BAIDU_QIANFAN_CONSOLE_COOKIE';
const DEFAULT_COOKIE_FILE = '~/.config/openchamber-qianfan-token-plan/config.json';
const DEFAULT_PROVIDER = 'baidu-qianfan-token-plan';

const CACHE_MS = 60_000;
const REQUEST_TIMEOUT_MS = 20_000;
const TREND_HOURS = 24;
const TREND_DAYS = 30;
const DETAIL_SAMPLE_SIZE = 200; // window aggregated for the panel
const DETAIL_RETURN = 50; // detail rows included in one aggregate payload
const MAX_POST_BYTES = 64 * 1024;
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

/** Order the plugin after the services it needs. */
export const inject = ['connection', 'credentials'];

/**
 * Standard Schema v1 config validation (the package is dependency-free, so the
 * shape is checked here instead of pulling in a schema library). Unknown keys
 * are dropped; every value has a documented default.
 */
export const Config = {
  vendor: 'dsh-qianfan-token-plan',
  version: 1,
  '~standard': {
    validate(value) {
      const input = value && typeof value === 'object' ? value : {};
      const out = {};
      const issues = [];
      const strings = ['cookieRef', 'cookieFile', 'providerName', 'consoleUrl'];
      for (const key of strings) {
        if (input[key] === undefined || input[key] === null) continue;
        if (typeof input[key] !== 'string' || input[key].trim() === '') {
          issues.push({ message: `${key} must be a non-empty string`, path: [key] });
        } else {
          out[key] = input[key].trim();
        }
      }
      if (input.pollIntervalSec !== undefined && input.pollIntervalSec !== null) {
        const seconds = Number(input.pollIntervalSec);
        if (!Number.isFinite(seconds) || seconds < 15) {
          issues.push({ message: 'pollIntervalSec must be a number of at least 15', path: ['pollIntervalSec'] });
        } else {
          out.pollIntervalSec = seconds;
        }
      }
      if (issues.length > 0) return { issues };
      return { value: out };
    },
  },
};

function normalizeConfig(config) {
  const raw = config && typeof config === 'object' ? config : {};
  return {
    cookieRef: typeof raw.cookieRef === 'string' && raw.cookieRef.trim() ? raw.cookieRef.trim() : DEFAULT_REF,
    cookieFile: typeof raw.cookieFile === 'string' && raw.cookieFile.trim() ? raw.cookieFile.trim() : DEFAULT_COOKIE_FILE,
    providerName: typeof raw.providerName === 'string' && raw.providerName.trim() ? raw.providerName.trim() : DEFAULT_PROVIDER,
    consoleUrl: typeof raw.consoleUrl === 'string' && raw.consoleUrl.trim() ? raw.consoleUrl.trim() : CONSOLE_URL,
    pollIntervalSec:
      Number.isFinite(Number(raw.pollIntervalSec)) && Number(raw.pollIntervalSec) >= 15
        ? Number(raw.pollIntervalSec)
        : 60,
    cacheMs: CACHE_MS,
  };
}

// ---------------------------------------------------------------------------
// formatting helpers (all wall-clock values are Asia/Shanghai)
// ---------------------------------------------------------------------------

const SHANGHAI = 'Asia/Shanghai';

const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const pad = (value, length = 2) => String(value).padStart(length, '0');

/** `YYYY-MM-DD` in Asia/Shanghai. */
const shanghaiDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

/** `YYYY-MM-DD` for an ISO instant, or null. */
const shanghaiDateOf = (iso) => {
  if (typeof iso !== 'string' || iso === '') return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return shanghaiDate(date);
};

/** `YYYY-MM-DDTHH` slot key in Asia/Shanghai. */
const shanghaiHourSlot = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  // en-CA renders "2026-11-02, 20" on this ICU build; normalize separators.
  const digits = parts.match(/\d+/g) || [];
  if (digits.length < 4) return shanghaiDate(date) + 'T00';
  const [year, month, day, hour] = digits;
  return `${year}-${month}-${day}T${pad(Number(hour))}`;
};

/** `YYYY-MM-DD` slot key for a day-granularity slot. */
const shanghaiDaySlot = (date) => shanghaiDate(date);

const daysUntil = (iso) => {
  if (typeof iso !== 'string' || iso === '') return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
};

// ---------------------------------------------------------------------------
// console access
// ---------------------------------------------------------------------------

class ExpiredError extends Error {}

function fail(message) {
  return new Error(`qianfan-token-plan: ${message}`);
}

/** Short, secret-free description of a thrown error. */
function describeError(error) {
  if (error instanceof ExpiredError) return 'console session expired';
  const message = error && typeof error.message === 'string' ? error.message : String(error || 'request failed');
  return message.length > 200 ? `${message.slice(0, 200)}…` : message;
}

async function consoleGet(cookie, pathname) {
  let response;
  try {
    response = await fetch(`${API_BASE}${pathname}`, {
      method: 'GET',
      headers: {
        Cookie: cookie,
        Accept: 'application/json;charset=UTF-8',
        Referer: CONSOLE_REFERER,
        'x-requested-with': 'XMLHttpRequest',
        oversea: 'false',
        'User-Agent': USER_AGENT,
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw fail(`console request failed: ${describeError(error)}`);
  }

  // The console answers 302 to the passport login once the session is gone.
  if ([301, 302, 303, 307, 308, 401, 403].includes(response.status)) {
    throw new ExpiredError('console session expired');
  }
  if (!response.ok) throw fail(`console answered HTTP ${response.status}`);

  const payload = await response.json().catch(() => null);
  if (!payload || payload.success !== true) {
    const message = typeof payload?.message === 'string' ? payload.message : 'console returned an error';
    throw fail(message.slice(0, 120));
  }
  return payload.result;
}

const CREDIT_UNIT = '积分';
const TOKEN_UNIT = 'Token';

/**
 * Pick the plan item that is both running and latest-expiring, then whitelist
 * only the quota fields. `items[]` also carries a per-plan `apiKey`
 * (`bce-v3/...`) which must never leave this process.
 */
async function fetchPlan(cookie) {
  const result = await consoleGet(cookie, '/resource');
  const items = Array.isArray(result?.items) ? result.items : [];
  if (items.length === 0) throw fail('this account has no Token Plan subscription');

  const running = items.filter((item) => item?.resourceStatus === 'Running');
  const chosen = (running.length > 0 ? running : items)
    .slice()
    .sort((a, b) => String(b?.expiresAt ?? '').localeCompare(String(a?.expiresAt ?? '')))[0];

  const creditMode = chosen?.billingMode === 'credit';
  const total = toNumber(creditMode ? chosen?.totalCredits : chosen?.totalTokens);
  const used = toNumber(creditMode ? chosen?.usedCredits : chosen?.usedTokens);
  if (total === null || used === null || total <= 0) throw fail('the console did not report a quota');

  const expiresAt = typeof chosen?.expiresAt === 'string' ? chosen.expiresAt : null;
  return {
    total,
    used: Math.min(used, total),
    unit: creditMode ? CREDIT_UNIT : TOKEN_UNIT,
    expiresAt,
    expiresAtText: shanghaiDateOf(expiresAt),
    daysLeft: daysUntil(expiresAt),
    planType: typeof chosen?.planType === 'string' ? chosen.planType : null,
    status: typeof chosen?.resourceStatus === 'string' ? chosen.resourceStatus : null,
  };
}

/** Trend/detail queries. Best-effort: the quota above is the headline. */
/** One `/usage/detail` row reduced to the whitelisted numeric fields. */
function mapDetailItem(item) {
  return {
    time: typeof item?.time === 'string' ? item.time : null,
    model: typeof item?.model === 'string' ? item.model : '',
    inputTokens: toNumber(item?.inputTokens) ?? 0,
    outputTokens: toNumber(item?.outputTokens) ?? 0,
    cachedTokens: toNumber(item?.cachedTokens) ?? 0,
    credits: toNumber(item?.credits) ?? 0,
    totalTokens: toNumber(item?.totalTokens) ?? 0,
  };
}

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Quota stays the headline; everything here is best-effort. Besides the two
 * trend series this derives the dimensions the panel shows: today / 24h / 7d /
 * 30d windows, the token split (input, cache, output) and cache share from the
 * recent-call sample, per-model shares, and a 7-day burn-rate projection.
 */
async function fetchUsage(cookie) {
  const end = new Date();
  const hourlyStart = new Date(end.getTime() - TREND_HOURS * 3_600_000);
  const dailyStart = new Date(end.getTime() - TREND_DAYS * 86_400_000);
  const hourlyQuery = new URLSearchParams({
    granularity: 'hour',
    startTime: hourlyStart.toISOString(),
    endTime: end.toISOString(),
  });
  const dailyQuery = new URLSearchParams({
    granularity: 'day',
    startTime: dailyStart.toISOString(),
    endTime: end.toISOString(),
  });

  const [hourlyTrend, dailyTrend, detail] = await Promise.all([
    consoleGet(cookie, `/usage/trend?${hourlyQuery}`),
    consoleGet(cookie, `/usage/trend?${dailyQuery}`),
    consoleGet(cookie, `/usage/detail?page=1&pageSize=${DETAIL_SAMPLE_SIZE}`),
  ]);

  const pointsOf = (trend) =>
    (Array.isArray(trend?.items) ? trend.items : [])
      .map((item) => ({
        time: typeof item?.time === 'string' ? item.time : null,
        credits: toNumber(item?.credits) ?? 0,
        totalTokens: toNumber(item?.totalTokens) ?? 0,
      }))
      .filter((point) => point.time !== null);

  // The console only returns the slots that spent something; a steady axis makes
  // a quiet stretch visible as quiet.
  const build = (raw, count, stepMs, keyLength, keyOf, suffix) => {
    const byKey = new Map();
    for (const point of raw) byKey.set(point.time.slice(0, keyLength), point);
    const slots = [];
    for (let index = count - 1; index >= 0; index -= 1) {
      const key = keyOf(new Date(end.getTime() - index * stepMs));
      const point = byKey.get(key.slice(0, keyLength));
      slots.push({ time: `${key}${suffix}`, credits: point?.credits ?? 0, totalTokens: point?.totalTokens ?? 0 });
    }
    return slots;
  };

  const hourly = build(
    pointsOf(hourlyTrend),
    TREND_HOURS,
    3_600_000,
    13,
    (date) => shanghaiHourSlot(date),
    ':00:00+08:00',
  );
  const daily = build(pointsOf(dailyTrend), TREND_DAYS, 86_400_000, 10, shanghaiDaySlot, 'T00:00:00+08:00');

  const sum = (list, key) => list.reduce((total, item) => total + (Number(item[key]) || 0), 0);
  const detailItems = (Array.isArray(detail?.items) ? detail.items : []).map(mapDetailItem);
  const detailTotal = toNumber(detail?.total) ?? null;

  // Token split and cache share come from the recent-call sample, not from the
  // (token-only) trend endpoint, so they are labelled as a sample in the panel.
  const tokens = {
    input: sum(detailItems, 'inputTokens'),
    cached: sum(detailItems, 'cachedTokens'),
    output: sum(detailItems, 'outputTokens'),
    total: sum(detailItems, 'totalTokens'),
  };
  const sampleCredits = sum(detailItems, 'credits');
  // The console reports cached tokens as part of the input: total = input + output.
  // So the meaningful cache ratio is cached / input, not cached / (input + cached).
  const cacheShare = tokens.input > 0 ? round2((tokens.cached / tokens.input) * 100) : null;

  const modelTotals = new Map();
  for (const item of detailItems) {
    const name = item.model !== '' ? item.model : 'unknown';
    const entry =
      modelTotals.get(name) ??
      { model: name, credits: 0, requests: 0, tokens: 0, inputTokens: 0, cachedTokens: 0, outputTokens: 0 };
    entry.credits += item.credits;
    entry.requests += 1;
    entry.tokens += item.totalTokens;
    entry.inputTokens += item.inputTokens;
    entry.cachedTokens += item.cachedTokens;
    entry.outputTokens += item.outputTokens;
    modelTotals.set(name, entry);
  }
  const models = [...modelTotals.values()]
    .sort((a, b) => b.credits - a.credits)
    .slice(0, 8)
    .map((entry) => ({
      ...entry,
      credits: round2(entry.credits),
      share: sampleCredits > 0 ? round2((entry.credits / sampleCredits) * 100) : 0,
    }));

  const today = shanghaiDate();
  const todaySlots = hourly.filter((slot) => slot.time.slice(0, 10) === today);
  const creditMode = hourlyTrend?.billingMode === 'credit';

  const windows = {
    last7: { credits: sum(daily.slice(-7), 'credits'), tokens: sum(daily.slice(-7), 'totalTokens') },
    last30: { credits: sum(daily, 'credits'), tokens: sum(daily, 'totalTokens') },
  };

  // Burn rate from the last seven *complete* days (today is partial). The
  // console only fills slots that exist, so start counting at the earliest day
  // that actually spent something — a fresh plan should not be diluted by the
  // empty days before it.
  const completeDays = daily.filter((slot) => slot.time.slice(0, 10) < today).slice(-7);
  let firstActive = -1;
  for (let index = 0; index < completeDays.length; index += 1) {
    if ((Number(completeDays[index].credits) || 0) > 0) {
      firstActive = index;
      break;
    }
  }
  const activeDays = firstActive >= 0 ? completeDays.slice(firstActive) : [];
  const avgDailyCredits = activeDays.length
    ? round2(sum(activeDays, 'credits') / activeDays.length)
    : null;

  return {
    unit: creditMode ? CREDIT_UNIT : TOKEN_UNIT,
    today: { date: today, credits: round2(sum(todaySlots, 'credits')), tokens: sum(todaySlots, 'totalTokens') },
    last24h: { credits: round2(sum(hourly, 'credits')), tokens: sum(hourly, 'totalTokens') },
    windows,
    hourly,
    daily,
    models,
    tokens,
    cacheShare,
    sample: { requests: detailItems.length, credits: round2(sampleCredits) },
    avg: {
      creditsPerRequest: detailItems.length ? round2(sampleCredits / detailItems.length) : null,
      tokensPerRequest: detailItems.length ? Math.round(tokens.total / detailItems.length) : null,
    },
    projection: { avgDailyCredits, daysLeftAtAvg: null, exhaustDate: null },
    detail: detailItems.slice(0, DETAIL_RETURN),
    detailTotal,
  };
}

/** One page of recent calls for the panel's detail list / "load more". */
async function loadDetail(ctx, cfg, { page = 1, pageSize = DETAIL_RETURN } = {}) {
  const resolved = await resolveCookie(ctx, cfg);
  if (resolved === null) return { state: 'unconfigured', page, pageSize, total: null, items: [] };
  try {
    const result = await consoleGet(resolved.cookie, `/usage/detail?page=${page}&pageSize=${pageSize}`);
    return {
      state: 'ok',
      unit: result?.billingMode === 'credit' ? CREDIT_UNIT : TOKEN_UNIT,
      page,
      pageSize,
      total: toNumber(result?.total) ?? null,
      items: (Array.isArray(result?.items) ? result.items : []).map(mapDetailItem),
    };
  } catch (error) {
    if (error instanceof ExpiredError) return { state: 'expired', page, pageSize, total: null, items: [] };
    return { state: 'error', message: describeError(error), page, pageSize, total: null, items: [] };
  }
}

// ---------------------------------------------------------------------------
// credential resolution (DSH credential store first, then the OpenChamber file)
// ---------------------------------------------------------------------------

function expandHome(target) {
  if (target === '~') return os.homedir();
  if (target.startsWith('~/')) return path.join(os.homedir(), target.slice(2));
  return target;
}

async function readCookieFile(configuredPath) {
  const file = expandHome(configuredPath);
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    const cookie = typeof parsed?.cookie === 'string' ? parsed.cookie.trim() : '';
    return cookie !== '' ? cookie : null;
  } catch {
    return null;
  }
}

/**
 * Cookie resolution order:
 *  1. DSH credential `cookieRef` (the credential service itself falls back to
 *     the environment variable of the same name),
 *  2. the read-only `cookieFile` (defaults to the OpenChamber extension config,
 *     so an existing setup keeps working with zero migration).
 * @returns {Promise<{ cookie: string, source: string } | null>}
 */
async function resolveCookie(ctx, cfg) {
  const credentials = ctx.get('credentials');
  if (credentials && typeof credentials.resolve === 'function') {
    try {
      const resolved = await credentials.resolve(cfg.cookieRef);
      const value = typeof resolved?.value === 'string' ? resolved.value.trim() : '';
      if (value !== '') return { cookie: value, source: resolved.source || 'credential' };
    } catch {
      /* fall through to the file */
    }
  }
  const fromFile = await readCookieFile(cfg.cookieFile);
  if (fromFile !== null) return { cookie: fromFile, source: 'file' };
  return null;
}

/** Masked hint for the panel. Never the value: only a count and a presence bit. */
function maskCookie(cookie) {
  const count = cookie
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part !== '').length;
  const hasBduss = /(?:^|;\s*)BDUSS=/.test(cookie) || cookie.includes('BDUSS=');
  return `${count} cookies · BDUSS ${hasBduss ? '已包含' : '缺失'}`;
}

/**
 * The credential view the panel is allowed to show: configured / source /
 * writable, plus a masked hint. The value itself is never part of it.
 */
async function describeCredential(ctx, cfg, resolved) {
  const credentials = ctx.get('credentials');
  let info = { configured: false, writable: false, source: undefined };
  if (credentials && typeof credentials.describe === 'function') {
    try {
      const described = await credentials.describe(cfg.cookieRef);
      info = {
        configured: described?.configured === true,
        source: typeof described?.source === 'string' ? described.source : undefined,
        writable: described?.writable !== false,
      };
    } catch {
      /* fall back to what resolution found */
    }
  }
  const effective = resolved ?? (await resolveCookie(ctx, cfg));
  return {
    configured: effective !== null,
    source: effective?.source ?? (info.configured ? info.source : 'none'),
    writable: info.writable !== false,
    masked: effective ? maskCookie(effective.cookie) : null,
  };
}

// ---------------------------------------------------------------------------
// aggregated, cached read
// ---------------------------------------------------------------------------

function createReader() {
  const cache = { at: 0, value: null };
  let inflight = null;

  return {
    get cacheAgeMs() {
      return cache.value === null ? null : Date.now() - cache.at;
    },
    invalidate() {
      cache.at = 0;
      cache.value = null;
    },
    async load(ctx, cfg, { force = false } = {}) {
      const resolved = await resolveCookie(ctx, cfg);
      if (resolved === null) {
        cache.at = 0;
        cache.value = null;
        return { state: 'unconfigured' };
      }
      const fresh = cache.value !== null && Date.now() - cache.at < cfg.cacheMs;
      if (fresh && !force) return cache.value;

      if (inflight === null) {
        inflight = (async () => {
          try {
            const plan = await fetchPlan(resolved.cookie);
            let usage = null;
            try {
              usage = await fetchUsage(resolved.cookie);
            } catch (error) {
              // The quota is the headline; usage statistics are best-effort.
              if (error instanceof ExpiredError) throw error;
            }
            if (usage && plan) {
              const avg = usage.projection?.avgDailyCredits;
              if (Number.isFinite(avg) && avg > 0) {
                const remainingCredits = Math.max(0, plan.total - plan.used);
                const days = remainingCredits / avg;
                usage.projection.daysLeftAtAvg = Math.round(days * 10) / 10;
                usage.projection.exhaustDate = shanghaiDate(new Date(Date.now() + days * 86_400_000));
              }
            }
            const value = { state: 'ok', plan, usage };
            cache.at = Date.now();
            cache.value = value;
            return value;
          } catch (error) {
            cache.at = 0;
            cache.value = null;
            if (error instanceof ExpiredError) return { state: 'expired' };
            return { state: 'error', message: describeError(error) };
          } finally {
            inflight = null;
          }
        })();
      }
      return inflight;
    },
  };
}

// ---------------------------------------------------------------------------
// HTTP route
// ---------------------------------------------------------------------------

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

const PUBLIC_CLIENT_CONFIG_KEYS = ['providerName', 'pollIntervalSec', 'consoleUrl'];

function clientConfig(cfg) {
  return {
    providerName: cfg.providerName,
    pollIntervalSec: cfg.pollIntervalSec,
    consoleUrl: cfg.consoleUrl,
  };
}

async function handleGet(ctx, cfg, reader, request) {
  const url = new URL(request.url);
  // On-demand paging for the detail list; the aggregate below only carries the
  // first page so a poll stays small.
  if (url.searchParams.get('detail') === '1') {
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const pageSize = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get('pageSize') ?? '50', 10) || 50));
    return json(await loadDetail(ctx, cfg, { page, pageSize }));
  }
  const force = url.searchParams.get('force') === '1';
  const [payload, credential] = await Promise.all([reader.load(ctx, cfg, { force }), describeCredential(ctx, cfg)]);
  const body = {
    ...payload,
    credential,
    client: clientConfig(cfg),
    fetchedAt: Date.now(),
    cacheAgeMs: force ? 0 : reader.cacheAgeMs,
  };
  if (payload.state === 'ok' && payload.plan) {
    // Keep the unit honest even when the usage half failed.
    body.plan = { ...payload.plan, unit: payload.plan.unit || CREDIT_UNIT };
  }
  return json(body);
}

async function handlePost(ctx, cfg, reader, request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(length) && length > MAX_POST_BYTES) {
    return json({ ok: false, error: 'request body too large' }, 413);
  }
  let parsed = null;
  try {
    parsed = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid JSON body' }, 400);
  }
  const cookie = typeof parsed?.cookie === 'string' ? parsed.cookie.trim() : '';
  if (cookie.length < 20 || /[\r\n]/.test(cookie)) {
    return json({ ok: false, error: 'cookie looks invalid' }, 400);
  }

  const credentials = ctx.get('credentials');
  if (!credentials || typeof credentials.set !== 'function') {
    return json({ ok: false, error: 'credential store is unavailable' }, 503);
  }
  try {
    await credentials.set(cfg.cookieRef, cookie);
  } catch (error) {
    return json({ ok: false, error: describeError(error) }, 500);
  }

  reader.invalidate();
  const state = await reader.load(ctx, cfg, { force: true });
  const credential = await describeCredential(ctx, cfg, { cookie, source: 'credential' });
  // Status only: never echo the value back to the browser.
  return json({
    ok: true,
    state: state.state,
    message: state.state === 'error' ? state.message : undefined,
    credential,
  });
}

async function handle(ctx, cfg, reader, request) {
  const method = request.method.toUpperCase();
  if (method === 'POST') return handlePost(ctx, cfg, reader, request);
  if (method === 'GET' || method === 'HEAD') return handleGet(ctx, cfg, reader, request);
  return json({ ok: false, error: 'method not allowed' }, 405);
}

// ---------------------------------------------------------------------------
// boot config for the Client half
// ---------------------------------------------------------------------------

/**
 * The Client half has no config service of its own; it learns the route name
 * through this additive index injection. Only non-secret config is published.
 */
function injectBootConfig(html, cfg) {
  const boot = JSON.stringify(clientConfig(cfg)).replace(/<\/script/gi, '<\\/script');
  const script = `<script>window.__QIANFAN_TOKEN_PLAN_BOOT__=${boot};</script>`;
  if (html.includes('</head>')) return html.replace('</head>', `${script}</head>`);
  return `${script}${html}`;
}

// ---------------------------------------------------------------------------
// plugin entry
// ---------------------------------------------------------------------------

export function apply(ctx, config) {
  const cfg = normalizeConfig(config);
  const connection = ctx.get('connection');
  if (!connection?.fetch || typeof connection.fetch.register !== 'function') {
    throw fail('connection service is unavailable; cannot serve /api/qianfan-token-plan');
  }
  const reader = createReader();

  ctx.effect(
    () =>
      connection.fetch.register({
        path: '/api/qianfan-token-plan',
        methods: ['GET', 'POST'],
        requestBody: 'buffered',
        fetch: (request) => handle(ctx, cfg, reader, request),
      }),
    'qianfan-token-plan: console route',
  );

  const webServer = ctx.get('webServer');
  if (webServer && typeof webServer.tapIndex === 'function') {
    try {
      ctx.effect(
        () => webServer.tapIndex((html) => injectBootConfig(String(html), cfg)),
        'qianfan-token-plan: boot config',
      );
    } catch {
      /* the Client half keeps its built-in default when the tap is unavailable */
    }
  }

  return () => {
    reader.invalidate();
  };
}