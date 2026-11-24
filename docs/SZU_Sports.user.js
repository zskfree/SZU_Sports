// ==UserScript==
// @name         深圳大学体育场馆自动预约
// @namespace    http://tampermonkey.net/
// @version      1.2.7
// @description  深圳大学体育场馆自动预约脚本 - iOS、安卓、移动端、桌面端完全兼容
// @author       zskfree
// @match        https://ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/*
// @match        https://ehall-443.webvpn.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/*
// @icon         🎾
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      qyapi.weixin.qq.com
// @run-at       document-end
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/537386/%E6%B7%B1%E5%9C%B3%E5%A4%A7%E5%AD%A6%E4%BD%93%E8%82%B2%E5%9C%BA%E9%A6%86%E8%87%AA%E5%8A%A8%E6%8A%A2%E7%A5%A8.user.js
// @updateURL https://update.greasyfork.org/scripts/537386/%E6%B7%B1%E5%9C%B3%E5%A4%A7%E5%AD%A6%E4%BD%93%E8%82%B2%E5%9C%BA%E9%A6%86%E8%87%AA%E5%8A%A8%E6%8A%A2%E7%A5%A8.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // ==================== 设备检测模块 ====================
    const Device = (() => {
        const ua = navigator.userAgent;
        const platform = navigator.platform;
        const maxTouch = navigator.maxTouchPoints;

        return {
            isMobile: /iPhone|iPad|iPod|Android|Mobile/i.test(ua),
            isIOS: /iPhone|iPad|iPod/i.test(ua),
            isIPad: /iPad/i.test(ua) || (platform === 'MacIntel' && maxTouch > 1),
            hasPointer: !!window.PointerEvent,
            get isTouch() {
                return this.isMobile || this.isIPad || (maxTouch > 0 && /Android|Mobile/i.test(ua));
            }
        };
    })();

    // ==================== 主题管理器 ====================
    const ThemeManager = {
        init() {
            if (document.getElementById('szu-theme-style')) return;
            const style = document.createElement('style');
            style.id = 'szu-theme-style';
            style.textContent = `
                :root {
                    --szu-bg-panel: #ffffff;
                    --szu-bg-secondary: #fafaf9;
                    --szu-bg-hover: #f5f5f4;
                    --szu-text-main: #1a1a1a;
                    --szu-text-secondary: #404040;
                    --szu-text-muted: #737373;
                    --szu-text-subtle: #a3a3a3;
                    --szu-border: #e5e5e5;
                    --szu-border-strong: #d4d4d4;
                    --szu-btn-primary-bg: #1a1a1a;
                    --szu-btn-primary-text: #ffffff;
                    --szu-btn-stop-bg: #991b1b;
                    --szu-focus-ring: rgba(26, 26, 26, 0.14);
                    --szu-shadow-soft: 0 12px 40px rgba(0,0,0,0.15);
                    --szu-shadow-lift: 0 16px 44px rgba(0,0,0,0.18);
                    --szu-motion-ease: cubic-bezier(.22, 1, .36, 1);

                    /* Logs */
                    --szu-log-info-color: #404040;
                    --szu-log-info-bg: transparent;
                    --szu-log-info-border: #d4d4d4;
                    --szu-log-success-color: #166534;
                    --szu-log-success-bg: #f0fdf4;
                    --szu-log-success-border: #bbf7d0;
                    --szu-log-warning-color: #9a3412;
                    --szu-log-warning-bg: #fff7ed;
                    --szu-log-warning-border: #ffedd5;
                    --szu-log-error-color: #991b1b;
                    --szu-log-error-bg: #fef2f2;
                    --szu-log-error-border: #fecaca;
                }
                .szu-dark {
                    --szu-bg-panel: #171717;
                    --szu-bg-secondary: #262626;
                    --szu-bg-hover: #333333;
                    --szu-text-main: #f5f5f5;
                    --szu-text-secondary: #d4d4d4;
                    --szu-text-muted: #a3a3a3;
                    --szu-text-subtle: #737373;
                    --szu-border: #404040;
                    --szu-border-strong: #525252;
                    --szu-btn-primary-bg: #f5f5f5;
                    --szu-btn-primary-text: #171717;
                    --szu-btn-stop-bg: #ef4444;
                    --szu-focus-ring: rgba(245, 245, 245, 0.16);
                    --szu-shadow-soft: 0 12px 40px rgba(0,0,0,0.36);
                    --szu-shadow-lift: 0 18px 48px rgba(0,0,0,0.42);

                    /* Logs */
                    --szu-log-info-color: #d4d4d4;
                    --szu-log-info-bg: transparent;
                    --szu-log-info-border: #525252;
                    --szu-log-success-color: #4ade80;
                    --szu-log-success-bg: rgba(22,101,52,0.25);
                    --szu-log-success-border: #14532d;
                    --szu-log-warning-color: #fb923c;
                    --szu-log-warning-bg: rgba(154,52,18,0.25);
                    --szu-log-warning-border: #7c2d12;
                    --szu-log-error-color: #f87171;
                    --szu-log-error-bg: rgba(153,27,27,0.25);
                    --szu-log-error-border: #7f1d1d;
                }
                /* 暗黑模式表单组件强覆盖 */
                .szu-dark input::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                }
                .szu-dark select option {
                    background: var(--szu-bg-panel);
                    color: var(--szu-text-main);
                }
                /* 统一滚动条样式 */
                #auto-booking-panel,
                #status-area,
                .szu-floating-popover {
                    scrollbar-width: thin;
                    scrollbar-color: var(--szu-border-strong) transparent;
                }
                #auto-booking-panel::-webkit-scrollbar,
                #status-area::-webkit-scrollbar,
                .szu-floating-popover::-webkit-scrollbar {
                    width: 7px;
                    height: 7px;
                }
                #auto-booking-panel::-webkit-scrollbar-track,
                #status-area::-webkit-scrollbar-track,
                .szu-floating-popover::-webkit-scrollbar-track {
                    background: transparent;
                }
                #auto-booking-panel::-webkit-scrollbar-thumb,
                #status-area::-webkit-scrollbar-thumb,
                .szu-floating-popover::-webkit-scrollbar-thumb {
                    background: var(--szu-border-strong);
                    background: color-mix(in srgb, var(--szu-border-strong) 72%, transparent);
                    border: 2px solid transparent;
                    border-radius: 999px;
                    background-clip: padding-box;
                }
                #auto-booking-panel::-webkit-scrollbar-thumb:hover,
                #status-area::-webkit-scrollbar-thumb:hover,
                .szu-floating-popover::-webkit-scrollbar-thumb:hover {
                    background: var(--szu-text-subtle);
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }
                #auto-booking-panel {
                    transition:
                        opacity 0.24s var(--szu-motion-ease),
                        transform 0.24s var(--szu-motion-ease),
                        background-color 0.2s ease,
                        border-color 0.2s ease,
                        box-shadow 0.2s ease;
                }
                #auto-booking-panel.szu-panel-ready {
                    will-change: opacity, transform;
                }
                #auto-booking-panel input,
                #auto-booking-panel select,
                #auto-booking-panel button,
                #floating-toggle-btn,
                .szu-chip,
                .szu-section,
                .szu-log-entry {
                    transition:
                        background-color 0.18s ease,
                        border-color 0.18s ease,
                        color 0.18s ease,
                        box-shadow 0.18s ease,
                        transform 0.18s var(--szu-motion-ease),
                        opacity 0.18s ease;
                }
                #auto-booking-panel input:focus,
                #auto-booking-panel select:focus {
                    border-color: var(--szu-text-muted) !important;
                    box-shadow: 0 0 0 3px var(--szu-focus-ring);
                    background: var(--szu-bg-panel) !important;
                }
                .szu-section {
                    animation: szu-section-in 0.34s var(--szu-motion-ease) both;
                }
                .szu-section:nth-of-type(2) { animation-delay: 0.03s; }
                .szu-section:nth-of-type(3) { animation-delay: 0.06s; }
                .szu-section:nth-of-type(4) { animation-delay: 0.09s; }
                .szu-log-entry {
                    animation: szu-log-in 0.2s var(--szu-motion-ease) both;
                }
                .szu-quick-action {
                    appearance: none;
                    -webkit-appearance: none;
                    border: 1px solid var(--szu-border);
                    background: var(--szu-bg-panel);
                    color: var(--szu-text-main);
                    cursor: pointer;
                    font: inherit;
                    text-align: left;
                    -webkit-tap-highlight-color: transparent;
                }
                .szu-quick-line {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    line-height: 1.4;
                    padding: 4px 6px;
                    margin-left: -6px;
                    border-radius: 6px;
                    border-color: transparent;
                    background: transparent;
                    color: var(--szu-text-secondary);
                }
                .szu-quick-editor {
                    display: none;
                    margin-top: 0;
                    padding: 12px;
                    border: 1px solid var(--szu-border);
                    border-radius: 8px;
                    background: var(--szu-bg-panel);
                    box-shadow: 0 10px 24px rgba(0,0,0,0.08);
                    animation: szu-quick-in 0.2s var(--szu-motion-ease) both;
                }
                .szu-quick-editor.is-open {
                    display: block;
                }
                .szu-quick-action.is-active {
                    border-color: var(--szu-text-muted) !important;
                    background: var(--szu-bg-hover) !important;
                    color: var(--szu-text-main) !important;
                }
                .szu-quick-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 10px;
                    color: var(--szu-text-main);
                    font-size: 13px;
                    font-weight: 600;
                }
                .szu-quick-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 8px;
                }
                .szu-quick-time {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 8px;
                    border: 1px solid var(--szu-border);
                    border-radius: 6px;
                    background: var(--szu-bg-secondary);
                    color: var(--szu-text-secondary);
                    font-size: 12px;
                    cursor: pointer;
                }
                .szu-quick-time:has(input:checked) {
                    border-color: var(--szu-text-muted);
                    background: var(--szu-bg-hover);
                    color: var(--szu-text-main);
                }
                .szu-floating-popover {
                    display: none !important;
                    position: fixed !important;
                    z-index: 10003 !important;
                    opacity: 0;
                    pointer-events: none;
                    transform: translateY(-6px) scale(0.98);
                    transform-origin: top center;
                    box-shadow: 0 18px 44px rgba(0,0,0,0.18);
                    max-height: min(72vh, 640px);
                    overflow-y: auto;
                    margin: 0 !important;
                    transition:
                        opacity 0.16s ease,
                        transform 0.2s var(--szu-motion-ease),
                        background-color 0.18s ease,
                        border-color 0.18s ease,
                        color 0.18s ease;
                }
                .szu-floating-popover.is-open {
                    display: block !important;
                    opacity: 1;
                    pointer-events: auto;
                    transform: translateY(0) scale(1);
                    animation: szu-popover-in 0.2s var(--szu-motion-ease) both;
                }
                .szu-floating-popover.szu-tips-content {
                    padding: 12px !important;
                    background: var(--szu-bg-panel) !important;
                    border: 1px solid var(--szu-border) !important;
                    border-radius: 8px !important;
                }
                @media (hover:hover) {
                    #auto-booking-panel button:not(:disabled):hover {
                        transform: translateY(-1px);
                        box-shadow: 0 8px 18px rgba(0,0,0,0.08);
                    }
                    .szu-chip:hover {
                        transform: translateY(-1px);
                        border-color: var(--szu-border-strong) !important;
                    }
                    .szu-quick-action:hover {
                        transform: translateY(-1px);
                        border-color: var(--szu-border-strong) !important;
                        background: var(--szu-bg-hover) !important;
                    }
                }
                @keyframes szu-section-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes szu-quick-in {
                    from { opacity: 0; transform: translateY(-6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes szu-popover-in {
                    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes szu-log-in {
                    from { opacity: 0; transform: translateX(8px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    #auto-booking-panel,
                    #auto-booking-panel *,
                    #floating-toggle-btn,
                    .szu-section,
                    .szu-log-entry {
                        animation: none !important;
                        transition: none !important;
                        scroll-behavior: auto !important;
                    }
                }
            `;
            document.head.appendChild(style);
        },
        toggle() {
            const isDark = Storage.get('theme', 'light') === 'dark';
            const nextTheme = isDark ? 'light' : 'dark';
            Storage.set('theme', nextTheme);
            this.apply(nextTheme);
        },
        apply(theme = Storage.get('theme', 'light')) {
            const container = document.documentElement;
            const panel = document.getElementById('auto-booking-panel');
            const btn = document.getElementById('floating-toggle-btn');
            const toggleIcon = document.getElementById('toggle-theme');
            const floatingPanels = ['config-area', 'quick-editor', 'tips-content']
                .map(id => document.getElementById(id))
                .filter(Boolean);

            const isDark = theme === 'dark';

            if (panel) isDark ? panel.classList.add('szu-dark') : panel.classList.remove('szu-dark');
            if (btn) isDark ? btn.classList.add('szu-dark') : btn.classList.remove('szu-dark');
            floatingPanels.forEach(el => isDark ? el.classList.add('szu-dark') : el.classList.remove('szu-dark'));
            if (toggleIcon) toggleIcon.innerHTML = isDark ? I.sun(16) : I.moon(16);

            // Apply variables specifically if needed over body
            // but our CSS scoped to .szu-dark on the panel should be enough
        }
    };

    // ==================== 样式管理器 ====================
    const Styles = {
        getSize: (desktop, mobile, iPad) => Device.isIPad ? iPad : (Device.isMobile ? mobile : desktop),

        get input() {
            const padding = this.getSize('8px 10px', '10px 12px', '12px 14px');
            const fontSize = this.getSize('14px', '15px', '16px');
            return `width:100%;padding:${padding};border:1px solid var(--szu-border);border-radius:6px;background:var(--szu-bg-secondary);color:var(--szu-text-main);font-size:${fontSize};font-family:inherit;box-sizing:border-box;-webkit-appearance:none;appearance:none;outline:none;`;
        },

        get button() {
            const padding = this.getSize('10px', '12px', '14px');
            const fontSize = this.getSize('15px', '16px', '18px');
            return `width:100%;padding:${padding};border:1px solid var(--szu-btn-primary-bg);border-radius:6px;background:var(--szu-btn-primary-bg);color:var(--szu-btn-primary-text);cursor:pointer;font-size:${fontSize};font-weight:500;font-family:inherit;-webkit-appearance:none;appearance:none;outline:none;-webkit-tap-highlight-color:transparent;display:flex;align-items:center;justify-content:center;gap:6px;`;
        },

        get secondaryButton() {
            const padding = this.getSize('10px', '12px', '14px');
            const fontSize = this.getSize('15px', '16px', '18px');
            return `width:100%;padding:${padding};border:1px solid var(--szu-border);border-radius:6px;background:var(--szu-bg-panel);color:var(--szu-text-main);cursor:pointer;font-size:${fontSize};font-weight:500;font-family:inherit;-webkit-appearance:none;appearance:none;outline:none;-webkit-tap-highlight-color:transparent;display:flex;align-items:center;justify-content:center;gap:6px;`;
        }
    };

    // ==================== 存储管理器 ====================
    const Storage = {
        prefix: 'szu_sports_',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        version: '1.2.7',

        set(key, value) {
            const data = { value, timestamp: Date.now(), version: this.version };
            const fullKey = this.prefix + key;

            try {
                localStorage.setItem(fullKey, JSON.stringify(data));
                return true;
            } catch {
                try {
                    sessionStorage.setItem(fullKey, JSON.stringify(data));
                    return true;
                } catch {
                    if (!window.memoryStorage) window.memoryStorage = new Map();
                    window.memoryStorage.set(fullKey, data);
                    return true;
                }
            }
        },

        get(key, defaultValue = null) {
            const fullKey = this.prefix + key;
            const now = Date.now();

            const tryParse = (item) => {
                if (!item) return null;
                try {
                    const data = JSON.parse(item);
                    if (data.version !== this.version || (data.timestamp && now - data.timestamp > this.maxAge)) {
                        this.remove(key);
                        return null;
                    }
                    return data.value !== undefined ? data.value : data;
                } catch {
                    this.remove(key);
                    return null;
                }
            };

            // 尝试 localStorage
            const localItem = tryParse(localStorage.getItem(fullKey));
            if (localItem !== null) return localItem;

            // 尝试 sessionStorage
            const sessionItem = tryParse(sessionStorage.getItem(fullKey));
            if (sessionItem !== null) return sessionItem;

            // 尝试内存存储
            if (window.memoryStorage?.has(fullKey)) {
                const data = window.memoryStorage.get(fullKey);
                return data.value !== undefined ? data.value : data;
            }

            return defaultValue;
        },

        remove(key) {
            const fullKey = this.prefix + key;
            try { localStorage.removeItem(fullKey); } catch { }
            try { sessionStorage.removeItem(fullKey); } catch { }
            window.memoryStorage?.delete(fullKey);
        },

        cleanup() {
            const now = Date.now();
            let count = 0;

            [localStorage, sessionStorage].forEach(storage => {
                try {
                    for (let i = storage.length - 1; i >= 0; i--) {
                        const key = storage.key(i);
                        if (key?.startsWith(this.prefix)) {
                            try {
                                const data = JSON.parse(storage.getItem(key));
                                if (data.timestamp && now - data.timestamp > this.maxAge) {
                                    storage.removeItem(key);
                                    count++;
                                }
                            } catch {
                                storage.removeItem(key);
                                count++;
                            }
                        }
                    }
                } catch { }
            });

            return count;
        }
    };

    // ==================== 网络错误处理器 ====================
    const NetworkErrorHandler = {
        categorize(error, response = null) {
            if (response) {
                if (response.status === 429) return 'rate_limit';
                if (response.status >= 500) return 'server_error';
                if (response.status === 401 || response.status === 403) return 'auth_error';
                if (response.status >= 400) return 'client_error';
            }
            if (error.name === 'AbortError' || error.message.includes('超时')) return 'timeout';
            if (error.message.includes('网络')) return 'network_error';
            return 'unknown_error';
        },

        shouldRetry(errorType, retryCount = 0) {
            const maxRetries = { rate_limit: 3, server_error: 5, network_error: 3, timeout: 3, unknown_error: 2 };
            const noRetry = ['auth_error', 'client_error'];
            return !noRetry.includes(errorType) && retryCount < (maxRetries[errorType] || 1);
        },

        getRetryDelay(errorType, retryCount = 0) {
            const baseDelays = { rate_limit: 5000, server_error: 3000, network_error: 2000, timeout: 1000, unknown_error: 2000 };
            return Math.min((baseDelays[errorType] || 2000) * Math.pow(1.5, retryCount), 30000);
        },

        async handle(error, response = null, retryCount = 0) {
            const errorType = this.categorize(error, response);
            const errorMsg = response ? `HTTP ${response.status}` : error.message;

            addLog(`❌ 请求失败: ${errorMsg}`, 'error');

            if (errorType === 'auth_error') {
                addLog(`🔐 认证失败，请检查登录状态`, 'error');
                if (isRunning) stopBooking();
                return { shouldStop: true, shouldRetry: false };
            }

            return {
                shouldStop: false,
                shouldRetry: this.shouldRetry(errorType, retryCount),
                retryDelay: this.shouldRetry(errorType, retryCount) ? this.getRetryDelay(errorType, retryCount) : 0,
                errorType
            };
        }
    };

    // ==================== 请求频率控制器 ====================
    const RequestThrottler = {
        requests: [],
        maxPerSecond: 2,
        maxConcurrent: 3,
        current: 0,

        cleanup() {
            const now = Date.now();
            this.requests = this.requests.filter(time => now - time < 1000);
        },

        canRequest() {
            this.cleanup();
            return this.requests.length < this.maxPerSecond && this.current < this.maxConcurrent;
        },

        async wait() {
            while (!this.canRequest()) {
                const waitTime = this.current >= this.maxConcurrent ? 1000 :
                    (this.requests.length >= this.maxPerSecond ? Math.max(0, 1000 - (Date.now() - Math.min(...this.requests))) : 0);
                if (waitTime > 0) await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        },

        onStart() {
            this.requests.push(Date.now());
            this.current++;
        },

        onEnd() {
            this.current = Math.max(0, this.current - 1);
        },

        reset() {
            this.requests = [];
            this.current = 0;
            addLog(`🔄 请求频率已重置`, 'info');
        }
    };

    // ==================== 智能重试机制 ====================
    const SmartRetry = {
        failures: 0,
        lastSuccess: Date.now(),

        reset() {
            this.failures = 0;
            this.lastSuccess = Date.now();
        },

        onSuccess() {
            if (this.failures > 0) addLog(`✅ 恢复正常`, 'success');
            this.reset();
        },

        onFailure() {
            this.failures++;
            if (this.failures >= 15) addLog(`⚠️ 连续失败${this.failures}次`, 'warning');
        }
    };

    // ==================== 移动端优化 ====================
    const MobileOptimization = {
        wakeLock: null,

        async init() {
            if (!Device.isMobile) return;
            addLog(`📱 启用移动端优化`, 'info');

            await this.requestWakeLock();
            this.setupVisibility();
            this.optimizeScrolling();
        },

        async requestWakeLock() {
            if ('wakeLock' in navigator) {
                try {
                    this.wakeLock = await navigator.wakeLock.request('screen');
                    addLog(`🔆 屏幕保持唤醒`, 'success');
                } catch { }
            }
        },

        setupVisibility() {
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && isRunning) this.requestWakeLock();
            });
        },

        optimizeScrolling() {
            const style = document.createElement('style');
            style.textContent = `
                #status-area { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
                * { touch-action: manipulation; }
                #auto-booking-panel { -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
                #auto-booking-panel input, #auto-booking-panel select { -webkit-user-select: auto; user-select: auto; }
            `;
            document.head.appendChild(style);
        },

        cleanup() {
            this.wakeLock?.release();
            this.wakeLock = null;
        }
    };

    // ==================== 企业微信推送 ====================
    const WeChatNotifier = {
        url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=4a1965fb-7559-4229-95ab-cc5a34066b6b',
        enabled: true,

        async sendSuccess(info) {
            if (!this.enabled || typeof GM_xmlhttpRequest === 'undefined') return false;

            const message = `🎉 深大体育场馆预约成功！

👤 ${info.userName} (${info.userId})
📅 ${info.date} | 🏟️ ${info.sport} | 🏫 ${info.campus}
📍 ${info.venueName} | ⏰ ${info.timeSlot}
📋 ${info.dhid}`;

            return new Promise(resolve => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: this.url,
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ msgtype: 'text', text: { content: message } }),
                    timeout: 10000,
                    onload: (res) => resolve(res.status === 200),
                    onerror: () => resolve(false),
                    ontimeout: () => resolve(false)
                });
            });
        }
    };

    // ==================== 常量定义 ====================
    const SPORT_CODES = {
        "羽毛球": "001",
        "排球": "003",
        "网球": "004",
        "篮球": "005",
        "乒乓球": "013",
        "桌球": "016"
    };
    const CAMPUS_CODES = { "粤海": "1", "丽湖": "2" };
    const TIME_SLOTS = ["08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00", "21:00-22:00"];

    // ==================== 配置管理 ====================

    // 新增: 模块化场馆配置
    const VENUE_CONFIG = {
        "羽毛球": {
            "丽湖": {
                options: [
                    { value: '至畅', label: '至畅体育馆' },
                    { value: '至快', label: '至快体育馆' },
                ],
                filter: (fullName, preferredVenue) => {
                    if (preferredVenue === "至畅") return fullName.includes("至畅");
                    if (preferredVenue === "至快") return fullName.includes("至快");
                    return false;
                }
            },
            "粤海": {
                options: [
                    { value: '运动广场东馆羽毛球场', label: '运动广场东馆羽毛球场' },
                ],
                filter: (fullName, preferredVenue) => {
                    if (preferredVenue === "运动广场东馆羽毛球场") return fullName.includes("东馆") || fullName.includes("运动广场");
                    return false;
                }
            }
        },
        "网球": {
            "粤海": {
                options: [
                    { value: '运动广场海边网球场', label: '运动广场海边网球场' },
                    { value: '北区网球场', label: '北区网球场' },
                ],
                filter: (fullName, preferredVenue) => {
                    if (preferredVenue === "运动广场海边网球场") return fullName.includes("海边") || fullName.includes("运动广场");
                    if (preferredVenue === "北区网球场") return fullName.includes("北区");
                    return false;
                }
            },
            "丽湖": {
                options: [
                    { value: '北区体育场网球场', label: '北区体育场网球场' },
                    { value: '南区室外网球场', label: '南区室外网球场' },
                ],
                filter: (fullName, preferredVenue) => {
                    if (preferredVenue === "北区体育场网球场") return fullName.includes("北区体育场");
                    if (preferredVenue === "南区室外网球场") return fullName.includes("南区室外");
                    return false;
                }
            }
        },
        "排球": {
            "粤海": {
                options: [
                    { value: '西馆排球场(包场)', label: '西馆排球场(包场)' },
                ],
                filter: (fullName, preferredVenue) => {
                    if (preferredVenue === "西馆排球场(包场)") return fullName.includes("西馆") || fullName.includes("排球场");
                    return false;
                }
            },
            "丽湖": {
                options: [
                    { value: '风雨操场排球场', label: '风雨操场排球场' },
                ],
                filter: (fullName, preferredVenue) => {
                    if (preferredVenue === "风雨操场排球场") return fullName.includes("风雨操场");
                    return false;
                }
            }
        },
        "篮球": {
            "粤海": {
                options: [
                    { value: '运动广场天台篮球场', label: '运动广场天台篮球场' },
                    { value: '运动广场东馆室内篮球场', label: '运动广场东馆室内篮球场' },
                ],
                filter: (fullName, preferredVenue) => {
                    if (preferredVenue === "运动广场天台篮球场") return fullName.includes("天台") || fullName.includes("运动广场");
                    if (preferredVenue === "运动广场东馆室内篮球场") return fullName.includes("东馆") || fullName.includes("室内篮球场");
                    return false;
                }
            },
            "丽湖": {
                options: [
                    { value: '风雨操场篮球场', label: '风雨操场篮球场' },
                ],
                filter: (fullName, preferredVenue) => {
                    if (preferredVenue === "风雨操场篮球场") return fullName.includes("风雨操场");
                    return false;
                }
            }
        },
        "乒乓球": {
            "粤海": {
                options: [
                    { value: '北区乒乓球馆', label: '北区乒乓球馆' },
                ],
                filter: (fullName, preferredVenue) => {
                    if (preferredVenue === "北区乒乓球馆") return fullName.includes("北区");
                    return false;
                }
            },
            "丽湖": {
                options: [
                    { value: '体育馆乒乓球室', label: '体育馆乒乓球室' },
                ],
                filter: (fullName, preferredVenue) => {
                    if (preferredVenue === "体育馆乒乓球室") return fullName.includes("体育馆");
                    return false;
                }
            }
        },
    };

    // ==================== SVG 图标库 ====================
    const I = {
        _svg: (s, d, extra = '') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra}>${d}</svg>`,

        tennis: (s = 16) => I._svg(s,
            `<circle cx="12" cy="12" r="10"/>` +
            `<path d="M18.09 5.91A8.962 8.962 0 0 0 12 12a8.962 8.962 0 0 0-6.09 6.09"/>` +
            `<path d="M5.91 5.91A8.962 8.962 0 0 1 12 12a8.962 8.962 0 0 1 6.09 6.09"/>`
        ),
        moon: (s = 16) => I._svg(s, `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`),
        sun: (s = 16) => I._svg(s,
            `<circle cx="12" cy="12" r="5"/>` +
            `<line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>` +
            `<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>` +
            `<line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>` +
            `<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`
        ),
        gear: (s = 14) => I._svg(s,
            `<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>` +
            `<circle cx="12" cy="12" r="3"/>`
        ),
        close: (s = 16) => I._svg(s, `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`),
        user: (s = 14) => I._svg(s,
            `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>` +
            `<circle cx="12" cy="7" r="4"/>`
        ),
        calendar: (s = 14) => I._svg(s,
            `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>` +
            `<line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>` +
            `<line x1="3" y1="10" x2="21" y2="10"/>`
        ),
        sport: (s = 14) => I._svg(s, `<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`),
        campus: (s = 14) => I._svg(s,
            `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/>` +
            `<path d="M6 12v5c0 1.1 2.69 2 6 2s6-.9 6-2v-5"/>`
        ),
        stadium: (s = 14) => I._svg(s,
            `<path d="M3 21h18"/>` +
            `<path d="M5 21V7l7-4 7 4v14"/>` +
            `<path d="M9 21v-4a3 3 0 0 1 6 0v4"/>`
        ),
        clock: (s = 14) => I._svg(s,
            `<circle cx="12" cy="12" r="10"/>` +
            `<polyline points="12 6 12 12 16 14"/>`
        ),
        timer: (s = 14) => I._svg(s,
            `<line x1="10" y1="2" x2="14" y2="2"/>` +
            `<circle cx="12" cy="14" r="8"/>` +
            `<path d="M12 14l3-3"/>` +
            `<path d="M19.4 6.6l1-1"/>`
        ),
        refresh: (s = 14) => I._svg(s,
            `<path d="M21.5 2v6h-6"/>` +
            `<path d="M21.34 15.57a10 10 0 1 1-.57-8.38L21.5 8"/>`
        ),
        save: (s = 14) => I._svg(s,
            `<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>` +
            `<polyline points="17 21 17 13 7 13 7 21"/>` +
            `<polyline points="7 3 7 8 15 8"/>`
        ),
        play: (s = 14) => I._svg(s, `<polygon points="5 3 19 12 5 21 5 3"/>`),
        stop: (s = 14) => I._svg(s, `<rect x="6" y="6" width="12" height="12" rx="1"/>`),
        alarm: (s = 14) => I._svg(s,
            `<circle cx="12" cy="13" r="8"/>` +
            `<path d="M12 9v4l2 2"/>` +
            `<path d="M5 3L2 6"/><path d="M22 6l-3-3"/>` +
            `<path d="M6.38 18.7L4 21"/><path d="M17.64 18.67L20 21"/>`
        ),
        xCircle: (s = 14) => I._svg(s,
            `<circle cx="12" cy="12" r="10"/>` +
            `<line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`
        ),
        smartphone: (s = 14) => I._svg(s,
            `<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>` +
            `<line x1="12" y1="18" x2="12.01" y2="18"/>`
        ),
        zap: (s = 14) => I._svg(s, `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`),
        edit: (s = 14) => I._svg(s,
            `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>` +
            `<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`
        ),
        check: (s = 14) => I._svg(s, `<polyline points="20 6 9 17 4 12"/>`),
        warn: (s = 14) => I._svg(s,
            `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>` +
            `<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`
        ),
        info: (s = 14) => I._svg(s,
            `<circle cx="12" cy="12" r="10"/>` +
            `<line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`
        ),
        lock: (s = 14) => I._svg(s,
            `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>` +
            `<path d="M7 11V7a5 5 0 0 1 10 0v4"/>`
        ),
        search: (s = 14) => I._svg(s,
            `<circle cx="11" cy="11" r="8"/>` +
            `<line x1="21" y1="21" x2="16.65" y2="16.65"/>`
        ),
        flag: (s = 14) => I._svg(s,
            `<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>` +
            `<line x1="4" y1="22" x2="4" y2="15"/>`
        ),
        bookmark: (s = 14) => I._svg(s, `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>`),
        lightbulb: (s = 14) => I._svg(s,
            `<path d="M9 18h6"/>` +
            `<path d="M10 22h4"/>` +
            `<path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>`
        ),
        chevronDown: (s = 12) => I._svg(s, `<polyline points="6 9 12 15 18 9"/>`),

        // 日志图标：根据 emoji 前缀返回对应 SVG
        forLog: (msg) => {
            const m = {
                '❌': I.close(13), '✅': I.check(13), '⚠️': I.warn(13), '⚠': I.warn(13),
                '🔐': I.lock(13), '🔄': I.refresh(13), '⏰': I.clock(13), '⏱️': I.timer(13),
                '💾': I.save(13), '⏹️': I.stop(13), '📱': I.smartphone(13), '🚀': I.play(13),
                '⚙️': I.gear(13), '🎾': I.tennis(13), '🏟️': I.stadium(13), '📅': I.calendar(13),
                '📋': I.bookmark(13), '📊': I.zap(13), '🔍': I.search(13), '🏁': I.flag(13),
                '🎉': I.check(13), '🎊': I.flag(13), '🎮': I.zap(13), '🧹': I.refresh(13),
                '🔆': I.sun(13), '📌': I.bookmark(13), '💥': I.warn(13), '🔥': I.warn(13),
                '😢': I.xCircle(13), 'ℹ️': I.info(13),
            };
            for (const [e, icon] of Object.entries(m)) {
                if (msg.startsWith(e)) return `<span style="display:inline-flex;vertical-align:middle;margin-right:5px;flex-shrink:0;">${icon}</span>${msg.slice(e.length)}`;
            }
            return msg.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '');
        },
    };

    function getTomorrowDate() {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    }

    // 根据运动项目和校区获取正确的YYLX
    function getYYLX(sport, campus) {
        // 粤海篮球需要使用团体预约模式
        if (sport === "篮球" && campus === "粤海") {
            return "2.0";
        }
        // 其他情况使用单人散场模式
        return "1.0";
    }

    // 判断是否显示场馆选择
    function shouldShowVenueSelection(sport, campus) {
        return !!(VENUE_CONFIG[sport] && VENUE_CONFIG[sport][campus]);
    }

    // 获取场馆选项
    function getVenueOptions(sport, campus) {
        const baseOptions = VENUE_CONFIG[sport]?.[campus]?.options || [];
        return [
            ...baseOptions,
            { value: '全部', label: '全部场馆' }
        ];
    }

    const DEFAULT_CONFIG = {
        USER_INFO: { YYRGH: "2300123999", YYRXM: "张三" },
        TARGET_DATE: getTomorrowDate(),
        SPORT: "羽毛球",
        CAMPUS: "丽湖",
        PREFERRED_VENUE: "至畅",
        PREFERRED_TIMES: ["20:00-21:00", "21:00-22:00"],
        RETRY_INTERVAL: 1,
        MAX_RETRY_TIMES: 20000,
        REQUEST_TIMEOUT: 10,
        YYLX: "1.0"
    };

    function loadConfig() {
        const saved = Storage.get('bookingConfig', null);
        const config = saved ? { ...DEFAULT_CONFIG, ...saved } : DEFAULT_CONFIG;

        // 只在没有保存配置时才设置为明天
        if (!saved) {
            config.TARGET_DATE = getTomorrowDate();
        }

        // 根据当前配置更新YYLX
        config.YYLX = getYYLX(config.SPORT, config.CAMPUS);
        // 确保场馆配置有效
        if (!shouldShowVenueSelection(config.SPORT, config.CAMPUS)) {
            config.PREFERRED_VENUE = '全部';
        }
        return config;
    }

    // ==================== 定时任务管理器 ====================
    const ScheduledTask = {
        timerId: null,
        targetTime: null,

        set(targetTime) {
            this.clear();

            const now = Date.now();
            const delay = targetTime - now;

            if (delay <= 0) {
                addLog(`❌ 定时时间必须晚于当前时间`, 'error');
                return false;
            }

            this.targetTime = targetTime;
            Storage.set('scheduledTime', targetTime);

            this.timerId = setTimeout(() => {
                addLog(`⏰ 定时任务触发，开始预约！`, 'success');
                if (!isRunning) {
                    updateConfigFromUI();
                    if (validateConfig()) startBooking();
                }
                this.clear();
            }, delay);

            const targetDate = new Date(targetTime);
            addLog(`⏰ 已设置定时任务: ${targetDate.toLocaleString('zh-CN')}`, 'success');
            addLog(`⏱️ 距离开始还有: ${this.formatRemaining()}`, 'info');
            return true;
        },

        clear() {
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
            this.targetTime = null;
            Storage.remove('scheduledTime');
        },

        getRemaining() {
            if (!this.targetTime) return null;
            const remaining = Math.max(0, this.targetTime - Date.now());
            return remaining > 0 ? remaining : null;
        },

        formatRemaining() {
            const remaining = this.getRemaining();
            if (!remaining) return '未设置';

            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            if (hours > 0) return `${hours}时${minutes}分${seconds}秒`;
            if (minutes > 0) return `${minutes}分${seconds}秒`;
            return `${seconds}秒`;
        },

        restore() {
            const savedTime = Storage.get('scheduledTime');
            if (savedTime && savedTime > Date.now()) {
                return this.set(savedTime);
            } else if (savedTime) {
                // 清理过期的定时任务
                Storage.remove('scheduledTime');
            }
            return false;
        },

        checkRefresh() {
            // 检查是否需要在30秒前刷新页面以保持会话活跃
            const remaining = this.getRemaining();
            // 使用2秒的窗口（28-30秒）确保能可靠触发刷新
            if (remaining !== null && remaining <= 30000 && remaining > 28000) {
                // 标记需要刷新并执行刷新，记录刷新时间戳
                Storage.set('needRefresh', { triggered: true, timestamp: Date.now() });
                addLog('🔄 即将刷新页面以保持会话活跃...', 'info');
                setTimeout(() => {
                    window.location.reload();
                }, 500);
                return true;
            }
            return false;
        }
    };

    // ==================== 全局变量 ====================
    let CONFIG = loadConfig();
    let isRunning = false;
    let retryCount = 0;
    let startTime = null;
    let successfulBookings = [];
    let controlPanel = null;
    let floatingButton = null;
    let isPanelVisible = Storage.get('panelVisible', true);
    let countdownInterval = null; // 倒计时更新定时器

    function getMaxBookings() {
        return Math.min(CONFIG.PREFERRED_TIMES.length, 2);
    }

    // ==================== 交互处理器 ====================
    const Interaction = {
        bind(el, handler) {
            if (!Device.isTouch) {
                el.addEventListener('click', handler);
                return;
            }

            let pressed = false, startTime = 0;

            if (Device.hasPointer) {
                el.addEventListener('pointerdown', (e) => {
                    if (!e.isPrimary) return;
                    pressed = true;
                    startTime = Date.now();
                });
                el.addEventListener('pointerup', (e) => {
                    if (!pressed || !e.isPrimary) return;
                    if (Date.now() - startTime < 800) {
                        e.preventDefault();
                        handler();
                    }
                    pressed = false;
                });
            } else {
                el.addEventListener('touchstart', () => {
                    pressed = true;
                    startTime = Date.now();
                }, { passive: true });
                el.addEventListener('touchend', (e) => {
                    if (!pressed) return;
                    if (Date.now() - startTime < 800) {
                        e.preventDefault();
                        handler();
                    }
                    pressed = false;
                });
            }
        }
    };

    // ==================== UI 创建 ====================
    function createFloatingButton() {
        const btn = document.createElement('div');
        btn.id = 'floating-toggle-btn';

        const size = Styles.getSize('50px', '56px', '64px');
        const fontSize = Styles.getSize('24px', '26px', '28px');

        btn.style.cssText = `position:fixed;top:20px;right:20px;width:${size};height:${size};background:var(--szu-bg-panel);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10001;box-shadow:0 4px 12px rgba(0,0,0,0.08);border:1px solid var(--szu-border);font-size:${fontSize};user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;color:var(--szu-text-main);will-change:transform;`;

        btn.innerHTML = I.tennis(24);
        btn.title = '显示/隐藏预约面板';

        Interaction.bind(btn, togglePanel);

        if (!Device.isTouch) {
            btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
            btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
        }

        document.body.appendChild(btn);
        return btn;
    }

    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'auto-booking-panel';

        const mobileStyles = Device.isMobile ?
            `width:calc(100vw - 32px);max-width:${Device.isIPad ? '480px' : '360px'};top:${Device.isIPad ? '72px' : '56px'};left:50%;font-size:${Device.isIPad ? '16px' : '15px'};` :
            `width:380px;top:20px;right:90px;`;

        panel.style.cssText = `position:fixed;${mobileStyles}background:var(--szu-bg-panel);border-radius:12px;padding:${Device.isMobile ? '16px' : '20px'};box-shadow:var(--szu-shadow-soft);z-index:10000;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif;color:var(--szu-text-main);border:1px solid var(--szu-border);overflow:visible;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;`;

        const getTodayDate = () => {
            const d = new Date();
            return d.toISOString().split('T')[0];
        };

        panel.innerHTML = `
        <div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--szu-border);padding-bottom:10px;gap:12px;">
            <h3 style="margin:0;flex:1;min-width:0;font-size:${Device.isMobile ? '17px' : '16px'};font-weight:600;font-family:'Noto Serif SC', 'Source Han Serif SC', serif;letter-spacing:0.5px;color:var(--szu-text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:32px;display:flex;align-items:center;gap:8px;"><span style="display:inline-flex;align-items:center;color:var(--szu-text-main);">${I.tennis(18)}</span>自动预约助手</h3>
            <div style="display:flex;gap:4px;align-items:center;flex-shrink:0;">
                <button id="toggle-theme" style="background:transparent;border:none;color:var(--szu-text-secondary);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;transition:background 0.2s;flex-shrink:0;" onmouseover="this.style.background='var(--szu-bg-hover)'" onmouseout="this.style.background='transparent'">${I.moon(16)}</button>
                <button id="toggle-config" style="background:var(--szu-bg-secondary);border:1px solid var(--szu-border);color:var(--szu-text-secondary);padding:0 10px;border-radius:6px;cursor:pointer;font-size:12px;line-height:32px;height:32px;transition:background 0.2s;font-family:inherit;flex-shrink:0;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;">${I.gear(13)} 设置</button>
                <button id="close-panel" style="background:transparent;border:none;color:var(--szu-text-subtle);cursor:pointer;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;transition:background-color 0.18s ease,color 0.18s ease,transform 0.18s var(--szu-motion-ease);flex-shrink:0;" onmouseover="this.style.background='var(--szu-bg-hover)';this.style.color='var(--szu-text-main)'" onmouseout="this.style.background='transparent';this.style.color='var(--szu-text-subtle)'">${I.close(16)}</button>
            </div>
        </div>

        <div id="config-area" class="szu-section szu-floating-popover" style="background:var(--szu-bg-secondary);padding:16px;border-radius:8px;border:1px solid var(--szu-border);">
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--szu-text-muted);display:flex;align-items:center;gap:5px;margin-bottom:4px;">${I.user(13)} 学号/工号</label>
                <input id="user-id" type="text" value="${CONFIG.USER_INFO.YYRGH}" style="${Styles.input}">
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--szu-text-muted);display:flex;align-items:center;gap:5px;margin-bottom:4px;">${I.edit(13)} 姓名</label>
                <input id="user-name" type="text" value="${CONFIG.USER_INFO.YYRXM}" style="${Styles.input}">
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--szu-text-muted);display:flex;align-items:center;gap:5px;margin-bottom:4px;">${I.calendar(13)} 预约日期</label>
                <input id="target-date" type="date" value="${CONFIG.TARGET_DATE}" style="${Styles.input}">
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--szu-text-muted);display:flex;align-items:center;gap:5px;margin-bottom:4px;">${I.sport(13)} 运动项目</label>
                <select id="sport-type" style="${Styles.input}">
                    ${Object.keys(SPORT_CODES).map(s => `<option value="${s}" ${s === CONFIG.SPORT ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--szu-text-muted);display:flex;align-items:center;gap:5px;margin-bottom:4px;">${I.campus(13)} 校区</label>
                <select id="campus" style="${Styles.input}">
                    ${Object.keys(CAMPUS_CODES).map(c => `<option value="${c}" ${c === CONFIG.CAMPUS ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
            <div id="venue-selection" style="margin-bottom:12px;display:${shouldShowVenueSelection(CONFIG.SPORT, CONFIG.CAMPUS) ? 'block' : 'none'};">
                <label style="font-size:13px;color:var(--szu-text-muted);display:flex;align-items:center;gap:5px;margin-bottom:4px;">${I.stadium(13)} 预约场馆</label>
                <select id="preferred-venue" style="${Styles.input}">
                    ${getVenueOptions(CONFIG.SPORT, CONFIG.CAMPUS).map(opt =>
            `<option value="${opt.value}" ${CONFIG.PREFERRED_VENUE === opt.value ? 'selected' : ''}>${opt.label}</option>`
        ).join('')}
                </select>
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:13px;color:var(--szu-text-muted);display:flex;align-items:center;gap:5px;margin-bottom:6px;">${I.clock(13)} 优先时间段</label>
                <div id="time-slots-container" style="background:var(--szu-bg-panel);border:1px solid var(--szu-border);border-radius:6px;padding:10px;display:grid;grid-template-columns:repeat(${Device.isMobile ? '2' : '2'},1fr);gap:8px;">
                    ${TIME_SLOTS.map(slot => `<label style="display:flex;align-items:center;font-size:13px;color:var(--szu-text-secondary);cursor:pointer;"><input type="checkbox" value="${slot}" ${CONFIG.PREFERRED_TIMES.includes(slot) ? 'checked' : ''} style="margin-right:6px;flex-shrink:0;accent-color:var(--szu-text-main);"><span style="white-space:nowrap;">${slot}</span></label>`).join('')}
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div>
                    <label style="font-size:13px;color:var(--szu-text-muted);display:flex;align-items:center;gap:5px;margin-bottom:4px;">${I.timer(13)} 间隔(秒)</label>
                    <input id="retry-interval" type="number" min="1" max="60" value="${CONFIG.RETRY_INTERVAL}" style="${Styles.input}">
                </div>
                <div>
                    <label style="font-size:13px;color:var(--szu-text-muted);display:flex;align-items:center;gap:5px;margin-bottom:4px;">${I.refresh(13)} 最大重试</label>
                    <input id="max-retry" type="number" min="10" max="9999" value="${CONFIG.MAX_RETRY_TIMES}" style="${Styles.input}">
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="font-size:13px;color:var(--szu-text-muted);display:flex;align-items:center;gap:5px;margin-bottom:4px;">${I.clock(13)} 超时(秒)</label>
                <input id="request-timeout" type="number" min="5" max="60" value="${CONFIG.REQUEST_TIMEOUT}" style="${Styles.input}">
            </div>

            <button id="save-config" style="${Styles.button}">${I.save(15)} 保存配置</button>
        </div>

        <div id="quick-summary" class="szu-section" style="background:var(--szu-bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--szu-border);margin-bottom:12px;">
            <button class="szu-quick-action szu-quick-line" data-quick="user" title="快捷修改姓名和学号" style="font-size:13px;margin-bottom:8px;"><span style="display:inline-flex;color:var(--szu-text-muted);">${I.user(14)}</span><span id="display-user" style="font-weight:500;color:var(--szu-text-main);">${CONFIG.USER_INFO.YYRXM} (${CONFIG.USER_INFO.YYRGH})</span></button>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                <button class="szu-chip szu-quick-action" data-quick="date" title="快捷修改预约日期" style="font-size:12px;color:var(--szu-text-main);background:var(--szu-bg-panel);padding:3px 10px;border-radius:4px;line-height:1.6;display:inline-flex;align-items:center;gap:4px;"><span style="display:inline-flex;color:var(--szu-text-muted);">${I.calendar(12)}</span><span id="display-date">${CONFIG.TARGET_DATE}</span></button>
                <button class="szu-chip szu-quick-action" data-quick="sport" title="快捷修改运动项目" style="font-size:12px;color:var(--szu-text-main);background:var(--szu-bg-panel);padding:3px 10px;border-radius:4px;line-height:1.6;display:inline-flex;align-items:center;gap:4px;"><span style="display:inline-flex;color:var(--szu-text-muted);">${I.sport(12)}</span><span id="display-sport">${CONFIG.SPORT}</span></button>
                <button class="szu-chip szu-quick-action" data-quick="campus" title="快捷修改校区" style="font-size:12px;color:var(--szu-text-main);background:var(--szu-bg-panel);padding:3px 10px;border-radius:4px;line-height:1.6;display:inline-flex;align-items:center;gap:4px;"><span style="display:inline-flex;color:var(--szu-text-muted);">${I.campus(12)}</span><span id="display-campus">${CONFIG.CAMPUS}</span></button>
            </div>
            <button id="venue-display" class="szu-quick-action szu-quick-line" data-quick="venue" title="快捷修改预约场馆" style="font-size:13px;margin-bottom:6px;display:${shouldShowVenueSelection(CONFIG.SPORT, CONFIG.CAMPUS) ? 'flex' : 'none'};"><span style="display:inline-flex;color:var(--szu-text-muted);">${I.stadium(14)}</span>预约场馆: <span id="display-venue" style="font-weight:500;color:var(--szu-text-main);">${CONFIG.PREFERRED_VENUE}</span></button>
            <button class="szu-quick-action szu-quick-line" data-quick="times" title="快捷修改优先时间段" style="font-size:13px;"><span style="display:inline-flex;color:var(--szu-text-muted);">${I.clock(14)}</span><span id="display-times" style="color:var(--szu-text-main);">${CONFIG.PREFERRED_TIMES.join(', ')}</span></button>
            <div id="quick-editor" class="szu-quick-editor szu-floating-popover"></div>
            <div style="font-size:12px;color:var(--szu-text-muted);margin-top:8px;padding-top:8px;border-top:1px solid var(--szu-border);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                <button class="szu-quick-action" data-quick="params" title="快捷修改请求参数" style="letter-spacing:0.3px;border-color:transparent;background:transparent;color:var(--szu-text-muted);padding:2px 4px;border-radius:6px;">间隔 <span id="display-interval" style="font-weight:500;color:var(--szu-text-secondary);">${CONFIG.RETRY_INTERVAL}</span>s · 重试 <span id="display-retry" style="font-weight:500;color:var(--szu-text-secondary);">${CONFIG.MAX_RETRY_TIMES}</span> · 超时 <span id="display-timeout" style="font-weight:500;color:var(--szu-text-secondary);">${CONFIG.REQUEST_TIMEOUT}</span>s</button>
                <span style="background:var(--szu-bg-panel);padding:2px 8px;border-radius:4px;border:1px solid var(--szu-border);color:var(--szu-text-main);font-weight:500;white-space:nowrap;">进度 <span id="booking-progress">0/${getMaxBookings()}</span></span>
            </div>
        </div>

        <div class="szu-section" style="background:var(--szu-bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--szu-border);margin-bottom:12px;">
            <div style="font-size:14px;color:var(--szu-text-main);margin-bottom:8px;font-weight:500;display:flex;align-items:center;gap:6px;"><span style="display:inline-flex;color:var(--szu-text-muted);">${I.alarm(15)}</span>定时预约</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                <div>
                    <label style="font-size:13px;color:var(--szu-text-muted);display:block;margin-bottom:4px;">日期</label>
                    <input id="scheduled-date" type="date" value="${getTodayDate()}" style="${Styles.input}">
                </div>
                <div>
                    <label style="font-size:13px;color:var(--szu-text-muted);display:block;margin-bottom:4px;">时间</label>
                    <input id="scheduled-time" type="time" value="12:30" style="${Styles.input}">
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <button id="set-schedule-btn" style="${Styles.secondaryButton}">${I.alarm(14)} 设置定时</button>
                <button id="cancel-schedule-btn" style="${Styles.secondaryButton}color:var(--szu-log-error-color);border-color:var(--szu-log-error-border);background:var(--szu-log-error-bg);">${I.xCircle(14)} 取消定时</button>
            </div>
            <div id="countdown-display" style="font-size:13px;margin-top:10px;text-align:center;color:var(--szu-log-warning-color);font-weight:500;padding:6px;background:var(--szu-log-warning-bg);border-radius:6px;border:1px solid var(--szu-log-warning-border);">未设置定时任务</div>
        </div>

        <div class="szu-section" style="margin-bottom:12px;">
            <button id="start-btn" style="${Styles.button}">${I.play(15)} 开始预约</button>
        </div>

        <div id="status-area" class="szu-section" style="background:var(--szu-bg-secondary);padding:10px;border-radius:8px;font-size:13px;height:${Device.isMobile ? '170px' : '180px'};overflow-y:auto;border:1px solid var(--szu-border);color:var(--szu-text-secondary);font-family:var(--font-mono, monospace);box-sizing:border-box;">
            <div style="color:var(--szu-text-muted);margin-bottom:4px;">[ 就绪 ] 等待开始...</div>
        </div>

        <div class="szu-section" style="margin-top:10px;border:1px solid var(--szu-border);border-radius:8px;overflow:hidden;">
            <div id="tips-toggle" style="display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;background:var(--szu-bg-secondary);transition:background 0.2s;user-select:none;-webkit-tap-highlight-color:transparent;" onmouseover="this.style.background='var(--szu-bg-hover)'" onmouseout="this.style.background='var(--szu-bg-secondary)'">
                <span style="display:inline-flex;color:var(--szu-log-warning-color);">${I.lightbulb(15)}</span>
                <span style="flex:1;font-size:13px;font-weight:500;color:var(--szu-text-main);">预约小贴士</span>
                <span id="tips-arrow" style="display:inline-flex;color:var(--szu-text-subtle);transition:transform 0.25s ease;">${I.chevronDown(14)}</span>
            </div>
            <div id="tips-content" class="szu-floating-popover szu-tips-content" style="padding:12px;background:var(--szu-bg-secondary);">
                <div style="border-top:1px solid var(--szu-border);padding-top:10px;display:flex;flex-direction:column;gap:10px;">
                    <div style="display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:1.6;color:var(--szu-text-secondary);">
                        <span style="display:inline-flex;flex-shrink:0;margin-top:3px;color:var(--szu-log-success-color);">${I.check(13)}</span>
                        <span><strong style="color:var(--szu-text-main);font-weight:600;">推荐定时 12:30 抢票</strong><br>场馆一般在 12:30 放票，建议提前设好定时任务，在放票的第一时间自动抢，成功率最高。</span>
                    </div>
                    <div style="display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:1.6;color:var(--szu-text-secondary);">
                        <span style="display:inline-flex;flex-shrink:0;margin-top:3px;color:var(--szu-log-warning-color);">${I.warn(13)}</span>
                        <span><strong style="color:var(--szu-text-main);font-weight:600;">后台挂抢请调大间隔</strong><br>如果 12:30 没约上需要挂后台持续抢，请将请求间隔调到 <strong style="color:var(--szu-text-main);">10 秒以上</strong>，频率过高可能被系统检测导致封号。</span>
                    </div>
                    <div style="display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:1.6;color:var(--szu-text-secondary);">
                        <span style="display:inline-flex;flex-shrink:0;margin-top:3px;color:var(--szu-text-muted);">${I.info(13)}</span>
                        <span>建议优先选择 2 个时间段，系统会自动按优先级依次尝试预约。</span>
                    </div>
                </div>
            </div>
        </div>


        `;

        document.body.appendChild(panel);
        ['config-area', 'quick-editor', 'tips-content'].forEach(id => {
            const el = panel.querySelector(`#${id}`);
            if (el) document.body.appendChild(el);
        });
        requestAnimationFrame(() => panel.classList.add('szu-panel-ready'));

        const transforms = Device.isMobile ?
            { visible: 'translateX(-50%) translateY(0)', hidden: 'translateX(-50%) translateY(-30px)' } :
            { visible: 'translateX(0)', hidden: 'translateX(30px)' };

        if (isPanelVisible) {
            panel.style.display = 'block';
            panel.style.opacity = '1';
            panel.style.transform = transforms.visible;
            panel.style.boxShadow = 'var(--szu-shadow-lift)';
        } else {
            panel.style.display = 'none';
            panel.style.opacity = '0';
            panel.style.transform = transforms.hidden;
            panel.style.boxShadow = 'var(--szu-shadow-soft)';
        }

        bindEvents(panel);
        return panel;
    }



    function togglePanel() {
        isPanelVisible = !isPanelVisible;
        Storage.set('panelVisible', isPanelVisible);

        const transforms = Device.isMobile ?
            { visible: 'translateX(-50%) translateY(0)', hidden: 'translateX(-50%) translateY(-20px)' } :
            { visible: 'translateX(0)', hidden: 'translateX(30px)' };

        if (isPanelVisible) {
            controlPanel.style.display = 'block';
            controlPanel.style.transform = transforms.hidden;
            controlPanel.style.opacity = '0';
            controlPanel.style.boxShadow = 'var(--szu-shadow-lift)';
            requestAnimationFrame(() => {
                controlPanel.style.opacity = '1';
                controlPanel.style.transform = transforms.visible;
            });
        } else {
            closeAllFloatingPopovers();
            controlPanel.style.opacity = '0';
            controlPanel.style.transform = transforms.hidden;
            controlPanel.style.boxShadow = 'var(--szu-shadow-soft)';
            setTimeout(() => {
                if (!isPanelVisible) controlPanel.style.display = 'none';
            }, 260);
        }

        if (floatingButton) {
            const isDark = Storage.get('theme', 'light') === 'dark';
            if (!isPanelVisible) {
                floatingButton.style.background = isDark ? '#171717' : '#ffffff';
                floatingButton.style.color = isDark ? '#f5f5f5' : '#1a1a1a';
                floatingButton.innerHTML = I.smartphone(24);
            } else {
                floatingButton.style.background = 'var(--szu-bg-panel)';
                floatingButton.style.color = 'var(--szu-text-main)';
                floatingButton.innerHTML = I.tennis(24);
            }
        }
    }

    function placeFloatingPopover(popover, trigger, options = {}) {
        if (!popover) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelRect = document.getElementById('auto-booking-panel')?.getBoundingClientRect();
        const margin = 12;
        const width = Math.min(
            options.width || panelRect?.width || 340,
            viewportWidth - margin * 2
        );

        popover.style.width = `${Math.max(240, width)}px`;
        popover.style.maxWidth = `calc(100vw - ${margin * 2}px)`;

        const popoverRect = popover.getBoundingClientRect();
        const anchorLeft = panelRect
            ? panelRect.left + panelRect.width / 2
            : viewportWidth / 2;
        const triggerRect = trigger?.getBoundingClientRect();
        const anchorTop = triggerRect
            ? triggerRect.bottom + 8
            : (panelRect ? panelRect.top + 64 : 96);

        let left = anchorLeft - popoverRect.width / 2;
        left = Math.max(margin, Math.min(left, viewportWidth - popoverRect.width - margin));

        let top = anchorTop;
        top = Math.max(margin, Math.min(top, viewportHeight - popoverRect.height - margin));

        popover.style.transformOrigin = 'center center';
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
    }

    function openFloatingPopover(popover, trigger, options = {}) {
        if (!popover || !trigger) return;
        popover.classList.add('is-open');
        placeFloatingPopover(popover, trigger, options);
    }

    function closeFloatingPopover(popover) {
        if (!popover) return;
        popover.classList.remove('is-open');
    }

    function closeConfigPopover() {
        closeFloatingPopover(document.getElementById('config-area'));
        const btn = document.getElementById('toggle-config');
        if (btn) btn.innerHTML = `${I.gear(13)} 设置`;
    }

    function closeTipsPopover() {
        closeFloatingPopover(document.getElementById('tips-content'));
        const arrow = document.getElementById('tips-arrow');
        const toggle = document.getElementById('tips-toggle');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        if (toggle) toggle.classList.remove('is-active');
    }

    function closeAllFloatingPopovers() {
        closeQuickEditor();
        closeConfigPopover();
        closeTipsPopover();
    }

    function normalizeConfig(config) {
        const next = { ...config };
        next.PREFERRED_TIMES = Array.isArray(next.PREFERRED_TIMES) && next.PREFERRED_TIMES.length
            ? next.PREFERRED_TIMES
            : [TIME_SLOTS[0]];
        next.YYLX = getYYLX(next.SPORT, next.CAMPUS);

        if (!shouldShowVenueSelection(next.SPORT, next.CAMPUS)) {
            next.PREFERRED_VENUE = '全部';
            return next;
        }

        const venueOptions = getVenueOptions(next.SPORT, next.CAMPUS);
        if (!venueOptions.some(opt => opt.value === next.PREFERRED_VENUE)) {
            next.PREFERRED_VENUE = venueOptions[0]?.value || '全部';
        }
        return next;
    }

    function syncConfigToUI() {
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };

        setValue('user-id', CONFIG.USER_INFO.YYRGH);
        setValue('user-name', CONFIG.USER_INFO.YYRXM);
        setValue('target-date', CONFIG.TARGET_DATE);
        setValue('sport-type', CONFIG.SPORT);
        setValue('campus', CONFIG.CAMPUS);
        setValue('retry-interval', CONFIG.RETRY_INTERVAL);
        setValue('max-retry', CONFIG.MAX_RETRY_TIMES);
        setValue('request-timeout', CONFIG.REQUEST_TIMEOUT);

        const venueSelection = document.getElementById('venue-selection');
        const venueDisplay = document.getElementById('venue-display');
        const preferredVenueSelect = document.getElementById('preferred-venue');
        const showVenue = shouldShowVenueSelection(CONFIG.SPORT, CONFIG.CAMPUS);

        if (venueSelection) venueSelection.style.display = showVenue ? 'block' : 'none';
        if (venueDisplay) venueDisplay.style.display = showVenue ? 'flex' : 'none';
        if (preferredVenueSelect) {
            preferredVenueSelect.innerHTML = getVenueOptions(CONFIG.SPORT, CONFIG.CAMPUS).map(opt =>
                `<option value="${opt.value}" ${CONFIG.PREFERRED_VENUE === opt.value ? 'selected' : ''}>${opt.label}</option>`
            ).join('');
            preferredVenueSelect.value = CONFIG.PREFERRED_VENUE;
        }

        document.querySelectorAll('#time-slots-container input[type="checkbox"]').forEach(cb => {
            cb.checked = CONFIG.PREFERRED_TIMES.includes(cb.value);
        });
    }

    function applyConfigPatch(patch, label = '配置') {
        CONFIG = normalizeConfig({ ...CONFIG, ...patch });
        Storage.set('bookingConfig', CONFIG);
        syncConfigToUI();
        updateDisplayConfig();
        updateProgress();
        addLog(`⚡ 已快捷更新${label}`, 'success');
    }

    function closeQuickEditor() {
        const editor = document.getElementById('quick-editor');
        if (!editor) return;
        editor.classList.remove('is-open');
        editor.dataset.kind = '';
        editor.innerHTML = '';
        document.querySelectorAll('[data-quick].is-active').forEach(el => el.classList.remove('is-active'));
    }

    function quickHeader(title) {
        return `
            <div class="szu-quick-header">
                <span>${title}</span>
                <button type="button" id="quick-close" style="background:transparent;border:none;color:var(--szu-text-subtle);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;">${I.close(14)}</button>
            </div>
        `;
    }

    function openQuickEditor(kind, trigger) {
        const configArea = document.getElementById('config-area');
        if (configArea?.classList.contains('is-open')) return;

        const editor = document.getElementById('quick-editor');
        if (!editor) return;

        if (editor.classList.contains('is-open') && editor.dataset.kind === kind) {
            closeQuickEditor();
            return;
        }

        const selectStyle = Styles.input;
        const renderers = {
            user: () => `${quickHeader('快捷修改用户信息')}
                <div style="display:grid;grid-template-columns:1fr;gap:10px;">
                    <label style="display:block;font-size:12px;color:var(--szu-text-muted);">学号/工号<input id="quick-user-id" type="text" value="${CONFIG.USER_INFO.YYRGH}" style="${selectStyle}margin-top:4px;"></label>
                    <label style="display:block;font-size:12px;color:var(--szu-text-muted);">姓名<input id="quick-user-name" type="text" value="${CONFIG.USER_INFO.YYRXM}" style="${selectStyle}margin-top:4px;"></label>
                </div>`,
            date: () => `${quickHeader('快捷修改日期')}<input id="quick-date" type="date" value="${CONFIG.TARGET_DATE}" style="${selectStyle}">`,
            sport: () => `${quickHeader('快捷修改项目')}<select id="quick-sport" style="${selectStyle}">${Object.keys(SPORT_CODES).map(s => `<option value="${s}" ${s === CONFIG.SPORT ? 'selected' : ''}>${s}</option>`).join('')}</select>`,
            campus: () => `${quickHeader('快捷修改校区')}<select id="quick-campus" style="${selectStyle}">${Object.keys(CAMPUS_CODES).map(c => `<option value="${c}" ${c === CONFIG.CAMPUS ? 'selected' : ''}>${c}</option>`).join('')}</select>`,
            venue: () => `${quickHeader('快捷修改场馆')}<select id="quick-venue" style="${selectStyle}">${getVenueOptions(CONFIG.SPORT, CONFIG.CAMPUS).map(opt => `<option value="${opt.value}" ${opt.value === CONFIG.PREFERRED_VENUE ? 'selected' : ''}>${opt.label}</option>`).join('')}</select>`,
            params: () => `${quickHeader('快捷修改请求参数')}
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <label style="display:block;font-size:12px;color:var(--szu-text-muted);">间隔(秒)<input id="quick-retry-interval" type="number" min="1" max="60" value="${CONFIG.RETRY_INTERVAL}" style="${selectStyle}margin-top:4px;"></label>
                    <label style="display:block;font-size:12px;color:var(--szu-text-muted);">最大重试<input id="quick-max-retry" type="number" min="10" max="9999" value="${CONFIG.MAX_RETRY_TIMES}" style="${selectStyle}margin-top:4px;"></label>
                    <label style="display:block;font-size:12px;color:var(--szu-text-muted);grid-column:1 / -1;">请求超时(秒)<input id="quick-request-timeout" type="number" min="5" max="60" value="${CONFIG.REQUEST_TIMEOUT}" style="${selectStyle}margin-top:4px;"></label>
                </div>`,
            times: () => `${quickHeader('快捷修改时间段')}<div class="szu-quick-grid">${TIME_SLOTS.map(slot => `<label class="szu-quick-time"><input type="checkbox" value="${slot}" ${CONFIG.PREFERRED_TIMES.includes(slot) ? 'checked' : ''} style="accent-color:var(--szu-text-main);"><span>${slot}</span></label>`).join('')}</div>`
        };

        if (!renderers[kind]) return;
        closeTipsPopover();
        editor.innerHTML = renderers[kind]();
        editor.dataset.kind = kind;
        openFloatingPopover(editor, trigger, { width: (kind === 'times' || kind === 'params') ? 340 : 300 });
        document.querySelectorAll('[data-quick].is-active').forEach(el => el.classList.remove('is-active'));
        trigger?.classList.add('is-active');

        Interaction.bind(editor.querySelector('#quick-close'), closeQuickEditor);

        const bindChange = (selector, handler) => {
            const el = editor.querySelector(selector);
            if (el) el.addEventListener('change', handler);
        };

        const updateQuickUser = () => {
            const id = editor.querySelector('#quick-user-id')?.value.trim() || CONFIG.USER_INFO.YYRGH;
            const name = editor.querySelector('#quick-user-name')?.value.trim() || CONFIG.USER_INFO.YYRXM;
            applyConfigPatch({ USER_INFO: { YYRGH: id, YYRXM: name } }, '用户信息');
        };
        const updateQuickParams = () => {
            const retryInterval = parseInt(editor.querySelector('#quick-retry-interval')?.value, 10) || CONFIG.RETRY_INTERVAL;
            const maxRetry = parseInt(editor.querySelector('#quick-max-retry')?.value, 10) || CONFIG.MAX_RETRY_TIMES;
            const requestTimeout = parseInt(editor.querySelector('#quick-request-timeout')?.value, 10) || CONFIG.REQUEST_TIMEOUT;
            applyConfigPatch({
                RETRY_INTERVAL: retryInterval,
                MAX_RETRY_TIMES: maxRetry,
                REQUEST_TIMEOUT: requestTimeout
            }, '请求参数');
        };

        bindChange('#quick-user-id', updateQuickUser);
        bindChange('#quick-user-name', updateQuickUser);
        bindChange('#quick-retry-interval', updateQuickParams);
        bindChange('#quick-max-retry', updateQuickParams);
        bindChange('#quick-request-timeout', updateQuickParams);
        bindChange('#quick-date', (e) => applyConfigPatch({ TARGET_DATE: e.target.value }, '日期'));
        bindChange('#quick-sport', (e) => applyConfigPatch({ SPORT: e.target.value }, '项目'));
        bindChange('#quick-campus', (e) => applyConfigPatch({ CAMPUS: e.target.value }, '校区'));
        bindChange('#quick-venue', (e) => applyConfigPatch({ PREFERRED_VENUE: e.target.value }, '场馆'));

        editor.querySelectorAll('.szu-quick-time input').forEach(cb => {
            cb.addEventListener('change', () => {
                const selected = Array.from(editor.querySelectorAll('.szu-quick-time input:checked')).map(input => input.value);
                if (!selected.length) {
                    cb.checked = true;
                    addLog('⚠️ 至少保留一个时间段', 'warning');
                    return;
                }
                applyConfigPatch({ PREFERRED_TIMES: selected }, '时间段');
            });
        });
    }

    function bindEvents(panel) {
        Interaction.bind(panel.querySelector('#close-panel'), togglePanel);

        Interaction.bind(panel.querySelector('#toggle-theme'), () => {
            ThemeManager.toggle();
        });

        Interaction.bind(panel.querySelector('#toggle-config'), () => {
            const area = document.getElementById('config-area');
            const btn = panel.querySelector('#toggle-config');
            if (!area.classList.contains('is-open')) {
                closeQuickEditor();
                closeTipsPopover();
                openFloatingPopover(area, btn, { width: Device.isMobile ? 340 : 380 });
                btn.innerHTML = `${I.gear(13)} 隐藏设置`;
            } else {
                closeConfigPopover();
            }
        });

        const updateVenueDisplay = () => {
            const sport = document.getElementById('sport-type').value;
            const campus = document.getElementById('campus').value;
            const venueSelection = document.getElementById('venue-selection');
            const venueDisplay = document.getElementById('venue-display');
            const preferredVenueSelect = document.getElementById('preferred-venue');

            const show = shouldShowVenueSelection(sport, campus);

            if (venueSelection) venueSelection.style.display = show ? 'block' : 'none';
            if (venueDisplay) venueDisplay.style.display = show ? 'flex' : 'none';

            // 更新场馆选项
            if (preferredVenueSelect && show) {
                const options = getVenueOptions(sport, campus);
                preferredVenueSelect.innerHTML = options.map(opt =>
                    `<option value="${opt.value}">${opt.label}</option>`
                ).join('');
            }
        };

        document.getElementById('sport-type').addEventListener('change', updateVenueDisplay);
        document.getElementById('campus').addEventListener('change', updateVenueDisplay);

        panel.querySelectorAll('[data-quick]').forEach(el => {
            Interaction.bind(el, () => openQuickEditor(el.dataset.quick, el));
        });

        Interaction.bind(document.getElementById('save-config'), () => {
            updateConfigFromUI();
            updateDisplayConfig();
            addLog('💾 配置已保存', 'success');

            const area = document.getElementById('config-area');
            const btn = panel.querySelector('#toggle-config');
            if (area && btn) {
                closeConfigPopover();
            }
        });

        Interaction.bind(panel.querySelector('#start-btn'), () => {
            if (isRunning) {
                // 停止预约
                addLog(`⏹️ 正在停止预约...`, 'info');
                stopBooking();
            } else {
                // 开始预约前先更新配置
                updateConfigFromUI();

                // 验证配置
                if (!validateConfig()) {
                    addLog(`❌ 配置验证失败，请检查配置`, 'error');
                    return;
                }

                startBooking();
            }
        });

        Interaction.bind(panel.querySelector('#set-schedule-btn'), () => {
            const dateInput = panel.querySelector('#scheduled-date').value;
            const timeInput = panel.querySelector('#scheduled-time').value;

            if (!dateInput || !timeInput) {
                addLog('❌ 请选择定时日期和时间', 'error');
                return;
            }

            // 构建完整的日期时间字符串
            const dateTimeString = `${dateInput}T${timeInput}:00`;
            const targetTime = new Date(dateTimeString).getTime();

            // 验证日期有效性
            if (isNaN(targetTime)) {
                addLog('❌ 日期时间格式无效', 'error');
                return;
            }

            // 检查是否是未来时间
            const now = Date.now();
            if (targetTime <= now) {
                addLog('❌ 定时时间必须晚于当前时间', 'error');
                addLog(`ℹ️ 当前时间: ${new Date(now).toLocaleString('zh-CN')}`, 'info');
                addLog(`ℹ️ 设置时间: ${new Date(targetTime).toLocaleString('zh-CN')}`, 'info');
                return;
            }

            if (ScheduledTask.set(targetTime)) {
                startCountdown();
            }
        });

        Interaction.bind(panel.querySelector('#cancel-schedule-btn'), () => {
            ScheduledTask.clear();
            stopCountdown();
            updateCountdownDisplay('未设置定时任务');
            addLog('❌ 已取消定时任务', 'info');
        });

        if (!Device.isMobile) {
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                    e.preventDefault();
                    panel.querySelector('#start-btn').click();
                } else if (e.ctrlKey && e.shiftKey && e.key === 'H') {
                    e.preventDefault();
                    togglePanel();
                }
            });
        }

        // 预约小贴士 展开/折叠
        Interaction.bind(panel.querySelector('#tips-toggle'), () => {
            const content = document.getElementById('tips-content');
            const arrow = panel.querySelector('#tips-arrow');
            if (!content.classList.contains('is-open')) {
                closeQuickEditor();
                closeConfigPopover();
                openFloatingPopover(content, panel.querySelector('#tips-toggle'), { width: Device.isMobile ? 320 : 340 });
                arrow.style.transform = 'rotate(180deg)';
                panel.querySelector('#tips-toggle')?.classList.add('is-active');
            } else {
                closeTipsPopover();
            }
        });

        document.addEventListener('click', (event) => {
            const content = document.getElementById('tips-content');
            const toggle = panel.querySelector('#tips-toggle');
            if (!content?.classList.contains('is-open')) return;
            if (content.contains(event.target) || toggle?.contains(event.target)) return;
            closeTipsPopover();
        });
    }

    function updateCountdownDisplay(text) {
        const display = document.getElementById('countdown-display');
        if (display) display.innerHTML = `<span style="display:inline-flex;vertical-align:middle;margin-right:5px;">${I.clock(14)}</span>${text}`;
    }

    function startCountdown() {
        stopCountdown();

        const updateDisplay = () => {
            const remaining = ScheduledTask.getRemaining();
            if (remaining === null) {
                stopCountdown();
                updateCountdownDisplay('未设置定时任务');
                return false;
            }

            // 检查是否需要刷新页面
            if (ScheduledTask.checkRefresh()) {
                return false; // 即将刷新，停止倒计时更新
            }

            const formatted = ScheduledTask.formatRemaining();
            const remainingSeconds = Math.floor(remaining / 1000);

            // 根据剩余时间显示不同的提示
            if (remainingSeconds <= 60 && remainingSeconds > 30) {
                updateCountdownDisplay(`倒计时: ${formatted} (将在30秒时刷新页面)`);
            } else if (remainingSeconds <= 30) {
                updateCountdownDisplay(`倒计时: ${formatted} (即将开始预约)`);
            } else {
                updateCountdownDisplay(`倒计时: ${formatted}`);
            }
            return true;
        };

        // 立即更新一次
        if (!updateDisplay()) return;

        // 每秒更新一次
        countdownInterval = setInterval(() => {
            if (!updateDisplay()) {
                stopCountdown();
            }
        }, 1000);
    }

    function stopCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }

    // ==================== 配置和日志 ====================
    function updateConfigFromUI() {
        const selectedTimes = Array.from(document.querySelectorAll('#time-slots-container input:checked')).map(cb => cb.value);
        const campus = document.getElementById('campus').value;
        const sport = document.getElementById('sport-type').value;

        let venue = '全部';
        if (shouldShowVenueSelection(sport, campus)) {
            venue = document.getElementById('preferred-venue')?.value || '全部';
        }

        CONFIG = normalizeConfig({
            USER_INFO: {
                YYRGH: document.getElementById('user-id').value.trim(),
                YYRXM: document.getElementById('user-name').value.trim()
            },
            TARGET_DATE: document.getElementById('target-date').value,
            SPORT: sport,
            CAMPUS: campus,
            PREFERRED_VENUE: venue,
            PREFERRED_TIMES: selectedTimes,
            RETRY_INTERVAL: parseInt(document.getElementById('retry-interval').value),
            MAX_RETRY_TIMES: parseInt(document.getElementById('max-retry').value),
            REQUEST_TIMEOUT: parseInt(document.getElementById('request-timeout').value),
            YYLX: getYYLX(sport, campus)
        });

        Storage.set('bookingConfig', CONFIG);
        syncConfigToUI();

        updateProgress();

        addLog(`⚙️ 预约模式: ${CONFIG.YYLX === "2.0" ? "团体预约" : "单人散场"}`, 'info');

        if (shouldShowVenueSelection(CONFIG.SPORT, CONFIG.CAMPUS) && CONFIG.PREFERRED_VENUE !== '全部') {
            addLog(`🏟️ 预约场馆: ${CONFIG.PREFERRED_VENUE}`, 'info');
        }
    }

    function updateDisplayConfig() {
        document.getElementById('display-user').textContent = `${CONFIG.USER_INFO.YYRXM} (${CONFIG.USER_INFO.YYRGH})`;

        // 格式化日期为 年/月/日
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        };

        document.getElementById('display-date').textContent = formatDate(CONFIG.TARGET_DATE);
        document.getElementById('display-sport').textContent = CONFIG.SPORT;
        document.getElementById('display-campus').textContent = CONFIG.CAMPUS;
        document.getElementById('display-venue').textContent = CONFIG.PREFERRED_VENUE;
        document.getElementById('display-times').textContent = CONFIG.PREFERRED_TIMES.join(', ');
        document.getElementById('display-interval').textContent = CONFIG.RETRY_INTERVAL;
        document.getElementById('display-retry').textContent = CONFIG.MAX_RETRY_TIMES;
        document.getElementById('display-timeout').textContent = CONFIG.REQUEST_TIMEOUT;

        const venueDisplay = document.getElementById('venue-display');
        if (venueDisplay) {
            venueDisplay.style.display = shouldShowVenueSelection(CONFIG.SPORT, CONFIG.CAMPUS) ? 'flex' : 'none';
        }
    }

    function validateConfig() {
        const errors = [];

        if (!CONFIG.USER_INFO.YYRGH || !CONFIG.USER_INFO.YYRXM) errors.push('请填写用户信息');
        if (!/^\d{3,12}$/.test(CONFIG.USER_INFO.YYRGH)) errors.push('学号格式不正确');
        if (!/^[\u4e00-\u9fa5]{2,20}$/.test(CONFIG.USER_INFO.YYRXM)) errors.push('姓名格式不正确');
        if (!CONFIG.TARGET_DATE) errors.push('请选择日期');
        if (!CONFIG.PREFERRED_TIMES.length) errors.push('请选择时间段');

        errors.forEach(e => addLog(`❌ ${e}`, 'error'));
        if (!errors.length) addLog(`✅ 配置验证通过`, 'success');
        return !errors.length;
    }

    function addLog(msg, type = 'info') {
        const area = document.getElementById('status-area');
        if (!area) return;

        const entry = document.createElement('div');
        entry.className = 'szu-log-entry';

        const typeClasses = {
            info: 'color:var(--szu-log-info-color);background:var(--szu-log-info-bg);border-left:3px solid var(--szu-log-info-border);',
            success: 'color:var(--szu-log-success-color);background:var(--szu-log-success-bg);border-left:3px solid var(--szu-log-success-border);',
            warning: 'color:var(--szu-log-warning-color);background:var(--szu-log-warning-bg);border-left:3px solid var(--szu-log-warning-border);',
            error: 'color:var(--szu-log-error-color);background:var(--szu-log-error-bg);border-left:3px solid var(--szu-log-error-border);'
        };

        entry.style.cssText = `${typeClasses[type]}margin-bottom:6px;padding:4px 8px;border-radius:0 4px 4px 0;word-break:break-all;display:flex;align-items:flex-start;gap:0;`;

        const timeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        entry.innerHTML = `<span style="color:var(--szu-text-subtle);font-size:11px;margin-right:6px;flex-shrink:0;line-height:1.5;">[${timeStr}]</span><span style="display:flex;align-items:center;line-height:1.5;">${I.forLog(msg)}</span>`;

        area.appendChild(entry);
        area.scrollTop = area.scrollHeight;

        while (area.children.length > 50) area.removeChild(area.firstChild);
    }

    function updateProgress() {
        const el = document.getElementById('booking-progress');
        if (el) el.textContent = `${successfulBookings.length}/${getMaxBookings()}`;
    }

    // ==================== 网络请求 ====================
    function getBaseUrl() {
        return window.location.href.includes('webvpn') ?
            'https://ehall-443.webvpn.szu.edu.cn' :
            'https://ehall.szu.edu.cn';
    }

    async function fetchWithTimeout(url, options, timeout = CONFIG.REQUEST_TIMEOUT * 1000) {
        const startTime = Date.now();
        let retry = 0;

        while (retry <= 3) {
            await RequestThrottler.wait();

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                RequestThrottler.onStart();
                const response = await fetch(url, { ...options, signal: controller.signal, credentials: 'same-origin', mode: 'cors', cache: 'no-cache' });
                clearTimeout(timeoutId);
                RequestThrottler.onEnd();

                if (!response.ok) {
                    const result = await NetworkErrorHandler.handle(new Error(`HTTP ${response.status}`), response, retry);
                    if (result.shouldStop) throw new Error('请求终止');
                    if (result.shouldRetry && retry < 3) {
                        retry++;
                        await new Promise(r => setTimeout(r, result.retryDelay));
                        continue;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                RequestThrottler.onEnd();

                if (retry >= 3) throw error;

                const result = await NetworkErrorHandler.handle(error, null, retry);
                if (result.shouldStop || !result.shouldRetry) throw error;

                retry++;
                await new Promise(r => setTimeout(r, result.retryDelay));
            }
        }
    }

    async function getAvailableSlots() {
        try {
            const slots = [];
            const baseUrl = getBaseUrl();
            const remaining = CONFIG.PREFERRED_TIMES.filter(t => !successfulBookings.some(b => b.timeSlot === t));

            if (!remaining.length) return [];

            for (const timeSlot of remaining) {
                const [start, end] = timeSlot.split("-");
                const payload = new URLSearchParams({
                    XMDM: SPORT_CODES[CONFIG.SPORT],
                    YYRQ: CONFIG.TARGET_DATE,
                    YYLX: CONFIG.YYLX,
                    KSSJ: start,
                    JSSJ: end,
                    XQDM: CAMPUS_CODES[CONFIG.CAMPUS]
                });

                const res = await fetchWithTimeout(`${baseUrl}/qljfwapp/sys/lwSzuCgyy/modules/sportVenue/getOpeningRoom.do`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                    body: payload
                });

                const data = await res.json();
                if (data.code !== "0") {
                    addLog(`⚠️ ${timeSlot} 查询失败: ${data.msg || '未知错误'}`, 'warning');
                    continue;
                }

                const rooms = data.datas?.getOpeningRoom?.rows || [];

                rooms.forEach(room => {
                    let isAvailable = false;

                    if (room.disabled === true || room.disabled === "true") {
                        return;
                    }

                    const textValue = String(room.text || '').trim();

                    if (textValue === "可预约") {
                        isAvailable = true;
                    } else if (/^\d+\/\d+$/.test(textValue)) {
                        const [remaining, total] = textValue.split('/').map(n => parseInt(n.trim()));
                        isAvailable = remaining > 0 && remaining <= total;
                    }

                    if (!isAvailable) return;

                    const fullName = room.CGBM_DISPLAY || room.CDMC || '';

                    // 模块化场馆过滤逻辑
                    if (shouldShowVenueSelection(CONFIG.SPORT, CONFIG.CAMPUS) && CONFIG.PREFERRED_VENUE !== "全部") {
                        const venueFilter = VENUE_CONFIG[CONFIG.SPORT]?.[CONFIG.CAMPUS]?.filter;
                        if (venueFilter && !venueFilter(fullName, CONFIG.PREFERRED_VENUE)) {
                            return; // 如果不匹配预约场馆，则跳过
                        }
                    }

                    let venuePriority = 2, courtPriority = 0;

                    if (CONFIG.CAMPUS === "丽湖") {
                        if (CONFIG.SPORT === "羽毛球") {
                            if (fullName.includes("至畅")) {
                                venuePriority = 0;
                                const name = room.CDMC || '';
                                if (name.includes("5号场") || name.includes("五号场")) courtPriority = -2;
                                else if (name.includes("10号场") || name.includes("十号场")) courtPriority = -1;
                                else if (name.match(/[^0-9]1号场|^1号场|一号场/) || name.includes("6号场") || name.includes("六号场")) courtPriority = 2;
                            } else if (fullName.includes("至快")) {
                                venuePriority = 1;
                            }
                        }
                    } else if (CONFIG.CAMPUS === "粤海") {
                        if (CONFIG.SPORT === "篮球") {
                            venuePriority = 0;
                            courtPriority = 0;
                        } else if (CONFIG.SPORT === "网球") {
                            if (fullName.includes("海边")) {
                                venuePriority = 0;
                            } else if (fullName.includes("北区")) {
                                venuePriority = 1;
                            }
                        }
                    }

                    let availableCount = null;
                    if (/^\d+\/\d+$/.test(textValue)) {
                        const [remaining, total] = textValue.split('/').map(n => parseInt(n.trim()));
                        availableCount = remaining;
                    }

                    slots.push({
                        wid: room.WID,
                        timeSlot,
                        startTime: start,
                        endTime: end,
                        venueName: room.CDMC || '',
                        venueFullName: fullName,
                        venueCode: room.CGBM || '',
                        priority: CONFIG.PREFERRED_TIMES.indexOf(timeSlot),
                        venuePriority,
                        courtPriority,
                        availableCount
                    });
                });
            }

            slots.sort((a, b) => a.courtPriority - b.courtPriority || a.venuePriority - b.venuePriority || a.priority - b.priority);
            return slots;
        } catch (error) {
            addLog(`🔥 获取场地失败: ${error.message}`, 'error');
            return [];
        }
    }

    async function bookSlot(slot) {
        try {
            const { wid, timeSlot, startTime, endTime, venueName, venueCode, venueFullName } = slot;

            if (!timeSlot || !venueCode) {
                addLog(`❌ 预约参数缺失`, 'error');
                return false;
            }

            const payload = new URLSearchParams({
                DHID: "",
                YYRGH: CONFIG.USER_INFO.YYRGH,
                CYRS: "",
                YYRXM: CONFIG.USER_INFO.YYRXM,
                CGDM: venueCode,
                CDWID: wid,
                XMDM: SPORT_CODES[CONFIG.SPORT],
                XQWID: CAMPUS_CODES[CONFIG.CAMPUS],
                KYYSJD: timeSlot,
                YYRQ: CONFIG.TARGET_DATE,
                YYLX: CONFIG.YYLX,
                YYKS: `${CONFIG.TARGET_DATE} ${startTime}`,
                YYJS: `${CONFIG.TARGET_DATE} ${endTime}`,
                PC_OR_PHONE: "pc"
            });

            const res = await fetchWithTimeout(`${getBaseUrl()}/qljfwapp/sys/lwSzuCgyy/sportVenue/insertVenueBookingInfo.do`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                body: payload
            });

            const contentType = res.headers.get('content-type') || '';

            if (contentType.includes('text/html')) {
                const html = await res.text();
                const errorMatch = html.match(/<h4>出错信息：<\/h4>[\s\S]*?<div class="bh-text-caption bh-color-caption">\s*(.*?)\s*<\/div>/);
                const errorMsg = errorMatch ? errorMatch[1].trim() : '系统异常';

                addLog(`⚠️ ${errorMsg}`, 'warning');

                if (errorMsg.includes('已预约该场地的相同时间段') || errorMsg.includes('已预约')) {
                    addLog(`📌 ${timeSlot} 已预约过，跳过`, 'info');
                    successfulBookings.push({
                        timeSlot,
                        venueName: '已预约',
                        dhid: 'duplicate',
                        slotName: `${timeSlot} (重复)`
                    });
                    updateProgress();
                    return 'already_booked';
                }

                return false;
            }

            const result = await res.json();

            if (result.code === "0" && result.msg === "成功") {
                const dhid = result.data?.DHID || "Unknown";
                const displayName = venueFullName ? `${venueFullName}-${venueName}` : venueName;

                addLog(`🎉 预约成功！场地：${displayName}`, 'success');
                addLog(`📋 预约单号：${dhid}`, 'success');

                successfulBookings.push({ timeSlot, venueName: displayName, dhid, slotName: displayName });
                updateProgress();

                WeChatNotifier.sendSuccess({
                    userName: CONFIG.USER_INFO.YYRXM,
                    userId: CONFIG.USER_INFO.YYRGH,
                    date: CONFIG.TARGET_DATE,
                    sport: CONFIG.SPORT,
                    campus: CONFIG.CAMPUS,
                    venueName: displayName,
                    timeSlot,
                    dhid
                });

                return true;
            } else {
                addLog(`❌ 预约失败：${result.msg}`, 'error');
                if (result.msg?.includes("只能预订2次") || result.msg?.includes("超过限制")) {
                    addLog(`🎊 已达预约上限`, 'success');
                    return 'limit_reached';
                }
                return false;
            }
        } catch (error) {
            if (error.message.includes('JSON') || error.message.includes('Unexpected token')) {
                addLog(`⚠️ 服务器返回异常格式`, 'warning');
                return false;
            }
            addLog(`💥 预约异常: ${error.message}`, 'error');
            return false;
        }
    }

    // ==================== 主流程 ====================
    async function startBooking() {
        if (isRunning) {
            addLog(`⚠️ 正在预约中，请勿重复点击`, 'warning');
            return;
        }

        // 重置状态 - 关键修复
        isRunning = true;
        retryCount = 0;
        successfulBookings = []; // 清空之前的预约记录
        startTime = new Date();
        const max = getMaxBookings();

        SmartRetry.reset();
        RequestThrottler.reset(); // 重置请求频率控制器

        const btn = document.getElementById('start-btn');
        if (btn) {
            btn.innerHTML = `${I.stop(15)} 停止预约`;
            btn.style.background = 'var(--szu-btn-stop-bg)';
            btn.style.borderColor = 'var(--szu-btn-stop-border, var(--szu-btn-stop-bg))';
            btn.style.color = '#ffffff';
        }

        // 更新进度显示
        updateProgress();

        // 格式化日期显示
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        };

        addLog(`🚀 开始预约！`, 'success');
        addLog(`📊 ${CONFIG.SPORT} | ${CONFIG.CAMPUS} | ${formatDate(CONFIG.TARGET_DATE)}`, 'info');
        addLog(`⏰ 目标时段: ${CONFIG.PREFERRED_TIMES.join(', ')}`, 'info');

        if (shouldShowVenueSelection(CONFIG.SPORT, CONFIG.CAMPUS) && CONFIG.PREFERRED_VENUE !== "全部") {
            addLog(`🏟️ 预约场馆: ${CONFIG.PREFERRED_VENUE}`, 'info');
        }

        try {
            while (isRunning && retryCount < CONFIG.MAX_RETRY_TIMES) {
                if (successfulBookings.length >= max) {
                    addLog(`🎊 成功预约 ${max} 个时段，已达上限`, 'success');
                    break;
                }

                retryCount++;
                if (retryCount === 1 || retryCount % 10 === 0) {
                    addLog(`🔍 第 ${retryCount} 次查询 (${successfulBookings.length}/${max})`);
                }

                try {
                    const slots = await getAvailableSlots();

                    if (slots.length) {
                        SmartRetry.onSuccess();
                        addLog(`🎉 找到 ${slots.length} 个可预约场地`, 'success');

                        const groups = {};
                        slots.forEach(s => {
                            if (!groups[s.timeSlot]) groups[s.timeSlot] = [];
                            groups[s.timeSlot].push(s);
                        });

                        for (const time of CONFIG.PREFERRED_TIMES) {
                            if (successfulBookings.length >= max) break;
                            if (successfulBookings.some(b => b.timeSlot === time)) continue;

                            if (groups[time]) {
                                groups[time].sort((a, b) => a.courtPriority - b.courtPriority || a.venuePriority - b.venuePriority);
                                const result = await bookSlot(groups[time][0]);

                                if (result === 'limit_reached') {
                                    addLog(`🏁 已达预约上限，停止预约`, 'success');
                                    break;
                                }
                                if (result === 'already_booked') {
                                    continue;
                                }
                                if (result === true) {
                                    addLog(`✅ ${time} 预约成功 (${successfulBookings.length}/${max})`, 'success');
                                }

                                await new Promise(r => setTimeout(r, 500));
                            }
                        }
                    } else {
                        SmartRetry.onFailure();
                        if (retryCount <= 3 || retryCount % 20 === 0) {
                            addLog(`🔍 暂无可预约场地，继续查询...`, 'warning');
                        }
                    }
                } catch (error) {
                    SmartRetry.onFailure();
                    if (NetworkErrorHandler.categorize(error) === 'auth_error') {
                        addLog(`🔐 认证错误，请重新登录`, 'error');
                        break;
                    }
                }

                if (successfulBookings.length < max && isRunning) {
                    const interval = CONFIG.RETRY_INTERVAL * 1000 + (Math.random() * 200 - 100);
                    await new Promise(r => setTimeout(r, Math.max(100, interval)));
                }
            }
        } finally {
            stopBooking();
        }
    }

    function stopBooking() {
        if (!isRunning) return;

        isRunning = false;

        if (Device.isMobile) MobileOptimization.cleanup();

        const btn = document.getElementById('start-btn');
        if (btn) {
            btn.innerHTML = `${I.play(15)} 开始预约`;
            btn.style.background = 'var(--szu-btn-primary-bg)';
            btn.style.borderColor = 'var(--szu-btn-primary-bg)';
            btn.style.color = 'var(--szu-btn-primary-text)';
        }

        const max = getMaxBookings();
        const realBookings = successfulBookings.filter(b => b.dhid !== 'duplicate');

        if (realBookings.length) {
            addLog(`🎉 成功预约 ${realBookings.length}/${max} 个时段`, 'success');
            realBookings.forEach((b, i) => addLog(`${i + 1}. ${b.slotName} (${b.dhid})`, 'success'));
        } else {
            addLog(`😢 未成功预约任何场地`, 'warning');
        }

        const elapsed = startTime ? Math.round((new Date() - startTime) / 1000) : 0;
        addLog(`📊 运行 ${elapsed} 秒，查询 ${retryCount} 次`, 'info');
        addLog(`✅ 预约已停止，可重新配置并开始`, 'info');
    }

    // ==================== 初始化 ====================
    function init() {
        const url = window.location.href;
        if (!url.includes('ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy') &&
            !url.includes('ehall-443.webvpn.szu.edu.cn/qljfwapp/sys/lwSzuCgyy')) return;

        const cleaned = Storage.cleanup();
        if (cleaned) addLog(`🧹 清理 ${cleaned} 个过期项`, 'info');

        const getTodayDateTime = () => {
            const d = new Date();
            const date = d.toISOString().split('T')[0];
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return { date, time: `${hours}:${minutes}` };
        };

        // 设置默认定时时间为当前时间的下一个小时
        const defaultDateTime = getTodayDateTime();

        if (Device.isMobile) MobileOptimization.init();
        SmartRetry.reset();

        ThemeManager.init();

        // 删除这行，不要自动更新日期
        // CONFIG.TARGET_DATE = getTomorrowDate();

        floatingButton = createFloatingButton();
        controlPanel = createControlPanel();
        updateDisplayConfig();

        ThemeManager.apply();

        // 删除这行，使用配置中的日期
        // document.getElementById('target-date').value = getTomorrowDate();

        // 确保UI显示当前配置的日期
        document.getElementById('target-date').value = CONFIG.TARGET_DATE;

        const scheduledDateInput = document.getElementById('scheduled-date');
        const scheduledTimeInput = document.getElementById('scheduled-time');

        const savedScheduledTime = Storage.get('scheduledTime', null);
        const hasSavedSchedule = typeof savedScheduledTime === 'number' && savedScheduledTime > Date.now();

        const pad2 = (n) => String(n).padStart(2, '0');
        const formatLocalDateInput = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        const formatLocalTimeInput = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

        if (scheduledDateInput && scheduledTimeInput) {
            if (hasSavedSchedule) {
                const d = new Date(savedScheduledTime);
                scheduledDateInput.value = formatLocalDateInput(d);
                scheduledTimeInput.value = formatLocalTimeInput(d);
            } else {
                scheduledDateInput.value = defaultDateTime.date;
                const nextHour = new Date();
                nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
                scheduledTimeInput.value = `${pad2(nextHour.getHours())}:00`;
            }
        }

        // 检查是否是预约前刷新恢复的状态
        const refreshData = Storage.get('needRefresh', null);
        // 检查刷新标记是否有效（5分钟内触发的刷新）
        const isValidRefresh = refreshData &&
            refreshData.triggered &&
            refreshData.timestamp &&
            (Date.now() - refreshData.timestamp < 5 * 60 * 1000);

        if (refreshData) {
            Storage.remove('needRefresh');
            if (isValidRefresh) {
                addLog('✅ 页面已刷新，会话保持活跃', 'success');
                addLog(`📅 预约日期: ${formatDateDisplay(CONFIG.TARGET_DATE)}`, 'info');
                addLog(`🏟️ ${CONFIG.SPORT} | ${CONFIG.CAMPUS}`, 'info');
            }
        }

        // 恢复定时任务
        if (ScheduledTask.restore()) {
            startCountdown();
            if (isValidRefresh) {
                addLog(`🔄 定时任务已恢复，继续倒计时`, 'success');
            } else {
                addLog(`🔄 已恢复定时任务`, 'success');
            }
        }

        addLog(`🎮 预约助手已就绪 (${Device.isIPad ? 'iPad' : (Device.isMobile ? '移动端' : '桌面端')})`, 'success');
    }

    // 添加一个格式化日期显示的辅助函数
    function formatDateDisplay(dateStr) {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }
})();
