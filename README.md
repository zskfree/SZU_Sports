# 🎾 SZU Sports - 深圳大学体育场馆智能抢票助手

<div align="center">

![Version](https://img.shields.io/badge/version-1.1.5-blue.svg)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Desktop-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-red.svg)

**专为深圳大学场馆预约系统开发的智能化油猴脚本**

支持多项目预约 • 跨平台兼容 • 移动端优化 • 智能重试

[🚀 立即安装](https://greasyfork.org/zh-CN/scripts/537386-深圳大学体育场馆自动抢票) • [📖 使用文档](#使用指南) • [🐛 问题反馈](https://github.com/zskfree/SZU_Sports/issues)

</div>

---

## ✨ 项目简介

**SZU Sports** 是一个功能强大的自动化抢票脚本，专为深圳大学体育场馆预约系统设计。通过智能算法和先进的错误恢复机制，帮助用户高效、便捷地预约心仪的运动场馆。

### 🎯 核心优势

- **🤖 全自动化**: 无需人工干预，智能循环预约
- **📱 跨平台支持**: 完美兼容 iOS、Android 和桌面端
- **🧠 智能重试**: 自适应重试策略，提高成功率
- **⚡ 高性能**: 优化的请求频率控制和内存管理
- **🛡️ 错误恢复**: 内置多重错误处理和自动恢复机制

## 🚀 主要功能

### 核心功能

- 🏃 **智能预约**: 自动循环刷新并预约指定时间段的场馆
- 🎯 **多项目支持**: 支持羽毛球、篮球、网球、排球、游泳、乒乓球、桌球
- 🏟️ **场馆优选**: 羽毛球支持至畅/至快场馆选择，智能优先级排序
- 📅 **灵活配置**: 自定义预约日期、校区、运动项目、时间段等参数

### 用户体验

- 🖱️ **友好界面**: 浮动按钮与可配置的控制面板
- ⚡ **快捷操作**: 支持键盘快捷键（桌面端）
- 📱 **移动优化**: 专为触摸设备优化的交互体验
- 💾 **配置保存**: 用户偏好自动保存，支持跨设备同步

### 高级特性

- 🔄 **智能重试**: 自适应重试间隔和错误恢复
- ⏱️ **实时监控**: 详细的预约进度和状态日志
- 🛡️ **错误处理**: 网络异常自动恢复，提高稳定性
- 🔋 **电池优化**: 移动端电池状态监控和性能优化

## 📋 支持的运动项目

| 项目 | 校区支持 | 特殊功能 |
|------|----------|----------|
| 🏸 羽毛球 | 粤海、丽湖 | 场馆优选（至畅/至快） |
| 🏀 篮球 | 粤海、丽湖 | - |
| 🎾 网球 | 粤海、丽湖 | - |
| 🏐 排球 | 粤海、丽湖 | - |
| 🏊 游泳 | 粤海、丽湖 | - |
| 🏓 乒乓球 | 粤海、丽湖 | - |
| 🎱 桌球 | 粤海、丽湖 | - |

## 🛠️ 技术规格

### 兼容性

- **📱 移动端**: iOS Safari 14+, Android Chrome 80+
- **💻 桌面端**: Chrome 90+, Firefox 88+, Edge 90+
- **🔧 核心技术**: ES6+ JavaScript, Fetch API, Touch/Pointer Events

### 性能优化

- **⚡ 请求控制**: 智能频率限制，避免服务器过载
- **🧹 内存管理**: 自动清理机制，防止内存泄漏
- **🔋 电池监控**: 移动端电池状态感知
- **📶 网络适应**: 网络状态检测和自动重连

## 📖 使用指南

### 🔧 安装步骤

#### 1. 安装浏览器扩展

首先需要安装 Tampermonkey 扩展：

- **Chrome**: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- **Safari**: [Safari Extensions](https://apps.apple.com/us/app/tampermonkey/id1482490089)
- **Edge**: [Microsoft Store](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

#### 2. 安装脚本

点击下方链接直接安装：

**[🚀 立即安装 SZU Sports 脚本](https://greasyfork.org/zh-CN/scripts/537386-深圳大学体育场馆自动抢票)**

#### 3. 访问预约页面

根据你的网络环境选择合适的访问方式：

**校园网环境（推荐）:**

```
https://ehall.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/index.do#/sportVenue
```

**校外网络（WebVPN）:**

```
https://ehall-443.webvpn.szu.edu.cn/qljfwapp/sys/lwSzuCgyy/index.do#/sportVenue
```

### 🎮 使用方法

#### 基础操作

1. **打开预约页面**: 访问深圳大学场馆预约系统
2. **显示控制面板**: 点击页面右上角的浮动按钮 🎾
3. **配置参数**: 填写个人信息和预约偏好
4. **开始抢票**: 点击"🚀 开始抢票"按钮

#### 配置说明

**用户信息**

- 学号/工号: 你的深大学号或工号
- 姓名: 与学号对应的真实姓名

**预约设置**

- 预约日期: 自动设置为明天（可手动调整）
- 校区: 粤海校区 / 丽湖校区
- 运动项目: 选择要预约的运动项目
- 优先时间段: 按优先级选择多个时间段

**高级参数**

- 查询间隔: 请求间隔时间（建议1-3秒）
- 最大重试: 最大重试次数（建议1000-20000）
- 请求超时: 单次请求超时时间（建议10-30秒）

#### 快捷键（桌面端）

- `Ctrl + Shift + S`: 开始/停止抢票
- `Ctrl + Shift + H`: 显示/隐藏控制面板
- `Ctrl + Shift + C`: 显示/隐藏配置区域

### 📱 移动端使用

#### iOS 设备

- 支持 Safari 14+ 浏览器
- 优化的触摸交互体验
- 自动屏幕唤醒锁定
- 电池状态监控

#### Android 设备

- 支持 Chrome 80+ 浏览器
- 完整的触摸事件支持
- 后台运行优化

### 🎯 最佳实践

#### 提高成功率的建议

1. **网络环境**: 使用稳定的校园网或高速网络
2. **时间选择**: 避开高峰期（12:00-13:00）
3. **参数调优**: 根据网络情况调整查询间隔
4. **多时段选择**: 选择多个备选时间段增加成功率
5. **提前准备**: 在开放预约前配置好所有参数

#### 常见问题解决

**Q: 脚本无法启动？**
A: 检查是否正确安装 Tampermonkey 扩展，确认脚本已启用

**Q: 频繁出现网络错误？**
A: 适当增加查询间隔时间，检查网络连接稳定性

**Q: 移动端操作不响应？**
A: 确保使用支持的浏览器版本，避免在低电量时使用

**Q: 预约失败率高？**
A: 选择多个时间段，避开预约高峰期，检查个人信息是否正确

## 📁 项目结构

```
SZU_Sports/
├── README.md              # 项目文档
├── index.html             # 项目主页
├── SZU_Sports.js          # 核心脚本文件
```

### 核心文件说明

- **SZU_Sports.js**: 主要的用户脚本，包含所有功能逻辑
- **index.html**: 项目展示页面，提供安装指导和功能介绍
- **README.md**: 详细的项目文档和使用说明

## 🔄 更新日志

### v1.1.5 (2025-01-19)

- ✨ 新增移动端电池状态监控
- 🐛 修复 iOS 设备触摸事件处理问题
- ⚡ 优化请求频率控制算法
- 🛡️ 增强错误恢复机制
- 📱 改进移动端用户界面

### v1.1.4 (2025-01-15)

- 🎯 新增场馆优选功能（羽毛球）
- 📱 完善移动端触摸优化
- 🔄 改进智能重试策略
- 💾 优化配置存储机制

### v1.1.3 (2025-01-10)

- 🚀 新增跨平台兼容性支持
- 🛠️ 重构核心预约逻辑
- 📊 添加实时状态监控
- 🔧 修复多项已知问题

## 🤝 贡献指南

我们欢迎所有形式的贡献！无论是报告 bug、提出功能建议，还是提交代码改进。

### 如何贡献

1. **Fork 项目**: 点击右上角的 Fork 按钮
2. **创建分支**: `git checkout -b feature/your-feature-name`
3. **提交更改**: `git commit -am 'Add some feature'`
4. **推送分支**: `git push origin feature/your-feature-name`
5. **创建 Pull Request**: 在 GitHub 上创建 PR

### 贡献类型

- 🐛 **Bug 报告**: 发现问题请创建 Issue
- 💡 **功能建议**: 有好想法请告诉我们
- 📝 **文档改进**: 帮助完善文档
- 🔧 **代码优化**: 提交代码改进
- 🌐 **国际化**: 支持多语言

### 开发环境

```bash
# 克隆项目
git clone https://github.com/zskfree/SZU_Sports.git

# 进入目录
cd SZU_Sports

# 在浏览器中安装 Tampermonkey 扩展
# 然后直接编辑 SZU_Sports.js 文件进行开发
```

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

```
MIT License

Copyright (c) 2025 zskfree

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## ⚠️ 免责声明

- 本脚本仅供学习和研究使用，请勿用于商业用途
- 使用本脚本时请遵守学校相关规定和网络使用政策
- 作者不对使用本脚本造成的任何后果承担责任
- 请合理使用，避免对服务器造成过大压力

## 📞 联系方式

- **GitHub**: [@zskfree](https://github.com/zskfree)
- **项目地址**: [https://github.com/zskfree/SZU_Sports](https://github.com/zskfree/SZU_Sports)
- **脚本更新**: [Greasy Fork](https://greasyfork.org/zh-CN/scripts/537386)
- **问题反馈**: [GitHub Issues](https://github.com/zskfree/SZU_Sports/issues)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

- 感谢深圳大学提供的场馆预约系统
- 感谢 Tampermonkey 团队提供的优秀扩展
- 感谢所有测试用户的反馈和建议

---

<div align="center">

**如果这个项目对你有帮助，请给它一个 ⭐ Star！**

Made with ❤️ by [zskfree](https://github.com/zskfree) | 2025

</div>
