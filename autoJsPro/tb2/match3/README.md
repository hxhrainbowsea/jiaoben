# match3 — 消消乐引擎 V1（已弃用）

> **⚠ 已弃用**：此目录是消消乐自动消除的 **V1 版本**，已被 `match3V2/` 替代。

## 弃用原因

| 对比项 | V1 (`match3/`) | V2 (`match3V2/`) |
|--------|---------------|------------------|
| 颜色识别 | 固定参考色 + RGB 欧氏距离 | 动态聚类 + 投票分类 |
| 容差机制 | `colorTolerance`（需手动调参） | 自动分析无需容差 |
| 棋盘检测 | `autoDetectBoard` | `boardDetector.js` 更稳定 |
| 当前使用 | ❌ 不引用 | ✅ `start.js` 引用此版本 |

## 文件说明

| 文件 | 功能 |
|------|------|
| `index.js` | 统一入口，注入全局 `jiaoxiaole()`、`playXiaoxiaole()` 等接口 |
| `main.js` | 主循环调度（`jiaoxiaole` / `playXiaoxiaole` / `calibrateBoard`） |
| `config.js` | 配置参数（棋盘坐标、颜色容差、参考色等） |
| `board.js` | 棋盘定位（`autoDetectBoard`、`waitForBoardStable`） |
| `matcher.js` | 颜色采样、聚类分类、匹配查找 |
| `gesture.js` | 手势执行（点击、交换、道具识别） |
| `cache.js` | 棋盘配置缓存 |
| `debug_overlay.js` | 调试悬浮窗 |
| `xiaoxiaole.js` | UI 界面脚本入口 |
| `test_board_detection.js` | 棋盘检测测试脚本 |

## 架构

```
require('./match3/index')(runtime, scope)
  → 注入 scope.jiaoxiaole(options)
  → main.jiaoxiaole()
    → board.autoDetectBoard()    定位棋盘
    → matcher.sampleGridColors() 采样格子颜色
    → matcher.findBestMove()     找最优交换
    → gesture.executeMove()      执行手势
    → 循环直到无解或 maxMoves
```

## 注意

- 代码风格为 Autojs4 Rhino 引擎，`var` 声明、无 `const/let`
- `_config` 对象可通过 `options` 参数覆盖
- 如需查看具体实现可阅读源码，但**所有新开发请基于 `match3V2/`**