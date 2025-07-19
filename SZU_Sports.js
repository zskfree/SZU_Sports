// ==UserScript==
// @name         深圳大学体育场馆自动抢票
// @namespace    http://tampermonkey.net/

// @version      1.1.5
// @description  深圳大学体育场馆自动预约脚本 - iOS、安卓、移动端、桌面端完全兼容
// @author       zskfree
// @match        https://ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/*
// @match        https://ehall-443.webvpn.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/*
// @icon         🎾
// @grant        none
// @run-at       document-end
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/537386/%E6%B7%B1%E5%9C%B3%E5%A4%A7%E5%AD%A6%E4%BD%93%E8%82%B2%E5%9C%BA%E9%A6%86%E8%87%AA%E5%8A%A8%E6%8A%A2%E7%A5%A8.user.js
// @updateURL https://update.greasyfork.org/scripts/537386/%E6%B7%B1%E5%9C%B3%E5%A4%A7%E5%AD%A6%E4%BD%93%E8%82%B2%E5%9C%BA%E9%A6%86%E8%87%AA%E5%8A%A8%E6%8A%A2%E7%A5%A8.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // 更精确的设备检测
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isIPad = /iPad/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // 修改触摸设备检测逻辑，优先判断移动设备
    const isTouchDevice = isMobile || isIPad || (navigator.maxTouchPoints > 0 && /Android|Mobile/i.test(userAgent));

    console.log('设备检测:', { isMobile, isIOS, isIPad, isTouchDevice });

    // 替换现有的 Storage 对象
    const Storage = {
        prefix: 'szu_sports_',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
        compressionThreshold: 1024, // 1KB以上进行压缩
        
        set: function(key, value) {
            const fullKey = this.prefix + key;
            const data = {
                value: value,
                timestamp: Date.now(),
                version: '1.1.5'
            };
            
            let serializedData = JSON.stringify(data);
            
            // 如果数据较大，尝试压缩（简单压缩）
            if (serializedData.length > this.compressionThreshold) {
                try {
                    // 移除重复的空格和换行符
                    serializedData = JSON.stringify(data, null, 0);
                } catch (e) {
                    console.warn('数据压缩失败:', e);
                }
            }
            
            // 尝试 localStorage
            try {
                localStorage.setItem(fullKey, serializedData);
                return true;
            } catch (e) {
                console.warn('localStorage 存储失败:', e);
                
                // 清理过期数据后重试
                try {
                    this.cleanup();
                    localStorage.setItem(fullKey, serializedData);
                    return true;
                } catch (e2) {
                    console.warn('清理后重试失败，尝试 sessionStorage');
                    
                    // 回退到 sessionStorage
                    try {
                        sessionStorage.setItem(fullKey, serializedData);
                        return true;
                    } catch (e3) {
                        console.warn('sessionStorage 也失败，使用内存存储');
                        
                        // 最后回退到 Map 结构的内存存储
                        if (!window.memoryStorage) {
                            window.memoryStorage = new Map();
                        }
                        window.memoryStorage.set(fullKey, data);
                        return true;
                    }
                }
            }
        },
        
        get: function(key, defaultValue = null) {
            const fullKey = this.prefix + key;
            
            // 尝试 localStorage
            try {
                const item = localStorage.getItem(fullKey);
                if (item !== null) {
                    const data = JSON.parse(item);
                    
                    // 检查版本兼容性
                    if (data.version && data.version !== '1.1.5') {
                        console.warn(`配置版本不匹配: ${data.version} -> 1.1.5，使用默认值`);
                        this.remove(key); // 清理旧版本数据
                        return defaultValue;
                    }
                    
                    // 检查数据是否过期
                    if (data.timestamp && Date.now() - data.timestamp > this.maxAge) {
                        console.warn(`数据已过期: ${key}`);
                        this.remove(key);
                        return defaultValue;
                    }
                    
                    return data.value !== undefined ? data.value : data; // 兼容旧格式
                }
            } catch (e) {
                console.warn('读取 localStorage 失败:', e);
                this.remove(key); // 清理损坏的数据
            }
            
            // 尝试 sessionStorage
            try {
                const item = sessionStorage.getItem(fullKey);
                if (item !== null) {
                    const data = JSON.parse(item);
                    return data.value !== undefined ? data.value : data;
                }
            } catch (e) {
                console.warn('读取 sessionStorage 失败:', e);
            }
            
            // 尝试内存存储
            if (window.memoryStorage && window.memoryStorage.has && window.memoryStorage.has(fullKey)) {
                const data = window.memoryStorage.get(fullKey);
                return data.value !== undefined ? data.value : data;
            } else if (window.memoryStorage && window.memoryStorage[fullKey] !== undefined) {
                // 兼容旧版本的对象格式
                return window.memoryStorage[fullKey];
            }
            
            return defaultValue;
        },
        
        remove: function(key) {
            const fullKey = this.prefix + key;
            
            try {
                localStorage.removeItem(fullKey);
            } catch (e) {
                console.warn('清理 localStorage 失败:', e);
            }
            
            try {
                sessionStorage.removeItem(fullKey);
            } catch (e) {
                console.warn('清理 sessionStorage 失败:', e);
            }
            
            if (window.memoryStorage) {
                if (window.memoryStorage.delete) {
                    window.memoryStorage.delete(fullKey);
                } else {
                    delete window.memoryStorage[fullKey];
                }
            }
        },
        
        // 清理过期数据
        cleanup: function() {
            const now = Date.now();
            let cleanedCount = 0;
            
            // 清理 localStorage
            try {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        try {
                            const data = JSON.parse(localStorage.getItem(key));
                            if (data.timestamp && now - data.timestamp > this.maxAge) {
                                localStorage.removeItem(key);
                                cleanedCount++;
                            }
                        } catch (e) {
                            // 损坏的数据，直接删除
                            localStorage.removeItem(key);
                            cleanedCount++;
                        }
                    }
                }
            } catch (e) {
                console.warn('清理 localStorage 失败:', e);
            }
            
            // 清理 sessionStorage 中的过期数据
            try {
                for (let i = sessionStorage.length - 1; i >= 0; i--) {
                    const key = sessionStorage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        try {
                            const data = JSON.parse(sessionStorage.getItem(key));
                            if (data.timestamp && now - data.timestamp > this.maxAge) {
                                sessionStorage.removeItem(key);
                                cleanedCount++;
                            }
                        } catch (e) {
                            sessionStorage.removeItem(key);
                            cleanedCount++;
                        }
                    }
                }
            } catch (e) {
                console.warn('清理 sessionStorage 失败:', e);
            }
            
            if (cleanedCount > 0) {
                console.log(`清理了 ${cleanedCount} 个过期数据项`);
            }
            
            return cleanedCount;
        },
        
        // 获取存储使用情况
        getStorageInfo: function() {
            const info = {
                localStorage: { used: 0, available: false },
                sessionStorage: { used: 0, available: false },
                memoryStorage: { used: 0, available: false }
            };
            
            // 检查 localStorage
            try {
                const testKey = this.prefix + 'storage_test';
                localStorage.setItem(testKey, 'test');
                localStorage.removeItem(testKey);
                info.localStorage.available = true;
                
                // 计算使用量
                let usedSize = 0;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        usedSize += localStorage.getItem(key).length;
                    }
                }
                info.localStorage.used = usedSize;
            } catch (e) {
                info.localStorage.available = false;
            }
            
            // 检查 sessionStorage
            try {
                const testKey = this.prefix + 'storage_test';
                sessionStorage.setItem(testKey, 'test');
                sessionStorage.removeItem(testKey);
                info.sessionStorage.available = true;
                
                let usedSize = 0;
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        usedSize += sessionStorage.getItem(key).length;
                    }
                }
                info.sessionStorage.used = usedSize;
            } catch (e) {
                info.sessionStorage.available = false;
            }
            
            // 检查内存存储
            if (window.memoryStorage) {
                info.memoryStorage.available = true;
                if (window.memoryStorage.size) {
                    info.memoryStorage.used = window.memoryStorage.size;
                } else {
                    info.memoryStorage.used = Object.keys(window.memoryStorage).length;
                }
            }
            
            return info;
        }
    };

    // 在现有 Storage 对象后添加网络错误处理器
    const NetworkErrorHandler = {
        // 错误类型分类
        categorizeError: function (error, response = null) {
            if (response) {
                if (response.status === 429) return 'rate_limit';
                if (response.status >= 500) return 'server_error';
                if (response.status === 401 || response.status === 403) return 'auth_error';
                if (response.status === 404) return 'not_found';
                if (response.status >= 400) return 'client_error';
            }

            if (error.name === 'AbortError') return 'timeout';
            if (error.message.includes('网络')) return 'network_error';
            if (error.message.includes('超时')) return 'timeout';

            return 'unknown_error';
        },

        // 根据错误类型决定是否应该重试
        shouldRetry: function (errorType, retryCount = 0) {
            const maxRetries = {
                'rate_limit': 3,
                'server_error': 5,
                'network_error': 3,
                'timeout': 3,
                'unknown_error': 2
            };

            const noRetry = ['auth_error', 'not_found', 'client_error'];

            if (noRetry.includes(errorType)) return false;
            return retryCount < (maxRetries[errorType] || 1);
        },

        // 获取重试延迟时间
        getRetryDelay: function (errorType, retryCount = 0) {
            const baseDelays = {
                'rate_limit': 5000,     // 5秒
                'server_error': 3000,   // 3秒
                'network_error': 2000,  // 2秒
                'timeout': 1000,        // 1秒
                'unknown_error': 2000   // 2秒
            };

            const baseDelay = baseDelays[errorType] || 2000;
            // 指数退避，但有上限
            return Math.min(baseDelay * Math.pow(1.5, retryCount), 30000);
        },

        // 处理网络错误的统一方法
        handleError: async function (error, response = null, retryCount = 0, operation = 'request') {
            const errorType = this.categorizeError(error, response);

            // 记录错误日志
            const errorMsg = response
                ? `HTTP ${response.status}: ${response.statusText || '网络错误'}`
                : error.message;

            addLog(`❌ ${operation}失败: ${errorMsg}`, 'error');

            // 特殊错误处理
            switch (errorType) {
                case 'auth_error':
                    addLog(`🔐 认证失败，请检查登录状态`, 'error');
                    if (isRunning) stopBooking();
                    return { shouldStop: true, shouldRetry: false };

                case 'rate_limit':
                    addLog(`⏰ 请求过于频繁，等待${this.getRetryDelay(errorType, retryCount) / 1000}秒后重试`, 'warning');
                    break;

                case 'server_error':
                    addLog(`🔧 服务器错误，可能是系统维护`, 'warning');
                    break;

                case 'network_error':
                    addLog(`🌐 网络连接异常，请检查网络`, 'warning');
                    break;

                case 'timeout':
                    addLog(`⏰ 请求超时，可能是网络较慢`, 'warning');
                    break;
            }

            const shouldRetry = this.shouldRetry(errorType, retryCount);
            const retryDelay = shouldRetry ? this.getRetryDelay(errorType, retryCount) : 0;

            return {
                shouldStop: false,
                shouldRetry,
                retryDelay,
                errorType
            };
        }
    };

    // 在 NetworkErrorHandler 后添加请求频率控制器
    const RequestThrottler = {
        requests: [],
        maxRequestsPerSecond: 2,        // 每秒最大请求数
        maxConcurrentRequests: 3,       // 最大并发请求数
        currentRequests: 0,             // 当前进行中的请求数
        adaptiveMode: true,             // 自适应模式

        // 清理过期的请求记录
        cleanup: function () {
            const now = Date.now();
            this.requests = this.requests.filter(time => now - time < 1000);
        },

        // 检查是否可以发送请求
        canMakeRequest: function () {
            this.cleanup();
            return this.requests.length < this.maxRequestsPerSecond &&
                this.currentRequests < this.maxConcurrentRequests;
        },

        // 获取需要等待的时间
        getWaitTime: function () {
            if (this.currentRequests >= this.maxConcurrentRequests) {
                return 1000; // 等待1秒
            }

            this.cleanup();
            if (this.requests.length >= this.maxRequestsPerSecond) {
                const oldestRequest = Math.min(...this.requests);
                return Math.max(0, 1000 - (Date.now() - oldestRequest));
            }

            return 0;
        },

        // 自适应调整频率限制
        adaptFrequency: function (success = true, responseTime = 0) {
            if (!this.adaptiveMode) return;

            if (success && responseTime < 1000) {
                // 请求成功且响应快，可以适当提高频率
                this.maxRequestsPerSecond = Math.min(this.maxRequestsPerSecond + 0.1, 3);
            } else if (!success || responseTime > 3000) {
                // 请求失败或响应慢，降低频率
                this.maxRequestsPerSecond = Math.max(this.maxRequestsPerSecond - 0.2, 1);
            }
        },

        // 请求开始时调用
        onRequestStart: function () {
            this.requests.push(Date.now());
            this.currentRequests++;
        },

        // 请求结束时调用
        onRequestEnd: function (success = true, responseTime = 0) {
            this.currentRequests = Math.max(0, this.currentRequests - 1);
            this.adaptFrequency(success, responseTime);
        },

        // 等待直到可以发送请求
        waitForSlot: async function () {
            while (!this.canMakeRequest()) {
                const waitTime = this.getWaitTime();
                if (waitTime > 0) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        },

        // 重置频率限制（在错误后使用）
        reset: function () {
            this.requests = [];
            this.currentRequests = 0;
            this.maxRequestsPerSecond = 2;
            addLog(`🔄 请求频率已重置`, 'info');
        }
    };

    // 在 RequestThrottler 后添加智能重试机制
    const SmartRetry = {
        consecutiveFailures: 0,
        lastSuccessTime: Date.now(),
        baseInterval: 1000, // 基础间隔1秒
        maxInterval: 30000, // 最大间隔30秒
        adaptiveMode: true,

        // 重置重试状态
        reset: function () {
            this.consecutiveFailures = 0;
            this.lastSuccessTime = Date.now();
            this.baseInterval = CONFIG.RETRY_INTERVAL * 1000;
            addLog(`🔄 重试机制已重置`, 'info');
        },

        // 记录成功
        onSuccess: function () {
            if (this.consecutiveFailures > 0) {
                addLog(`✅ 恢复正常，重置重试策略`, 'success');
            }
            this.consecutiveFailures = 0;
            this.lastSuccessTime = Date.now();
        },

        // 记录失败
        onFailure: function (errorType = 'unknown') {
            this.consecutiveFailures++;

            // 根据错误类型调整策略
            if (errorType === 'rate_limit') {
                this.consecutiveFailures = Math.min(this.consecutiveFailures + 2, 10); // 限频错误加重惩罚
            } else if (errorType === 'network_error') {
                this.consecutiveFailures = Math.min(this.consecutiveFailures + 1, 8);
            }
        },

        // 获取下一次重试间隔
        getNextInterval: function () {
            if (this.consecutiveFailures === 0) {
                return this.baseInterval;
            }

            // 指数退避，但有上限
            const backoffMultiplier = Math.min(Math.pow(1.5, this.consecutiveFailures), 20);
            const interval = Math.min(this.baseInterval * backoffMultiplier, this.maxInterval);

            // 添加随机抖动，避免所有客户端同时重试
            const jitter = Math.random() * 0.3 + 0.85; // 85%-115%的随机抖动

            return Math.floor(interval * jitter);
        },

        // 判断是否应该继续重试 - 修改为始终返回true
        shouldContinue: function () {
            // 只在连续失败过多时给出提示，但不停止
            if (this.consecutiveFailures >= 15) {
                addLog(`⚠️ 连续失败${this.consecutiveFailures}次，但继续尝试`, 'warning');
            }

            // 移除长时间无成功的限制，只给出提示
            const timeSinceLastSuccess = Date.now() - this.lastSuccessTime;
            if (timeSinceLastSuccess > 10 * 60 * 1000) { // 10分钟
                addLog(`⏰ 超过10分钟无成功响应，继续尝试中...`, 'warning');
            }

            // 始终返回true，让程序按照用户设置的MAX_RETRY_TIMES运行
            return true;
        },

        // 获取重试建议 - 移除暂停机制，直接按参数运行
        getRetryAdvice: function () {
            return {
                shouldPause: false,
                pauseDuration: 0,
                message: '按设定参数持续运行'
            };
        },

        // 动态调整重试间隔
        updateInterval: function () {
            if (!this.adaptiveMode) return;

            // 根据当前时间调整间隔
            const hour = new Date().getHours();
            if (hour >= 12 && hour <= 13) {
                // 高峰期适当延长间隔
                this.baseInterval = Math.max(CONFIG.RETRY_INTERVAL * 1000, 2000);
            } else {
                this.baseInterval = CONFIG.RETRY_INTERVAL * 1000;
            }
        }
    };


    // 添加移动端专用功能
    const MobileOptimization = {
        wakeLock: null,
        isVisible: true,
        lastActivity: Date.now(),
        heartbeatInterval: null,
        
        // 初始化移动端优化
        init: function() {
            if (!isMobile) return;
            
            addLog(`📱 启用移动端优化`, 'info');
            
            // 请求屏幕唤醒锁
            this.requestWakeLock();
            
            // 监听页面可见性变化
            this.setupVisibilityMonitor();
            
            // 启动心跳机制
            this.startHeartbeat();
            
            // 监听电池状态（如果支持）
            this.setupBatteryMonitor();
            
            // 设置触摸反馈
            this.setupTouchFeedback();
            
            // 优化滚动性能
            this.optimizeScrolling();
        },
        
        // 请求屏幕唤醒锁
        requestWakeLock: async function() {
            if ('wakeLock' in navigator) {
                try {
                    this.wakeLock = await navigator.wakeLock.request('screen');
                    addLog(`🔆 屏幕保持唤醒已启用`, 'success');
                    
                    this.wakeLock.addEventListener('release', () => {
                        addLog(`😴 屏幕唤醒锁已释放`, 'warning');
                        // 如果还在运行，尝试重新获取
                        if (isRunning) {
                            setTimeout(() => this.requestWakeLock(), 1000);
                        }
                    });
                } catch (err) {
                    addLog(`⚠️ 无法获取屏幕唤醒锁: ${err.message}`, 'warning');
                }
            } else {
                addLog(`📱 当前浏览器不支持屏幕唤醒锁`, 'info');
            }
        },
        
        // 释放屏幕唤醒锁
        releaseWakeLock: function() {
            if (this.wakeLock) {
                this.wakeLock.release();
                this.wakeLock = null;
            }
        },
        
        // 设置页面可见性监听
        setupVisibilityMonitor: function() {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.isVisible = false;
                    addLog(`📱 页面进入后台`, 'info');
                    
                    // 如果正在运行，增加心跳频率
                    if (isRunning && this.heartbeatInterval) {
                        clearInterval(this.heartbeatInterval);
                        this.startHeartbeat(5000); // 5秒心跳
                    }
                } else {
                    this.isVisible = true;
                    addLog(`📱 页面回到前台`, 'info');
                    this.lastActivity = Date.now();
                    
                    // 恢复正常心跳
                    if (this.heartbeatInterval) {
                        clearInterval(this.heartbeatInterval);
                        this.startHeartbeat();
                    }
                    
                    // 重新请求唤醒锁
                    if (isRunning) {
                        this.requestWakeLock();
                    }
                }
            });
        },
        
        // 启动心跳机制
        startHeartbeat: function(interval = 30000) {
            this.heartbeatInterval = setInterval(() => {
                if (isRunning) {
                    this.lastActivity = Date.now();
                    
                    // 触发一个微小的DOM操作，保持页面活跃
                    const statusArea = document.getElementById('status-area');
                    if (statusArea) {
                        statusArea.style.opacity = statusArea.style.opacity || '1';
                    }
                    
                    // 检查网络连接
                    if (!navigator.onLine) {
                        addLog(`📶 网络连接已断开`, 'error');
                    } else if (!this.isVisible) {
                        // 只在后台时显示心跳日志
                        addLog(`💓 后台运行正常`, 'info');
                    }
                }
            }, interval);
        },
        
        // 停止心跳机制
        stopHeartbeat: function() {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
        },
        
        // 设置电池监听
        setupBatteryMonitor: function() {
            if ('getBattery' in navigator) {
                navigator.getBattery().then((battery) => {
                    const updateBatteryInfo = () => {
                        const level = Math.round(battery.level * 100);
                        const charging = battery.charging;
                        
                        if (level <= 20 && !charging) {
                            addLog(`🔋 电池电量较低 (${level}%)，建议连接充电器`, 'warning');
                        } else if (level <= 10 && !charging) {
                            addLog(`🔋 电池电量严重不足 (${level}%)，可能影响抢票`, 'error');
                        }
                    };
                    
                    // 初始检查
                    updateBatteryInfo();
                    
                    // 监听电池变化
                    battery.addEventListener('levelchange', updateBatteryInfo);
                    battery.addEventListener('chargingchange', updateBatteryInfo);
                }).catch(err => {
                    console.log('电池 API 不可用:', err);
                });
            }
        },
        
        // 设置触摸反馈
        setupTouchFeedback: function() {
            if (!isTouchDevice) return;
            
            // 为所有按钮添加触觉反馈（如果支持）
            const addHapticFeedback = (element) => {
                element.addEventListener('touchstart', () => {
                    // 轻微的触觉反馈
                    if ('vibrate' in navigator) {
                        navigator.vibrate(10); // 10ms轻微震动
                    }
                }, { passive: true });
            };
            
            // 应用到现有按钮
            setTimeout(() => {
                const buttons = document.querySelectorAll('button');
                buttons.forEach(addHapticFeedback);
            }, 100);
        },
        
        // 优化滚动性能
        optimizeScrolling: function() {
            if (!isMobile) return;
            
            const style = document.createElement('style');
            style.textContent = `
                /* 优化移动端滚动 */
                #status-area {
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: contain;
                }
                
                /* 防止iOS双击缩放 */
                * {
                    touch-action: manipulation;
                }
                
                /* 优化输入框 */
                input, select, textarea {
                    -webkit-user-select: auto;
                    user-select: auto;
                }
                
                /* 防止长按选择文本 */
                #auto-booking-panel {
                    -webkit-user-select: none;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }
                
                /* 允许输入区域选择文本 */
                #auto-booking-panel input,
                #auto-booking-panel select {
                    -webkit-user-select: auto;
                    user-select: auto;
                }
            `;
            document.head.appendChild(style);
        },
        
        // 处理长时间运行的页面冻结问题
        preventPageFreeze: function() {
            if (!isMobile) return;
            
            // 定期执行一些轻量级操作防止页面冻结
            setInterval(() => {
                if (isRunning) {
                    // 创建一个微任务
                    Promise.resolve().then(() => {
                        // 轻量级DOM操作
                        const now = Date.now();
                        document.body.setAttribute('data-activity', now.toString());
                    });
                }
            }, 15000); // 每15秒执行一次
        },
        
        // 优化内存使用
        optimizeMemory: function() {
            if (!isMobile) return;
            
            // 定期清理日志
            setInterval(() => {
                const statusArea = document.getElementById('status-area');
                if (statusArea && statusArea.children.length > 100) {
                    // 保留最后50条日志
                    while (statusArea.children.length > 50) {
                        statusArea.removeChild(statusArea.firstChild);
                    }
                    addLog(`🧹 已清理历史日志`, 'info');
                }
            }, 60000); // 每分钟检查一次
        },
        
        // 清理资源
        cleanup: function() {
            this.releaseWakeLock();
            this.stopHeartbeat();
            addLog(`📱 移动端优化已清理`, 'info');
        }
    };

    // 在 MobileOptimization 后添加错误恢复机制
    const ErrorRecovery = {
        errorHistory: [],
        maxHistorySize: 50,
        recoveryStrategies: new Map(),
        
        // 初始化错误恢复机制
        init: function() {
            // 注册恢复策略
            this.registerStrategies();
            
            // 监听全局错误
            this.setupGlobalErrorHandler();
            
            addLog(`🛡️ 错误恢复机制已启用`, 'info');
        },
        
        // 注册恢复策略
        registerStrategies: function() {
            // 网络错误恢复
            this.recoveryStrategies.set('network_error', {
                immediate: () => {
                    addLog(`🌐 检测到网络错误，检查连接状态`, 'warning');
                    if (!navigator.onLine) {
                        addLog(`📶 网络已断开，等待重新连接...`, 'error');
                        return false;
                    }
                    return true;
                },
                delayed: async () => {
                    // 等待3秒后重试
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    RequestThrottler.reset();
                    return true;
                }
            });
            
            // 认证错误恢复
            this.recoveryStrategies.set('auth_error', {
                immediate: () => {
                    addLog(`🔐 认证失败，建议刷新页面重新登录`, 'error');
                    return false; // 无法自动恢复
                }
            });
            
            // 频率限制恢复
            this.recoveryStrategies.set('rate_limit', {
                immediate: () => {
                    addLog(`⏰ 触发频率限制，启用保守模式`, 'warning');
                    RequestThrottler.maxRequestsPerSecond = 1; // 降低频率
                    return true;
                },
                delayed: async () => {
                    await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
                    RequestThrottler.maxRequestsPerSecond = 2; // 恢复正常频率
                    return true;
                }
            });
            
            // 服务器错误恢复
            this.recoveryStrategies.set('server_error', {
                immediate: () => {
                    addLog(`🔧 服务器错误，可能是系统维护`, 'warning');
                    return false;
                },
                delayed: async () => {
                    await new Promise(resolve => setTimeout(resolve, 30000)); // 等待30秒
                    return true;
                }
            });
        },
        
        // 记录错误
        recordError: function(error, context = {}) {
            const errorRecord = {
                timestamp: Date.now(),
                message: error.message || String(error),
                type: error.name || 'Unknown',
                context: context,
                stack: error.stack
            };
            
            this.errorHistory.push(errorRecord);
            
            // 限制历史记录大小
            if (this.errorHistory.length > this.maxHistorySize) {
                this.errorHistory.shift();
            }
            
            return errorRecord;
        },
        
        // 尝试恢复
        attemptRecovery: async function(errorType, error, context = {}) {
            this.recordError(error, context);
            
            const strategy = this.recoveryStrategies.get(errorType);
            if (!strategy) {
                addLog(`❌ 未知错误类型: ${errorType}`, 'error');
                return false;
            }
            
            // 尝试即时恢复
            if (strategy.immediate) {
                try {
                    const immediateResult = strategy.immediate();
                    if (immediateResult) {
                        addLog(`✅ 即时恢复成功`, 'success');
                        return true;
                    }
                } catch (e) {
                    addLog(`❌ 即时恢复失败: ${e.message}`, 'error');
                }
            }
            
            // 尝试延迟恢复
            if (strategy.delayed) {
                try {
                    addLog(`⏳ 尝试延迟恢复...`, 'info');
                    const delayedResult = await strategy.delayed();
                    if (delayedResult) {
                        addLog(`✅ 延迟恢复成功`, 'success');
                        return true;
                    }
                } catch (e) {
                    addLog(`❌ 延迟恢复失败: ${e.message}`, 'error');
                }
            }
            
            return false;
        },
        
        // 设置全局错误处理
        setupGlobalErrorHandler: function() {
            // 捕获未处理的Promise错误
            window.addEventListener('unhandledrejection', (event) => {
                console.error('未处理的Promise错误:', event.reason);
                this.recordError(event.reason, { type: 'unhandledrejection' });
                
                // 防止控制台报错
                event.preventDefault();
            });
            
            // 捕获全局JavaScript错误
            window.addEventListener('error', (event) => {
                console.error('全局JavaScript错误:', event.error);
                this.recordError(event.error, { 
                    type: 'javascript_error',
                    filename: event.filename,
                    lineno: event.lineno
                });
            });
        },
        
        // 获取错误统计
        getErrorStats: function() {
            const now = Date.now();
            const last24Hours = this.errorHistory.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000);
            const lastHour = this.errorHistory.filter(e => now - e.timestamp < 60 * 60 * 1000);
            
            const typeStats = {};
            last24Hours.forEach(error => {
                const type = error.type || 'unknown';
                typeStats[type] = (typeStats[type] || 0) + 1;
            });
            
            return {
                total: this.errorHistory.length,
                last24Hours: last24Hours.length,
                lastHour: lastHour.length,
                typeStats: typeStats,
                latestErrors: this.errorHistory.slice(-5)
            };
        }
    };

    // 运动项目映射
    const SPORT_CODES = {
        "羽毛球": "001",
        "排球": "003",
        "网球": "004",
        "篮球": "005",
        "游泳": "009",
        "乒乓球": "013",
        "桌球": "016"
    };

    // 校区映射
    const CAMPUS_CODES = {
        "粤海": "1",
        "丽湖": "2"
    };

    // 时间段选项
    const TIME_SLOTS = [
        "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00",
        "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00",
        "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00",
        "20:00-21:00", "21:00-22:00"
    ];

    // 场馆代码映射
    const VENUE_CODES = {
        "至畅": "104",
        "至快": "111"
    };

    // 修改默认配置，确保每次都使用最新的明天日期
    const DEFAULT_CONFIG = {
        USER_INFO: {
            YYRGH: "2300123999",
            YYRXM: "张三"
        },
        TARGET_DATE: getTomorrowDate(), // 已经设置为明天
        SPORT: "羽毛球",
        CAMPUS: "丽湖",
        PREFERRED_VENUE: "至畅",
        PREFERRED_TIMES: ["20:00-21:00", "21:00-22:00"],
        RETRY_INTERVAL: 1,
        MAX_RETRY_TIMES: 20000,
        REQUEST_TIMEOUT: 10,
        YYLX: "1.0"
    };

    // 获取明天日期
    function getTomorrowDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    // 修改保存和加载配置函数
    function saveConfig(config) {
        Storage.set('bookingConfig', config);
    }

    // 修改加载配置函数，确保日期始终为明天
    function loadConfig() {
        try {
            const saved = Storage.get('bookingConfig', null);
            const config = saved ? { ...DEFAULT_CONFIG, ...saved } : DEFAULT_CONFIG;

            // 始终更新为明天的日期，避免使用过期日期
            config.TARGET_DATE = getTomorrowDate();

            return config;
        } catch (e) {
            return DEFAULT_CONFIG;
        }
    }

    function savePanelState(isVisible) {
        Storage.set('panelVisible', isVisible);
    }

    function loadPanelState() {
        return Storage.get('panelVisible', true);
    }

    // 全局变量
    let CONFIG = loadConfig();
    let isRunning = false;
    let retryCount = 0;
    let startTime = null;
    let successfulBookings = [];
    let controlPanel = null;
    let floatingButton = null;
    let isPanelVisible = loadPanelState();

    // 获取动态最大预约数量
    function getMaxBookings() {
        const selectedTimeSlots = CONFIG.PREFERRED_TIMES.length;
        return Math.min(selectedTimeSlots, 2); // 最多2个，但不超过选择的时间段数量
    }

    // 修改创建浮动按钮函数 - 完全重写触摸事件处理
    function createFloatingButton() {
        const button = document.createElement('div');
        button.id = 'floating-toggle-btn';

        // iOS设备尺寸优化
        const buttonSize = isIPad ? '80px' : (isMobile ? '70px' : '60px');
        const fontSize = isIPad ? '32px' : (isMobile ? '28px' : '24px');

        button.style.cssText = `
        position: fixed;
        top: ${isMobile ? '20px' : '20px'};
        right: ${isMobile ? '20px' : '20px'};
        width: ${buttonSize};
        height: ${buttonSize};
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10001;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        border: 3px solid rgba(255,255,255,0.2);
        font-size: ${fontSize};
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    `;

        button.innerHTML = '🎾';
        button.title = '显示/隐藏抢票面板';

        // 统一的点击处理函数
        function handleButtonClick(e) {
            console.log('浮动按钮被点击，当前面板状态:', isPanelVisible);
            if (e) {
                e.preventDefault(); // 集中处理 preventDefault
                e.stopPropagation(); // 集中处理 stopPropagation
            }
            togglePanel();
        }

        // 为 iPad 特别优化的事件处理
        if (isTouchDevice) {
            let isPressed = false;
            let touchStartTime = 0;
            let hasMoved = false;
            let startX = 0, startY = 0;

            const pressThreshold = 800; // ms, 定义有效点击的最大时长
            const moveThreshold = 10; // pixels, 定义手指移动多少算作移动而非点击

            // 通用的按下处理逻辑
            function onInteractionStart(clientX, clientY, pointerType = 'touch') {
                console.log(`浮动按钮 ${pointerType} start`);
                isPressed = true;
                touchStartTime = Date.now();
                hasMoved = false;
                startX = clientX;
                startY = clientY;

                button.style.transform = 'scale(1.1)';
                button.style.opacity = '0.8';
            }

            // 通用的移动处理逻辑
            function onInteractionMove(clientX, clientY) {
                if (!isPressed) return;
                if (!hasMoved) {
                    if (Math.abs(clientX - startX) > moveThreshold || Math.abs(clientY - startY) > moveThreshold) {
                        hasMoved = true;
                        console.log('浮动按钮 moved');
                    }
                }
            }

            // 通用的抬起/结束处理逻辑
            function onInteractionEnd(e, interactionType = 'touch') {
                console.log(`浮动按钮 ${interactionType} end`, { isPressed, hasMoved, duration: Date.now() - touchStartTime });

                if (!isPressed) { // 如果没有按下状态，则重置并返回
                    button.style.transform = 'scale(1)';
                    button.style.opacity = '1';
                    return;
                }

                const pressDuration = Date.now() - touchStartTime;

                if (!hasMoved && pressDuration < pressThreshold) {
                    console.log('浮动按钮 - TAP detected');
                    handleButtonClick(e); // 调用统一处理函数
                }

                button.style.transform = 'scale(1)';
                button.style.opacity = '1';
                isPressed = false;
                hasMoved = false;
            }

            // 通用的取消处理逻辑
            function onInteractionCancel() {
                console.log('浮动按钮 interaction cancel');
                isPressed = false;
                hasMoved = false;
                button.style.transform = 'scale(1)';
                button.style.opacity = '1';
            }

            if (window.PointerEvent) {
                console.log('使用 Pointer 事件');
                button.addEventListener('pointerdown', (e) => {
                    if (!e.isPrimary || (e.pointerType !== 'touch' && e.pointerType !== 'pen')) return;
                    onInteractionStart(e.clientX, e.clientY, e.pointerType);
                    // 不在此处 e.preventDefault()，让滚动等默认行为可以发生，除非确定是点击
                });
                button.addEventListener('pointermove', (e) => {
                    if (!e.isPrimary || (e.pointerType !== 'touch' && e.pointerType !== 'pen')) return;
                    onInteractionMove(e.clientX, e.clientY);
                });
                button.addEventListener('pointerup', (e) => {
                    if (!e.isPrimary || (e.pointerType !== 'touch' && e.pointerType !== 'pen')) return;
                    onInteractionEnd(e, e.pointerType);
                });
                button.addEventListener('pointercancel', onInteractionCancel);
            } else {
                console.log('使用 Touch 事件');
                button.addEventListener('touchstart', (e) => {
                    if (e.touches.length > 1) return; // 忽略多点触控
                    const touch = e.touches[0];
                    onInteractionStart(touch.clientX, touch.clientY, 'touch');
                }, { passive: true }); // passive:true 允许默认滚动行为

                button.addEventListener('touchmove', (e) => {
                    if (!isPressed || e.touches.length > 1) return;
                    const touch = e.touches[0];
                    onInteractionMove(touch.clientX, touch.clientY);
                }, { passive: true }); // passive:true 允许默认滚动行为

                button.addEventListener('touchend', (e) => {
                    // touchend 在 e.touches 中没有信息, 使用 e.changedTouches
                    if (e.changedTouches.length > 1) return; // 通常是单点结束
                    onInteractionEnd(e, 'touch');
                }); // touchend 不应是 passive，因为 handleButtonClick 可能调用 preventDefault

                button.addEventListener('touchcancel', onInteractionCancel);
            }
        } else {
            // 桌面端使用鼠标事件
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.1)';
                button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
                button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
            });
            button.addEventListener('click', handleButtonClick);
        }

        document.body.appendChild(button);
        console.log('浮动按钮创建完成，当前面板状态:', isPanelVisible);
        return button;
    }


    // 修改创建控制面板函数的移动端样式部分
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'auto-booking-panel';

        // iOS设备样式优化 - 修复变换原点问题
        const mobileStyles = isMobile ? `
        width: calc(100vw - 30px);
        max-width: ${isIPad ? '500px' : '380px'};
        top: ${isIPad ? '120px' : '100px'};
        left: 50%;
        /* transform: translateX(-50%); // Initial transform will be set below */
        font-size: ${isIPad ? '18px' : '16px'};
        max-height: calc(100vh - 150px);
        -webkit-overflow-scrolling: touch;
    ` : `
        width: 400px;
        top: 20px;
        right: 90px;
        max-height: 90vh;
        /* transform: translateX(0); // Initial transform will be set below */
    `;

        panel.style.cssText = `
        position: fixed;
        ${mobileStyles}
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        padding: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
        color: white;
        border: 2px solid rgba(255,255,255,0.2);
        overflow-y: auto;
        /* transition: all 0.3s ease; // Replaced with more specific transition */
        transition: opacity 0.3s ease, transform 0.3s ease; /* Specific transitions for animation */
        -webkit-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        /* Initial state will be set below after appending */
    `;

        // iOS输入框样式优化
        const inputBaseStyle = `
            width: 100%;
            padding: ${isIPad ? '14px' : (isMobile ? '12px' : '8px')};
            border: none;
            border-radius: 6px;
            background: rgba(255,255,255,0.95);
            color: #333;
            font-size: ${isIPad ? '18px' : (isMobile ? '16px' : '14px')};
            box-sizing: border-box;
            -webkit-appearance: none;
            appearance: none;
            outline: none;
        `;

        // iOS按钮样式优化
        const buttonBaseStyle = `
            width: 100%;
            padding: ${isIPad ? '18px' : (isMobile ? '15px' : '12px')};
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: ${isIPad ? '20px' : (isMobile ? '18px' : '16px')};
            font-weight: bold;
            transition: all 0.3s;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            -webkit-appearance: none;
            appearance: none;
            outline: none;
            -webkit-tap-highlight-color: transparent;
        `;


        panel.innerHTML = `
        <div style="margin-bottom: 15px; text-align: center; position: relative;">
            <h3 style="margin: 0; font-size: ${isMobile ? '20px' : '18px'}; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                🎾 自动抢票助手 v1.1.5
            </h3>
            <button id="close-panel" style="
                position: absolute;
                top: -5px;
                right: -5px;
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: ${isMobile ? '35px' : '30px'};
                height: ${isMobile ? '35px' : '30px'};
                border-radius: 50%;
                cursor: pointer;
                font-size: ${isMobile ? '20px' : '16px'};
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: manipulation;
            " title="隐藏面板">×</button>
            <button id="toggle-config" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: ${isMobile ? '8px 12px' : '5px 10px'};
                border-radius: 5px;
                cursor: pointer;
                margin-top: 5px;
                font-size: ${isMobile ? '14px' : '12px'};
                touch-action: manipulation;
            ">⚙️ 配置设置</button>
        </div>

        <!-- 配置区域 -->
        <div id="config-area" style="
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            display: block; /* Or load from saved state */
        ">
            <!-- 用户信息 -->
            <div style="margin-bottom: 12px;">
                <label style="font-size: ${isMobile ? '14px' : '12px'}; display: block; margin-bottom: 3px;">👤 学号/工号:</label>
                <input id="user-id" type="text" value="${CONFIG.USER_INFO.YYRGH}" style="${inputBaseStyle}">
            </div>

            <div style="margin-bottom: 12px;">
                <label style="font-size: ${isMobile ? '14px' : '12px'}; display: block; margin-bottom: 3px;">📝 姓名:</label>
                <input id="user-name" type="text" value="${CONFIG.USER_INFO.YYRXM}" style="${inputBaseStyle}">
            </div>

            <!-- 预约设置 -->
            <div style="margin-bottom: 12px;">
                <label style="font-size: ${isMobile ? '14px' : '12px'}; display: block; margin-bottom: 3px;">📅 预约日期:</label>
                <input id="target-date" type="date" value="${CONFIG.TARGET_DATE}" style="${inputBaseStyle}">
            </div>

            <div style="margin-bottom: 12px;">
                <label style="font-size: ${isMobile ? '14px' : '12px'}; display: block; margin-bottom: 3px;">🏟️ 运动项目:</label>
                <select id="sport-type" style="${inputBaseStyle}">
                    ${Object.keys(SPORT_CODES).map(sport =>
            `<option value="${sport}" ${sport === CONFIG.SPORT ? 'selected' : ''}>${sport}</option>`
        ).join('')}
                </select>
            </div>

            <div style="margin-bottom: 12px;">
                <label style="font-size: ${isMobile ? '14px' : '12px'}; display: block; margin-bottom: 3px;">🏫 校区:</label>
                <select id="campus" style="${inputBaseStyle}">
                    ${Object.keys(CAMPUS_CODES).map(campus =>
            `<option value="${campus}" ${campus === CONFIG.CAMPUS ? 'selected' : ''}>${campus}</option>`
        ).join('')}
                </select>
            </div>

            <!-- 羽毛球场馆选择 -->
            <div id="venue-selection" style="margin-bottom: 12px; display: ${CONFIG.SPORT === '羽毛球' ? 'block' : 'none'};">
                <label style="font-size: ${isMobile ? '14px' : '12px'}; display: block; margin-bottom: 3px;">🏟️ 优先场馆:</label>
                <select id="preferred-venue" style="${inputBaseStyle}">
                    <option value="至畅" ${CONFIG.PREFERRED_VENUE === '至畅' ? 'selected' : ''}>🏆 至畅体育馆</option>
                    <option value="至快" ${CONFIG.PREFERRED_VENUE === '至快' ? 'selected' : ''}>⚡ 至快体育馆</option>
                    <option value="全部" ${CONFIG.PREFERRED_VENUE === '全部' ? 'selected' : ''}>🔄 全部场馆</option>
                </select>
                <div style="font-size: ${isMobile ? '12px' : '10px'}; color: rgba(255,255,255,0.7); margin-top: 2px;">
                    💡 选择"全部"将按至畅>至快的顺序预约
                </div>
            </div>

            <!-- 时间段选择 -->
            <div style="margin-bottom: 12px;">
                <label style="font-size: ${isMobile ? '14px' : '12px'}; display: block; margin-bottom: 3px;">⏰ 优先时间段 (按优先级排序):</label>
                <div id="time-slots-container" style="
                    max-height: ${isMobile ? '120px' : '100px'};
                    overflow-y: auto;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                    padding: 5px;
                ">
                    ${TIME_SLOTS.map(slot => `
                        <label style="display: block; font-size: ${isMobile ? '14px' : '11px'}; margin: ${isMobile ? '5px 0' : '2px 0'}; cursor: pointer;">
                            <input type="checkbox" value="${slot}"
                                ${CONFIG.PREFERRED_TIMES.includes(slot) ? 'checked' : ''}
                                style="margin-right: 5px; transform: ${isMobile ? 'scale(1.2)' : 'scale(1)'};">
                            ${slot}
                        </label>
                    `).join('')}
                </div>
            </div>

            <!-- 运行参数 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                <div>
                    <label style="font-size: ${isMobile ? '14px' : '12px'}; display: block; margin-bottom: 3px;">⏱️ 查询间隔(秒):</label>
                    <input id="retry-interval" type="number" min="1" max="60" value="${CONFIG.RETRY_INTERVAL}" style="${inputBaseStyle}">
                </div>
                <div>
                    <label style="font-size: ${isMobile ? '14px' : '12px'}; display: block; margin-bottom: 3px;">🔄 最大重试:</label>
                    <input id="max-retry" type="number" min="10" max="9999" value="${CONFIG.MAX_RETRY_TIMES}" style="${inputBaseStyle}">
                </div>
            </div>

            <div style="margin-bottom: 12px;">
                <label style="font-size: ${isMobile ? '14px' : '12px'}; display: block; margin-bottom: 3px;">⏰ 请求超时(秒):</label>
                <input id="request-timeout" type="number" min="5" max="60" value="${CONFIG.REQUEST_TIMEOUT}" style="${inputBaseStyle}">
            </div>

            <button id="save-config" style="
                ${buttonBaseStyle}
                background: linear-gradient(45deg, #4caf50, #45a049);
                color: white;
                font-size: ${isMobile ? '16px' : '14px'};
                margin-bottom: 10px;
            ">💾 保存配置</button>
        </div>

        <!-- 当前配置显示 -->
        <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
            <div style="font-size: ${isMobile ? '15px' : '13px'}; margin-bottom: 5px;">
                👤 <span id="display-user">${CONFIG.USER_INFO.YYRXM} (${CONFIG.USER_INFO.YYRGH})</span>
            </div>
            <div style="font-size: ${isMobile ? '15px' : '13px'}; margin-bottom: 5px;">
                📅 <span id="display-date">${CONFIG.TARGET_DATE}</span> |
                🏟️ <span id="display-sport">${CONFIG.SPORT}</span> |
                🏫 <span id="display-campus">${CONFIG.CAMPUS}</span>
            </div>
            <div id="venue-display" style="font-size: ${isMobile ? '15px' : '13px'}; margin-bottom: 5px; display: ${CONFIG.SPORT === '羽毛球' ? 'block' : 'none'};">
                🏟️ 优先场馆: <span id="display-venue">${CONFIG.PREFERRED_VENUE || '至畅'}</span>
            </div>
            <div style="font-size: ${isMobile ? '15px' : '13px'}; margin-bottom: 5px;">
                ⏰ <span id="display-times">${CONFIG.PREFERRED_TIMES.join(', ')}</span>
            </div>
            <div style="font-size: ${isMobile ? '15px' : '13px'};">
                ⚙️ 间隔:<span id="display-interval">${CONFIG.RETRY_INTERVAL}</span>s |
                重试:<span id="display-retry">${CONFIG.MAX_RETRY_TIMES}</span> |
                超时:<span id="display-timeout">${CONFIG.REQUEST_TIMEOUT}</span>s
            </div>
            <div style="font-size: ${isMobile ? '15px' : '13px'}; margin-top: 5px;">
                🎯 进度: <span id="booking-progress">0/${getMaxBookings()} 个时段</span>
            </div>
        </div>

        <!-- 控制按钮 -->
        <div style="margin-bottom: 15px;">
            <button id="start-btn" style="
                ${buttonBaseStyle}
                background: linear-gradient(45deg, #ff6b6b, #ee5a52);
                color: white;
            ">
                🚀 开始抢票
            </button>
        </div>

        <!-- 状态日志 -->
        <div id="status-area" style="
            background: rgba(0,0,0,0.2);
            padding: 10px;
            border-radius: 8px;
            font-size: ${isMobile ? '14px' : '12px'};
            max-height: ${isMobile ? '250px' : '200px'};
            overflow-y: auto;
            border: 1px solid rgba(255,255,255,0.1);
        ">
            <div style="color: #ffd700;">🔧 等待开始...</div>
        </div>

        <div style="margin-top: 15px; text-align: center; font-size: ${isMobile ? '13px' : '11px'}; opacity: 0.8;">
            ${isMobile ? '📱 触摸优化版本' : '⚡ 快捷键: Ctrl+Shift+S 开始/停止 | Ctrl+Shift+H 显示/隐藏面板'}
        </div>
    `;

        document.body.appendChild(panel);

        // 定义 transform 值，方便复用
        const transformVisibleMobile = 'translateX(-50%) translateY(0)';
        const transformHiddenMobile = 'translateX(-50%) translateY(-30px)'; // 轻微向上滑出作为隐藏状态
        const transformVisibleDesktop = 'translateX(0)';
        const transformHiddenDesktop = 'translateX(100%)'; // 从右侧滑出作为隐藏状态

        // 根据保存的状态设置面板初始可见性、透明度和位置
        if (isPanelVisible) {
            panel.style.display = 'block';
            panel.style.opacity = '1';
            if (isMobile) {
                panel.style.transform = transformVisibleMobile;
            } else {
                panel.style.transform = transformVisibleDesktop;
            }
        } else {
            panel.style.display = 'none'; // 初始隐藏
            panel.style.opacity = '0';    // 透明
            // 设置为隐藏时的 transform，这样 togglePanel 显示时可以从此状态过渡
            if (isMobile) {
                panel.style.transform = transformHiddenMobile;
            } else {
                panel.style.transform = transformHiddenDesktop;
            }
        }

        bindEventsIOS(panel); // 将 panel 作为参数传递
        return panel;
    }

    // 修改切换面板函数
    function togglePanel() {
        console.log('togglePanel 被调用，当前面板状态 (切换前):', isPanelVisible);

        isPanelVisible = !isPanelVisible;
        savePanelState(isPanelVisible);

        console.log('切换后面板状态:', isPanelVisible);

        if (controlPanel) {
            const transformVisibleMobile = 'translateX(-50%) translateY(0)';
            const transformHiddenMobile = 'translateX(-50%) translateY(-30px)';
            const transformVisibleDesktop = 'translateX(0)';
            const transformHiddenDesktop = 'translateX(100%)'; // 面板从右侧滑出

            // 确保 transition 属性在 controlPanel 上 (已在 createControlPanel 中设置)
            // controlPanel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

            if (isPanelVisible) { // 如果要显示面板
                console.log('准备显示面板');
                controlPanel.style.display = 'block'; // 必须先 block 才能应用 transform 和 opacity

                // 设置动画起始状态 (面板在隐藏位置，透明)
                // 这确保了即使面板之前是 display:none，动画也能从正确的视觉起点开始
                if (isMobile) {
                    controlPanel.style.transform = transformHiddenMobile;
                } else {
                    controlPanel.style.transform = transformHiddenDesktop;
                }
                controlPanel.style.opacity = '0';

                // 使用 setTimeout 确保浏览器渲染了起始状态，然后再开始过渡
                setTimeout(() => {
                    controlPanel.style.opacity = '1';
                    if (isMobile) {
                        controlPanel.style.transform = transformVisibleMobile;
                    } else {
                        controlPanel.style.transform = transformVisibleDesktop;
                    }
                    console.log('面板显示动画开始');
                }, 10); // 短暂延迟，让浏览器捕获起始状态

            } else { // 如果要隐藏面板
                console.log('准备隐藏面板');
                // 开始隐藏动画 (移动到隐藏位置，变透明)
                controlPanel.style.opacity = '0';
                if (isMobile) {
                    controlPanel.style.transform = transformHiddenMobile;
                } else {
                    controlPanel.style.transform = transformHiddenDesktop;
                }
                console.log('面板隐藏动画开始');

                // 等待过渡动画完成后再设置 display: none
                setTimeout(() => {
                    if (!isPanelVisible) { // 再次检查状态，防止快速切换导致问题
                        controlPanel.style.display = 'none';
                        console.log('面板已完全隐藏 (display: none)');
                    }
                }, 300); // 300ms 对应 CSS 中的 transition-duration
            }
        }

        // 更新浮动按钮样式
        if (floatingButton) {
            console.log('更新浮动按钮样式，面板可见:', isPanelVisible);
            if (isPanelVisible) {
                floatingButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                floatingButton.innerHTML = '🎾';
                floatingButton.title = '隐藏抢票面板';
            } else {
                floatingButton.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)';
                floatingButton.innerHTML = '📱'; // 可以考虑用不同图标指示面板已隐藏
                floatingButton.title = '显示抢票面板';
            }
            console.log('浮动按钮样式更新完成');
        }

        console.log('面板状态切换完成:', isPanelVisible);
    }

    // 修改 iOS 事件绑定函数
    function bindEventsIOS(panelElement) { // 接受 panelElement 作为参数
        // 为所有按钮添加通用的触摸处理
        function addButtonTouchHandler(button, clickHandler) {
            if (isTouchDevice) {
                let touchStarted = false;
                let touchStartTime = 0;

                // 移除可能存在的旧事件监听器
                button.removeEventListener('click', clickHandler);

                button.addEventListener('touchstart', (e) => {
                    touchStarted = true;
                    touchStartTime = Date.now();
                    button.style.opacity = '0.7';
                    button.style.transform = 'scale(0.95)';
                    e.preventDefault();
                }, { passive: false });

                button.addEventListener('touchend', (e) => {
                    if (touchStarted && (Date.now() - touchStartTime) < 1000) {
                        e.preventDefault();
                        e.stopPropagation();

                        button.style.opacity = '1';
                        button.style.transform = 'scale(1)';

                        // 延迟执行点击处理
                        setTimeout(() => {
                            try {
                                clickHandler();
                            } catch (error) {
                                console.error('Button click handler error:', error);
                            }
                        }, 50);
                    }
                    touchStarted = false;
                }, { passive: false });

                button.addEventListener('touchcancel', () => {
                    touchStarted = false;
                    button.style.opacity = '1';
                    button.style.transform = 'scale(1)';
                }, { passive: true });

            } else {
                // 桌面端直接使用点击事件
                button.addEventListener('click', clickHandler);
            }
        }

        // 面板关闭按钮
        const closeBtn = panelElement.querySelector('#close-panel'); // 使用 panelElement.querySelector
        if (closeBtn) {
            addButtonTouchHandler(closeBtn, () => {
                togglePanel();
            });
        }

        // 配置显示/隐藏按钮
        const toggleConfigBtn = panelElement.querySelector('#toggle-config'); // 使用 panelElement.querySelector
        if (toggleConfigBtn) {
            addButtonTouchHandler(toggleConfigBtn, () => {
                const configArea = panelElement.querySelector('#config-area'); // 使用 panelElement.querySelector
                if (configArea.style.display === 'none') {
                    configArea.style.display = 'block';
                    toggleConfigBtn.textContent = '⚙️ 隐藏配置';
                } else {
                    configArea.style.display = 'none';
                    toggleConfigBtn.textContent = '⚙️ 显示配置';
                }
            });
        }

        // 运动项目变化时显示/隐藏场馆选择
        const sportTypeSelect = panelElement.querySelector('#sport-type'); // 使用 panelElement.querySelector
        if (sportTypeSelect) {
            // select 元素使用 change 事件
            sportTypeSelect.addEventListener('change', () => {
                const sportType = sportTypeSelect.value;
                const venueSelection = panelElement.querySelector('#venue-selection'); // 使用 panelElement.querySelector
                const venueDisplay = panelElement.querySelector('#venue-display'); // 使用 panelElement.querySelector

                if (sportType === '羽毛球') {
                    if (venueSelection) venueSelection.style.display = 'block';
                    if (venueDisplay) venueDisplay.style.display = 'block';
                } else {
                    if (venueSelection) venueSelection.style.display = 'none';
                    if (venueDisplay) venueDisplay.style.display = 'none';
                }
            });
        }

        // 保存配置按钮
        const saveConfigBtn = panelElement.querySelector('#save-config'); // 使用 panelElement.querySelector
        if (saveConfigBtn) {
            addButtonTouchHandler(saveConfigBtn, () => {
                try {
                    updateConfigFromUI();
                    updateDisplayConfig();
                    addLog('✅ 配置已保存', 'success');
                    
                    // 新增：保存配置后自动隐藏配置区域
                    const configArea = panelElement.querySelector('#config-area');
                    const toggleConfigBtn = panelElement.querySelector('#toggle-config');
                    if (configArea && toggleConfigBtn) {
                        configArea.style.display = 'none';
                        toggleConfigBtn.textContent = '⚙️ 显示配置';
                        addLog('📦 配置区域已自动隐藏', 'info');
                    }
                } catch (error) {
                    addLog('❌ 保存配置失败: ' + error.message, 'error');
                }
            });
        }

        // 开始/停止按钮
        const startBtn = panelElement.querySelector('#start-btn'); // 使用 panelElement.querySelector
        if (startBtn) {
            addButtonTouchHandler(startBtn, () => {
                try {
                    if (isRunning) {
                        stopBooking();
                    } else {
                        updateConfigFromUI();
                        if (validateConfig()) {
                            startBooking();
                        }
                    }
                } catch (error) {
                    addLog('❌ 操作失败: ' + error.message, 'error');
                }
            });
        }

        // 快捷键 - 只在非移动端添加
        if (!isMobile) {
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey) {
                    if (e.key === 'S') {
                        e.preventDefault();
                        if (isRunning) {
                            stopBooking();
                        } else {
                            updateConfigFromUI();
                            if (validateConfig()) {
                                startBooking();
                            }
                        }
                    } else if (e.key === 'H') {
                        e.preventDefault();
                        togglePanel();
                    } else if (e.key === 'C') {
                        e.preventDefault();
                        if (isPanelVisible) {
                            const toggleBtn = panelElement.querySelector('#toggle-config'); // 使用 panelElement.querySelector
                            if (toggleBtn) toggleBtn.click();
                        }
                    }
                }
            });
        }

        // iOS输入框优化
        if (isIOS) {
            const inputs = panelElement.querySelectorAll('input, select'); // 使用 panelElement.querySelectorAll
            inputs.forEach(input => {
                // 防止iOS Safari缩放
                input.addEventListener('focus', (e) => {
                    // 对于iOS设备，设置字体大小防止缩放
                    if (input.type !== 'date' && input.type !== 'number') {
                        e.target.style.fontSize = '16px';
                    }

                    // 延迟滚动到视图中
                    setTimeout(() => {
                        e.target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }, 300);
                });

                input.addEventListener('blur', (e) => {
                    // 恢复原始字体大小
                    e.target.style.fontSize = '';
                });
            });
        }

        // checkbox 特殊处理
        const checkboxes = panelElement.querySelectorAll('input[type="checkbox"]'); // 使用 panelElement.querySelectorAll
        checkboxes.forEach(checkbox => {
            if (isTouchDevice) {
                // 为 checkbox 的父级 label 添加触摸处理
                const label = checkbox.closest('label');
                if (label) {
                    label.style.touchAction = 'manipulation';
                    label.addEventListener('touchend', (e) => {
                        // 阻止事件冒泡，让浏览器处理 checkbox 切换
                        e.stopPropagation();
                    }, { passive: true });
                }
            }
        });
    }


    // 从UI更新配置
    function updateConfigFromUI() {
        // 获取选中的时间段
        const selectedTimes = Array.from(document.querySelectorAll('#time-slots-container input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        CONFIG = {
            USER_INFO: {
                YYRGH: document.getElementById('user-id').value.trim(),
                YYRXM: document.getElementById('user-name').value.trim()
            },
            TARGET_DATE: document.getElementById('target-date').value,
            SPORT: document.getElementById('sport-type').value,
            CAMPUS: document.getElementById('campus').value,
            PREFERRED_VENUE: document.getElementById('preferred-venue')?.value || '至畅', // 新增场馆选择
            PREFERRED_TIMES: selectedTimes,
            RETRY_INTERVAL: parseInt(document.getElementById('retry-interval').value),
            MAX_RETRY_TIMES: parseInt(document.getElementById('max-retry').value),
            REQUEST_TIMEOUT: parseInt(document.getElementById('request-timeout').value),
            YYLX: "1.0"
        };

        saveConfig(CONFIG);
        // 更新进度显示
        updateProgress();
    }

    // 更新显示配置
    function updateDisplayConfig() {
        document.getElementById('display-user').textContent = `${CONFIG.USER_INFO.YYRXM} (${CONFIG.USER_INFO.YYRGH})`;
        document.getElementById('display-date').textContent = CONFIG.TARGET_DATE;
        document.getElementById('display-sport').textContent = CONFIG.SPORT;
        document.getElementById('display-campus').textContent = CONFIG.CAMPUS;

        // 更新场馆显示
        const venueDisplayElement = document.getElementById('display-venue');
        if (venueDisplayElement) {
            venueDisplayElement.textContent = CONFIG.PREFERRED_VENUE || '至畅';
        }

        document.getElementById('display-times').textContent = CONFIG.PREFERRED_TIMES.join(', ');
        document.getElementById('display-interval').textContent = CONFIG.RETRY_INTERVAL;
        document.getElementById('display-retry').textContent = CONFIG.MAX_RETRY_TIMES;
        document.getElementById('display-timeout').textContent = CONFIG.REQUEST_TIMEOUT;
    }

    // 验证配置
    function validateConfig() {
        const errors = [];
        const warnings = [];

        // 用户信息验证
        if (!CONFIG.USER_INFO.YYRGH || !CONFIG.USER_INFO.YYRXM) {
            errors.push('请填写完整的用户信息');
        }

        // 学号格式验证（更严格）
        const userIdPattern = /^\d{8,12}$/;
        if (CONFIG.USER_INFO.YYRGH && !userIdPattern.test(CONFIG.USER_INFO.YYRGH)) {
            errors.push('学号格式不正确（应为8-12位数字）');
        }

        // 学号范围验证（深圳大学学号规则）
        if (CONFIG.USER_INFO.YYRGH) {
            const userId = CONFIG.USER_INFO.YYRGH;
            const currentYear = new Date().getFullYear();
            const yearPrefix = parseInt(userId.substring(0, 2));

            // 检查年份前缀是否合理（最近20年）
            if (yearPrefix < (currentYear - 2020) || yearPrefix > (currentYear - 2000 + 10)) {
                warnings.push('学号年份可能不正确，请检查');
            }
        }

        // 姓名格式验证
        const namePattern = /^[\u4e00-\u9fa5]{2,10}$/;
        if (CONFIG.USER_INFO.YYRXM && !namePattern.test(CONFIG.USER_INFO.YYRXM)) {
            errors.push('姓名格式不正确（应为2-10个中文字符）');
        }

        // 日期验证
        if (!CONFIG.TARGET_DATE) {
            errors.push('请选择预约日期');
        } else {
            const targetDate = new Date(CONFIG.TARGET_DATE);
            const today = new Date();
            const maxDate = new Date();

            today.setHours(0, 0, 0, 0);
            maxDate.setDate(today.getDate() + 7);

            if (isNaN(targetDate.getTime())) {
                errors.push('预约日期格式不正确');
            } else if (targetDate < today) {
                errors.push('预约日期不能是过去的日期');
            } else if (targetDate > maxDate) {
                warnings.push('预约日期超过7天，可能无法预约');
            }
        }

        // 时间段验证
        if (!CONFIG.PREFERRED_TIMES || CONFIG.PREFERRED_TIMES.length === 0) {
            errors.push('请至少选择一个时间段');
        } else if (CONFIG.PREFERRED_TIMES.length > 5) {
            warnings.push('选择的时间段过多，建议不超过5个以提高成功率');
        }

        // 验证时间段格式
        const timePattern = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
        const invalidTimes = CONFIG.PREFERRED_TIMES.filter(time => !timePattern.test(time));
        if (invalidTimes.length > 0) {
            errors.push(`时间段格式不正确: ${invalidTimes.join(', ')}`);
        }

        // 运行参数验证
        if (CONFIG.RETRY_INTERVAL < 1 || CONFIG.RETRY_INTERVAL > 60) {
            errors.push('查询间隔应在1-60秒之间');
        } else if (CONFIG.RETRY_INTERVAL < 1) {
            warnings.push('查询间隔过短，建议设置1秒以上');
        }

        if (CONFIG.MAX_RETRY_TIMES < 10 || CONFIG.MAX_RETRY_TIMES > 999999) {
            errors.push('最大重试次数应在10-999999之间');
        } else if (CONFIG.MAX_RETRY_TIMES > 999999) {
            warnings.push('最大重试次数过高，可能影响系统性能');
        }

        if (CONFIG.REQUEST_TIMEOUT < 5 || CONFIG.REQUEST_TIMEOUT > 60) {
            errors.push('请求超时应在5-60秒之间');
        }

        // 场馆和运动项目验证
        if (!SPORT_CODES[CONFIG.SPORT]) {
            errors.push('运动项目不支持');
        }

        if (!CAMPUS_CODES[CONFIG.CAMPUS]) {
            errors.push('校区选择无效');
        }

        // 羽毛球场馆验证
        if (CONFIG.SPORT === '羽毛球' && CONFIG.PREFERRED_VENUE) {
            const validVenues = ['至畅', '至快', '全部'];
            if (!validVenues.includes(CONFIG.PREFERRED_VENUE)) {
                errors.push('羽毛球场馆选择无效');
            }
        }

        // 配置组合合理性验证
        if (CONFIG.CAMPUS === '粤海' && CONFIG.SPORT === '羽毛球' && CONFIG.PREFERRED_VENUE === '至畅') {
            warnings.push('粤海校区可能没有至畅体育馆，请确认场馆信息');
        }

        // 时间合理性验证
        const now = new Date();
        if (CONFIG.TARGET_DATE === now.toISOString().split('T')[0]) {
            // 如果是今天，检查时间段是否已过
            const currentHour = now.getHours();
            const pastTimes = CONFIG.PREFERRED_TIMES.filter(time => {
                const hour = parseInt(time.split(':')[0]);
                return hour <= currentHour;
            });

            if (pastTimes.length > 0) {
                warnings.push(`今日已过时间段: ${pastTimes.join(', ')}`);
            }
        }

        // 显示错误和警告
        errors.forEach(error => addLog(`❌ ${error}`, 'error'));
        warnings.forEach(warning => addLog(`⚠️ ${warning}`, 'warning'));

        // 额外的提示信息
        if (warnings.length > 0 && errors.length === 0) {
            addLog(`💡 发现 ${warnings.length} 个警告，建议检查配置`, 'warning');
        }

        if (errors.length === 0) {
            addLog(`✅ 配置验证通过`, 'success');

            // 显示优化建议
            if (CONFIG.RETRY_INTERVAL >= 5) {
                addLog(`💡 当前查询间隔较长，如需更快响应可适当调低`, 'info');
            }
        }

        return errors.length === 0;
    }

    // 添加状态日志
    function addLog(message, type = 'info') {
        const statusArea = document.getElementById('status-area');
        if (!statusArea) return;

        const colors = {
            info: '#e3f2fd',
            success: '#c8e6c9',
            warning: '#fff3e0',
            error: '#ffcdd2'
        };

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            color: ${colors[type]};
            margin-bottom: 3px;
            border-left: 3px solid ${colors[type]};
            padding-left: 8px;
        `;
        logEntry.innerHTML = `[${timestamp}] ${message}`;

        statusArea.appendChild(logEntry);
        statusArea.scrollTop = statusArea.scrollHeight;

        // 保持最多50条日志
        while (statusArea.children.length > 50) {
            statusArea.removeChild(statusArea.firstChild);
        }
    }

    // 更新预约进度
    function updateProgress() {
        const currentMaxBookings = getMaxBookings();
        const progressElement = document.getElementById('booking-progress');
        if (progressElement) {
            progressElement.textContent = `${successfulBookings.length}/${currentMaxBookings} 个时段`;
        }
    }

    // 带超时的网络请求
    async function fetchWithTimeout(url, options, timeout = CONFIG.REQUEST_TIMEOUT * 1000) {
        const startTime = Date.now();
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount <= maxRetries) {
            // 等待请求槽位
            await RequestThrottler.waitForSlot();

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                // 记录请求开始
                RequestThrottler.onRequestStart();

                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    credentials: 'same-origin',
                    mode: 'cors',
                    cache: 'no-cache'
                });

                clearTimeout(timeoutId);
                const responseTime = Date.now() - startTime;

                // 记录请求结束
                RequestThrottler.onRequestEnd(response.ok, responseTime);

                // 处理非OK响应
                if (!response.ok) {
                    const errorResult = await NetworkErrorHandler.handleError(
                        new Error(`HTTP ${response.status}`),
                        response,
                        retryCount,
                        '网络请求'
                    );

                    if (errorResult.shouldStop) {
                        throw new Error('请求被终止');
                    }

                    if (errorResult.shouldRetry && retryCount < maxRetries) {
                        retryCount++;
                        addLog(`🔄 ${errorResult.retryDelay / 1000}秒后重试 (${retryCount}/${maxRetries})`, 'info');
                        await new Promise(resolve => setTimeout(resolve, errorResult.retryDelay));
                        continue;
                    }

                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return response;

            } catch (error) {
                clearTimeout(timeoutId);
                RequestThrottler.onRequestEnd(false, Date.now() - startTime);

                if (retryCount >= maxRetries) {
                    throw error;
                }

                const errorResult = await NetworkErrorHandler.handleError(
                    error,
                    null,
                    retryCount,
                    '网络请求'
                );

                if (errorResult.shouldStop || !errorResult.shouldRetry) {
                    throw error;
                }

                retryCount++;
                addLog(`🔄 ${errorResult.retryDelay / 1000}秒后重试 (${retryCount}/${maxRetries})`, 'info');
                await new Promise(resolve => setTimeout(resolve, errorResult.retryDelay));
            }
        }
    }

    // 动态获取基础 URL
    function getBaseUrl() {
        const currentUrl = window.location.href;
        if (currentUrl.includes('ehall-443.webvpn.szu.edu.cn')) {
            return 'https://ehall-443.webvpn.szu.edu.cn';
        } else {
            return 'https://ehall.szu.edu.cn';
        }
    }

    // 修改获取可用时段函数，使用动态 URL
    async function getAvailableSlots() {
        try {
            const allAvailable = [];
            const sportCode = SPORT_CODES[CONFIG.SPORT];
            const campusCode = CAMPUS_CODES[CONFIG.CAMPUS];
            const baseUrl = getBaseUrl(); // 动态获取基础 URL

            // 获取已预约成功的时间段
            const bookedTimeSlots = successfulBookings.map(booking => booking.timeSlot);

            // 过滤掉已预约成功的时间段，只查询剩余需要预约的时间段
            const remainingTimeSlots = CONFIG.PREFERRED_TIMES.filter(timeSlot =>
                !bookedTimeSlots.includes(timeSlot)
            );

            // 如果所有时间段都已预约，直接返回空数组
            if (remainingTimeSlots.length === 0) {
                return [];
            }

            for (const timeSlot of remainingTimeSlots) {
                const [startTime, endTime] = timeSlot.split("-");

                const payload = new URLSearchParams({
                    XMDM: sportCode,
                    YYRQ: CONFIG.TARGET_DATE,
                    YYLX: CONFIG.YYLX,
                    KSSJ: startTime,
                    JSSJ: endTime,
                    XQDM: campusCode
                });

                // 使用动态 URL
                const response = await fetchWithTimeout(
                    `${baseUrl}/qljfwapp/sys/lwSzuCgyy/modules/sportVenue/getOpeningRoom.do`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'X-Requested-With': 'XMLHttpRequest',
                            'Accept': 'application/json, text/javascript, */*; q=0.01'
                        },
                        body: payload
                    }
                );

                if (!response.ok) {
                    addLog(`❌ 请求失败: HTTP ${response.status}`, 'error');
                    continue;
                }

                const data = await response.json();

                if (data.code !== "0") {
                    addLog(`❌ 查询时段 ${timeSlot} 失败: ${data.msg || '未知错误'}`, 'error');
                    continue;
                }

                if (data.datas && data.datas.getOpeningRoom) {
                    const rooms = data.datas.getOpeningRoom.rows || [];

                    let availableCount = 0;
                    for (const room of rooms) {
                        if (!room.disabled && room.text === "可预约") {
                            const venueName = room.CDMC || '';

                            // 根据场馆选择过滤
                            if (CONFIG.SPORT === "羽毛球" && CONFIG.PREFERRED_VENUE !== "全部") {
                                if (CONFIG.PREFERRED_VENUE === "至畅" && !venueName.includes("至畅")) {
                                    continue; // 跳过非至畅场馆
                                }
                                if (CONFIG.PREFERRED_VENUE === "至快" && !venueName.includes("至快")) {
                                    continue; // 跳过非至快场馆
                                }
                            }

                            let venuePriority = 2;
                            let courtPriority = 0; // 场地优先级，数字越小优先级越高

                            // 场馆优先级判断
                            if (venueName.includes("至畅")) {
                                venuePriority = 0;  // 至畅最优先

                                // 丽湖校区至畅羽毛球场优先级设置
                                if (CONFIG.CAMPUS === "丽湖" && CONFIG.SPORT === "羽毛球") {
                                    // 匹配"5号场"或"五号场"
                                    if (venueName.includes("5号场") || venueName.includes("五号场")) {
                                        courtPriority = -2; // 5号场地最优先
                                    }
                                    // 匹配"10号场"或"十号场"
                                    else if (venueName.includes("10号场") || venueName.includes("十号场")) {
                                        courtPriority = -1; // 10号场地次优先
                                    }
                                    // 匹配"1号场"或"一号场"
                                    else if (venueName.match(/[^0-9]1号场|^1号场|一号场/)) {
                                        courtPriority = 2; // 1号场地最低优先级
                                    }
                                    // 匹配"6号场"或"六号场"
                                    else if (venueName.includes("6号场") || venueName.includes("六号场")) {
                                        courtPriority = 2; // 6号场地最低优先级
                                    }
                                    // 其他至畅场地为默认优先级 0
                                }
                            } else if (venueName.includes("至快")) {
                                venuePriority = 1;  // 至快次之
                            }

                            const slotInfo = {
                                name: `${timeSlot} - ${venueName}`,
                                wid: room.WID,
                                timeSlot: timeSlot,
                                startTime: startTime,
                                endTime: endTime,
                                venueName: venueName,
                                venueCode: room.CGBM || '',
                                priority: CONFIG.PREFERRED_TIMES.indexOf(timeSlot),
                                venuePriority: venuePriority,
                                courtPriority: courtPriority // 场地优先级
                            };

                            allAvailable.push(slotInfo);
                            availableCount++;
                        }
                    }

                    // 只在找到可预约场地时显示简化信息
                    if (availableCount > 0) {
                        addLog(`✅ ${timeSlot} 找到 ${availableCount} 个可预约场地`, 'success');
                    }
                }
            }

            // 排序逻辑：优先级数字越小越优先
            allAvailable.sort((a, b) => {
                // 首先按场地优先级排序（数字越小优先级越高）
                if (a.courtPriority !== b.courtPriority) {
                    return a.courtPriority - b.courtPriority;
                }
                // 其次按场馆优先级排序
                if (a.venuePriority !== b.venuePriority) {
                    return a.venuePriority - b.venuePriority;
                }
                // 最后按时间优先级排序
                return a.priority - b.priority;
            });

            // 🔍 简化调试信息显示
            if (allAvailable.length > 0) {
                // 只在羽毛球且有特殊优先级场地时显示详细信息
                if (CONFIG.CAMPUS === "丽湖" && CONFIG.SPORT === "羽毛球") {
                    const hasSpecialCourts = allAvailable.some(slot =>
                        slot.courtPriority === -2 || slot.courtPriority === -1
                    );

                    if (hasSpecialCourts) {
                        const topSlot = allAvailable[0];
                        let priorityText = "";
                        if (topSlot.courtPriority === -2) {
                            priorityText = " (🏆 5号场优先)";
                        } else if (topSlot.courtPriority === -1) {
                            priorityText = " (⭐ 10号场)";
                        }
                        addLog(`🎯 优选场地: ${topSlot.venueName}${priorityText}`, 'info');
                    }
                }
            }

            return allAvailable;

        } catch (error) {
            addLog(`🔥 获取时段失败: ${error.message}`, 'error');
            return [];
        }
    }

    // 预约场地
    async function bookSlot(wid, slotName) {
        try {
            const timeSlot = CONFIG.PREFERRED_TIMES.find(time => slotName.includes(time));
            if (!timeSlot) {
                addLog(`❌ 无法从 ${slotName} 中提取时间信息`, 'error');
                return false;
            }

            // 使用新的场馆代码映射
            let venueCode = "104"; // 默认值
            for (const [venueName, code] of Object.entries(VENUE_CODES)) {
                if (slotName.includes(venueName)) {
                    venueCode = code;
                    break;
                }
            }

            const [startTime, endTime] = timeSlot.split("-");
            const sportCode = SPORT_CODES[CONFIG.SPORT];
            const campusCode = CAMPUS_CODES[CONFIG.CAMPUS];
            const baseUrl = getBaseUrl(); // 动态获取基础 URL

            const payload = new URLSearchParams({
                DHID: "",
                YYRGH: CONFIG.USER_INFO.YYRGH,
                CYRS: "",
                YYRXM: CONFIG.USER_INFO.YYRXM,
                CGDM: venueCode,
                CDWID: wid,
                XMDM: sportCode,
                XQWID: campusCode,
                KYYSJD: timeSlot,
                YYRQ: CONFIG.TARGET_DATE,
                YYLX: CONFIG.YYLX,
                YYKS: `${CONFIG.TARGET_DATE} ${startTime}`,
                YYJS: `${CONFIG.TARGET_DATE} ${endTime}`,
                PC_OR_PHONE: "pc"
            });

            // 使用动态 URL
            const response = await fetchWithTimeout(
                `${baseUrl}/qljfwapp/sys/lwSzuCgyy/sportVenue/insertVenueBookingInfo.do`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json, text/javascript, */*; q=0.01'
                    },
                    body: payload
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.code === "0" && result.msg === "成功") {
                const dhid = result.data?.DHID || "Unknown";
                addLog(`🎉 预约成功！场地：${slotName}`, 'success');
                addLog(`📋 预约单号：${dhid}`, 'success');

                successfulBookings.push({
                    timeSlot: timeSlot,
                    venueName: slotName,
                    dhid: dhid,
                    slotName: slotName
                });

                updateProgress();
                return true;
            } else {
                const errorMsg = result.msg || "未知错误";
                addLog(`❌ 预约失败：${errorMsg}`, 'error');

                if (errorMsg.includes("只能预订2次") || errorMsg.includes("超过限制")) {
                    addLog(`🎊 已达到预约上限！`, 'success');
                    return 'limit_reached';
                }

                return false;
            }

        } catch (error) {
            addLog(`💥 预约异常: ${error.message}`, 'error');
            return false;
        }
    }

    // 添加时间检查功能
    function checkBookingTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        // 检查是否在12:25-12:30之间
        if (hours === 12 && minutes >= 25 && minutes < 30) {
            const targetTime = new Date();
            targetTime.setHours(12, 29, 55, 0); // 设置为12:29:55

            const currentTime = now.getTime();
            const targetTimeMs = targetTime.getTime();

            if (currentTime < targetTimeMs) {
                const waitTime = targetTimeMs - currentTime;
                const waitMinutes = Math.floor(waitTime / 60000);
                const waitSeconds = Math.floor((waitTime % 60000) / 1000);

                return {
                    shouldWait: true,
                    waitTime: waitTime,
                    waitText: `${waitMinutes}分${waitSeconds}秒`
                };
            }
        }

        return { shouldWait: false };
    }

    // 等待到指定时间的函数
    async function waitForBookingTime() {
        const timeCheck = checkBookingTime();

        if (timeCheck.shouldWait) {
            addLog(`⏰ 检测到当前时间在12:25-12:30之间`, 'info');
            addLog(`🕐 将等待到12:29:55开始抢票 (还需等待${timeCheck.waitText})`, 'warning');

            // 创建倒计时显示
            const countdownInterval = setInterval(() => {
                const currentCheck = checkBookingTime();
                if (currentCheck.shouldWait) {
                    const waitMinutes = Math.floor(currentCheck.waitTime / 60000);
                    const waitSeconds = Math.floor((currentCheck.waitTime % 60000) / 1000);

                    // 更新按钮显示倒计时
                    const startBtn = document.getElementById('start-btn');
                    if (startBtn && isRunning) {
                        startBtn.textContent = `⏰ 等待开始 ${waitMinutes}:${waitSeconds.toString().padStart(2, '0')}`;
                    }

                    // 每30秒显示一次等待提示
                    if (waitSeconds % 30 === 0) {
                        addLog(`⏳ 继续等待... 还有${waitMinutes}分${waitSeconds}秒`, 'info');
                    }
                } else {
                    // 时间到了，清除倒计时
                    clearInterval(countdownInterval);
                    addLog(`🚀 等待结束，开始抢票！`, 'success');

                    // 更新按钮显示
                    const startBtn = document.getElementById('start-btn');
                    if (startBtn && isRunning) {
                        startBtn.textContent = '⏹️ 停止抢票';
                    }
                }
            }, 1000); // 每秒更新一次

            // 等待到指定时间
            await new Promise(resolve => {
                const checkTime = () => {
                    const currentCheck = checkBookingTime();
                    if (!currentCheck.shouldWait) {
                        clearInterval(countdownInterval);
                        resolve();
                    } else {
                        setTimeout(checkTime, 100); // 每100ms检查一次，确保精确
                    }
                };
                checkTime();
            });
        }
    }

    // 更新 startBooking 函数，移除退出机制
    async function startBooking() {
        if (isRunning) return;

        isRunning = true;
        retryCount = 0;
        startTime = new Date();
        const currentMaxBookings = getMaxBookings();

        // 重置重试机制
        SmartRetry.reset();
        SmartRetry.updateInterval();

        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.textContent = '⏹️ 停止抢票';
            startBtn.style.background = 'linear-gradient(45deg, #f44336, #d32f2f)';
        }

        addLog(`🚀 开始自动抢票！`, 'success');
        addLog(`📊 ${CONFIG.SPORT} | ${CONFIG.CAMPUS} | ${CONFIG.TARGET_DATE} | 目标: ${currentMaxBookings} 个时段`, 'info');

        // 添加场馆选择提示
        if (CONFIG.SPORT === "羽毛球") {
            if (CONFIG.PREFERRED_VENUE === "全部") {
                addLog(`🏟️ 场馆策略: 全部场馆 (至畅 > 至快)`, 'info');
            } else {
                addLog(`🏟️ 场馆策略: 仅${CONFIG.PREFERRED_VENUE}体育馆`, 'info');
            }

            if (CONFIG.CAMPUS === "丽湖" && (CONFIG.PREFERRED_VENUE === "至畅" || CONFIG.PREFERRED_VENUE === "全部")) {
                addLog(`🎾 至畅场地优先级: 5号 > 10号 > 其他 > 1号/6号`, 'info');
            }
        }

        try {
            // 检查是否需要等待到特定时间
            await waitForBookingTime();

            if (!isRunning) return;

            // 重新设置开始时间（排除等待时间）
            startTime = new Date();
            addLog(`⚡ 正式开始抢票循环！`, 'success');

            while (isRunning && retryCount < CONFIG.MAX_RETRY_TIMES) {
                if (successfulBookings.length >= currentMaxBookings) {
                    addLog(`🎊 恭喜！已成功预约 ${currentMaxBookings} 个时间段！`, 'success');
                    break;
                }

                // 移除 shouldContinue 检查，让程序按用户设置运行

                retryCount++;

                // 获取重试建议
                const advice = SmartRetry.getRetryAdvice();
                if (advice.shouldPause && retryCount > 1) {
                    addLog(`⏸️ ${advice.message}`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, advice.pauseDuration));
                    if (!isRunning) break;
                }

                // 简化查询进度显示
                if (retryCount === 1 || retryCount % 10 === 0 || retryCount <= 5) {
                    addLog(`🔍 第 ${retryCount} 次查询 (${successfulBookings.length}/${currentMaxBookings})`);
                }

                try {
                    const availableSlots = await getAvailableSlots();

                    if (availableSlots.length > 0) {
                        SmartRetry.onSuccess(); // 记录成功

                        // 简化找到场地的提示
                        if (availableSlots.length <= 5) {
                            addLog(`🎉 找到 ${availableSlots.length} 个可预约时段`, 'success');
                        } else {
                            addLog(`🎉 找到 ${availableSlots.length} 个可预约时段 (显示前5个)`, 'success');
                        }

                        // 预约逻辑保持不变...
                        const timeSlotGroups = {};
                        availableSlots.forEach(slot => {
                            if (!timeSlotGroups[slot.timeSlot]) {
                                timeSlotGroups[slot.timeSlot] = [];
                            }
                            timeSlotGroups[slot.timeSlot].push(slot);
                        });

                        for (const timeSlot of CONFIG.PREFERRED_TIMES) {
                            if (successfulBookings.length >= currentMaxBookings) break;

                            if (successfulBookings.some(booking => booking.timeSlot === timeSlot)) {
                                continue;
                            }

                            if (timeSlotGroups[timeSlot]) {
                                const slotsInTime = timeSlotGroups[timeSlot];
                                slotsInTime.sort((a, b) => {
                                    if (a.courtPriority !== b.courtPriority) {
                                        return a.courtPriority - b.courtPriority;
                                    }
                                    return a.venuePriority - b.venuePriority;
                                });

                                const firstSlot = slotsInTime[0];

                                let priorityText = "";
                                if (CONFIG.CAMPUS === "丽湖" && CONFIG.SPORT === "羽毛球" && firstSlot.venueName.includes("至畅")) {
                                    if (firstSlot.courtPriority === -2) {
                                        priorityText = " 🏆";
                                    } else if (firstSlot.courtPriority === -1) {
                                        priorityText = " ⭐";
                                    } else if (firstSlot.courtPriority === 2) {
                                        priorityText = " 🔻";
                                    }
                                }

                                addLog(`🎯 预约: ${firstSlot.venueName}${priorityText}`, 'info');

                                const result = await bookSlot(firstSlot.wid, firstSlot.name);

                                if (result === true) {
                                    addLog(`✨ ${timeSlot} 预约成功！`, 'success');
                                    if (successfulBookings.length < currentMaxBookings) {
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                    }
                                } else if (result === 'limit_reached') {
                                    break;
                                } else {
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                }
                            }
                        }
                    } else {
                        SmartRetry.onFailure('no_slots'); // 记录无可用时段

                        if (retryCount <= 3 || retryCount % 20 === 0) {
                            addLog(`🔍 暂无可预约场地`, 'warning');
                        }
                    }

                } catch (error) {
                    const errorType = NetworkErrorHandler.categorizeError(error);
                    SmartRetry.onFailure(errorType);

                    // 尝试错误恢复，但不因为恢复失败而退出
                    try {
                        await ErrorRecovery.attemptRecovery(errorType, error, {
                            operation: 'getAvailableSlots',
                            retryCount: retryCount
                        });
                    } catch (recoveryError) {
                        // 恢复失败也继续运行
                        addLog(`🔧 错误恢复失败，继续尝试`, 'warning');
                    }

                    // 只有认证错误才退出，其他错误都继续
                    if (errorType === 'auth_error') {
                        addLog(`🔐 认证错误，需要重新登录`, 'error');
                        break;
                    }
                }

                if (successfulBookings.length < currentMaxBookings && isRunning && retryCount < CONFIG.MAX_RETRY_TIMES) {
                    // 严格按照用户设置的查询间隔，添加小的随机抖动
                    const baseInterval = CONFIG.RETRY_INTERVAL * 1000; // 转换为毫秒
                    const jitter = Math.random() * 200 - 100; // ±100ms的随机抖动
                    const actualInterval = Math.max(100, baseInterval + jitter); // 确保最小间隔100ms
                    await new Promise(resolve => setTimeout(resolve, actualInterval));
                }
            }

        } catch (error) {
            addLog(`💥 程序异常: ${error.message}`, 'error');
            ErrorRecovery.recordError(error, { operation: 'startBooking' });
        } finally {
            stopBooking();
        }
    }
    
    // 更新 stopBooking 函数
    function stopBooking() {
        if (!isRunning) return;
        
        isRunning = false;
        const currentMaxBookings = getMaxBookings();
        
        // 清理移动端优化资源
        if (isMobile) {
            MobileOptimization.cleanup();
        }
        
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.textContent = '🚀 开始抢票';
            startBtn.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a52)';
        }
        
        if (successfulBookings.length > 0) {
            addLog(`🎉 抢票结束！成功预约 ${successfulBookings.length}/${currentMaxBookings} 个时段`, 'success');
            successfulBookings.forEach((booking, index) => {
                addLog(`${index + 1}. ${booking.slotName} (${booking.dhid})`, 'success');
            });
        } else {
            addLog(`😢 很遗憾，没有成功预约到任何时段`, 'warning');
        }
        
        const elapsed = startTime ? Math.round((new Date() - startTime) / 1000) : 0;
        addLog(`📊 运行时间: ${elapsed}秒, 查询次数: ${retryCount}`, 'info');
        
        // 显示错误统计
        const errorStats = ErrorRecovery.getErrorStats();
        if (errorStats.total > 0) {
            addLog(`🛡️ 错误统计: 总计${errorStats.total}个, 最近1小时${errorStats.lastHour}个`, 'info');
        }
    }

    // iOS兼容的初始化检查
    function checkIOSCompatibility() {
        const issues = [];

        // 检查存储可用性
        if (!Storage.set('test', 'test') || Storage.get('test') !== 'test') {
            issues.push('存储功能受限');
        }

        // 检查 fetch 支持
        if (typeof fetch === 'undefined') {
            issues.push('网络请求不支持');
        }

        // 检查触摸支持
        if (isIOS && !isTouchDevice) {
            issues.push('触摸事件检测异常');
        }

        if (issues.length > 0) {
            addLog(`⚠️ iOS兼容性问题: ${issues.join(', ')}`, 'warning');
            addLog(`💡 建议刷新页面或重启Safari`, 'info');
        } else {
            addLog(`✅ iOS兼容性检查通过`, 'success');
        }

        return issues.length === 0;
    }

    // 初始化函数
    function init() {
        // 添加系统健康检查
        const systemHealth = checkSystemHealth();
        if (!systemHealth.healthy) {
            addLog(`⚠️ 系统检查发现问题: ${systemHealth.issues.join(', ')}`, 'warning');
        }
        
        // 初始化错误恢复机制
        ErrorRecovery.init();
        
        // 初始化移动端优化
        if (isMobile) {
            MobileOptimization.init();
            MobileOptimization.preventPageFreeze();
            MobileOptimization.optimizeMemory();
        }
        
        // 初始化智能重试机制
        SmartRetry.reset();
        
        // 清理存储
        const cleanedCount = Storage.cleanup();
        if (cleanedCount > 0) {
            addLog(`🧹 清理了 ${cleanedCount} 个过期配置项`, 'info');
        }
        
        // 显示存储状态
        const storageInfo = Storage.getStorageInfo();
        let storageStatus = '💾 存储状态: ';
        if (storageInfo.localStorage.available) {
            storageStatus += `localStorage(${Math.round(storageInfo.localStorage.used/1024)}KB) `;
        }
        if (storageInfo.sessionStorage.available) {
            storageStatus += `sessionStorage(${Math.round(storageInfo.sessionStorage.used/1024)}KB) `;
        }
        if (storageInfo.memoryStorage.available) {
            storageStatus += `memory(${storageInfo.memoryStorage.used}项)`;
        }
        addLog(storageStatus, 'info');
        
        // 更新 URL 检查逻辑，支持 WebVPN
        const currentUrl = window.location.href;
        const isValidUrl = currentUrl.includes('ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy') ||
                          currentUrl.includes('ehall-443.webvpn.szu.edu.cn/qljfwapp/sys/lwSzuCgyy');
        
        if (!isValidUrl) {
            console.log('URL 不匹配，退出初始化。当前URL:', currentUrl);
            return;
        }
        
        console.log('开始初始化...', {
            isMobile, isIOS, isIPad, isTouchDevice,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            maxTouchPoints: navigator.maxTouchPoints,
            hasPointerEvent: !!window.PointerEvent,
            currentUrl: currentUrl
        });
        
        // 检查 PointerEvent 支持
        if (window.PointerEvent) {
            console.log('✅ 支持 PointerEvent API');
        } else {
            console.log('❌ 不支持 PointerEvent API，使用 TouchEvent');
        }
        
        // 确保配置中的日期为明天
        CONFIG.TARGET_DATE = getTomorrowDate();
        
        // iOS兼容性检查
        const isCompatible = checkIOSCompatibility();
        
        // 创建浮动按钮
        floatingButton = createFloatingButton();
        console.log('浮动按钮创建完成', floatingButton);
        
        // 创建控制面板
        controlPanel = createControlPanel();
        console.log('控制面板创建完成', controlPanel);
        
        // 更新界面显示
        updateDisplayConfig();
        
        // 同时更新输入框的值
        const targetDateInput = document.getElementById('target-date');
        if (targetDateInput) {
            targetDateInput.value = getTomorrowDate();
        }

        const deviceInfo = isIPad ? 'iPad' : (isMobile ? '移动端' : '桌面端');
        addLog(`🎮 自动抢票助手已就绪！(${deviceInfo})`, 'success');
        
        if (isIOS) {
            addLog(`🍎 iOS优化版本，触摸操作已优化`, 'info');
            if (window.PointerEvent) {
                addLog(`🎯 使用 PointerEvent API`, 'info');
            } else {
                addLog(`📱 使用 TouchEvent API`, 'info');
            }
            if (!isCompatible) {
                addLog(`⚠️ 发现兼容性问题，建议检查Safari设置`, 'warning');
            }
        }
        
        addLog(`📝 已加载配置，可随时修改`, 'info');
        console.log('初始化完成');
        
        // 测试面板状态
        console.log('初始面板状态:', isPanelVisible);
    }

    // 新增：页面可见性变化时也更新日期
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // 页面重新可见时，检查并更新日期
            const newTomorrowDate = getTomorrowDate();
            if (CONFIG.TARGET_DATE !== newTomorrowDate) {
                CONFIG.TARGET_DATE = newTomorrowDate;

                // 更新输入框
                const targetDateInput = document.getElementById('target-date');
                if (targetDateInput) {
                    targetDateInput.value = newTomorrowDate;
                }

                // 更新显示
                updateDisplayConfig();

                // 保存更新后的配置
                saveConfig(CONFIG);

                addLog(`📅 日期已自动更新为明天: ${newTomorrowDate}`, 'info');
            }
        }
    });

    // 添加系统健康检查函数
    function checkSystemHealth() {
        const issues = [];

        // 检查网络连接
        if (!navigator.onLine) {
            issues.push('网络连接断开');
        }

        // 检查存储空间
        try {
            const testKey = 'szu_sports_health_check';
            const testData = 'x'.repeat(1024); // 1KB test data
            localStorage.setItem(testKey, testData);
            localStorage.removeItem(testKey);
        } catch (e) {
            issues.push('存储空间不足');
        }

        // 检查时间同步（简单检查）
        const serverTime = new Date().getTime();
        const clientTime = Date.now();
        if (Math.abs(serverTime - clientTime) > 60000) { // 1分钟差异
            issues.push('系统时间可能不准确');
        }

        // 检查浏览器兼容性
        if (!window.fetch) issues.push('浏览器不支持fetch API');
        if (!window.Promise) issues.push('浏览器不支持Promise');
        if (!window.AbortController) issues.push('浏览器不支持AbortController');

        return {
            healthy: issues.length === 0,
            issues: issues
        };
    }

    // 确保页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM 已经加载完成
        setTimeout(init, 100); // 稍作延迟以确保页面元素完全就绪
    }

})();
