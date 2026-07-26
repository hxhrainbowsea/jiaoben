# match3V2 — 消消乐引擎 V2（当前使用）

## 简介

消消乐自动消除引擎 V2，采用**动态颜色识别**（HSV 聚类 + 多数投票），比 V1 的固定 RGB 阈值更鲁棒。

## 文件说明

### 核心模块

| 文件 | 功能 |
|------|------|
| [index.js](index.js) | **模块入口**。组装所有子模块并导出公共 API：`classifyBoard`、`findBestMove`、`executeSwap`、`play` |
| [main.js](main.js) | **主循环**。`play(boardConfig, maxMoves)` — 截图→识别→找最优交换→执行→等待稳定，循环直到步数用完或无解 |
| [recognizer.js](recognizer.js) | **颜色识别**。对每个格子密集采样 5×5=25 点（每点 3×3 像素平均），HSV 主分类 + 多数投票。绿/浅绿用饱和度区分 |
| [config.js](config.js) | **颜色配置**。6 种参考色（黄/红/紫/绿/蓝/浅绿）的 RGB 值 + 预计算 HSV，以及分类阈值 |
| [matcher.js](matcher.js) | **匹配算法**。扫描所有 3+ 连消，为每个格子计算「消除增益」，找出最优交换位置 |
| [gesture.js](gesture.js) | **手势执行**。模拟完整 DOWN→MOVE→UP 事件序列，避开边缘冲突（左边缘不往右滑触发系统返回） |
| [board.js](board.js) | **棋盘稳定检测**。`waitForBoardStable` — 连续截图对比哈希，直到棋盘不再变化 |
| [boardDetector.js](boardDetector.js) | **棋盘自动检测**。逐行/逐列扫描，找「6 色匹配区域」确定棋盘位置（极简算法，精度有限） |

### 专有模块

| 文件 | 功能 |
|------|------|
| [recognizer_autojs.js](recognizer_autojs.js) | **Auto.js 专用 UI 增强**。在 Auto.js 环境中提供浮窗标注功能（`showResultOverlay`），Node.js 测试下为空壳 |

### 测试工具

| 文件 | 功能 |
|------|------|
| [test/testBoardDetector.js](test/testBoardDetector.js) | **棋盘位置检测离线测试工具**。在截图上检测棋盘区域 + 网格 + 颜色识别，生成 `debug_board.jpg` 辅助标定 |

## 调用关系

```
index.js  ─→  recognizer.js  (颜色识别)
         ├→  matcher.js      (匹配算法)
         ├→  gesture.js      (手势执行)
         ├→  board.js        (稳定检测)
         └→  main.js         (主循环)
               │
               ├→ recognizer.classifyBoard()
               ├→ matcher.findBestMove()
               ├→ gesture.executeSwap()
               └→ boardUtil.waitForBoardStable()
```

## 棋盘位置检测工具

在截图上检测「三消游戏」的棋盘区域（位置 + 行列数），并识别每个格子的颜色，用于**标定棋盘坐标**。

### 安装

```bash
cd test
npm install
```

依赖：`sharp`（图片处理）

## 准备截图

1. 在手机上打开三消游戏，截一张**包含完整棋盘**的屏幕截图
2. 把截图传到电脑，放到 `test/` 目录下（如 `a.jpg`、`b.jpg`）
3. 建议用 PNG 或高质量 JPG，棋盘清晰无遮挡

## 用法

### 1. 自动检测（推荐先试这个）

```bash
node testBoardDetector.js a.jpg
```

自动扫描棋盘区域，输出：
- 棋盘左上角/右下角坐标
- 网格行列数
- 置信度
- 每个格子的颜色识别结果
- 生成 `debug_board.jpg`（标记了棋盘框和网格线）

### 2. 手动指定边界 + 网格（自动检测不准时用）

如果自动检测结果不对，先用看图软件找到棋盘四个角的坐标，再手动指定：

```bash
node testBoardDetector.js b.jpg -b 35,1030,1226,1420 -g 3x9
node testBoardDetector.js a.jpg -b 35,1100,1226,1480 -g 3x9
```

| 参数 | 含义 | 示例 |
|------|------|------|
| `-b L,T,R,B` | 棋盘边界 (left, top, right, bottom) | `-b 23,1030,1249,1416` |
| `-g 行x列` | 网格行列数 | `-g 9x9`、`-g 3x9` |

### 3. 单独看边界，不指定网格

```bash
node testBoardDetector.js a.jpg -b 23,1030,1249,1416
```

只画红色外框，不做网格分割和颜色识别。

### 4. 查看参考色（`--suggest`）

```bash
node testBoardDetector.js a.jpg -b 23,1030,1249,1416 --suggest
```

输出棋盘区域内**每种参考颜色的最匹配像素**，辅助判断该区域是否包含这几种颜色：
- 黄色 / 红色 / 紫色 / 绿色 / 蓝色 / 浅绿色

## 输出解读

### 控制台

```
========== 自动检测 ==========
棋盘区域: [0,922]-[1232,1292]     ← 棋盘左上角(0,922) 右下角(1232,1292)
网格: 9列 × 3行                   ← 自动找到的网格
置信度: 96.3%                     ← 越高越可信

========== 颜色识别 ==========
行1: 绿 紫 蓝 蓝 绿 绿 蓝 紫 绿   ← 每格识别出的颜色
行2: 黄 绿 红 蓝 黄 绿 黄 紫 黄
行3: 紫 紫 红 黄 蓝 紫 绿 蓝 紫
有效: 27/27                        ← 27个格子全部识别成功
```

### debug_board.jpg

| 元素 | 颜色 | 含义 |
|------|------|------|
| 红色外框 | 🔴 | 棋盘边界 |
| 青色网格线 | 🟢 (半透明) | 格子分割线，40%透明度可看到底层滑块颜色 |
| 中文标注 | 黄/红/紫/绿/蓝/浅绿 | 每个格子识别出的颜色分类 |

## 常见工作流

### 找棋盘位置

1. 截图放 `test/` 目录
2. 先跑自动检测：`node testBoardDetector.js a.jpg`
3. 如果自动检测不准，打开截图用看图软件读坐标
4. 用 `-b` 手动指定边界，加 `-g` 指定行列数
5. 看 `debug_board.jpg` 确认网格对齐
6. 调整 `-b` 坐标直到网格完美对齐

### 注意

- `-b` 坐标是像素坐标，可用画图软件、Photoshop 等读取
- 坐标格式：`left,top,right,bottom`（英文逗号，无空格）
- `-g` 格式：`行x列`，如 `9x9`、`3x9`、`7x7`
- 输出文件 `debug_board.jpg` 会覆盖之前的文件