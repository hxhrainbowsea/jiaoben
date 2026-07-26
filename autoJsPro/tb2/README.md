# tb2 — 淘宝芭芭农场自动化脚本 (Auto.js Pro)

基于 **Auto.js Pro 9.3.11**（Node.js 引擎）的淘宝芭芭农场自动化脚本，支持任务执行、浇水施肥、阳光收集、消消乐、好友助力等功能。

> ⚠ 隐藏无障碍后，UI 选择器会失效，可在设置中切换「使用纯OCR」模式（性能消耗稍大）。

## 目录结构

```
tb2/
├── start.js             # 主入口
├── ui.js                # UI 配置界面（Tab 切换）
│
├── config.js            # 全局配置常量
├── utils.js             # 工具函数
├── gesture.js           # 滑动手势
├── recognize.js         # 文字/图标识别 + PaddleOCR
├── ocrDefines.js        # OCR 识别配置定义
├── iconDefines.js       # 图标模板匹配配置定义
├── cache.js             # 任务状态缓存
├── navigation.js        # 页面导航/检测
│
├── farm.js              # 农场操作（浇水、阳光等）
├── friendHelp.js        # 助力好友
├── taskDefines.js       # 任务定义数组
│
├── match3V2/            # 消消乐引擎 V2（当前使用）
│   ├── main.js          #   主循环
│   ├── recognizer.js    #   颜色识别
│   ├── matcher.js       #   匹配算法
│   ├── boardDetector.js #   棋盘检测
│   ├── gesture.js       #   手势执行
│   ├── board.js         #   棋盘工具
│   ├── config.js        #   配置
│   └── test/            #   棋盘检测测试工具
│
├── match3V3/            # 消消乐引擎 V3（开发中）
│
└── images/              # 图标模板图片
```

## 启动方式

### 方式 1：UI 界面启动

在 Auto.js Pro 中运行 `ui.js`，选择功能后点击「开始执行」：

| 功能     | 说明                     |
| -------- | ------------------------ |
| 任务     | 执行淘宝任务列表         |
| 浇水     | 自动浇水（自动/固定次数）|
| 亲密度   | 提升亲密值               |
| 阳光     | 收集阳光                 |
| 助力     | 助力好友列表             |
| 消消乐   | 自动玩消消乐（V2 引擎）  |

### 方式 2：直接运行

```javascript
engines.execScriptFile("./start.js");
```

## 消消乐引擎

| 版本 | 目录        | 状态         | 颜色识别方式             |
|------|-------------|-------------|-------------------------|
| V2   | `match3V2/` | ✅ 当前使用   | 动态聚类 + 投票分类       |
| V3   | `match3V3/` | 🔄 开发中     | —                       |

## 注意事项

1. **运行环境**：Auto.js Pro **9.3.11**（Node.js 引擎），需安装 PaddleOCR 和 MLKit 插件
2. **截图权限**：需要授予 Auto.js Pro 截图权限
3. **无障碍服务**：需要开启无障碍服务
4. **`floaty` 模块**：需延迟加载（内部 try-catch），否则 Node.js 模式下顶级 require 会挂
5. **调试模式**：UI 中开启「调试截图」可在每一步保存截图用于排查

## 许可

本项目基于 **GNU General Public License v3.0 (GPLv3)** 开源。

```
Copyright (C) 2026  hxh

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
```

## 免责声明

本脚本仅供**学习交流**用途。使用者应自行承担以下责任：

1. **账号风险**：使用自动化脚本违反淘宝/支付宝用户协议，可能导致账号限制或封禁
2. **合规性**：请遵守所在地区法律法规及平台服务条款
3. **商业使用**：禁止将本脚本用于任何商业目的

作者不对因使用本脚本产生的任何直接或间接损失负责。