# 深圳大学体育场馆自动预约脚本 🎾

版本: 1.2.4 | 作者: zskfree | 许可证: MIT

---

## 概述

这是一个 Tampermonkey 用户脚本，用于自动化预约深圳大学（SZU）体育场馆。支持 iOS、Android 及桌面端，提供智能预约、定时重试、限频控制及企业微信推送通知。

👉 **[立即安装与使用教程](https://www.zskksz.asia/SZU_Sports/)**

---

## ✨ 功能亮点

- **智能预约**：支持多时段优先级配置，内置场馆优先级策略。
- **稳定重试**：具备自动重试与频率控制（指数退避算法），有效应对接口限流。
- **定时任务**：支持设定未来时间预约，并在页面刷新后自动恢复执行。
- **移动端优化**：屏幕唤醒保持、触控优化及响应式 UI 设计。
- **可选通知**：支持通过企业微信 Webhook 推送预约状态，不错过任何成功反馈。

---

## 📁 项目结构

```text
SZU_Sports/
├── docs/               # 静态部署目录 (GitHub Pages)
│   ├── index.html      # 教程主页
│   ├── install_*.html  # 分平台安装指南
│   └── assets/         # 图片等静态资源
├── src/                # 源代码目录
│   └── SZU_Sports.js   # 核心脚本文件
├── README.md           # 项目说明文档
└── LICENSE             # MIT 开源协议
```

### 快速说明

- **代码开发**：主要逻辑位于 [src/SZU_Sports.js](src/SZU_Sports.js)。
- **文档部署**：`docs/` 目录通过 GitHub Pages 自动部署，通过 `https://[username].github.io/SZU_Sports/` 访问。
- **图片资源**：统一存放在 `docs/assets/img/`。

---

## 🚀 开发与安装

- **本地修改**：编辑 `src/` 目录下的代码。
- **多端同步**：本脚本适配移动端，建议使用 Via 进行测试。
- **许可证**：采用 MIT 协议，欢迎提交 Issue 或 Pull Request。

---

© 2026 zskfree | [MIT License](LICENSE)
