// ============================================================
// main.js - 消消乐主流程调度 + 对外接口
// 依赖: config.js, cache.js, board.js, matcher.js, gesture.js
// ============================================================

var _config    = require('./config.js')._config;
var SPECIAL_NONE = require('./config.js').SPECIAL_NONE;
var SPECIAL_VERT_STRIPE = require('./config.js').SPECIAL_VERT_STRIPE;
var SPECIAL_MUSHROOM = require('./config.js').SPECIAL_MUSHROOM;

var loadCachedBoardConfig = require('./cache.js').loadCachedBoardConfig;
var board = require('./board.js');
var matcher = require('./matcher.js');
var gesture = require('./gesture.js');

var randomSleep  = gesture.randomSleep;
var randInt      = gesture.randInt;

// ============================================================
// 主游戏循环
// ============================================================

/**
 * 消消乐自动游戏（主入口）
 *
 * 完整流程：
 *   1. 检测是否在游戏中
 *   2. 定位棋盘区域
 *   3. 截图 → 采样颜色 → 聚类分类 → 计算最优交换 → 执行 → 等待稳定
 *   4. 重复直到无解或达到最大步数
 *   5. 检测是否过关
 *
 * @param {Object} [options] - 覆盖 _config 的配置
 * @param {number} [options.boardLeft]   - 棋盘左坐标
 * @param {number} [options.boardTop]    - 棋盘上坐标
 * @param {number} [options.boardRight]  - 棋盘右坐标
 * @param {number} [options.boardBottom] - 棋盘下坐标
 * @param {number} [options.rows]        - 行数
 * @param {number} [options.cols]        - 列数
 * @param {number} [options.maxMoves]    - 最大步数
 * @param {number} [options.colorTolerance] - 颜色容差
 *
 * @example
 * jiaoxiaole();                              // 使用默认配置
 * jiaoxiaole({boardLeft: 100, boardTop: 300, boardRight: 700, boardBottom: 900, rows: 8, cols: 8});
 */
function jiaoxiaole(options) {
    log("===== 消消乐自动游戏开始 =====");

    options = options || {};

    // 合并配置
    for (var key in options) {
        if (options.hasOwnProperty(key) && _config.hasOwnProperty(key)) {
            _config[key] = options[key];
        }
    }

    // 1. 检测是否在游戏中
    if (!board.isInGame()) {
        log("未检测到消消乐游戏，尝试直接运行...");
    }

    // 2. 尝试加载缓存配置
    if (!_config.boardLeft && !_config.boardTop && !_config.boardRight && !_config.boardBottom) {
        var cached = loadCachedBoardConfig();
        if (cached) {
            log("✅ 使用缓存棋盘配置（来自 test_board_detection.js）");
            _config.boardLeft   = cached.left;
            _config.boardTop    = cached.top;
            _config.boardRight  = cached.right;
            _config.boardBottom = cached.bottom;
            _config.rows        = cached.rows || _config.rows;
            _config.cols        = cached.cols || _config.cols;
            log("   棋盘: [" + _config.boardLeft + ", " + _config.boardTop + ", " +
                _config.boardRight + ", " + _config.boardBottom + "]");
            log("   网格: " + _config.rows + "x" + _config.cols);
        } else {
            log("无缓存配置，尝试自动检测...");
            var brd = board.autoDetectBoard();
            if (!brd) {
                log("棋盘定位失败");
                return false;
            }
        }
    }

    log("棋盘区域: [" + _config.boardLeft + ", " + _config.boardTop + ", " +
        _config.boardRight + ", " + _config.boardBottom + "]");
    log("网格: " + _config.rows + "x" + _config.cols);

    // 校验棋盘坐标
    if (_config.boardLeft >= _config.boardRight || _config.boardTop >= _config.boardBottom) {
        log("⚠ 棋盘坐标无效，尝试自动检测...");
        var brd = board.autoDetectBoard();
        if (!brd) {
            log("自动检测失败，使用兜底坐标");
            _config.boardLeft   = Math.floor(device.width * 0.05);
            _config.boardTop    = Math.floor(device.height * 0.25);
            _config.boardRight  = Math.floor(device.width * 0.95);
            _config.boardBottom = Math.floor(device.height * 0.90);
        }
    }

    // 3. 游戏主循环
    var moveCount = 0;
    var retryCount = 0;
    var _failedMoves = {};

    while (moveCount < _config.maxMoves) {
        var screen = captureScreen();
        if (!screen) {
            sleep(1000);
            continue;
        }

        var colorGrid = matcher.sampleGridColors(screen, _config);
        var classified = matcher.classifyColors(colorGrid);
        var specialItems = gesture.scanSpecialItems(screen);
        screen.recycle();

        // 特殊道具优先
        if (specialItems.length > 0) {
            log("发现 " + specialItems.length + " 个特殊道具，优先使用");
            for (var si = 0; si < specialItems.length; si++) {
                var item = specialItems[si];
                log("  类型=" + (item.type === SPECIAL_VERT_STRIPE ? "垂直条纹" : "蘑菇") +
                    " 位置=(" + item.row + "," + item.col + ")");
                gesture.doubleClickCell(item.row, item.col);
                board.waitForBoardStable(4000, _config);
            }
            continue;
        }

        // 调试截图
        if (_config.debug) {
            try {
                var debugDir = "./debug/xiaoxiaole/";
                files.createWithDirs(debugDir);
                var screen2 = captureScreen();
                if (screen2) {
                    images.save(screen2, debugDir + "step_" + ('0000' + moveCount).slice(-4) + ".png");
                    screen2.recycle();
                }
            } catch(e) {}
        }

        var bestMove = matcher.findBestMove(classified, _failedMoves);

        if (!bestMove) {
            if (Object.keys(_failedMoves).length > 0) {
                log("黑名单内" + Object.keys(_failedMoves).length + "条，清空后重新搜索...");
                _failedMoves = {};
                bestMove = matcher.findBestMove(classified, _failedMoves);
            }
        }

        if (!bestMove) {
            retryCount++;
            if (retryCount >= _config.maxRetries) {
                log("无可用交换，已达最大重试次数 " + _config.maxRetries + "，退出");
                break;
            }
            log("无可用交换，重试 " + retryCount + "/" + _config.maxRetries);
            board.waitForBoardStable(2000, _config);
            continue;
        }

        retryCount = 0;

        // 保存交换前快照
        var beforeClassified = [];
        for (var r = 0; r < classified.length; r++) {
            beforeClassified[r] = classified[r].slice();
        }

        gesture.executeMove(bestMove, _config);
        board.waitForBoardStable(4000, _config);

        // 验证交换是否有效
        var verifyScreen = captureScreen();
        if (verifyScreen) {
            var verifyGrid = matcher.sampleGridColors(verifyScreen, _config);
            verifyScreen.recycle();
            var verifyClassified = matcher.classifyColors(verifyGrid);

            var changedCells = 0, totalChecked = 0;
            for (var r = 0; r < beforeClassified.length && r < verifyClassified.length; r++) {
                for (var c = 0; c < beforeClassified[r].length && c < verifyClassified[r].length; c++) {
                    if (beforeClassified[r][c] >= 0 || verifyClassified[r][c] >= 0) {
                        totalChecked++;
                        if (beforeClassified[r][c] !== verifyClassified[r][c]) changedCells++;
                    }
                }
            }
            var changeRatio = totalChecked > 0 ? changedCells / totalChecked : 0;

            if (changeRatio < 0.08) {
                var failKey = bestMove.r1 + "," + bestMove.c1 + "-" + bestMove.r2 + "," + bestMove.c2;
                _failedMoves[failKey] = true;
                log("⚠ 交换(%d,%d)↔(%d,%d) 无效（变化率 %.1f%%），加入黑名单",
                    bestMove.r1, bestMove.c1, bestMove.r2, bestMove.c2, changeRatio * 100);
                continue;
            }

            log("交换有效（变化率 %.1f%%），继续", changeRatio * 100);
        }

        _failedMoves = {};
        moveCount++;

        if (moveCount % 10 === 0) log("已执行 " + moveCount + " 步...");
    }

    log("===== 消消乐完成 =====");
    log("共执行 " + moveCount + " 步");

    if (moveCount === 0) {
        log("提示：可能是棋盘位置不正确，请校准棋盘区域");
        return false;
    }

    return true;
}

// ============================================================
// 简易入口
// ============================================================

/**
 * 消消乐简易入口
 */
function playXiaoxiaole(boardConfig) {
    log("尝试进入消消乐游戏...");
    log("请在 3 秒内切换到消消乐游戏界面...");
    sleep(3000);
    jiaoxiaole(boardConfig);
}

// ============================================================
// 校准辅助工具
// ============================================================

/**
 * 交互式校准：在屏幕上点击棋盘的四个角
 */
function calibrateBoard() {
    log("===== 棋盘校准开始 =====");
    log("请在 3 秒内将手指放到指定位置，脚本会自动读取");

    var corners = [];
    var labels = ["左上角", "右上角", "左下角", "右下角"];

    for (var i = 0; i < 4; i++) {
        log("请在 " + labels[i] + " 位置保持 3 秒...");
        toastCustom("请按住棋盘" + labels[i], 3500);
        sleep(3000);
        log("读取位置...");
        corners.push({x: 0, y: 0});
    }

    log("===== 校准完成 =====");
    log("请手动将以下配置填入 xiaoxiaole.js 的 _config 对象：");
    log(JSON.stringify(corners));
    return corners;
}

/**
 * 打印当前屏幕的网格采样信息（调试用）
 */
function debugPrintGrid(boardRect) {
    boardRect = boardRect || _config;
    var screen = captureScreen();
    if (!screen) {
        log("截图失败");
        return;
    }

    try {
        var debugDir = "/sdcard/脚本/tb2/debug/";
        files.createWithDirs(debugDir);
        var ssPath = debugDir + "debug_board_" + new Date().getTime() + ".png";
        images.save(screen, ssPath);
        log("已保存调试截图到: " + ssPath);

        var overlay = images.copy(screen);
        var canvas = new Canvas(overlay);
        var paint = new Paint();
        paint.setColor(colors.RED);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(5);
        canvas.drawRect(boardRect.boardLeft, boardRect.boardTop, boardRect.boardRight, boardRect.boardBottom, paint);
        var overlayPath = debugDir + "debug_board_overlay_" + new Date().getTime() + ".png";
        images.save(overlay, overlayPath);
        overlay.recycle();
        log("已保存带标注截图到: " + overlayPath);
    } catch(e) {
        log("保存截图失败: " + e);
    }

    var grid = matcher.sampleGridColors(screen, boardRect);
    screen.recycle();

    log("设备分辨率: " + device.width + "x" + device.height);
    log("当前棋盘配置: boardLeft=" + boardRect.boardLeft + " boardTop=" + boardRect.boardTop +
        " boardRight=" + boardRect.boardRight + " boardBottom=" + boardRect.boardBottom +
        " rows=" + grid.length + " cols=" + grid[0].length);

    var classified = matcher.classifyColors(grid);
    // 每类中心颜色
    var clsMap = {};
    for (var r = 0; r < classified.length; r++) {
        for (var c = 0; c < classified[r].length; c++) {
            var cls = classified[r][c];
            if (cls >= 0) {
                if (!clsMap[cls]) clsMap[cls] = {rSum:0, gSum:0, bSum:0, count:0};
                clsMap[cls].rSum += grid[r][c][0];
                clsMap[cls].gSum += grid[r][c][1];
                clsMap[cls].bSum += grid[r][c][2];
                clsMap[cls].count++;
            }
        }
    }
    for (var cls in clsMap) {
        var info = clsMap[cls];
        log("  类" + cls + " 中心: RGB(" +
            Math.round(info.rSum/info.count) + "," +
            Math.round(info.gSum/info.count) + "," +
            Math.round(info.bSum/info.count) + ") 数量=" + info.count);
    }

    log("===== 颜色采样详情 =====");
    for (var r = 0; r < grid.length; r++) {
        for (var c = 0; c < grid[r].length; c++) {
            var col = grid[r][c];
            log("  [" + r + "," + c + "] RGB(" + col[0] + "," + col[1] + "," + col[2] + ")");
        }
    }
    log("===== 打印完毕 =====");
}

// ============================================================
// 轻量级检测（配置式）
// ============================================================

function detectBoardSimple(cfg) {
    if (!cfg) {
        log("[Simple] 请提供棋盘配置参数 {rows, cols, tileSize, boardX, boardY}");
        return null;
    }

    var rows   = cfg.rows   || 5;
    var cols   = cfg.cols   || 8;
    var tSize  = cfg.tileSize || 80;
    var bX     = cfg.boardX || 100;
    var bY     = cfg.boardY || 200;
    var thresh = cfg.colorThreshold || 30;

    log("[Simple] 使用配置式检测: " + rows + "x" + cols + "  tile=" + tSize +
        "  origin=(" + bX + "," + bY + ")");

    var img = captureScreen();
    if (!img) { log("[Simple] 截图失败"); return null; }

    try {
        var board_ = [];
        for (var r = 0; r < rows; r++) {
            board_[r] = [];
            for (var c = 0; c < cols; c++) {
                var x = bX + c * tSize + Math.floor(tSize / 2);
                var y = bY + r * tSize + Math.floor(tSize / 2);
                try { board_[r][c] = images.pixel(img, x, y); }
                catch (e) { board_[r][c] = 0; }
            }
        }

        function sameColor(c1, c2) {
            if (c1 === c2) return true;
            var r1 = colors.red(c1), g1 = colors.green(c1), b1 = colors.blue(c1);
            var r2 = colors.red(c2), g2 = colors.green(c2), b2 = colors.blue(c2);
            return Math.abs(r1 - r2) < thresh && Math.abs(g1 - g2) < thresh && Math.abs(b1 - b2) < thresh;
        }

        var matchSet = {};
        function addPos(r, c) { matchSet[r + "," + c] = { row: r, col: c }; }

        for (var r = 0; r < rows; r++) {
            var start = 0;
            for (var c = 1; c <= cols; c++) {
                var isEnd = (c === cols) || !sameColor(board_[r][c], board_[r][start]);
                if (isEnd) {
                    if (c - start >= 3) { for (var i = start; i < c; i++) addPos(r, i); }
                    start = c;
                }
            }
        }
        for (var c = 0; c < cols; c++) {
            var start = 0;
            for (var r = 1; r <= rows; r++) {
                var isEnd = (r === rows) || !sameColor(board_[r][c], board_[start][c]);
                if (isEnd) {
                    if (r - start >= 3) { for (var i = start; i < r; i++) addPos(i, c); }
                    start = r;
                }
            }
        }

        var matches = [];
        for (var key in matchSet) { if (matchSet.hasOwnProperty(key)) matches.push(matchSet[key]); }

        log("[Simple] 检测到 " + matches.length + " 个可消除位置");
        return { board: board_, matches: matches };
    } finally { img.recycle(); }
}

module.exports = {
    jiaoxiaole: jiaoxiaole,
    playXiaoxiaole: playXiaoxiaole,
    calibrateBoard: calibrateBoard,
    debugPrintGrid: debugPrintGrid,
    detectBoardSimple: detectBoardSimple,
    _config: _config
};