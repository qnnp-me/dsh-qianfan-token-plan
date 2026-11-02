// Client half of `dsh-qianfan-token-plan`.
//
// Registers one entry in `conversation.composer.dock` — the ambient row below
// the composer card that already carries the session statistics. The entry is
// only rendered, and only polls, while the session's model selection routes
// through `config.providerName` (default `baidu-qianfan-token-plan`). The pill
// shows the plan's credit percentage, remaining balance and today's spend;
// clicking it opens the detail panel.
//
// The route name reaches this half through `window.__QIANFAN_TOKEN_PLAN_BOOT__`
// (an additive index injection written by the Host half); the built-in default
// keeps the pill working if that injection is unavailable.
window.__ModuleLoader__.load({
  id: 'dsh-qianfan-token-plan',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'qianfan-token-plan';
    const BOOT = (typeof window !== 'undefined' && window.__QIANFAN_TOKEN_PLAN_BOOT__) || {};
    const CONFIG = {
      providerName:
        typeof BOOT.providerName === 'string' && BOOT.providerName.trim() !== ''
          ? BOOT.providerName.trim()
          : 'baidu-qianfan-token-plan',
      pollIntervalSec: Number(BOOT.pollIntervalSec) >= 15 ? Number(BOOT.pollIntervalSec) : 60,
      consoleUrl:
        typeof BOOT.consoleUrl === 'string' && BOOT.consoleUrl.trim() !== ''
          ? BOOT.consoleUrl.trim()
          : 'https://console.bce.baidu.com/qianfan/resource/token-plan',
    };

    const IDLE_AFTER_MS = 5 * 60_000; // no key/pointer/wheel activity → idle
    const IDLE_POLL_MS = 5 * 60_000; // idle re-poll cadence
    const ROUTE = '/api/qianfan-token-plan';
    const PANEL_WIDTH = 400;
    const PANEL_MAX_HEIGHT = 520; // cap the popover so it never becomes a full-page column
    const PLAN_TYPES = { mini: 'Mini', lite: 'Lite', pro: 'Pro', max: 'Max' };

    const DICTS = {
      zh: {
        brand: '千帆',
        title: '千帆 Token Plan 套餐用量',
        planTitle: '套餐额度',
        used: '已用',
        total: '总额',
        remaining: '剩余',
        today: '今日',
        todayShort: '今日',
        remainingShort: '剩',
        range24: '近 24 小时',
        range7: '近 7 天',
        range30: '近 30 天',
        rangeTotal: '区间合计',
        peak: '峰值',
        last7: '近 7 天',
        last30: '近 30 天',
        sampleNote: '最近 200 次调用',
        cacheShare: '缓存占比',
        inputTokens: '输入',
        cachedTokens: '缓存',
        outputTokens: '输出',
        totalTokensLabel: '合计',
        detailTitle: '最近调用',
        detailShowAll: '展开全部',
        detailCollapse: '收起',
        detailEmpty: '暂无调用明细',
        loadMore: '加载更多',
        loadingMore: '加载中…',
        sampleN: '最近 {n} 次调用',
        tokenComposition: 'Token 构成',
        cacheWithinInput: '含缓存 {p}',
        inputPlusOutput: '输入 + 输出',
        cacheSubsetNote: '缓存 {n} 计入输入，不计入合计',
        needRestart: '详情分页需要重启 dsh-web 后生效',
        avgDaily: '日均（7 天）',
        projected: '预计可用',
        projectedExhaust: '预计 {date} 耗尽',
        coveredToExpiry: '按当前日均，额度可用至套餐到期',
        noProjection: '暂无法估算',
        calls: '次调用',
        modelsSample: '按模型（最近 200 次调用）',
        last24h: '近 24 小时',
        tokens: 'Token',
        requests: '次调用',
        requestsTotal: '累计调用',
        expiry: '到期',
        days: '天',
        creditsUnit: '积分',
        tokenUnit: 'Token',
        console: '打开控制台',
        refresh: '刷新',
        loading: '读取中…',
        unconfigured: '未配置控制台 Cookie',
        unconfiguredShort: '未配置',
        expired: '控制台登录态已过期',
        expiredShort: '登录过期',
        error: '读取失败',
        errorShort: '读取失败',
        loadingShort: '读取中…',
        retry: '重试',
        models: '按模型（最近调用）',
        byModel: '按模型',
        noModels: '暂无调用明细',
        noUsage: '用量统计暂不可用',
        cookieLabel: '粘贴千帆控制台 Cookie',
        cookieHint: '在已登录的 console.bce.baidu.com 页面复制 Cookie（含 BDUSS）。Cookie 只保存在 DSH 凭据库，不会回显。',
        save: '保存并校验',
        saving: '校验中…',
        saved: '已配置',
        sourceLabel: '来源',
        writableLabel: '可写',
        yes: '是',
        no: '否',
        invalid: 'Cookie 看起来无效',
        failed: '保存失败',
        planTypes: { mini: 'Mini', lite: 'Lite', pro: 'Pro', max: 'Max' },
        updated: '更新于',
        planText: '{plan} 套餐',
        daysLeft: '还剩 {n} 天',
        sparkTitle: '近 24 小时积分消耗',
        thresholdNote: '用量超过 70% 变黄、超过 90% 变红',
      },
      en: {
        brand: 'Qianfan',
        title: 'Qianfan Token Plan usage',
        planTitle: 'Plan quota',
        used: 'Used',
        total: 'Total',
        remaining: 'Left',
        today: 'Today',
        todayShort: 'Today',
        remainingShort: 'Left',
        range24: 'Last 24h',
        range7: 'Last 7d',
        range30: 'Last 30d',
        rangeTotal: 'Total',
        peak: 'Peak',
        last7: 'Last 7 days',
        last30: 'Last 30 days',
        sampleNote: 'last 200 calls',
        cacheShare: 'Cache share',
        inputTokens: 'Input',
        cachedTokens: 'Cache',
        outputTokens: 'Output',
        totalTokensLabel: 'Total',
        detailTitle: 'Recent calls',
        detailShowAll: 'Show all',
        detailCollapse: 'Collapse',
        detailEmpty: 'No calls recorded',
        loadMore: 'Load more',
        loadingMore: 'Loading…',
        sampleN: 'last {n} calls',
        tokenComposition: 'Token mix',
        cacheWithinInput: 'cache {p}',
        inputPlusOutput: 'input + output',
        cacheSubsetNote: 'Cache {n} is part of input, not added to the total',
        needRestart: 'Detail paging needs a dsh-web restart',
        avgDaily: 'Daily avg (7d)',
        projected: 'Lasts about',
        projectedExhaust: 'runs out around {date}',
        coveredToExpiry: 'At this rate the quota lasts through expiry',
        noProjection: 'Not enough history',
        calls: 'calls',
        modelsSample: 'By model (last 200 calls)',
        last24h: 'Last 24h',
        tokens: 'tokens',
        requests: 'calls',
        requestsTotal: 'Calls',
        expiry: 'Expires',
        days: 'd',
        creditsUnit: 'credits',
        tokenUnit: 'tokens',
        console: 'Open console',
        refresh: 'Refresh',
        loading: 'Loading…',
        unconfigured: 'Console cookie not configured',
        unconfiguredShort: 'No cookie',
        expired: 'Console session expired',
        expiredShort: 'Expired',
        error: 'Usage unavailable',
        errorShort: 'Unavailable',
        loadingShort: 'Loading…',
        retry: 'Retry',
        models: 'By model (recent calls)',
        byModel: 'By model',
        noModels: 'No calls recorded',
        noUsage: 'Usage statistics unavailable',
        cookieLabel: 'Paste the Qianfan console cookie',
        cookieHint: 'Copy the cookie (including BDUSS) from a signed-in console.bce.baidu.com tab. It is stored only in the DSH credential store and never echoed.',
        save: 'Save and verify',
        saving: 'Verifying…',
        saved: 'Configured',
        sourceLabel: 'Source',
        writableLabel: 'Writable',
        yes: 'yes',
        no: 'no',
        invalid: 'That cookie looks invalid',
        failed: 'Save failed',
        planTypes: { mini: 'Mini', lite: 'Lite', pro: 'Pro', max: 'Max' },
        updated: 'Updated',
        planText: '{plan} plan',
        daysLeft: '{n} days left',
        sparkTitle: 'Credits used (last 24h)',
        thresholdNote: 'Turns amber above 70% and red above 90%',
      },
    };

    const CSS = [
      '.qfqp-root{box-sizing:border-box;min-width:0;max-width:100%;position:relative;display:inline-flex;order:2}',
      '.qfqp-pill{box-sizing:border-box;min-width:0;max-width:100%;overflow:hidden;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));font-variant-numeric:tabular-nums;white-space:nowrap;background:0 0;border:none;border-radius:999px;align-items:center;gap:6px;padding:1px 8px;display:inline-flex;cursor:pointer}',
      '.qfqp-pill:hover,.qfqp-pill[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '.qfqp-pill:focus-visible{outline:1.5px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
      '.qfqp-pill svg{flex:none;width:14px;height:14px}',
      '.qfqp-mark{display:inline-flex;align-items:center;color:var(--dsw-alias-brand-primary)}',
      '.qfqp-mark svg{display:block}',
      '.qfqp-pct{color:var(--qfqp-state,var(--dsw-alias-label-secondary));font-weight:600}',
      '.qfqp-sep{color:var(--dsw-alias-label-tertiary);opacity:.7}',
      '.qfqp-tone{color:var(--dsw-alias-state-warn-primary)}',
      '.qfqp-bad{color:var(--dsw-alias-state-error-primary)}',
      '.qfqp-panel{position:fixed;z-index:30;width:' + PANEL_WIDTH + 'px;max-width:calc(100vw - 24px);box-sizing:border-box;overflow-y:auto;overscroll-behavior:contain;background:var(--dsw-alias-bg-overlay);border:0.5px solid var(--dsw-alias-border-l1);border-radius:14px;box-shadow:0 4px 16px rgba(0,0,0,.10),0 12px 40px rgba(0,0,0,.12);padding:14px;display:flex;flex-direction:column;gap:12px;text-align:left;white-space:normal;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.qfqp-head{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-primary);font-size:12.5px;font-weight:600}',
      '.qfqp-head-mark{display:inline-flex;color:var(--dsw-alias-brand-primary)}',
      '.qfqp-head-mark svg{width:15px;height:15px;display:block}',
      '.qfqp-spacer{flex:1}',
      '.qfqp-iconbtn{border:none;background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:3px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}',
      '.qfqp-iconbtn:hover{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}',
      '.qfqp-iconbtn svg{width:13px;height:13px;display:block}',
      '.qfqp-block{display:flex;flex-direction:column;gap:7px}',
      '.qfqp-label{font-size:11px;color:var(--dsw-alias-label-tertiary)}',
      '.qfqp-row{display:flex;align-items:baseline;gap:6px}',
      '.qfqp-row .qfqp-k{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.qfqp-row .qfqp-v{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}',
      '.qfqp-quota{display:flex;flex-direction:column;gap:6px;background:var(--dsw-alias-interactive-bg-hover);border-radius:10px;padding:10px}',
      '.qfqp-quota-top{display:flex;align-items:baseline;gap:7px}',
      '.qfqp-big{font-size:19px;line-height:1.1;font-weight:700;font-variant-numeric:tabular-nums;color:var(--qfqp-state,var(--dsw-alias-label-primary))}',
      '.qfqp-sub{font-size:10.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.qfqp-bar{height:6px;border-radius:999px;background:var(--dsw-alias-border-l1);overflow:hidden}',
      '.qfqp-bar-fill{height:100%;border-radius:999px;background:var(--qfqp-state,var(--dsw-alias-brand-primary));transition:width .2s ease}',
      '.qfqp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '.qfqp-card{background:var(--dsw-alias-bg-layer-2);border:0.5px solid var(--dsw-alias-border-l1);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:3px;min-width:0}',
      '.qfqp-card-k{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}',
      '.qfqp-card-v{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.qfqp-card-s{font-size:10px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.qfqp-chart{position:relative;display:flex;flex-direction:column;gap:4px}',
      '.qfqp-spark{position:relative;display:flex;align-items:flex-end;gap:1px;height:34px}',
      '.qfqp-spark span{flex:1;min-width:2px;border-radius:1px 1px 0 0;background:var(--dsw-alias-brand-primary);opacity:.85;cursor:pointer;outline:none}',
      '.qfqp-spark span:hover,.qfqp-spark span:focus-visible{opacity:1;background:var(--dsw-alias-state-warn-primary)}',
      '.qfqp-tip{position:absolute;top:0;transform:translateX(-50%);z-index:5;min-width:96px;max-width:calc(100% - 8px);background:var(--dsw-alias-bg-overlay);border:0.5px solid var(--dsw-alias-border-l1);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.14);padding:4px 7px;font-size:10px;line-height:1.4;color:var(--dsw-alias-label-primary);white-space:nowrap;pointer-events:none}',
      '.qfqp-tip-t{color:var(--dsw-alias-label-tertiary)}',
      '.qfqp-tip-v{font-weight:600;font-variant-numeric:tabular-nums}',
      '.qfqp-tip-s{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.qfqp-axis{display:flex;align-items:center;justify-content:space-between;font-size:9.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.qfqp-axis-peak{color:var(--dsw-alias-label-secondary)}',
      '.qfqp-chart-sum{font-size:10px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.qfqp-chart-sum-active{color:var(--dsw-alias-label-primary);font-weight:600}',
      '.qfqp-tabs{display:inline-flex;align-items:center;gap:4px;background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;padding:2px}',
      '.qfqp-tab{border:none;background:0 0;font:inherit;font-size:10px;color:var(--dsw-alias-label-secondary);padding:2px 8px;border-radius:999px;cursor:pointer}',
      '.qfqp-tab[aria-selected=true]{background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);font-weight:600}',
      '.qfqp-kv{display:flex;flex-direction:column;gap:3px}',
      '.qfqp-kv-row{display:flex;align-items:baseline;gap:8px;font-size:11px}',
      '.qfqp-kv-k{min-width:58px;color:var(--dsw-alias-label-tertiary)}',
      '.qfqp-kv-v{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}',
      '.qfqp-kv-s{margin-left:auto;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.qfqp-split{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}',
      '.qfqp-split-item{background:var(--dsw-alias-bg-layer-2);border:0.5px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.qfqp-split-k{font-size:9.5px;color:var(--dsw-alias-label-tertiary)}',
      '.qfqp-split-v{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.qfqp-split-s{font-size:9px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.qfqp-model-row{display:flex;flex-direction:column;gap:3px;padding:5px 0;border-bottom:0.5px solid var(--dsw-alias-border-l1)}',
      '.qfqp-model-row:last-child{border-bottom:none}',
      '.qfqp-model-top{display:flex;align-items:baseline;gap:8px;font-size:11px}',
      '.qfqp-model-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}',
      '.qfqp-model-credits{margin-left:auto;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.qfqp-share{height:4px;border-radius:999px;background:var(--dsw-alias-border-l1);overflow:hidden}',
      '.qfqp-share-fill{height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary);opacity:.75}',
      '.qfqp-model-meta{font-size:9.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;display:flex;gap:6px;flex-wrap:wrap}',
      '.qfqp-sec-head{display:flex;align-items:baseline;gap:8px}',
      '.qfqp-link{margin-left:auto;border:none;background:0 0;font:inherit;font-size:10px;color:var(--dsw-alias-brand-primary);cursor:pointer;padding:1px 2px;border-radius:4px}',
      '.qfqp-link:hover{text-decoration:underline}',
      '.qfqp-call{display:flex;flex-direction:column;gap:2px;padding:5px 0;border-bottom:0.5px solid var(--dsw-alias-border-l1)}',
      '.qfqp-call:last-child{border-bottom:none}',
      '.qfqp-call-top{display:flex;align-items:baseline;gap:6px;font-size:11px}',
      '.qfqp-call-time{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.qfqp-call-model{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}',
      '.qfqp-call-credits{margin-left:auto;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.qfqp-call-meta{font-size:9.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.qfqp-more{display:flex;align-items:center;gap:8px}',
      '.qfqp-err{font-size:10px;color:var(--dsw-alias-state-error-primary)}',
      '.qfqp-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px}',
      '.qfqp-list li{display:flex;align-items:baseline;gap:6px;font-size:11px}',
      '.qfqp-list .qfqp-model{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}',
      '.qfqp-list .qfqp-num{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}',
      '.qfqp-note{border-radius:10px;padding:9px 10px;font-size:11.5px;line-height:1.55;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '.qfqp-note-warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}',
      '.qfqp-note-bad{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.qfqp-form{display:flex;flex-direction:column;gap:6px}',
      '.qfqp-input{width:100%;box-sizing:border-box;border:0.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;padding:6px 8px;min-height:48px;resize:vertical}',
      '.qfqp-input:focus{outline:1.5px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.qfqp-hint{font-size:10.5px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}',
      '.qfqp-actions{display:flex;align-items:center;gap:8px}',
      '.qfqp-btn{border:none;border-radius:8px;padding:5px 12px;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-on-accent,#fff)}',
      '.qfqp-btn:disabled{opacity:.55;cursor:default}',
      '.qfqp-btn-ghost{background:0 0;color:var(--dsw-alias-label-secondary)}',
      '.qfqp-btn-ghost:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.qfqp-status{font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);margin-left:auto}',
      '.qfqp-foot{display:flex;align-items:center;gap:8px;border-top:0.5px solid var(--dsw-alias-border-l1);padding-top:10px;font-size:10.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.qfqp-foot .qfqp-spacer{flex:1}',
      '@media (prefers-reduced-motion:reduce){.qfqp-bar-fill{transition:none}}',
    ].join('');

    // ------------------------------------------------------------------
    // icons (original artwork)
    // ------------------------------------------------------------------
    const markIcon = (size) =>
      h(
        'svg',
        { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true, width: size, height: size },
        h('path', {
          d: 'M8 2.2 3.4 8.6h4.6V2.2Z',
          fill: 'currentColor',
          opacity: '0.55',
        }),
        h('path', {
          d: 'M8.9 5.2 12.6 8.6H8.9V5.2Z',
          fill: 'currentColor',
          opacity: '0.9',
        }),
        h('path', {
          d: 'M1.8 10.6c1.6 0 1.6 1.6 3.2 1.6s1.6-1.6 3.2-1.6 1.6 1.6 3.2 1.6 1.6-1.6 3.2-1.6',
          stroke: 'currentColor',
          strokeWidth: '1.5',
          strokeLinecap: 'round',
        }),
      );

    const refreshIcon = h(
      'svg',
      { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
      h('path', {
        d: 'M13.3 6.7A5.4 5.4 0 1 0 13.9 9.4',
        stroke: 'currentColor',
        strokeWidth: '1.6',
        strokeLinecap: 'round',
      }),
      h('path', {
        d: 'M13.5 2.5v4h-4',
        stroke: 'currentColor',
        strokeWidth: '1.6',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    );

    const externalIcon = h(
      'svg',
      { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
      h('path', {
        d: 'M6.5 3.5H4a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 4 13.5h7a1.5 1.5 0 0 0 1.5-1.5V9.5',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
      }),
      h('path', {
        d: 'M9.5 2.5h4v4M13.2 2.8 7.8 8.2',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    );

    // ------------------------------------------------------------------
    // formatting
    // ------------------------------------------------------------------
    const SHANGHAI = 'Asia/Shanghai';

    function fmtAmount(value, loc) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
      return new Intl.NumberFormat(loc === 'zh' ? 'zh-CN' : 'en-US', { maximumFractionDigits: digits }).format(value);
    }

    function fmtCompact(value, loc) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      const abs = Math.abs(value);
      if (loc === 'zh') {
        if (abs >= 1e8) return (value / 1e8).toFixed(2) + '亿';
        if (abs >= 1e4) return (value / 1e4).toFixed(1) + '万';
        if (abs >= 1000) return (value / 1e3).toFixed(1) + 'k';
        return abs >= 100 ? value.toFixed(0) : value.toFixed(1);
      }
      const trim = (text) => text.replace(/\.0(?=[A-Za-z])/, '');
      if (abs >= 1e9) return trim((value / 1e9).toFixed(1)) + 'B';
      if (abs >= 1e6) return trim((value / 1e6).toFixed(1)) + 'M';
      if (abs >= 1e3) return trim((value / 1e3).toFixed(1)) + 'k';
      return abs >= 100 ? value.toFixed(0) : value.toFixed(1);
    }

    function fmtPercent(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      return `${value < 1 ? value.toFixed(2) : value.toFixed(1)}%`;
    }

    function percentOf(plan) {
      const total = Number(plan?.total);
      const used = Number(plan?.used);
      if (!Number.isFinite(total) || !Number.isFinite(used) || total <= 0) return 0;
      return Math.min(100, Math.max(0, (used / total) * 100));
    }

    function stateColor(percent) {
      if (percent >= 90) return 'var(--dsw-alias-state-error-primary)';
      if (percent >= 70) return 'var(--dsw-alias-state-warn-primary)';
      return 'var(--dsw-alias-brand-primary)';
    }

    function fmtExpiry(plan, t, loc) {
      if (typeof plan?.expiresAtText === 'string' && plan.expiresAtText !== '') {
        const days = Number.isFinite(plan?.daysLeft) ? plan.daysLeft : null;
        if (days === null) return plan.expiresAtText;
        return loc === 'zh' ? `${plan.expiresAtText} · ${days} ${t('days')}` : `${plan.expiresAtText} · ${days} ${t('days')}`;
      }
      if (typeof plan?.expiresAt === 'string' && plan.expiresAt !== '') {
        const date = new Date(plan.expiresAt);
        if (!Number.isNaN(date.getTime())) {
          const text = new Intl.DateTimeFormat('en-CA', {
            timeZone: SHANGHAI,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(date);
          return text;
        }
      }
      return '—';
    }

    function fmtTime(iso, loc) {
      if (typeof iso !== 'string' || iso === '') return null;
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return null;
      return new Intl.DateTimeFormat(loc === 'zh' ? 'zh-CN' : 'en-US', {
        timeZone: SHANGHAI,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    }

    function fmtStamp(timestamp, loc) {
      if (!Number.isFinite(timestamp)) return null;
      return new Intl.DateTimeFormat(loc === 'zh' ? 'zh-CN' : 'en-US', {
        timeZone: SHANGHAI,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(timestamp));
    }

    // ------------------------------------------------------------------
    // data polling
    // ------------------------------------------------------------------
    function useQuota(enabled) {
      const [state, setState] = React.useState({ phase: 'idle', data: null, error: null });
      const seq = React.useRef(0);
      const mounted = React.useRef(true);
      const timer = React.useRef(0);
      const lastActivity = React.useRef(Date.now());

      React.useEffect(() => {
        mounted.current = true;
        return () => {
          mounted.current = false;
          if (timer.current) window.clearTimeout(timer.current);
        };
      }, []);

      const load = React.useCallback(async (force) => {
        const ticket = ++seq.current;
        try {
          const response = await fetch(ROUTE + (force ? '?force=1' : ''), {
            credentials: 'same-origin',
            headers: { accept: 'application/json' },
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          if (!mounted.current || ticket !== seq.current) return;
          setState({
            phase: typeof data?.state === 'string' ? data.state : 'error',
            data,
            error: typeof data?.message === 'string' ? data.message : null,
          });
        } catch (error) {
          if (!mounted.current || ticket !== seq.current) return;
          setState((previous) => ({
            ...previous,
            phase: 'error',
            error: error && error.message ? String(error.message) : String(error),
          }));
        }
      }, []);

      React.useEffect(() => {
        if (!enabled) {
          seq.current += 1;
          if (timer.current) window.clearTimeout(timer.current);
          setState({ phase: 'idle', data: null, error: null });
          return undefined;
        }

        let disposed = false;
        const markActivity = () => {
          lastActivity.current = Date.now();
        };
        const activityEvents = ['keydown', 'pointerdown', 'wheel', 'touchstart'];
        for (const name of activityEvents) {
          window.addEventListener(name, markActivity, { passive: true, capture: true });
        }

        const clearTimer = () => {
          if (timer.current) {
            window.clearTimeout(timer.current);
            timer.current = 0;
          }
        };

        const schedule = () => {
          clearTimer();
          if (disposed || document.visibilityState === 'hidden') return;
          const idle = Date.now() - lastActivity.current >= IDLE_AFTER_MS;
          const delay = idle ? IDLE_POLL_MS : CONFIG.pollIntervalSec * 1000;
          timer.current = window.setTimeout(tick, Math.max(1000, delay));
        };

        const tick = () => {
          void load(false).finally(schedule);
        };

        const onVisibility = () => {
          if (document.visibilityState === 'visible') {
            lastActivity.current = Date.now();
            tick();
          } else {
            clearTimer();
          }
        };

        document.addEventListener('visibilitychange', onVisibility);
        tick();

        return () => {
          disposed = true;
          clearTimer();
          document.removeEventListener('visibilitychange', onVisibility);
          for (const name of activityEvents) {
            window.removeEventListener(name, markActivity, { capture: true });
          }
        };
      }, [enabled, load]);

      const refresh = React.useCallback(() => load(true), [load]);
      return { state, refresh };
    }

    // ------------------------------------------------------------------
    // cookie maintenance form
    // ------------------------------------------------------------------
    function CookieForm({ t, onSaved }) {
      const [value, setValue] = React.useState('');
      const [phase, setPhase] = React.useState('idle');
      const [result, setResult] = React.useState(null);

      const submit = async (event) => {
        if (event) event.preventDefault();
        if (phase === 'saving') return;
        setPhase('saving');
        setResult(null);
        try {
          const response = await fetch(ROUTE, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ cookie: value }),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok || !data || data.ok !== true) {
            setPhase('failed');
            setResult({ kind: 'error', message: data?.error === 'cookie looks invalid' ? String(t('invalid')) : String(data?.error || t('failed')) });
            return;
          }
          setPhase('idle');
          setValue('');
          setResult({ kind: 'ok', state: data.state, credential: data.credential || null });
          if (typeof onSaved === 'function') onSaved();
        } catch (error) {
          setPhase('failed');
          setResult({ kind: 'error', message: error && error.message ? String(error.message) : String(t('failed')) });
        }
      };

      return h(
        'form',
        { className: 'qfqp-form', onSubmit: submit },
        h('label', { className: 'qfqp-label', htmlFor: 'qfqp-cookie' }, t('cookieLabel')),
        h('textarea', {
          id: 'qfqp-cookie',
          className: 'qfqp-input',
          value,
          spellCheck: false,
          autoComplete: 'off',
          placeholder: 'BDUSS=...; STOKEN=...',
          onChange: (event) => setValue(event.target.value),
        }),
        h('div', { className: 'qfqp-hint' }, t('cookieHint')),
        result && result.kind === 'ok'
          ? h(
              'div',
              { className: 'qfqp-status', style: { marginLeft: 0, color: 'var(--dsw-alias-state-success-primary)' } },
              `${t('saved')} · ${t('sourceLabel')} ${String(result.credential?.source || 'credential')}${
                result.credential ? ` · ${t('writableLabel')} ${result.credential.writable ? t('yes') : t('no')}` : ''
              }${result.state ? ` · ${result.state}` : ''}`,
            )
          : null,
        result && result.kind === 'error'
          ? h('div', { className: 'qfqp-status', style: { marginLeft: 0, color: 'var(--dsw-alias-state-error-primary)' } }, result.message)
          : null,
        h(
          'div',
          { className: 'qfqp-actions' },
          h('button', { type: 'submit', className: 'qfqp-btn', disabled: phase === 'saving' || value.trim() === '' }, phase === 'saving' ? t('saving') : t('save')),
        ),
      );
    }

    // ------------------------------------------------------------------
    // the dock entry
    // ------------------------------------------------------------------
    function QianfanDock({ t, loc, useProjection }) {
      // The selection projection is framework-provided to session-scoped slot
      // occupants; it is read unconditionally to keep the hook order stable.
      let selection = null;
      if (typeof useProjection === 'function') {
        try {
          selection = useProjection('modelSelection');
        } catch {
          selection = null;
        }
      }
      const current = selection?.next ?? selection?.lastUsed ?? null;
      const provider = String(current?.provider || '').toLowerCase();
      const isQianfan = provider !== '' && provider === String(CONFIG.providerName).toLowerCase();

      const [open, setOpen] = React.useState(false);
      const { state, refresh } = useQuota(isQianfan);
      const rootRef = React.useRef(null);

      React.useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
          if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [open]);

      const pillRef = React.useRef(null);
      // How much room the dock row leaves this entry: the row already carries
      // the activity and token-usage cells, so the pill degrades from three
      // segments to two to one instead of clipping mid-label.
      const [room, setRoom] = React.useState(0);
      const [level, setLevel] = React.useState(0);

      React.useEffect(() => {
        if (!isQianfan) return undefined;
        const root = rootRef.current;
        if (!root || typeof ResizeObserver !== 'function') return undefined;
        // The slot wrapper may be a `display: contents` node, so walk up to the
        // first real flex row before measuring.
        const rowOf = (node) => {
          let parent = node ? node.parentElement : null;
          while (parent && getComputedStyle(parent).display === 'contents') parent = parent.parentElement;
          return parent;
        };
        let frame = 0;
        const measure = () => {
          frame = 0;
          const rootNow = rootRef.current;
          const parent = rowOf(rootNow);
          if (!parent) return;
          const gap = parseFloat(getComputedStyle(parent).columnGap) || 0;
          let used = 0;
          for (const child of parent.children) {
            if (child === rootNow || child.contains(rootNow)) continue;
            used += child.getBoundingClientRect().width;
          }
          const available = parent.clientWidth - used - gap * Math.max(0, parent.children.length - 1);
          setRoom((previous) => (Math.abs(previous - available) < 2 ? previous : Math.max(0, Math.round(available))));
        };
        const schedule = () => {
          if (!frame) frame = requestAnimationFrame(measure);
        };
        const parent = rowOf(root);
        const observer = new ResizeObserver(schedule);
        if (parent) {
          observer.observe(parent);
          for (const child of parent.children) {
            if (!child.contains(root)) observer.observe(child);
          }
        }
        window.addEventListener('resize', schedule);
        measure();
        return () => {
          if (frame) cancelAnimationFrame(frame);
          observer.disconnect();
          window.removeEventListener('resize', schedule);
        };
      }, [isQianfan, state.phase]);

      // The panel is a fixed popover clamped to the viewport, so it stays fully
      // visible on narrow screens (the dock entry sits at the right edge).
      const [panelRect, setPanelRect] = React.useState(null);

      React.useEffect(() => {
        setLevel(0);
      }, [room, loc]);

      React.useLayoutEffect(() => {
        if (!open) {
          setPanelRect(null);
          return undefined;
        }
        const place = () => {
          const pill = pillRef.current;
          if (!pill) return;
          const box = pill.getBoundingClientRect();
          const margin = 12;
          const width = Math.min(PANEL_WIDTH, window.innerWidth - margin * 2);
          const left = Math.min(
            Math.max(margin, box.left + box.width / 2 - width / 2),
            Math.max(margin, window.innerWidth - width - margin),
          );
          const bottom = Math.max(margin, window.innerHeight - box.top + 10);
          setPanelRect({
            left: Math.round(left),
            width: Math.round(width),
            bottom: Math.round(bottom),
            maxHeight: Math.round(Math.min(PANEL_MAX_HEIGHT, Math.max(180, window.innerHeight - bottom - margin))),
          });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
          window.removeEventListener('resize', place);
          window.removeEventListener('scroll', place, true);
        };
      }, [open]);

      // A clipped pill is one segment too wide: drop content one step at a time
      // (0 brand+percent+remaining+today, 1 drop today, 2 drop brand, 3 percent only).
      React.useLayoutEffect(() => {
        const pill = pillRef.current;
        if (!pill) return;
        if (level < 3 && pill.scrollWidth > pill.clientWidth + 1) setLevel(level + 1);
      });

      // Never render, and never request, outside the qianfan route.
      if (!isQianfan) return null;

      const data = state.phase === 'ok' ? state.data : null;
      const plan = data?.plan || null;
      const usage = data?.usage || null;
      const percent = percentOf(plan);
      const color = stateColor(percent);
      const remaining = plan ? Math.max(0, Number(plan.total) - Number(plan.used)) : null;
      const unit = plan?.unit || usage?.unit || t('creditsUnit');

      const showBrand = level < 2;
      const showRemaining = level < 3;
      const showToday = level === 0 && usage !== null;
      const lead = [
        h('span', { className: 'qfqp-mark', key: 'mark' }, markIcon(14)),
        showBrand ? h('span', { key: 'brand' }, t('brand')) : null,
      ];
      const shortStatus = level >= 2;
      let pill;
      if (state.phase === 'ok' && plan) {
        pill = [
          ...lead,
          h('span', { className: 'qfqp-pct', key: 'pct', style: { '--qfqp-state': color } }, fmtPercent(percent)),
          showRemaining ? h('span', { className: 'qfqp-sep', key: 's1' }, '·') : null,
          showRemaining ? h('span', { key: 'left' }, `${t('remainingShort')} ${fmtCompact(remaining, loc)}`) : null,
          showToday
            ? h(
                'span',
                { key: 'today' },
                h('span', { className: 'qfqp-sep' }, ' · '),
                `${t('todayShort')} ${fmtCompact(usage.today?.credits ?? 0, loc)} ${unit}`,
              )
            : null,
        ];
      } else if (state.phase === 'unconfigured') {
        pill = [
          ...lead,
          h('span', { className: 'qfqp-sep', key: 's' }, '·'),
          h('span', { key: 'msg' }, shortStatus ? t('unconfiguredShort') : t('unconfigured')),
        ];
      } else if (state.phase === 'expired') {
        pill = [
          ...lead,
          h('span', { className: 'qfqp-sep', key: 's' }, '·'),
          h('span', { className: 'qfqp-tone', key: 'msg' }, shortStatus ? t('expiredShort') : t('expired')),
        ];
      } else if (state.phase === 'error') {
        pill = [
          ...lead,
          h('span', { className: 'qfqp-sep', key: 's' }, '·'),
          h('span', { className: 'qfqp-bad', key: 'msg', title: state.error || '' }, shortStatus ? t('errorShort') : t('error')),
        ];
      } else {
        pill = [
          ...lead,
          h('span', { className: 'qfqp-sep', key: 's' }, '·'),
          h('span', { key: 'msg' }, shortStatus ? t('loadingShort') : t('loading')),
        ];
      }

      return h(
        'div',
        { className: 'qfqp-root', ref: rootRef },
        h(
          'button',
          {
            type: 'button',
            className: 'qfqp-pill',
            ref: pillRef,
            'aria-expanded': open ? 'true' : 'false',
            title: plan ? `${CONFIG.providerName} · ${current?.model || ''}` : CONFIG.providerName,
            onClick: () => setOpen((value) => !value),
          },
          pill,
        ),
        open && panelRect
          ? h(Panel, {
              t,
              loc,
              state,
              data,
              plan,
              usage: deriveUsage(usage, plan),
              percent,
              color,
              remaining,
              unit,
              refresh,
              rect: panelRect,
            })
          : null,
      );
    }

    const shanghaiTodayString = () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: SHANGHAI,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

    /**
     * Fill dimensions the Host half may not send yet (a Host change only takes
     * effect after a dsh-web restart, while the Client half hot-reloads). The
     * values are derived from whatever the payload already carries: windows from
     * `daily`, the token split/cache share from the returned detail sample, and
     * the burn-rate projection from the last seven complete days.
     */
    function deriveUsage(usage, plan) {
      if (usage === null || usage === undefined) return usage;
      const daily = Array.isArray(usage.daily) ? usage.daily : [];
      const sum = (list, key) => list.reduce((total, item) => total + (Number(item?.[key]) || 0), 0);
      const windowOf = (list) => ({ credits: sum(list, 'credits'), tokens: sum(list, 'totalTokens') });
      const windows = usage.windows || { last7: windowOf(daily.slice(-7)), last30: windowOf(daily) };

      const detail = Array.isArray(usage.detail) ? usage.detail : [];
      const tokens =
        usage.tokens && Number.isFinite(usage.tokens.total)
          ? usage.tokens
          : {
              input: sum(detail, 'inputTokens'),
              cached: sum(detail, 'cachedTokens'),
              output: sum(detail, 'outputTokens'),
              total: sum(detail, 'totalTokens'),
            };
      // total = input + output; cached is a subset of input, so compare it to
      // input. Computed locally (not read from the payload) because the running
      // Host may be an older module generation with the former denominator.
      const cacheShare = tokens.input > 0 ? (tokens.cached / tokens.input) * 100 : null;

      // Compute the burn rate here from the daily series instead of trusting a
      // Host-derived value: the Client half hot-reloads, the Host half does not,
      // so this keeps the projection correct even while the running Host is an
      // older module generation.
      let projection = null;
      {
        const today = shanghaiTodayString();
        const complete = daily
          .filter((slot) => typeof slot?.time === 'string' && slot.time.slice(0, 10) < today)
          .slice(-7);
        let firstActive = -1;
        for (let index = 0; index < complete.length; index += 1) {
          if ((Number(complete[index]?.credits) || 0) > 0) {
            firstActive = index;
            break;
          }
        }
        const activeDays = firstActive >= 0 ? complete.slice(firstActive) : [];
        const average = activeDays.length > 0 ? sum(activeDays, 'credits') / activeDays.length : null;
        if (average !== null && Number.isFinite(average)) {
          const estimate = { avgDailyCredits: average, daysLeftAtAvg: null, exhaustDate: null };
          if (plan && Number.isFinite(plan.total) && Number.isFinite(plan.used) && average > 0) {
            const days = Math.max(0, plan.total - plan.used) / average;
            estimate.daysLeftAtAvg = Math.round(days * 10) / 10;
            const dayFmt = new Intl.DateTimeFormat('en-CA', {
              timeZone: SHANGHAI,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
            estimate.exhaustDate = dayFmt.format(new Date(Date.now() + days * 86_400_000));
          }
          projection = estimate;
        }
      }

      const modelCredits = Array.isArray(usage.models) ? sum(usage.models, 'credits') : 0;
      const models = Array.isArray(usage.models)
        ? usage.models.map((entry) => ({
            ...entry,
            share: Number.isFinite(entry.share)
              ? entry.share
              : modelCredits > 0
                ? (entry.credits / modelCredits) * 100
                : 0,
          }))
        : [];

      return {
        ...usage,
        windows,
        tokens,
        cacheShare,
        models,
        projection,
        detailTotal: usage.detailTotal ?? usage.requests ?? null,
        sample: usage.sample || { requests: detail.length },
      };
    }

    function fmtCallTime(iso, loc) {
      if (typeof iso !== 'string' || iso === '') return '—';
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return iso.slice(5, 16).replace('T', ' ');
      const dayFmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: SHANGHAI,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const day = dayFmt.format(date);
      const today = dayFmt.format(new Date());
      const time = new Intl.DateTimeFormat(loc === 'zh' ? 'zh-CN' : 'en-US', {
        timeZone: SHANGHAI,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
      return day === today ? time : `${day.slice(5)} ${time}`;
    }

    /**
     * One bar chart. Every bar is focusable and carries its own label/tooltip —
     * hovering or focusing shows that slot's time range, credits and tokens.
     */
    function BarChart({ points, kind, t, loc, unit, summary }) {
      // Touch has no hover: a tap pins one slot, so the reading stays visible on
      // phones. The overlay tooltip and the caption below the chart both read
      // from the pinned/hovered slot — no native `title` tooltip is used.
      const [pinned, setPinned] = React.useState(null);
      const [hovered, setHovered] = React.useState(null);
      const rootRef = React.useRef(null);
      const n = points.length;
      const peak = points.reduce((max, point) => Math.max(max, Number(point?.credits) || 0), 0);
      const active = pinned !== null && points[pinned] ? pinned : hovered;

      React.useEffect(() => {
        if (pinned === null) return undefined;
        const onPointerDown = (event) => {
          if (rootRef.current && !rootRef.current.contains(event.target)) setPinned(null);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setPinned(null);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [pinned]);

      const labelOf = (point) => {
        if (!point || typeof point.time !== 'string') return '—';
        if (kind === 'hour') {
          const hour = point.time.slice(11, 13);
          const next = String((Number(hour) + 1) % 24).padStart(2, '0');
          return `${hour}:00–${next}:00`;
        }
        return point.time.slice(0, 10);
      };
      const shortOf = (point) => {
        if (!point || typeof point.time !== 'string') return '';
        return kind === 'hour' ? point.time.slice(11, 13) : point.time.slice(5, 10);
      };
      const textOf = (point) =>
        `${labelOf(point)} · ${fmtAmount(point.credits, loc)} ${unit} · ${fmtCompact(point.totalTokens, loc)} ${String(t('tokens'))}`;

      const activePoint = active !== null ? points[active] : null;
      const caption = activePoint
        ? textOf(activePoint)
        : summary;

      return h(
        'div',
        { className: 'qfqp-chart', ref: rootRef },
        h(
          'div',
          { className: 'qfqp-spark' },
          active !== null && points[active]
            ? h(
                'div',
                {
                  className: 'qfqp-tip',
                  style: { left: `${Math.min(Math.max(((active + 0.5) / n) * 100, 18), 82)}%` },
                },
                h('div', { className: 'qfqp-tip-t' }, labelOf(points[active])),
                h('div', { className: 'qfqp-tip-v' }, `${fmtAmount(points[active].credits, loc)} ${unit} · ${fmtCompact(points[active].totalTokens, loc)} ${String(t('tokens'))}`),
              )
            : null,
          points.map((point, index) =>
            h('span', {
              key: point?.time || index,
              tabIndex: 0,
              role: 'img',
              'aria-label': textOf(point),
              'aria-pressed': pinned === index ? 'true' : undefined,
              onClick: () => setPinned((current) => (current === index ? null : index)),
              onPointerEnter: () => setHovered(index),
              onPointerLeave: () => setHovered(null),
              onFocus: () => setPinned(index),
              onBlur: () => setPinned((current) => (current === index ? null : current)),
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setPinned((current) => (current === index ? null : index));
                }
              },
              style: {
                height:
                  peak > 0
                    ? `${Math.max(4, Math.round(((Number(point?.credits) || 0) / peak) * 100))}%`
                    : '2px',
                opacity: (Number(point?.credits) || 0) > 0 ? undefined : '.22',
                background: pinned === index ? 'var(--dsw-alias-state-warn-primary)' : undefined,
              },
            }),
          ),
        ),
        h(
          'div',
          { className: 'qfqp-axis' },
          h('span', null, n > 0 ? shortOf(points[0]) : ''),
          h('span', { className: 'qfqp-axis-peak' }, `${t('peak')} ${fmtAmount(peak, loc)}`),
          h('span', null, n > 0 ? shortOf(points[n - 1]) : ''),
        ),
        caption ? h('div', { className: `qfqp-chart-sum${activePoint ? ' qfqp-chart-sum-active' : ''}` }, caption) : null,
      );
    }

    function Panel({ t, loc, state, data, plan, usage, percent, color, remaining, unit, refresh, rect }) {
      const credential = data?.credential || null;
      const [range, setRange] = React.useState('24h');
      const [showAll, setShowAll] = React.useState(false);
      const [extra, setExtra] = React.useState([]);
      const [page, setPage] = React.useState(1);
      const [hasMore, setHasMore] = React.useState(true);
      const [busy, setBusy] = React.useState(false);
      const [detailError, setDetailError] = React.useState(null);

      const loadMore = React.useCallback(async () => {
        if (busy) return;
        const nextPage = page + 1;
        setBusy(true);
        setDetailError(null);
        try {
          const response = await fetch(`${ROUTE}?detail=1&page=${nextPage}&pageSize=50`, {
            credentials: 'same-origin',
            headers: { accept: 'application/json' },
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload || payload.state !== 'ok') {
            throw new Error(payload?.message || payload?.state || `HTTP ${response.status}`);
          }
          const items = Array.isArray(payload.items) ? payload.items : null;
          if (items === null) {
            setHasMore(false);
            throw new Error(String(t('needRestart')));
          }
          setExtra((previous) => [...previous, ...items]);
          setPage(nextPage);
          if (items.length < 50) setHasMore(false);
        } catch (error) {
          setDetailError(error && error.message ? String(error.message) : String(error));
        } finally {
          setBusy(false);
        }
      }, [busy, page]);

      const chart = React.useMemo(() => {
        if (usage === null || usage === undefined) return null;
        if (range === '24h') {
          return {
            points: Array.isArray(usage.hourly) ? usage.hourly : [],
            kind: 'hour',
            summary: `${t('rangeTotal')} ${fmtAmount(usage.last24h?.credits ?? 0, loc)} ${unit} · ${fmtCompact(usage.last24h?.tokens ?? 0, loc)} ${String(t('tokens'))}`,
          };
        }
        const daily = Array.isArray(usage.daily) ? usage.daily : [];
        if (range === '7d') {
          return {
            points: daily.slice(-7),
            kind: 'day',
            summary: `${t('rangeTotal')} ${fmtAmount(usage.windows?.last7?.credits ?? 0, loc)} ${unit} · ${fmtCompact(usage.windows?.last7?.tokens ?? 0, loc)} ${String(t('tokens'))}`,
          };
        }
        return {
          points: daily,
          kind: 'day',
          summary: `${t('rangeTotal')} ${fmtAmount(usage.windows?.last30?.credits ?? 0, loc)} ${unit} · ${fmtCompact(usage.windows?.last30?.tokens ?? 0, loc)} ${String(t('tokens'))}`,
        };
      }, [usage, range, loc, unit, t]);

      const details = React.useMemo(() => {
        const sample = usage && Array.isArray(usage.detail) ? usage.detail : [];
        return extra.length > 0 ? [...sample, ...extra] : sample;
      }, [usage, extra]);
      const visibleDetails = showAll ? details : details.slice(0, 6);
      const detailTotal = usage?.detailTotal ?? null;
      const sampleCount = usage?.sample?.requests ?? details.length;
      const sampleLabel = String(t('sampleN')).replace('{n}', String(sampleCount));
      const canLoadMore = hasMore && (detailTotal === null || details.length < detailTotal);

      const head = h(
        'div',
        { className: 'qfqp-head' },
        h('span', { className: 'qfqp-head-mark' }, markIcon(15)),
        h('span', null, t('title')),
        h('span', { className: 'qfqp-spacer' }),
        h(
          'button',
          { type: 'button', className: 'qfqp-iconbtn', title: t('refresh'), 'aria-label': t('refresh'), onClick: () => refresh() },
          refreshIcon,
        ),
        h(
          'a',
          {
            className: 'qfqp-iconbtn',
            href: CONFIG.consoleUrl,
            target: '_blank',
            rel: 'noreferrer noopener',
            title: t('console'),
            'aria-label': t('console'),
          },
          externalIcon,
        ),
      );

      const body = [];

      if (state.phase === 'unconfigured' || state.phase === 'expired' || state.phase === 'error') {
        const tone = state.phase === 'expired' ? 'qfqp-note-warn' : state.phase === 'error' ? 'qfqp-note-bad' : '';
        const message =
          state.phase === 'expired'
            ? t('expired')
            : state.phase === 'error'
              ? `${t('error')}${state.error ? `: ${state.error}` : ''}`
              : t('unconfigured');
        body.push(h('div', { key: 'note', className: `qfqp-note ${tone}`.trim() }, message));
        if (credential) {
          body.push(
            h(
              'div',
              { key: 'cred', className: 'qfqp-row' },
              h('span', { className: 'qfqp-k' }, `${t('sourceLabel')}: ${String(credential.source || 'none')}`),
              h('span', { className: 'qfqp-num qfqp-v' }, `${t('writableLabel')}: ${credential.writable ? t('yes') : t('no')}`),
            ),
          );
        }
        body.push(h(CookieForm, { key: 'form', t, onSaved: refresh }));
        if (state.phase === 'error') {
          body.push(
            h(
              'div',
              { key: 'retry', className: 'qfqp-actions' },
              h('button', { type: 'button', className: 'qfqp-btn qfqp-btn-ghost', onClick: () => refresh() }, t('retry')),
            ),
          );
        }
      } else if (state.phase === 'ok' && plan) {
        const planName = plan.planType ? PLAN_TYPES[plan.planType] || plan.planType : null;

        // quota + expiry
        body.push(
          h(
            'div',
            { key: 'quota', className: 'qfqp-quota' },
            h(
              'div',
              { className: 'qfqp-quota-top' },
              h('span', { className: 'qfqp-big', style: { '--qfqp-state': color } }, fmtPercent(percent)),
              h('span', { className: 'qfqp-sub' }, `${t('used')} ${fmtAmount(plan.used, loc)} / ${fmtAmount(plan.total, loc)} ${unit}`),
              planName ? h('span', { className: 'qfqp-sub', style: { marginLeft: 'auto' } }, String(t('planText')).replace('{plan}', planName)) : null,
            ),
            h('div', { className: 'qfqp-bar' }, h('div', { className: 'qfqp-bar-fill', style: { width: `${percent}%`, '--qfqp-state': color } })),
            h(
              'div',
              { className: 'qfqp-row' },
              h('span', { className: 'qfqp-k' }, t('remaining')),
              h('span', { className: 'qfqp-v' }, `${fmtAmount(remaining, loc)} ${unit}`),
            ),
            h(
              'div',
              { className: 'qfqp-row' },
              h('span', { className: 'qfqp-k' }, t('expiry')),
              h('span', { className: 'qfqp-v' }, plan.expiresAtText ? fmtExpiry(plan, t, loc) : '—'),
            ),
          ),
        );

        // windows + requests + cache share
        if (usage) {
          const windowRows = [
            ['today', usage.today?.credits ?? 0, usage.today?.tokens ?? 0],
            ['last24h', usage.last24h?.credits ?? 0, usage.last24h?.tokens ?? 0],
            ['last7', usage.windows?.last7?.credits ?? 0, usage.windows?.last7?.tokens ?? 0],
            ['last30', usage.windows?.last30?.credits ?? 0, usage.windows?.last30?.tokens ?? 0],
          ];
          body.push(
            h(
              'div',
              { key: 'windows', className: 'qfqp-kv' },
              windowRows.map(([key, credits, tokens]) =>
                h(
                  'div',
                  { className: 'qfqp-kv-row', key },
                  h('span', { className: 'qfqp-kv-k' }, t(key)),
                  h('span', { className: 'qfqp-kv-v' }, `${fmtAmount(credits, loc)} ${unit}`),
                  h('span', { className: 'qfqp-kv-s' }, `${fmtCompact(tokens, loc)} ${String(t('tokens'))}`),
                ),
              ),
              h(
                'div',
                { className: 'qfqp-kv-row', key: 'requests' },
                h('span', { className: 'qfqp-kv-k' }, t('requestsTotal')),
                h('span', { className: 'qfqp-kv-v' }, detailTotal !== null ? `${fmtAmount(detailTotal, loc)} ${String(t('requests'))}` : '—'),
                h('span', { className: 'qfqp-kv-s' }, usage.cacheShare !== null && usage.cacheShare !== undefined ? `${t('cacheShare')} ${fmtPercent(usage.cacheShare)}` : ''),
              ),
            ),
          );

          // burn-rate projection
          const projection = usage.projection || null;
          if (projection && Number.isFinite(projection.avgDailyCredits)) {
            const overSoon = projection.exhaustDate && plan.expiresAtText && projection.exhaustDate < plan.expiresAtText;
            body.push(
              h(
                'div',
                { key: 'projection', className: 'qfqp-kv-row' },
                h('span', { className: 'qfqp-kv-k' }, t('avgDaily')),
                h('span', { className: 'qfqp-kv-v' }, `${fmtAmount(projection.avgDailyCredits, loc)} ${unit}`),
                h(
                  'span',
                  { className: 'qfqp-kv-s', style: overSoon ? { color: 'var(--dsw-alias-state-warn-primary)' } : undefined },
                  projection.daysLeftAtAvg !== null ? `${t('projected')} ${projection.daysLeftAtAvg} ${t('days')}` : '',
                ),
              ),
            );
            if (projection.exhaustDate) {
              body.push(
                h(
                  'div',
                  { key: 'exhaust', className: 'qfqp-hint', style: overSoon ? { color: 'var(--dsw-alias-state-warn-primary)' } : undefined },
                  overSoon ? String(t('projectedExhaust')).replace('{date}', projection.exhaustDate) : t('coveredToExpiry'),
                ),
              );
            }
          }

          // charts with range tabs
          body.push(
            h(
              'div',
              { key: 'charts', className: 'qfqp-block' },
              h(
                'div',
                { className: 'qfqp-sec-head' },
                h('div', { className: 'qfqp-tabs', role: 'tablist' },
                  [
                    ['24h', t('range24')],
                    ['7d', t('range7')],
                    ['30d', t('range30')],
                  ].map(([key, label]) =>
                    h(
                      'button',
                      {
                        key,
                        type: 'button',
                        role: 'tab',
                        className: 'qfqp-tab',
                        'aria-selected': range === key ? 'true' : 'false',
                        onClick: () => setRange(key),
                      },
                      label,
                    ),
                  ),
                ),
              ),
              chart ? h(BarChart, { points: chart.points, kind: chart.kind, t, loc, unit, summary: chart.summary }) : h('span', { className: 'qfqp-hint' }, t('noUsage')),
            ),
          );

          // token composition from the recent-call sample, next to the other
          // sample-based blocks so it cannot be read as the plan total
          {
            const cacheShareOfInput = usage.cacheShare;
            const cacheLine =
              cacheShareOfInput !== null && cacheShareOfInput !== undefined
                ? String(t('cacheWithinInput')).replace('{p}', fmtPercent(cacheShareOfInput))
                : t('cachedTokens');
            body.push(
              h(
                'div',
                { key: 'split', className: 'qfqp-block' },
                h('span', { className: 'qfqp-label' }, `${t('tokenComposition')} · ${sampleLabel}`),
                h(
                  'div',
                  { className: 'qfqp-split' },
                  h(
                    'div',
                    { className: 'qfqp-split-item' },
                    h('span', { className: 'qfqp-split-k' }, t('inputTokens')),
                    h('span', { className: 'qfqp-split-v' }, fmtCompact(usage.tokens?.input ?? 0, loc)),
                    h('span', { className: 'qfqp-split-s' }, cacheLine),
                  ),
                  h(
                    'div',
                    { className: 'qfqp-split-item' },
                    h('span', { className: 'qfqp-split-k' }, t('outputTokens')),
                    h('span', { className: 'qfqp-split-v' }, fmtCompact(usage.tokens?.output ?? 0, loc)),
                  ),
                  h(
                    'div',
                    { className: 'qfqp-split-item' },
                    h('span', { className: 'qfqp-split-k' }, t('totalTokensLabel')),
                    h('span', { className: 'qfqp-split-v' }, fmtCompact(usage.tokens?.total ?? 0, loc)),
                    h('span', { className: 'qfqp-split-s' }, t('inputPlusOutput')),
                  ),
                ),
                h(
                  'span',
                  { className: 'qfqp-hint' },
                  String(t('cacheSubsetNote')).replace('{n}', fmtCompact(usage.tokens?.cached ?? 0, loc)),
                ),
              ),
            );
          }

          // recent calls, expandable and pageable
          body.push(
            h(
              'div',
              { key: 'detail', className: 'qfqp-block' },
              h(
                'div',
                { className: 'qfqp-sec-head' },
                h('span', { className: 'qfqp-label' }, `${t('detailTitle')}${detailTotal !== null ? ` · ${fmtAmount(detailTotal, loc)} ${String(t('requests'))}` : ''}`),
                details.length > 6
                  ? h(
                      'button',
                      { type: 'button', className: 'qfqp-link', onClick: () => setShowAll((value) => !value) },
                      showAll ? t('detailCollapse') : `${t('detailShowAll')} (${details.length})`,
                    )
                  : null,
              ),
              visibleDetails.length === 0
                ? h('span', { className: 'qfqp-hint' }, t('detailEmpty'))
                : visibleDetails.map((item, index) =>
                    h(
                      'div',
                      { className: 'qfqp-call', key: `${item.time || ''}-${index}` },
                      h(
                        'div',
                        { className: 'qfqp-call-top' },
                        h('span', { className: 'qfqp-call-time' }, fmtCallTime(item.time, loc)),
                        h('span', { className: 'qfqp-call-model' }, item.model || '—'),
                        h('span', { className: 'qfqp-call-credits' }, `${fmtAmount(item.credits, loc)} ${unit}`),
                      ),
                      h(
                        'div',
                        { className: 'qfqp-call-meta' },
                        `${t('inputTokens')} ${fmtCompact(item.inputTokens, loc)} · ${t('cachedTokens')} ${fmtCompact(item.cachedTokens, loc)} · ${t('outputTokens')} ${fmtCompact(item.outputTokens, loc)} · ${t('totalTokensLabel')} ${fmtCompact(item.totalTokens, loc)}`,
                      ),
                    ),
                  ),
              canLoadMore
                ? h(
                    'div',
                    { className: 'qfqp-more' },
                    h('button', { type: 'button', className: 'qfqp-btn qfqp-btn-ghost', disabled: busy, onClick: loadMore }, busy ? t('loadingMore') : t('loadMore')),
                    detailError ? h('span', { className: 'qfqp-err' }, detailError) : null,
                  )
                : null,
            ),
          );
          // per-model breakdown
          const models = Array.isArray(usage.models) ? usage.models : [];
          body.push(
            h(
              'div',
              { key: 'models', className: 'qfqp-block' },
              h('span', { className: 'qfqp-label' }, `${t('byModel')} · ${sampleLabel}`),
              models.length === 0
                ? h('span', { className: 'qfqp-hint' }, t('noModels'))
                : h(
                    'div',
                    null,
                    models.map((entry) =>
                      h(
                        'div',
                        { className: 'qfqp-model-row', key: entry.model },
                        h(
                          'div',
                          { className: 'qfqp-model-top' },
                          h('span', { className: 'qfqp-model-name' }, entry.model),
                          h(
                            'span',
                            { className: 'qfqp-model-credits' },
                            `${fmtAmount(entry.credits, loc)} ${unit} · ${fmtPercent(entry.share || 0)}`,
                          ),
                        ),
                        h('div', { className: 'qfqp-share' }, h('div', { className: 'qfqp-share-fill', style: { width: `${Math.min(100, entry.share || 0)}%` } })),
                        h(
                          'div',
                          { className: 'qfqp-model-meta' },
                          h('span', null, `${fmtCompact(entry.tokens, loc)} ${String(t('tokens'))}`),
                          h('span', null, `${fmtAmount(entry.requests, loc)} ${String(t('calls'))}`),
                          h('span', null, `${t('inputTokens')} ${fmtCompact(entry.inputTokens, loc)}`),
                          h('span', null, `${t('cachedTokens')} ${fmtCompact(entry.cachedTokens, loc)}`),
                          h('span', null, `${t('outputTokens')} ${fmtCompact(entry.outputTokens, loc)}`),
                        ),
                      ),
                    ),
                  ),
            ),
          );

        } else {
          body.push(h('div', { key: 'nousage', className: 'qfqp-note' }, t('noUsage')));
        }
      }

      const stamp = fmtStamp(data?.fetchedAt, loc);
      const style = rect
        ? { left: `${rect.left}px`, bottom: `${rect.bottom}px`, width: `${rect.width}px`, maxHeight: `${rect.maxHeight}px` }
        : undefined;
      return h(
        'div',
        { className: 'qfqp-panel', role: 'dialog', 'aria-label': t('title'), style },
        head,
        ...body,
        h(
          'div',
          { key: 'foot', className: 'qfqp-foot' },
          h('span', null, `${t('updated')}${stamp ? ` ${stamp}` : ' —'}`),
          h('span', { className: 'qfqp-spacer' }),
          credential ? h('span', null, `${t('sourceLabel')}: ${String(credential.source || 'none')}`) : null,
        ),
      );
    }

    // ------------------------------------------------------------------
    // plugin body
    // ------------------------------------------------------------------
    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = ctx.get('locale');
        let t = (key) => DICTS.zh[key] ?? DICTS.en[key] ?? key;
        let loc = 'en';
        if (locale && typeof locale.register === 'function') {
          const disposeLocale = locale.register(NS, { zh: DICTS.zh, en: DICTS.en });
          if (typeof disposeLocale === 'function') {
            ctx.effect(() => disposeLocale, 'qianfan-token-plan: locale');
          }
          if (typeof locale.bind === 'function') t = locale.bind(NS);
          try {
            const snapshot = typeof locale.getLocale === 'function' ? locale.getLocale() : null;
            if (snapshot && snapshot.active) loc = String(snapshot.active).startsWith('zh') ? 'zh' : 'en';
          } catch {
            /* keep the English fallback */
          }
        }

        const style = document.createElement('style');
        style.textContent = CSS;
        style.setAttribute('data-plugin', 'dsh-qianfan-token-plan');
        document.head.appendChild(style);
        ctx.effect(() => () => style.remove(), 'qianfan-token-plan: styles');

        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.composer.dock',
              id: 'qianfan-token-plan',
              order: 2,
            },
            (props) => h(QianfanDock, { ...props, t, loc }),
          ),
        );
      },
    };
  },
});