// ============================================================
// main.js - 消消乐主循环
// ============================================================

var recognizer = require('./recognizer.js');
var matcher   = require('./matcher.js');
var gesture   = require('./gesture.js');
var boardUtil = require('./board.js');

/** 交换间隔默认值（毫秒） */
var SWAP_INTERVAL_DEFAULT = 2500;

/**
 * 验证交换是否成功
 *
 * 在交换 + 等待稳定后，检查交换的两个格子颜色是否发生了变化。
 * 如果至少一个格子的颜色分类变了，认为交换成功。
 * 不需要非常精确，快速轻量检查即可。
 */
function verifySwap(img, boardConfig, rows, cols, move, oldGrid) {
    var cellW = (boardConfig.boardRight - boardConfig.boardLeft) / cols;
    var cellH = (boardConfig.boardBottom - boardConfig.boardTop) / rows;

    var positions = [
        {r: move.r1, c: move.c1},
        {r: move.r2, c: move.c2}
    ];

    for (var p = 0; p < positions.length; p++) {
        var r = positions[p].r;
        var c = positions[p].c;
        var cx = Math.floor(boardConfig.boardLeft + c * cellW + cellW / 2);
        var cy = Math.floor(boardConfig.boardTop  + r * cellH + cellH / 2);
        cx = Math.max(0, Math.min(cx, img.width - 1));
        cy = Math.max(0, Math.min(cy, img.height - 1));

        var rgb = images.pixel(img, cx, cy);
        var newId = recognizer.classifySample(recognizer.intToRgb(rgb));
        var oldId = oldGrid[r][c];

        // 颜色分类变了 → 交换生效
        if (newId !== oldId) {
            return true;
        }
    }

    return false;  // 两个格子颜色都没变
}

/**
 * 识别棋盘上的道具并双击消除
 * 使用颜色对比（不使用灰度化）
 * 
 * @param {Object} boardConfig - 棋盘区域配置
 * @returns {boolean} 是否成功使用道具消除
 */
function tryUseProp(boardConfig) {
    var propPaths = [
        "./match3V2/images/xiaoxiaole_daoju1.jpg",
        "./match3V2/images/xiaoxiaole_daoju2.jpg"
    ];
    let h = device.height - Math.floor(device.height * 0.2)-  boardConfig.boardTop;
    if (h<=0){
        h = boardConfig.boardBottom - boardConfig.boardTop;
    }
    for (var i = 0; i < propPaths.length; i++) {
        sleep(1000)
        var propPath = propPaths[i];
        var propResult = global.findIconByTemplate(propPath, {
            threshold: 0.75,
            region: [
                boardConfig.boardLeft,
                boardConfig.boardTop,
                boardConfig.boardRight - boardConfig.boardLeft,
                h
            ],
            colorCompare: true
        });
        
        if (propResult) {
            log("[道具] 检测到道具 at (" + propResult.centerX + ", " + propResult.centerY + ")");
            
            // 双击道具
            global.simulateClick(propResult.centerX, propResult.centerY);
            sleep(80 + Math.floor(Math.random() * 70));
            global.simulateClick(propResult.centerX, propResult.centerY);
            
            log("[道具] 双击道具成功");
            return true;
        }
    }
    
    log("[道具] 未检测到可用道具");
    return false;
}

/**
 * 执行 N 次消除
 *
 * @param {Object} boardConfig - {boardLeft, boardTop, boardRight, boardBottom, rows, cols}
 * @param {number} maxMoves   - 最多消除次数（默认 999）
 */
function play(boardConfig, maxMoves) {
    maxMoves = maxMoves || 999;

    if (!boardConfig) {
        log("[主循环] 未提供棋盘参数，尝试从缓存读取...");
        try {
            var storage = storages.create("match3_board");
            boardConfig = storage.get("boardConfig");
        } catch (e) {
            log("[主循环] 读取缓存失败: " + e.message);
        }
        if (!boardConfig) {
            log("[主循环] !! 无棋盘参数，请先在 UI 界面设置并保存");
            return;
        }
    }

    log("===== 消消乐 自动消除 =====");
    log("网格: " + boardConfig.rows + "x" + boardConfig.cols
        + "  区域: [" + boardConfig.boardLeft + "," + boardConfig.boardTop
        + "]-[" + boardConfig.boardRight + "," + boardConfig.boardBottom + "]");
    log("计划消除次数: " + maxMoves);

    var moveCount = 0;
    var failCount = 0;
    var isFallbackMode = false;
    var totalTime = Date.now();

    while (moveCount < maxMoves) {
        // 1. 等待棋盘稳定
        boardUtil.waitForBoardStable(boardConfig, boardConfig.rows, boardConfig.cols, 5000, 0.08, 300);

        // 2. 截图并识别棋盘
        var img = captureScreen();
        var result = recognizer.classifyBoard(img, boardConfig, boardConfig.rows, boardConfig.cols);
        img.recycle();

        var grid = result.grid;
        log("\n[主循环] 尝试第 " + (moveCount + 1) + " 次交换:");
        matcher.debugPrintGrid(grid);
        log("有效格: " + result.stats.validCells + "/" + result.stats.totalCells);

        // 3. 找最优交换（连续失败≥3次时切换到回退模式）
        var moveOptions = {};
        if (failCount >= 3) {
            if (!isFallbackMode) {
                log("[主循环] ⚠ 连续3次交换失败，切换到回退模式——从 Top 3 中随机选交换");
                isFallbackMode = true;
            }
            moveOptions.randomizeTopK = 3;
        }
        var bestMove = matcher.findBestMove(grid, moveOptions);

        if (!bestMove || bestMove.score < 3) {
            log("[主循环] !! 无可用交换（或得分<3），尝试使用道具...");
            
            // 尝试使用道具（兜底方案）
            var propUsed = tryUseProp(boardConfig);
            if (propUsed) {
                // 等待道具消除动画
                boardUtil.waitForBoardStable(boardConfig, boardConfig.rows, boardConfig.cols, 5000, 0.08, 300);
                moveCount++;
                log("[主循环] 道具消除成功 ✓  已完成 " + moveCount + "/" + maxMoves + " 次消除");
                failCount = 0;
                continue;
            } else {
                log("[主循环] !! 无可用交换且无道具，结束");
                break;
            }
        }

        // 4. 执行交换手势
        gesture.executeSwap(boardConfig, boardConfig.cols, boardConfig.rows, bestMove);

        // 5. 等待消除动画 + 新棋子落下
        boardUtil.waitForBoardStable(boardConfig, boardConfig.rows, boardConfig.cols, 5000, 0.08, 300);

        // 6. 验证交换是否成功
        var verifyImg = captureScreen();
        var swapped = verifySwap(verifyImg, boardConfig, boardConfig.rows, boardConfig.cols, bestMove, grid);
        verifyImg.recycle();

        if (swapped) {
            moveCount++;
            if (isFallbackMode) {
                log("[主循环] 回退模式下交换成功 ✓  恢复正常模式");
                isFallbackMode = false;
            }
            failCount = 0;
            log("[主循环] 交换成功 ✓  已完成 " + moveCount + "/" + maxMoves + " 次消除");
        } else {
            failCount++;
            log("[主循环] 交换失败 ✗  连续失败 " + failCount + "/5" + (isFallbackMode ? " (回退模式)" : ""));
            if (failCount >= 5) {
                log("[主循环] !! 连续5次交换失败，终止脚本");
                break;
            }
        }
    }

            // ---- 交换间隔：配置值 + 对数正态分布随机化（防风控） ----
        var baseDelay = boardConfig.swapInterval || SWAP_INTERVAL_DEFAULT;
        log("[主循环] 交换间隔 " + baseDelay + "ms");
        global.randomSleep(baseDelay);

    var elapsed = ((Date.now() - totalTime) / 1000).toFixed(1);
    log("===== 消除结束 =====");
    log("实际执行: " + moveCount + " 次消除，耗时 " + elapsed + "s");
}

module.exports = {
    play: play
};