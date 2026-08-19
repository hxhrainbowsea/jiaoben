# tb2 — 淘宝芭芭农场自动化脚本 (Auto.js Pro)

基于 **Auto.js Pro 9.3.11**（Node.js 引擎）的淘宝芭芭农场自动化脚本，支持任务执行、浇水施肥、阳光收集、农场百科答题、消消乐、好友助力等功能。

> ⚠ 隐藏无障碍后，UI 选择器会失效，可在设置中切换「使用纯OCR」模式（性能消耗稍大）。

---

## 目录结构

```
tb2/
├── start.js                 # 主入口（init / taskLoop / main）
├── ui.js                    # UI 配置界面（标签页切换）
├── config.js                # 全局配置常量（识别方法、滑动参数、防风控参数等）
├── utils.js                 # 工具函数（randomSleep / clickWithOffset / randInt 等）
├── gesture.js               # 高级滑动手势引擎（缓动函数 / 拇指弧线 / 复合方向）
├── recognize.js             # 文字/图标识别引擎（UI Selector + MLKit OCR + PaddleOCR）
├── ocrDefines.js            # OCR 识别配置定义（文字→方法/区域/参数映射表）
├── iconDefines.js           # 图标模板匹配配置定义（图标名→模板路径/区域/参数映射表）
├── cache.js                 # 任务状态缓存（基于 storages，每日自动过期）
├── navigation.js            # 页面导航与检测（打开农场、返回任务页、检测边缘、关闭弹窗等）
├── farm.js                  # 农场操作（浇水/施肥/阳光收集/亲密度等）
├── friendHelp.js            # 好友助力（消息页导航 / 查找聊天 / 点击助力卡片）
├── taskDefines.js           # 任务定义数组（全部淘宝任务列表，含执行类型/参数）
│
├── match3V2/                # 消消乐引擎 V2（当前使用）
│   ├── index.js             #   入口
│   ├── main.js              #   主循环
│   ├── recognizer.js        #   颜色识别（动态聚类 + 投票分类）
│   ├── recognizer_autojs.js #   Auto.js 原生颜色识别备选方案
│   ├── matcher.js           #   匹配算法
│   ├── boardDetector.js     #   棋盘检测
│   ├── gesture.js           #   手势执行
│   ├── board.js             #   棋盘工具
│   ├── config.js            #   配置
│   └── test/                #   棋盘检测测试工具
│
├── match3V3/                # 消消乐引擎 V3（开发中，暂无文件）
│
└── images/                  # 图标模板图片（13 张）
    ├── shifei.jpg           #   施肥按钮
    ├── close.jpg            #   通用关闭
    ├── jiaoshui_close.jpg   #   浇水弹窗关闭
    ├── jiaoshui_feiliao.jpg #   浇水肥料奖励
    ├── jiaoshui1.jpg        #   浇水 1 次档位
    ├── jiaoshui5.jpg        #   浇水 5 次档位
    ├── jifeiliao_icon.jpg   #   集肥料入口图标
    ├── sun_entry.jpg        #   阳光入口
    ├── sun.jpg              #   阳光图标
    ├── taskPageClose.jpg    #   任务页弹窗关闭
    ├── tuzi.jpg             #   兔子点击
    ├── xiaoxiaole_close.jpg #   消消乐关闭
    └── xiaoxiaole_exit.jpg  #   消消乐退出
```

---

## 模块说明

| 模块 | 文件 | 功能 |
|------|------|------|
| **入口** | `start.js` | `init()` 初始化运行配置/模块/截图权限/PaddleOCR；`taskLoop()` 任务主循环（OCR 批量识别 + 多类型任务分发）；`handleFarmQuizTask()` 农场答题处理（兼容上下/左右两种布局）；`handleXiaoxiaoleTask()` 消消乐任务流程；`main()` 主流程编排 |
| **配置** | `config.js` | 识别方法常量（UI_SELECTOR / MLKit_OCR / PaddleOCR / TesserOCR）、点击偏移、返回滑动参数、上下滑动参数、图标匹配阈值、调试开关、浮窗避让区域 |
| **工具** | `utils.js` | `randomSleep()` 随机延时防风控、`clickWithOffset()` 带随机偏移点击、`randInt()` 整数随机数等 |
| **手势** | `gesture.js` | 缓动函数引擎（easeInOutCubic/easeInCubic/easeOutCubic）生成非等距轨迹点；拇指弧线轨迹（贝塞尔曲线模拟大拇指弧度）；复合方向滑动（up_down/down_up 模拟"回看一下"）；自动避开日志浮窗区域；`scrollVerticalMultiple()` 按总时长反复随机滑动，支持 OCR 校准剩余时间 |
| **识别** | `recognize.js` | UI 控件选择器识别、MLKit OCR、PaddleOCR 三种识别方式；`waitForText()` 轮询等待文字出现（支持单文本/批量数组/自动点击）；`waitForIcon()` 轮询等待图标出现（支持等待过程中自动关闭弹窗）；`ocrCaptureAll()` 截图一次+OCR一次返回全部结果（taskLoop 优化关键）；调试截图保存功能 |
| **OCR 定义** | `ocrDefines.js` | 40+ 条识别配置（含 method/region/exactMatch/alias 等），提供 `ocrRecognize()` / `ocrFindClick()` / `ocrWaitForText()` 三个增强函数，自动合并配置，支持别名（如"点击领取"/"点击領取"） |
| **图标定义** | `iconDefines.js` | 13 个图标配置（含 path/region/threshold/colorCompare 等），提供 `iconFindClick()` / `iconRecognize()` / `iconWaitFor()` 三个增强函数，自动解析路径 ./images/{name}.jpg |
| **缓存** | `cache.js` | 基于 `storages` 的日常任务状态缓存，自动清理过期记录，提供 `isTaskDoneToday()` / `markTaskDone()` 等接口 |
| **导航** | `navigation.js` | `openNongChangPage()` 多路径导航进入农场；`checkIsTaskPage()` 页面检测（支持自动重启）；`backToTaskPage()` 多重返回；`checkEdge()` 截图对比法检测页面边缘；`dismissPopups()` 弹窗关闭；`forceStopApp()` 系统设置强杀 App（5秒倒计时可取消）；`clickJiFeiLiao()` / `isJiFeiLiaoPage()` 集肥料图标相关 |
| **农场** | `farm.js` | `jiaoshui()` 浇水主入口（4 种模式：auto/count/target/fertilizer）；`jiaoshuiAuto()` 浇水至奖励领完；`jiaoshuiToTarget()` 浇水至指定次数（含余数优化：1次档补余数 + 5次档快速浇）；`jiaoshuiAllFertilizer()` 耗尽所有肥料；肥料理论值跟踪 + OCR 校验机制；`getMyWaterCount()` 从亲密度弹框 OCR 提取当前浇水次数；`collectSun()` 阳光收集全流程；`processOtherTasks()` 亲密度领取 |
| **助力** | `friendHelp.js` | `helpFriends()` 助力主流程；`navigateToMessageTab()` 导航到淘宝消息页；`findFriendChat()` 查找好友聊天；`clickHelpCard()` 点击助力卡片（链接/文字双重检测）；`clickImmediateHelp()` 点击立即助力；`backToMessageList()` 返回消息列表；已助力缓存（按日期一天有效） |
| **任务定义** | `taskDefines.js` | 30+ 条任务定义，支持 8 种 `openType`：none（纯点击）、newPage（浏览后返回）、newTwoPage（二级页面）、newOneOrTwoPage（自适应二级）、newThreePage（点击3个商品）、newPageAndClick（进入点击后返回）、goToOtherApp（跳转其他 App）、farmQuiz（百科答题）、xiaoxiaole（消消乐）；支持 `condition` 条件判断（如检测 App 是否安装）、`durationRegion`/`durationText` 时间校准、`altTexts` 简繁备选文字 |
| **消消乐 V2** | `match3V2/` | 动态聚类颜色识别 + 投票分类匹配算法，支持自定义棋盘参数，完整的 play() 接口供 start.js 调用 |

---

## 功能特性

### 📋 任务执行（taskLoop）

自动化执行淘宝芭芭农场任务列表中的各项任务，支持：

- **浏览类任务**：进入页面后模拟滑动浏览指定秒数，自动返回
- **点击类任务**：纯点击领取奖励/签到
- **多级页面**：进入后再进入第二层页面浏览
- **商品点击**：进入页面后依次点击 3 个商品
- **跨应用跳转**：跳转到支付宝/美团/头条等 App 完成任务
- **农场答题**：兼容上下排列(A./B.)和左右布局(选Ta)两种模式
- **消消乐**：自动进入并完成消消乐游戏
- **智能下滑**：每页只截图+OCR一次，批量对比所有任务
- **截图对比法**检测页面底部
- **`once` 标记**：每日只做一次的任务自动跳过

### 💧 浇水施肥

4 种模式可选：

| 模式 | 说明 |
|------|------|
| `auto` | 自动浇水，直到所有奖励领完 |
| `count` | 固定浇水 N 次 |
| `target` | 浇水至目标次数（默认 204 次） |
| `fertilizer` | 耗尽所有肥料 |

**防浪费机制**：
- 肥料理论值跟踪（首次 OCR 初始化 → 手动扣减 → OCR 校验修正）
- 每 3 轮校验肥料是否确实消耗
- 施肥失败自动重试（最多 5 次）
- 肥料不足 600（1 次）自动跳过
- 浇水次数已达上限 200 次自动停止

### ☀️ 阳光收集

- 点击阳光入口 → 领阳光签到 → 执行"浏览15秒"任务
- 循环收集屏幕上的阳光图标
- 识别含"万"/"亿"的字体区域并点击升级，处理"立即领取升级阳光"弹窗

### 🎮 消消乐（Match-3）

- 从任务页进入消消乐 → 关闭弹窗 → 选择关卡 → 点击开始
- V2 引擎（动态聚类颜色识别 + 投票分类匹配算法）
- 支持自定义棋盘参数（位置/行列数/最大步数/交换间隔）

### 👥 好友助力

- 遍历好友列表，过滤已助力过的（每日缓存）
- 导航到淘宝消息页 → 查找好友聊天 → 点击助力卡片
- 支持链接和文字两种助力卡片格式
- 自动返回消息列表处理下一个好友

### 🛡️ 防风控设计

- **缓动函数轨迹**：easeInOutCubic 生成非等距轨迹点，模拟真人加速启动→匀速滑行→减速停止
- **拇指弧线模拟**：贝塞尔曲线模拟大拇指自然滑动弧度，区分左右手握持姿势
- **随机返回方向**：70% 左滑返回 + 30% 右滑返回，模拟人类操作习惯
- **复合滑动方向**：支持 up_down（先上滑再下滑）和 down_up（先下滑再上滑）
- **随机坐标偏移**：所有点击坐标叠加随机偏移
- **随机时间间隔**：操作间等待时间随机化
- **浮窗避让**：下滑时自动检测并避让左上角日志浮窗
- **音量键急停**：任何时候按下音量-键立即停止脚本

### 🔧 其他

- **执行完毕清理后台**：可配置任务完成后强制退出指定 App（5 秒倒计时可取消）
- **调试截图**：开启后每步保存截图到 `./debug/` 目录
- **OCR 时间校准**：浏览任务中自动 OCR 识别剩余时间，动态调整等待时长
- **多识别引擎**：UI Selector / MLKit OCR / PaddleOCR 三种方式，可切换纯 OCR 模式

---

## 消消乐引擎

| 版本 | 目录 | 状态 | 颜色识别方式 |
|------|------|------|-------------|
| V2 | `match3V2/` | ✅ 当前使用 | 动态聚类 + 投票分类 |
| V3 | `match3V3/` | 🔄 开发中 | — |

---

## 启动方式

### 方式 1：UI 界面启动

在 Auto.js Pro 中运行 `ui.js`，选择功能后点击「开始执行」：

| 功能 | 说明 |
|------|------|
| 任务 | 执行淘宝任务列表 |
| 浇水 | 自动浇水（自动/固定次数/目标次数/耗尽肥料） |
| 亲密度 | 提升亲密值 |
| 阳光 | 收集阳光 |
| 助力 | 助力好友列表 |
| 消消乐 | 自动玩消消乐（V2 引擎，需先在 UI 中设置棋盘参数） |

### 方式 2：直接运行

```javascript
engines.execScriptFile("./start.js");
```

直接运行默认执行全功能。

---

## 运行环境要求

| 项目 | 要求 |
|------|------|
| Auto.js Pro | **9.3.11**（Node.js 引擎） |
| 插件 | PaddleOCR 插件 + MLKit 插件 |
| 截图权限 | 需授予 Auto.js Pro 截图权限 |
| 无障碍服务 | 需开启无障碍服务 |
| Android | 建议 Android 7.0+ |

---

## 注意事项

1. **`floaty` 模块**：需延迟加载（内部 try-catch），否则 Node.js 模式下顶级 require 会挂
2. **调试模式**：UI 中开启「调试截图」可在每一步保存截图用于排查
3. **消消乐棋盘**：使用消消乐功能前必须在 UI 中设置棋盘参数（坐标/行列数）
4. **音量键**：任何时候按音量-可停止脚本；强杀倒计时中按音量-可取消本次强杀
5. **首次运行**：需确保已安装相关插件并授予必要权限

---

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

---

## 免责声明

本脚本仅供**学习交流**用途。使用者应自行承担以下责任：

1. **账号风险**：使用自动化脚本违反淘宝/支付宝用户协议，可能导致账号限制或封禁
2. **合规性**：请遵守所在地区法律法规及平台服务条款
3. **商业使用**：禁止将本脚本用于任何商业目的

作者不对因使用本脚本产生的任何直接或间接损失负责。