// ==UserScript==
// @name         深圳大学体育场馆自动抢票
// @namespace    http://tampermonkey.net/
// @version      1.0.7
// @description  深圳大学体育场馆自动预约脚本 - 支持面板隐藏显示
// @author       zskfree
// @match        https://ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/*
// @icon         🎾
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/537386/%E6%B7%B1%E5%9C%B3%E5%A4%A7%E5%AD%A6%E4%BD%93%E8%82%B2%E5%9C%BA%E9%A6%86%E8%87%AA%E5%8A%A8%E6%8A%A2%E7%A5%A8.user.js
// @updateURL https://update.greasyfork.org/scripts/537386/%E6%B7%B1%E5%9C%B3%E5%A4%A7%E5%AD%A6%E4%BD%93%E8%82%B2%E5%9C%BA%E9%A6%86%E8%87%AA%E5%8A%A8%E6%8A%A2%E7%A5%A8.meta.js
// ==/UserScript==

(function () {
    'use strict';

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

    // 保存和加载配置
    function saveConfig(config) {
        GM_setValue('bookingConfig', JSON.stringify(config));
    }

    function loadConfig() {
        try {
            const saved = GM_getValue('bookingConfig', null);
            return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
        } catch (e) {
            return DEFAULT_CONFIG;
        }
    }

    // 保存和加载面板状态
    function savePanelState(isVisible) {
        GM_setValue('panelVisible', isVisible);
    }

    function loadPanelState() {
        return GM_getValue('panelVisible', true);
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

    // 创建浮动按钮
    function createFloatingButton() {
        const button = document.createElement('div');
        button.id = 'floating-toggle-btn';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
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
            font-size: 24px;
            user-select: none;
        `;

        button.innerHTML = '🎾';
        button.title = '显示/隐藏抢票面板';

        // 悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        });

        // 点击切换面板显示/隐藏
        button.addEventListener('click', () => {
            togglePanel();
        });

        document.body.appendChild(button);
        return button;
    }

    // 创建控制面板
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'auto-booking-panel';
        panel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 90px;
        width: 400px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        padding: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: 'Microsoft YaHei', sans-serif;
        color: white;
        border: 2px solid rgba(255,255,255,0.2);
        max-height: 90vh;
        overflow-y: auto;
        transition: all 0.3s ease;
        transform: translateX(0);
    `;

        panel.innerHTML = `
        <div style="margin-bottom: 15px; text-align: center; position: relative;">
            <h3 style="margin: 0; font-size: 18px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                🎾 自动抢票助手 v1.0.7
            </h3>
            <button id="close-panel" style="
                position: absolute;
                top: -5px;
                right: -5px;
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
            " title="隐藏面板">×</button>
            <button id="toggle-config" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 5px 10px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 5px;
                font-size: 12px;
            ">⚙️ 配置设置</button>
        </div>

        <!-- 配置区域 -->
        <div id="config-area" style="
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            display: block;
        ">
            <!-- 用户信息 -->
            <div style="margin-bottom: 12px;">
                <label style="font-size: 12px; display: block; margin-bottom: 3px;">👤 学号/工号:</label>
                <input id="user-id" type="text" value="${CONFIG.USER_INFO.YYRGH}" style="
                    width: 100%;
                    padding: 6px;
                    border: none;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.9);
                    color: #333;
                    font-size: 12px;
                    box-sizing: border-box;
                ">
            </div>

            <div style="margin-bottom: 12px;">
                <label style="font-size: 12px; display: block; margin-bottom: 3px;">📝 姓名:</label>
                <input id="user-name" type="text" value="${CONFIG.USER_INFO.YYRXM}" style="
                    width: 100%;
                    padding: 6px;
                    border: none;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.9);
                    color: #333;
                    font-size: 12px;
                    box-sizing: border-box;
                ">
            </div>

            <!-- 预约设置 -->
            <div style="margin-bottom: 12px;">
                <label style="font-size: 12px; display: block; margin-bottom: 3px;">📅 预约日期:</label>
                <input id="target-date" type="date" value="${CONFIG.TARGET_DATE}" style="
                    width: 100%;
                    padding: 6px;
                    border: none;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.9);
                    color: #333;
                    font-size: 12px;
                    box-sizing: border-box;
                ">
            </div>

            <div style="margin-bottom: 12px;">
                <label style="font-size: 12px; display: block; margin-bottom: 3px;">🏟️ 运动项目:</label>
                <select id="sport-type" style="
                    width: 100%;
                    padding: 6px;
                    border: none;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.9);
                    color: #333;
                    font-size: 12px;
                    box-sizing: border-box;
                ">
                    ${Object.keys(SPORT_CODES).map(sport =>
            `<option value="${sport}" ${sport === CONFIG.SPORT ? 'selected' : ''}>${sport}</option>`
        ).join('')}
                </select>
            </div>

            <div style="margin-bottom: 12px;">
                <label style="font-size: 12px; display: block; margin-bottom: 3px;">🏫 校区:</label>
                <select id="campus" style="
                    width: 100%;
                    padding: 6px;
                    border: none;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.9);
                    color: #333;
                    font-size: 12px;
                    box-sizing: border-box;
                ">
                    ${Object.keys(CAMPUS_CODES).map(campus =>
            `<option value="${campus}" ${campus === CONFIG.CAMPUS ? 'selected' : ''}>${campus}</option>`
        ).join('')}
                </select>
            </div>

            <!-- 羽毛球场馆选择 -->
            <div id="venue-selection" style="margin-bottom: 12px; display: ${CONFIG.SPORT === '羽毛球' ? 'block' : 'none'};">
                <label style="font-size: 12px; display: block; margin-bottom: 3px;">🏟️ 优先场馆:</label>
                <select id="preferred-venue" style="
                    width: 100%;
                    padding: 6px;
                    border: none;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.9);
                    color: #333;
                    font-size: 12px;
                    box-sizing: border-box;
                ">
                    <option value="至畅" ${CONFIG.PREFERRED_VENUE === '至畅' ? 'selected' : ''}>🏆 至畅体育馆</option>
                    <option value="至快" ${CONFIG.PREFERRED_VENUE === '至快' ? 'selected' : ''}>⚡ 至快体育馆</option>
                    <option value="全部" ${CONFIG.PREFERRED_VENUE === '全部' ? 'selected' : ''}>🔄 全部场馆</option>
                </select>
                <div style="font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px;">
                    💡 选择"全部"将按至畅>至快的顺序预约
                </div>
            </div>

            <!-- 时间段选择 -->
            <div style="margin-bottom: 12px;">
                <label style="font-size: 12px; display: block; margin-bottom: 3px;">⏰ 优先时间段 (按优先级排序):</label>
                <div id="time-slots-container" style="
                    max-height: 100px;
                    overflow-y: auto;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                    padding: 5px;
                ">
                    ${TIME_SLOTS.map(slot => `
                        <label style="display: block; font-size: 11px; margin: 2px 0; cursor: pointer;">
                            <input type="checkbox" value="${slot}"
                                ${CONFIG.PREFERRED_TIMES.includes(slot) ? 'checked' : ''}
                                style="margin-right: 5px;">
                            ${slot}
                        </label>
                    `).join('')}
                </div>
            </div>

            <!-- 运行参数 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                <div>
                    <label style="font-size: 12px; display: block; margin-bottom: 3px;">⏱️ 查询间隔(秒):</label>
                    <input id="retry-interval" type="number" min="1" max="60" value="${CONFIG.RETRY_INTERVAL}" style="
                        width: 100%;
                        padding: 6px;
                        border: none;
                        border-radius: 4px;
                        background: rgba(255,255,255,0.9);
                        color: #333;
                        font-size: 12px;
                        box-sizing: border-box;
                    ">
                </div>
                <div>
                    <label style="font-size: 12px; display: block; margin-bottom: 3px;">🔄 最大重试:</label>
                    <input id="max-retry" type="number" min="10" max="9999" value="${CONFIG.MAX_RETRY_TIMES}" style="
                        width: 100%;
                        padding: 6px;
                        border: none;
                        border-radius: 4px;
                        background: rgba(255,255,255,0.9);
                        color: #333;
                        font-size: 12px;
                        box-sizing: border-box;
                    ">
                </div>
            </div>

            <div style="margin-bottom: 12px;">
                <label style="font-size: 12px; display: block; margin-bottom: 3px;">⏰ 请求超时(秒):</label>
                <input id="request-timeout" type="number" min="5" max="60" value="${CONFIG.REQUEST_TIMEOUT}" style="
                    width: 100%;
                    padding: 6px;
                    border: none;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.9);
                    color: #333;
                    font-size: 12px;
                    box-sizing: border-box;
                ">
            </div>

            <button id="save-config" style="
                width: 100%;
                padding: 8px;
                background: linear-gradient(45deg, #4caf50, #45a049);
                border: none;
                border-radius: 6px;
                color: white;
                font-size: 14px;
                cursor: pointer;
                margin-bottom: 10px;
            ">💾 保存配置</button>
        </div>

        <!-- 当前配置显示 -->
        <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
            <div style="font-size: 13px; margin-bottom: 5px;">
                👤 <span id="display-user">${CONFIG.USER_INFO.YYRXM} (${CONFIG.USER_INFO.YYRGH})</span>
            </div>
            <div style="font-size: 13px; margin-bottom: 5px;">
                📅 <span id="display-date">${CONFIG.TARGET_DATE}</span> |
                🏟️ <span id="display-sport">${CONFIG.SPORT}</span> |
                🏫 <span id="display-campus">${CONFIG.CAMPUS}</span>
            </div>
            <div id="venue-display" style="font-size: 13px; margin-bottom: 5px; display: ${CONFIG.SPORT === '羽毛球' ? 'block' : 'none'};">
                🏟️ 优先场馆: <span id="display-venue">${CONFIG.PREFERRED_VENUE || '至畅'}</span>
            </div>
            <div style="font-size: 13px; margin-bottom: 5px;">
                ⏰ <span id="display-times">${CONFIG.PREFERRED_TIMES.join(', ')}</span>
            </div>
            <div style="font-size: 13px;">
                ⚙️ 间隔:<span id="display-interval">${CONFIG.RETRY_INTERVAL}</span>s |
                重试:<span id="display-retry">${CONFIG.MAX_RETRY_TIMES}</span> |
                超时:<span id="display-timeout">${CONFIG.REQUEST_TIMEOUT}</span>s
            </div>
            <div style="font-size: 13px; margin-top: 5px;">
                🎯 进度: <span id="booking-progress">0/${getMaxBookings()} 个时段</span>
            </div>
        </div>

        <!-- 控制按钮 -->
        <div style="margin-bottom: 15px;">
            <button id="start-btn" style="
                width: 100%;
                padding: 12px;
                background: linear-gradient(45deg, #ff6b6b, #ee5a52);
                border: none;
                border-radius: 8px;
                color: white;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            ">
                🚀 开始抢票
            </button>
        </div>

        <!-- 状态日志 -->
        <div id="status-area" style="
            background: rgba(0,0,0,0.2);
            padding: 10px;
            border-radius: 8px;
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid rgba(255,255,255,0.1);
        ">
            <div style="color: #ffd700;">🔧 等待开始...</div>
        </div>

        <div style="margin-top: 15px; text-align: center; font-size: 11px; opacity: 0.8;">
            ⚡ 快捷键: Ctrl+Shift+S 开始/停止 | Ctrl+Shift+H 显示/隐藏面板
        </div>
    `;

        document.body.appendChild(panel);

        // 根据保存的状态设置面板可见性
        if (!isPanelVisible) {
            panel.style.display = 'none';
        }

        bindEvents();
        return panel;
    }

    // 切换面板显示/隐藏
    function togglePanel() {
        isPanelVisible = !isPanelVisible;
        savePanelState(isPanelVisible);

        if (controlPanel) {
            if (isPanelVisible) {
                controlPanel.style.display = 'block';
                // 添加入场动画
                controlPanel.style.transform = 'translateX(100%)';
                controlPanel.style.opacity = '0';
                setTimeout(() => {
                    controlPanel.style.transition = 'all 0.3s ease';
                    controlPanel.style.transform = 'translateX(0)';
                    controlPanel.style.opacity = '1';
                }, 10);
            } else {
                // 添加退场动画
                controlPanel.style.transition = 'all 0.3s ease';
                controlPanel.style.transform = 'translateX(100%)';
                controlPanel.style.opacity = '0';
                setTimeout(() => {
                    controlPanel.style.display = 'none';
                }, 300);
            }
        }

        // 更新浮动按钮样式
        if (floatingButton) {
            if (isPanelVisible) {
                floatingButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                floatingButton.innerHTML = '🎾';
                floatingButton.title = '隐藏抢票面板';
            } else {
                floatingButton.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)';
                floatingButton.innerHTML = '📱';
                floatingButton.title = '显示抢票面板';
            }
        }
    }

    // 绑定事件
    function bindEvents() {
        // 面板关闭按钮
        document.getElementById('close-panel').addEventListener('click', () => {
            togglePanel();
        });

        // 配置显示/隐藏
        document.getElementById('toggle-config').addEventListener('click', () => {
            const configArea = document.getElementById('config-area');
            if (configArea.style.display === 'none') {
                configArea.style.display = 'block';
                document.getElementById('toggle-config').textContent = '⚙️ 隐藏配置';
            } else {
                configArea.style.display = 'none';
                document.getElementById('toggle-config').textContent = '⚙️ 显示配置';
            }
        });

        // 运动项目变化时显示/隐藏场馆选择
        document.getElementById('sport-type').addEventListener('change', () => {
            const sportType = document.getElementById('sport-type').value;
            const venueSelection = document.getElementById('venue-selection');
            const venueDisplay = document.getElementById('venue-display');

            if (sportType === '羽毛球') {
                venueSelection.style.display = 'block';
                venueDisplay.style.display = 'block';
            } else {
                venueSelection.style.display = 'none';
                venueDisplay.style.display = 'none';
            }
        });

        // 保存配置
        document.getElementById('save-config').addEventListener('click', () => {
            updateConfigFromUI();
            updateDisplayConfig();
            addLog('✅ 配置已保存', 'success');
        });

        // 开始/停止按钮
        document.getElementById('start-btn').addEventListener('click', () => {
            if (isRunning) {
                stopBooking();
            } else {
                updateConfigFromUI();
                if (validateConfig()) {
                    startBooking();
                }
            }
        });

        // 快捷键
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
                        document.getElementById('toggle-config').click();
                    }
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

    // 获取可用时段
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

                const response = await fetch(
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

            // 移除"正在预约"的重复提示，因为上面已经显示了

            const response = await fetch(
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

    // 初始化
    function init() {
        if (!window.location.href.includes('ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy')) {
            return;
        }

        // 创建浮动按钮
        floatingButton = createFloatingButton();

        // 创建控制面板
        controlPanel = createControlPanel();
        updateDisplayConfig();

        addLog(`🎮 自动抢票助手已就绪！`, 'success');
        addLog(`📝 已加载配置，可随时修改`, 'info');
        addLog(`⌨️ 快捷键: Ctrl+Shift+S 开始/停止 | Ctrl+Shift+H 显示/隐藏`, 'info');
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();