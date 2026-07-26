# tb2 — Auto.js Pro 淘宝自动化脚本

- 运行环境：**Auto.js Pro 9.3.11**（Node.js 引擎，需安装 PaddleOCR和MLKit插件）
- 用途：淘宝自动化任务（任务、浇水、消消乐等）
- 隐藏无障碍后，UI 选择器会失效，本脚本支持在设置中切换「使用纯OCR」模式，但是性能消耗会大一点

## 目录结构

```
tb2/
├── start.js             # 主入口（建议从UI进入）
├── ui.js                # 功能选择页面（Tab 切换）
│
├── config.js            # 全局配置常量
├── utils.js             # 工具函数
├── gesture.js           # 滑动手势
├── recognize.js         # 文字/图标识别 + PaddleOCR
├── cache.js             # 任务状态缓存
├── navigation.js        # 页面导航/检测
│
├── farm.js              # 农场操作（浇水、阳光等）
├── friendHelp.js        # 助力好友
├── taskDefines.js       # 任务定义数组
│
├── match3V2/            # ✅ 消消乐引擎 V2（当前使用）需精确配置棋盘位置和X行X列数配置
│   ├── main.js          #   主循环
│   ├── recognizer.js    #   颜色识别
│   ├── matcher.js       #   匹配算法
│   ├── boardDetector.js #   棋盘检测
│   ├── gesture.js       #   手势执行
│   ├── board.js         #   棋盘工具
│   ├── config.js        #   配置
│   └── test/            #   棋盘检测测试工具
│
├── match3/              # ⚠ 消消乐引擎 V1（已弃用）
├── match3V3/            # 🔄 消消乐引擎 V3（开发中）
│
└── doudizhu/            # 开发中...
```

## 启动方式

### 方式 1：UI 界面启动

在 Auto.js Pro 中运行 `ui.js`，选择功能后点击「开始」：

| 功能 | 说明 |
|------|------|
| 任务 | 执行淘宝任务列表 |
| 浇水 | 自动浇水（自动/固定次数模式） |
| 亲密度 | 提升亲密值 |
| 阳光 | 收集阳光 |
| 助力 | 助力好友列表 |
| 消消乐 | 自动玩消消乐（V2 引擎） |
| 斗地主 | 自动斗地主 |

### 方式 2：直接运行

```javascript
// 运行 start.js 默认执行所有功能
engines.execScriptFile("./start.js");
```

### 参数传递

通过 `storages` 缓存传参：

```
tb_run_config → task, water, waterMode, waterNum, xiaoxiaole, doudizhu ...（临时，传递后清除）
tb_ui_config  → 所有 UI 开关、棋盘位置等永久配置（含 xxlLeft/xxlTop/xxlRight/xxlBottom 等）
```

## 核心模块

| 模块 | 文件 | 功能 |
|------|------|------|
| 入口 | `start.js` | 主流程调度，读取缓存参数，按顺序执行功能 |
| 配置 | `config.js` | 全局常量（方法选择、阈值、等待时间等） |
| 工具 | `utils.js` | 随机等待、点击偏移、截图等通用函数 |
| 手势 | `gesture.js` | 滑动、返回、上划等手势操作 |
| 识别 | `recognize.js` | OCR + 模板匹配，用于文字/图标识别 |
| 农场 | `farm.js` | 浇水、施肥、阳光采集等农场操作 |
| 导航 | `navigation.js` | 页面检测与跳转 |
| 缓存 | `cache.js` | 任务完成状态缓存（`datastore`） |

## 消消乐引擎

| 版本 | 目录 | 状态 | 颜色识别方式 |
|------|------|------|-------------|
| V1 | `match3/` | ⚠ 已弃用 | 固定参考色 + RGB 欧氏距离 |
| V2 | `match3V2/` | ✅ 当前使用 | 动态聚类 + 投票分类 |
| V3 | `match3V3/` | 🔄 开发中 | — |

详见各目录下的 README。
## 斗地主

| 模块 | 文件 | 功能 |
|------|------|------|
| 主入口 | doudizhu/index.js | 斗地主自动游戏控制器，加载识别/拆牌模块，控制游戏流程 |
| 卡牌识别 | doudizhu/cardRecognizer.js | 基于模板匹配（images.findImage）识别手牌和对家出牌 |
| 拆牌算法 | doudizhu/cardSplitter.js | DFS 最优拆牌，搜索手数最少的出牌方案 |
| 拆牌测试 | doudizhu/test_cardSplitter.js | 拆牌算法独立测试脚本，可脱离游戏环境运行 |
| 地主图标 | doudizhu/images/dizhu_logo.jpg | 地主 crown 图标模板 |
| 牌面模板 | doudizhu/images/digits/*.png | 3~10、J、Q、K、A、2、JOKER 的牌面截图模板 |

### 当前状态

**斗地主功能暂不可用，卡在卡牌识别阶段。**

核心问题是：使用纯数字/字母小图做模板匹配时，特征不足、匹配率低。而改为"牌面+花色"组合大图后可以成功识别。详见 [doudizhu/README.md](doudizhu/README.md)。

  
## 免责声明

本脚本仅供**学习交流**用途。使用者应自行承担以下责任：

1. **账号风险**：使用自动化脚本违反淘宝/支付宝用户协议，可能导致的账号限制或封禁由使用者自行承担
2. **合规性**：请遵守所在地区法律法规及平台服务条款
3. **商业使用**：禁止将本脚本用于任何商业目的
4. **二次分发**：修改或二次分发请保留原开源声明

作者不对因使用本脚本产生的任何直接或间接损失负责。

## 注意事项

1. **运行环境**：Auto.js Pro **9.3.11**（Node.js 引擎），旧版本可能不兼容
2. **`floaty` 模块**：需延迟加载（内部 try-catch），否则 Node.js 模式下顶级 require 会挂
3. **`ui.js`**：必须保持 Rhino UI 风格（`"ui"` + `ui.layout()`），不能使用 `class` 或 `require('ui')`
4. **截图权限**：需要授予 Auto.js Pro 截图权限
5. **无障碍服务**：需要开启无障碍服务
6. **调试模式**：UI 中开启「调试截图」可在每一步保存截图用于排查