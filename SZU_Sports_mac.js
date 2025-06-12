// ==UserScript==
// @name         深圳大学体育场馆自动抢票 (iOS兼容优化版)
// @namespace    http://tampermonkey.net/

// @version      1.1.0
// @description  深圳大学体育场馆自动预约脚本 - iOS完全兼容
// @author       zskfree
// @match        https://ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/*
// @icon         🎾
// @grant        none
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // 更精确的设备检测
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isIPad = /iPad/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    console.log('设备检测:', { isMobile, isIOS, isIPad, isTouchDevice });

    // 增强的存储方案 - 兼容iOS限制
    const Storage = {
        set: function (key, value) {
            const fullKey = 'szu_sports_' + key;
            try {
                // 尝试 localStorage
                localStorage.setItem(fullKey, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('localStorage 失败，尝试 sessionStorage:', e);
                try {
                    // 回退到 sessionStorage
                    sessionStorage.setItem(fullKey, JSON.stringify(value));
                    return true;
                } catch (e2) {
                    console.warn('sessionStorage 也失败，使用内存存储:', e2);
                    // 最后回退到内存存储
                    if (!window.memoryStorage) window.memoryStorage = {};
                    window.memoryStorage[fullKey] = value;
                    return true;
                }
            }
        },
        get: function (key, defaultValue) {
            const fullKey = 'szu_sports_' + key;
            try {
                // 尝试 localStorage
                const item = localStorage.getItem(fullKey);
                if (item !== null) {
                    return JSON.parse(item);
                }
            } catch (e) {
                console.warn('读取 localStorage 失败:', e);
            }

            try {
                // 尝试 sessionStorage
                const item = sessionStorage.getItem(fullKey);
                if (item !== null) {
                    return JSON.parse(item);
                }
            } catch (e) {
                console.warn('读取 sessionStorage 失败:', e);
            }

            // 尝试内存存储
            if (window.memoryStorage && window.memoryStorage[fullKey] !== undefined) {
                return window.memoryStorage[fullKey];
            }

            return defaultValue;
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

    // 默认配置
    const DEFAULT_CONFIG = {
        USER_INFO: {
            YYRGH: "2300123999",
            YYRXM: "张三"
        },
        TARGET_DATE: getTomorrowDate(),
        SPORT: "羽毛球",
        CAMPUS: "丽湖",
        PREFERRED_VENUE: "至畅", // 新增：优先场馆选择
        PREFERRED_TIMES: ["20:00-21:00", "21:00-22:00"],
        RETRY_INTERVAL: 1,
        MAX_RETRY_TIMES: 200,
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

    function loadConfig() {
        try {
            const saved = Storage.get('bookingConfig', null);
            return saved ? { ...DEFAULT_CONFIG, ...saved } : DEFAULT_CONFIG;
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
                🎾 自动抢票助手 v1.1.0
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
        if (!CONFIG.USER_INFO.YYRGH || !CONFIG.USER_INFO.YYRXM) {
            addLog('❌ 请填写完整的用户信息', 'error');
            return false;
        }
        if (CONFIG.PREFERRED_TIMES.length === 0) {
            addLog('❌ 请至少选择一个时间段', 'error');
            return false;
        }
        if (!CONFIG.TARGET_DATE) {
            addLog('❌ 请选择预约日期', 'error');
            return false;
        }

        // 新增：验证日期不能是过去
        const targetDate = new Date(CONFIG.TARGET_DATE);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (targetDate < today) {
            addLog('❌ 预约日期不能是过去的日期', 'error');
            return false;
        }

        // 新增：验证学号格式
        if (!/^\d{8,12}$/.test(CONFIG.USER_INFO.YYRGH)) {
            addLog('⚠️ 学号格式可能不正确，请检查', 'warning');
        }

        return true;
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

    // iOS优化的网络请求
    async function fetchWithTimeout(url, options, timeout = CONFIG.REQUEST_TIMEOUT * 1000) {
        // iOS Safari 兼容的 AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            // iOS Safari 兼容的 fetch 配置
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                credentials: 'same-origin', // iOS Safari 兼容
                mode: 'cors',
                cache: 'no-cache'
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        }
    }


    // 修改获取可用时段函数，使用优化的请求
    async function getAvailableSlots() {
        try {
            const allAvailable = [];
            const sportCode = SPORT_CODES[CONFIG.SPORT];
            const campusCode = CAMPUS_CODES[CONFIG.CAMPUS];

            for (const timeSlot of CONFIG.PREFERRED_TIMES) {
                const [startTime, endTime] = timeSlot.split("-");

                const payload = new URLSearchParams({
                    XMDM: sportCode,
                    YYRQ: CONFIG.TARGET_DATE,
                    YYLX: CONFIG.YYLX,
                    KSSJ: startTime,
                    JSSJ: endTime,
                    XQDM: campusCode
                });

                // 使用优化的请求函数
                const response = await fetchWithTimeout(
                    "https://ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/modules/sportVenue/getOpeningRoom.do",
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

            // 使用优化的请求函数
            const response = await fetchWithTimeout(
                "https://ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/sportVenue/insertVenueBookingInfo.do",
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

    // 主抢票循环
    async function startBooking() {
        if (isRunning) return;

        isRunning = true;
        retryCount = 0;
        startTime = new Date();
        const currentMaxBookings = getMaxBookings(); // 获取当前最大预约数量

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

            // 只在丽湖至畅时显示优先级提示
            if (CONFIG.CAMPUS === "丽湖" && (CONFIG.PREFERRED_VENUE === "至畅" || CONFIG.PREFERRED_VENUE === "全部")) {
                addLog(`🎾 至畅场地优先级: 5号 > 10号 > 其他 > 1号/6号`, 'info');
            }
        }

        try {
            while (isRunning && retryCount < CONFIG.MAX_RETRY_TIMES) {
                if (successfulBookings.length >= currentMaxBookings) {
                    addLog(`🎊 恭喜！已成功预约 ${currentMaxBookings} 个时间段！`, 'success');
                    break;
                }

                retryCount++;
                // 简化查询进度显示
                if (retryCount === 1 || retryCount % 10 === 0 || retryCount <= 5) {
                    addLog(`🔍 第 ${retryCount} 次查询 (${successfulBookings.length}/${currentMaxBookings})`);
                }

                const availableSlots = await getAvailableSlots();

                if (availableSlots.length > 0) {
                    // 简化找到场地的提示
                    if (availableSlots.length <= 5) {
                        addLog(`🎉 找到 ${availableSlots.length} 个可预约时段`, 'success');
                    } else {
                        addLog(`🎉 找到 ${availableSlots.length} 个可预约时段 (显示前5个)`, 'success');
                    }

                    const bookedTimeSlots = successfulBookings.map(booking => booking.timeSlot);
                    const remainingSlots = availableSlots.filter(slot =>
                        !bookedTimeSlots.includes(slot.timeSlot)
                    );

                    if (remainingSlots.length > 0) {
                        const timeSlotGroups = {};
                        remainingSlots.forEach(slot => {
                            if (!timeSlotGroups[slot.timeSlot]) {
                                timeSlotGroups[slot.timeSlot] = [];
                            }
                            timeSlotGroups[slot.timeSlot].push(slot);
                        });

                        for (const timeSlot of CONFIG.PREFERRED_TIMES) {
                            if (successfulBookings.length >= currentMaxBookings) break;
                            if (bookedTimeSlots.includes(timeSlot)) continue;

                            if (timeSlotGroups[timeSlot]) {
                                const slotsInTime = timeSlotGroups[timeSlot];
                                // 重新排序以确保优先级正确
                                slotsInTime.sort((a, b) => {
                                    if (a.courtPriority !== b.courtPriority) {
                                        return a.courtPriority - b.courtPriority;
                                    }
                                    return a.venuePriority - b.venuePriority;
                                });

                                const firstSlot = slotsInTime[0];

                                // 简化选择场地信息显示
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
                    }
                } else {
                    // 简化无可用场地的提示
                    if (retryCount <= 3 || retryCount % 20 === 0) {
                        addLog(`🔍 暂无可预约场地`, 'warning');
                    }
                }

                if (successfulBookings.length < currentMaxBookings && isRunning && retryCount < CONFIG.MAX_RETRY_TIMES) {
                    // 只在前几次或间隔显示等待信息
                    if (retryCount <= 3 || retryCount % 30 === 0) {
                        addLog(`⏳ 等待 ${CONFIG.RETRY_INTERVAL} 秒后重试...`);
                    }
                    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_INTERVAL * 1000));
                }
            }

        } catch (error) {
            addLog(`💥 程序异常: ${error.message}`, 'error');
        } finally {
            stopBooking();
        }
    }

    // 停止抢票
    function stopBooking() {
        if (!isRunning) return; // 防止重复调用

        isRunning = false;
        const currentMaxBookings = getMaxBookings();

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

    // 修改初始化函数，增加更多调试信息
    function init() {
        if (!window.location.href.includes('ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy')) {
            console.log('URL 不匹配，退出初始化');
            return;
        }

        console.log('开始初始化...', {
            isMobile,
            isIOS,
            isIPad,
            isTouchDevice,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            maxTouchPoints: navigator.maxTouchPoints,
            hasPointerEvent: !!window.PointerEvent
        });

        // 检查 PointerEvent 支持
        if (window.PointerEvent) {
            console.log('✅ 支持 PointerEvent API');
        } else {
            console.log('❌ 不支持 PointerEvent API，使用 TouchEvent');
        }

        // iOS兼容性检查
        const isCompatible = checkIOSCompatibility();

        // 创建浮动按钮
        floatingButton = createFloatingButton();
        console.log('浮动按钮创建完成', floatingButton);

        // 创建控制面板
        controlPanel = createControlPanel();
        console.log('控制面板创建完成', controlPanel);

        updateDisplayConfig();

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

    // 确保页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM 已经加载完成
        setTimeout(init, 100); // 稍作延迟以确保页面元素完全就绪
    }

})();