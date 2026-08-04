# SZU & HZAU Sports Venue Automatic Booking Script 🎾

Version: 1.2.7 | Author: zskfree | License: MIT

---

## Overview

A set of Tampermonkey user script examples for technical research on front-end injection, form configuration, scheduled workflows, request control, and UI interactions on the sports venue booking pages of Shenzhen University (SZU) and Huazhong Agricultural University (HZAU). This document only describes the code structure and interaction design. It does not encourage, recommend, or authorize use for actual bookings.

> **Disclaimer**: This project is intended solely for technical learning, script development discussions, and automated process research. It must not be used for profit, proxy booking, actual appointments, bypassing platform rules, or any purpose that violates school/platform regulations. Users assume all risks arising from improper use.

👉 **SZU Learning Guide**: <https://www.280468.xyz/SZU_Sports/>

---

## ✨ General Technical Highlights

- **Form Configuration**: Front-end state management examples for multi-period, venue strategy, and parameter settings.
- **Scheduled Workflow**: Examples of scheduled triggers, countdown displays, and state recovery logic.
- **Request Control**: Code structure examples for retries, rate limiting, and concurrency control.
- **Cross-Platform UI**: Mobile touch optimization and desktop floating panel controls.
- **Lightweight UI**: Supports light/dark themes, quick setting overlays, fixed log windows, and elegant transition animations.
- **Notification Example**: WeCom Webhook invocation structure example.

---

## HZAU Version (Huazhong Agricultural University)

- **Core Script**: See [src/HZAU_Sports.js](src/HZAU_Sports.js).
- **Feature Overview**:
  - Scheduled workflow, pre-loading processes, server time synchronization, and clock drift calibration examples.
  - Concurrent retry, multi-period state management, and error handling examples.
  - Visual floating panels, logging, and Token guard logic examples.
- **Notes**:
  - The HZAU version is also provided for learning and exchange only, and must not be used for profit, proxy booking, actual appointments, or in violation of relevant platform rules.

---

## SZU Version (Shenzhen University)

- **Core Script**: See [src/SZU_Sports.js](src/SZU_Sports.js).
- **Learning Guide**: Visit <https://www.280468.xyz/SZU_Sports/> for related page instructions.

### Update Notes (v1.2.7)

- Redesigned SZU panel UI with light/dark theme support, icon-based controls, and more restrained visual styling.
- Added quick modification to the summary area: name/student ID, date, project, campus, booking venue, time slot, and request parameters can be directly edited.
- Converted full settings, quick settings, and booking tips into separate overlays to avoid compressing main interface content.
- Optimized animation transitions, scrollbar style, fixed log window height, and progress display format.
- Changed the wording of "Priority Venue" to "Booking Venue" to align with the actual logic of booking only the selected venue.

### SZU Learning Tips

- The code injects floating buttons and configuration panels on matched pages, useful for learning how to implement UI injection in user scripts.
- The summary area can be used to learn and demonstrate configuration interaction for date, project, campus, booking venue, and time slot.
- When selecting a specific "Booking Venue," the script logic restricts booking to that venue; only when selecting "All Venues" is the venue unrestricted.
- Request interval, maximum retries, and request timeout can be quickly modified at the bottom of the summary, useful for understanding rate-limiting and retry logic.

---

## 📁 Project Structure

```text
SZU_Sports/
├── docs/               # GitHub Pages static deployment
│   ├── index.html      # Tutorial homepage (currently the SZU guide; HZAU follows the same installation process)
│   ├── install_*.html  # Platform-specific installation guides
│   └── assets/         # Static resources such as images
├── src/                # Source code directory
│   ├── SZU_Sports.js   # SZU core script
│   └── HZAU_Sports.js  # HZAU core script
├── README.md           # Project documentation
└── LICENSE             # MIT open source license
```

### Quick Reference

- **Development Entry**: Main logic is located in [src/SZU_Sports.js](src/SZU_Sports.js) and [src/HZAU_Sports.js](src/HZAU_Sports.js).
- **Documentation Deployment**: The `docs/` directory is automatically deployed via GitHub Pages, defaulting to the SZU tutorial; HZAU installation steps are the same and can be followed as per the README.
- **Image Resources**: Unified in `docs/assets/img/`.

---

## 🚀 Development & Installation

- **Local Edits**: Edit scripts under the `src/` directory.
- **Cross-Platform Sync**: Scripts are adapted for mobile devices; Via browser is recommended for testing.
- **Usage Restrictions**: Intended for learning and exchange only. Must not be used for profit, proxy booking, actual appointments, or in violation of relevant platform rules.
- **License**: MIT License. Welcome to submit Issues or Pull Requests.

---

© 2026 zskfree | [MIT License](LICENSE)
