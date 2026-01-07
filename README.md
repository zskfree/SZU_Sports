# SZU & HZAU 体育场馆自动预约脚本 🎾

版本: 1.2.4 | 作者: zskfree | 许可证: MIT

---

## 概述

一组 Tampermonkey 用户脚本，用于自动化预约深圳大学（SZU）和华中农业大学（HZAU）体育场馆。支持 iOS、Android 及桌面端，提供智能预约、定时重试、限频控制及企业微信推送通知。

👉 **SZU 教程与安装**：<https://www.zskksz.asia/SZU_Sports/>

---

## ✨ 功能亮点（通用）

- **智能预约**：多时段优先级与场馆策略，支持盲打预加载（HZAU）。
- **毫秒级定时**：支持设定开抢时间，服务器校时可选。
- **稳定重试**：自动重试、限频与并发控制，降低接口限流风险。
- **多端优化**：移动端唤醒保持、触控优化，桌面端悬浮面板控制。
- **可选通知**：企业微信 Webhook 推送预约状态。

---

## HZAU 版（华中农业大学）

- **核心脚本**：见 [src/HZAU_Sports.js](src/HZAU_Sports.js)。
- **特性概览**：
 	- 自动抢票、毫秒级定时、盲打预加载提高成功率。
 	- 服务器时间同步，校准本机偏差。
 	- 并发重试与多时段选择，失败自动重试。
 	- 可视化悬浮面板、日志与 Token 守护。
- **使用提示**：
 	- 安装方式与 SZU 版一致，先安装 Tampermonkey，再导入脚本。
 	- 进入华农预约系统 <https://zhcg.hzau.edu.cn/>，按面板选择场馆、日期、时段，定时或立即开抢即可。

---

## SZU 版（深圳大学）

- **核心脚本**：见 [src/SZU_Sports.js](src/SZU_Sports.js)。
- **安装与教程**：访问 <https://www.zskksz.asia/SZU_Sports/> 获取桌面端和手机端图文引导。

---

## 📁 项目结构

```text
SZU_Sports/
├── docs/               # GitHub Pages 静态部署
│   ├── index.html      # 教程主页（当前为 SZU 指南，HZAU 同流程安装）
│   ├── install_*.html  # 分平台安装指南
│   └── assets/         # 图片等静态资源
├── src/                # 源代码目录
│   ├── SZU_Sports.js   # SZU 核心脚本
│   └── HZAU_Sports.js  # HZAU 核心脚本
├── README.md           # 项目说明文档
└── LICENSE             # MIT 开源协议
```

### 快速说明

- **开发入口**：主要逻辑位于 [src/SZU_Sports.js](src/SZU_Sports.js) 与 [src/HZAU_Sports.js](src/HZAU_Sports.js)。
- **文档部署**：`docs/` 目录通过 GitHub Pages 自动部署，默认指向 SZU 教程；HZAU 安装步骤相同，可按 README 指引使用。
- **图片资源**：统一存放在 `docs/assets/img/`。

---

## 🚀 开发与安装

- **本地修改**：编辑 `src/` 目录下的脚本。
- **多端同步**：脚本适配移动端，建议使用 Via 浏览器进行测试。
- **许可证**：采用 MIT 协议，欢迎提交 Issue 或 Pull Request。

---

© 2026 zskfree | [MIT License](LICENSE)
