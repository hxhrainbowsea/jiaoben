// ============================================================
// board.js - 棋盘检测、稳定判断
// 依赖: config.js, cache.js
// ============================================================

var _config    = require('./config.js')._config;
var loadCachedBoardConfig = require('./cache.js').loadCachedBoardConfig;

// ============================================================
// 2. 棋盘区域自动检测（主方案：边缘检测）
// ============================================================

/**
 * 全自动检测 8x9 棋盘（含被遮挡区域）
 *
 * 核心思想：通过边缘强度投影 + 周期性聚类定位网格线。
 *
 * @param {Image} img - 截图对象
 * @returns {Object} { rows, cols, xLines, yLines, cells, tileSizeW, tileSizeH, left, top, right, bottom }
 */
function detectFullBoard(img) {
    var width  = img.width;
    var height = img.height;
    log("[Edge] 图像尺寸: " + width + "x" + height);

    // 1. 生成灰度图
    var gray = images.grayscale(img);

    // 2. 计算水平方向边缘强度（Sobel-like：相邻行差分）
    var rowEdge = [];
    for (var y = 1; y < height - 1; y++) {
        var sum = 0;
        for (var x = 1; x < width - 1; x++) {
            var top = colors.red(images.pixel(gray, x, y - 1));
            var bot = colors.red(images.pixel(gray, x, y + 1));
            sum += Math.abs(bot - top);
        }
        rowEdge.push(sum / (width - 2));
    }

    // 3. 计算垂直方向边缘强度
    var colEdge = [];
    for (var x = 1; x < width - 1; x++) {
        var sum = 0;
        for (var y = 1; y < height - 1; y++) {
            var left  = colors.red(images.pixel(gray, x - 1, y));
            var right = colors.red(images.pixel(gray, x + 1, y));
            sum += Math.abs(right - left);
        }
        colEdge.push(sum / (height - 2));
    }

    // 4. 找峰值位置（网格线所在）
    function findPeaks(arr, minDist, threshold) {
        minDist   = minDist   || 50;
        threshold = threshold || 0.3;
        var avg = 0;
        for (var i = 0; i < arr.length; i++) avg += arr[i];
        avg /= arr.length;
        var peaks = [];
        for (var i = 1; i < arr.length - 1; i++) {
            if (arr[i] > avg * (1 + threshold) &&
                arr[i] > arr[i - 1] && arr[i] > arr[i + 1]) {
                if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDist) {
                    peaks.push(i);
                }
            }
        }
        return peaks;
    }

    var tileSizeEstimate = Math.floor(width / 9);
    var horizontalLines = findPeaks(rowEdge, Math.floor(tileSizeEstimate * 0.5), 0.15);
    var verticalLines   = findPeaks(colEdge, Math.floor(tileSizeEstimate * 0.5), 0.15);

    log("[Edge] 检测到横线: " + horizontalLines.length + " 条, 竖线: " + verticalLines.length + " 条");

    // 5. 聚类合并接近的线
    function clusterPositions(pos, maxGap) {
        maxGap = maxGap || 8;
        if (pos.length === 0) return [];
        var clusters = [[pos[0]]];
        for (var i = 1; i < pos.length; i++) {
            if (pos[i] - clusters[clusters.length - 1][0] <= maxGap) {
                clusters[clusters.length - 1].push(pos[i]);
            } else {
                clusters.push([pos[i]]);
            }
        }
        var result = [];
        for (var c = 0; c < clusters.length; c++) {
            var sum = 0;
            for (var j = 0; j < clusters[c].length; j++) sum += clusters[c][j];
            result.push(Math.round(sum / clusters[c].length));
        }
        return result;
    }

    var yLines = clusterPositions(horizontalLines, 5);
    var xLines = clusterPositions(verticalLines, 5);

    log("[Edge] 聚类后横线: " + yLines.length + " 条, 竖线: " + xLines.length + " 条");

    // 6. 选择最均匀的 9 条线
    function selectBestLines(lines, expectedCount) {
        if (lines.length < expectedCount) {
            log("[Edge] 线不足 " + expectedCount + " 条，尝试均匀分布");
            if (lines.length < 2) return null;
            var first = lines[0];
            var last  = lines[lines.length - 1];
            var step  = (last - first) / (expectedCount - 1);
            var result = [];
            for (var i = 0; i < expectedCount; i++) {
                result.push(Math.round(first + i * step));
            }
            return result;
        }

        var bestCombo = null;
        var bestScore = -1;
        for (var start = 0; start + expectedCount <= lines.length; start++) {
            var combo = lines.slice(start, start + expectedCount);
            var gaps = [];
            for (var i = 1; i < combo.length; i++) gaps.push(combo[i] - combo[i - 1]);
            var mean = 0;
            for (var i = 0; i < gaps.length; i++) mean += gaps[i];
            mean /= gaps.length;
            var variance = 0;
            for (var i = 0; i < gaps.length; i++) {
                var diff = gaps[i] - mean;
                variance += diff * diff;
            }
            variance /= gaps.length;
            var score = -variance;
            if (mean > tileSizeEstimate * 0.6 && mean < tileSizeEstimate * 1.5) score += 1000;
            if (combo[0] > height * 0.1 && combo[combo.length - 1] < height * 0.95) score += 500;
            if (score > bestScore) { bestScore = score; bestCombo = combo; }
        }
        return bestCombo;
    }

    var selectedY = selectBestLines(yLines, 9);
    var selectedX = selectBestLines(xLines, 9);

    if (!selectedY || !selectedX) {
        log("[Edge] 无法筛选出有效网格线，回退...");
        if (gray) gray.recycle();
        return fallbackDetect(img);
    }

    selectedY.sort(function(a, b) { return a - b; });
    selectedX.sort(function(a, b) { return a - b; });

    var rows = selectedY.length - 1;
    var cols = selectedX.length - 1;

    log("[Edge] 最终: " + rows + "行 x " + cols + "列");

    // 7. 构建 cells 类型
    var cells = [];
    for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) {
            var cx = Math.floor((selectedX[c] + selectedX[c + 1]) / 2);
            var cy = Math.floor((selectedY[r] + selectedY[r + 1]) / 2);
            cx = Math.max(0, Math.min(cx, gray.width - 1));
            cy = Math.max(0, Math.min(cy, gray.height - 1));
            var pixel = images.pixel(gray, cx, cy);
            var grayVal = colors.red(pixel);

            var std = getLocalStd(gray, cx, cy, 10);
            if (std > 20 && grayVal < 200) {
                row.push("tile");
            } else if (grayVal > 130 && grayVal < 170 && std < 10) {
                row.push("block");
            } else {
                row.push("unknown");
            }
        }
        cells.push(row);
    }

    if (gray) gray.recycle();

    return {
        rows: rows,
        cols: cols,
        xLines: selectedX,
        yLines: selectedY,
        cells: cells,
        tileSizeW: Math.round((selectedX[1] - selectedX[0])),
        tileSizeH: Math.round((selectedY[1] - selectedY[0])),
        left: selectedX[0],
        top: selectedY[0],
        right: selectedX[cols],
        bottom: selectedY[rows]
    };
}

/**
 * 计算局部标准差
 */
function getLocalStd(img, cx, cy, radius) {
    var sum = 0, sum2 = 0, count = 0;
    for (var dy = -radius; dy <= radius; dy++) {
        for (var dx = -radius; dx <= radius; dx++) {
            var x = cx + dx, y = cy + dy;
            if (x >= 0 && x < img.width && y >= 0 && y < img.height) {
                var p = images.pixel(img, x, y);
                var g = colors.red(p);
                sum  += g;
                sum2 += g * g;
                count++;
            }
        }
    }
    if (count === 0) return 0;
    var mean = sum / count;
    return Math.sqrt(sum2 / count - mean * mean);
}

/**
 * 降级方案
 */
function fallbackDetect(img) {
    var w = img.width;
    var h = img.height;
    log("[Fallback] 使用硬编码兜底尺寸 (" + w + "x" + h + ")");

    var boardW   = Math.floor(w * 0.90);
    var boardH   = Math.floor(boardW * 9 / 8);
    var boardX   = Math.floor((w - boardW) / 2);
    var boardY   = Math.floor(h * 0.28);

    var tileW = Math.floor(boardW / 8);
    var tileH = Math.floor(boardH / 9);

    var xLines = [];
    for (var i = 0; i <= 8; i++) xLines.push(boardX + i * tileW);
    var yLines = [];
    for (var i = 0; i <= 9; i++) yLines.push(boardY + i * tileH);

    var cells = [];
    for (var r = 0; r < 9; r++) {
        var row = [];
        for (var c = 0; c < 8; c++) row.push("tile");
        cells.push(row);
    }

    return {
        rows: 9, cols: 8,
        xLines: xLines, yLines: yLines,
        cells: cells,
        tileSizeW: tileW, tileSizeH: tileH,
        left: boardX, top: boardY,
        right: boardX + boardW, bottom: boardY + boardH
    };
}

/**
 * 保存棋盘检测结果截图（带标注）
 */
function saveDetectionResult(screen, board) {
    try {
        var debugDir = "/sdcard/debug_xiaoxiaole/";
        files.createWithDirs(debugDir);
        var timestamp = new Date().getTime();
        var overlayPath = debugDir + "detect_edge_" + timestamp + ".png";

        var overlay = images.copy(screen);
        var canvas = new Canvas(overlay);
        var paint = new Paint();

        paint.setColor(colors.RED);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(6);
        canvas.drawRect(board.left, board.top, board.right, board.bottom, paint);

        paint.setStrokeWidth(2);
        paint.setARGB(150, 255, 165, 0);
        for (var i = 0; i < board.xLines.length; i++) {
            canvas.drawLine(board.xLines[i], board.top, board.xLines[i], board.bottom, paint);
        }
        for (var i = 0; i < board.yLines.length; i++) {
            canvas.drawLine(board.left, board.yLines[i], board.right, board.yLines[i], paint);
        }

        var textPaint = new Paint();
        textPaint.setTextSize(20);
        for (var r = 0; r < board.cells.length; r++) {
            for (var c = 0; c < board.cells[r].length; c++) {
                var cx = Math.floor((board.xLines[c] + board.xLines[c + 1]) / 2) - 8;
                var cy = Math.floor((board.yLines[r] + board.yLines[r + 1]) / 2) + 6;
                var label = board.cells[r][c].charAt(0).toUpperCase();
                textPaint.setColor(label === "T" ? colors.GREEN : (label === "B" ? colors.RED : colors.GRAY));
                canvas.drawText(label, cx, cy, textPaint);
            }
        }

        images.save(overlay, overlayPath);
        overlay.recycle();
        log("✅ 已保存检测结果到: " + overlayPath);
    } catch(e) {
        log("保存检测结果截图失败: " + e.message);
    }
}

// ============================================================
// 自动检测棋盘入口（供外部调用）
// ============================================================

/**
 * 自动检测棋盘区域
 */
function autoDetectBoard() {
    log("===== 边缘检测版棋盘自动检测 =====");
    var startTime = new Date().getTime();

    var screen = captureScreen();
    if (!screen) {
        log("截图失败");
        return null;
    }

    try {
        var w = device.width;
        var h = device.height;
        log("设备分辨率: " + w + "x" + h);

        var board = detectFullBoard(screen);

        _config.boardLeft   = board.left;
        _config.boardTop    = board.top;
        _config.boardRight  = board.right;
        _config.boardBottom = board.bottom;
        _config.rows        = board.rows;
        _config.cols        = board.cols;

        var elapsed = new Date().getTime() - startTime;
        log("===== 边缘检测完成 (" + elapsed + "ms) =====");
        log("最佳匹配: " + board.rows + "x" + board.cols + " 网格");
        log("棋盘区域: [" + board.left + ", " + board.top + ", " +
            board.right + ", " + board.bottom + "]");
        log("棋盘尺寸: " + (board.right - board.left) + "x" +
            (board.bottom - board.top) + " 像素");
        log("单个格子: " + board.tileSizeW + "x" + board.tileSizeH + " 像素");

        var tileCount = 0, blockCount = 0, unknownCount = 0;
        for (var r = 0; r < board.cells.length; r++) {
            for (var c = 0; c < board.cells[r].length; c++) {
                if (board.cells[r][c] === "tile") tileCount++;
                else if (board.cells[r][c] === "block") blockCount++;
                else unknownCount++;
            }
        }
        log("格子分布: tile=" + tileCount + " block=" + blockCount + " unknown=" + unknownCount);

        saveDetectionResult(screen, board);

        log("若位置仍不准，请运行 test_board_simple.js 使用配置式检测");
        return board;
    } catch (e) {
        log("检测过程出错: " + e.message);
        var fb = fallbackDetect(screen);
        _config.boardLeft   = fb.left;
        _config.boardTop    = fb.top;
        _config.boardRight  = fb.right;
        _config.boardBottom = fb.bottom;
        _config.rows        = fb.rows;
        _config.cols        = fb.cols;
        log("回退检测结果: [" + fb.left + ", " + fb.top + ", " +
            fb.right + ", " + fb.bottom + "]");
        return fb;
    } finally {
        if (screen) screen.recycle();
    }
}

// ============================================================
// 等待棋盘稳定
// ============================================================

/**
 * 等待棋盘稳定（连续截图检测变化）
 *
 * 使用 RGB 全通道哈希替代仅蓝色通道（提升变化敏感度）
 */
function waitForBoardStable(maxWaitMs, boardRect) {
    maxWaitMs = maxWaitMs || 5000;
    boardRect = boardRect || _config;

    var stableCount = 0;
    var needStable = 5;
    var checkInterval = 400;
    var elapsed = 0;
    var prevHash = "";

    while (elapsed < maxWaitMs) {
        var screen = captureScreen();
        if (!screen) {
            sleep(checkInterval);
            elapsed += checkInterval;
            continue;
        }

        var imgW = screen.width;
        var imgH = screen.height;
        var sx0 = Math.max(0, Math.min(boardRect.boardLeft, imgW - 2));
        var sx1 = Math.max(sx0 + 1, Math.min(boardRect.boardRight, imgW - 1));
        var sy0 = Math.max(0, Math.min(boardRect.boardTop, imgH - 2));
        var sy1 = Math.max(sy0 + 1, Math.min(boardRect.boardBottom, imgH - 1));

        var hash = "";
        var stepX = Math.max(1, Math.floor((sx1 - sx0) / 6));
        var stepY = Math.max(1, Math.floor((sy1 - sy0) / 6));
        for (var y = sy0; y < sy1; y += stepY) {
            for (var x = sx0; x < sx1; x += stepX) {
                var c = images.pixel(screen, x, y);
                hash += ((c >> 16) & 0xFF).toString(16);
                hash += ((c >> 8) & 0xFF).toString(16);
                hash += (c & 0xFF).toString(16);
            }
        }
        screen.recycle();

        if (hash === prevHash) {
            stableCount++;
            if (stableCount >= needStable) {
                log("棋盘已稳定（" + needStable + " 次无变化）");
                return true;
            }
        } else {
            stableCount = 0;
        }
        prevHash = hash;

        sleep(checkInterval);
        elapsed += checkInterval;
    }

    log("等待超时（" + maxWaitMs + "ms），假设已稳定");
    return false;
}

// ============================================================
// 关卡检测
// ============================================================

/**
 * 检测当前是否在消消乐游戏中
 */
function isInGame() {
    var topRegion = [
        0, 0,
        device.width,
        Math.floor(device.height * 0.25)
    ];
    var found = global.recognize("第\\d+关", global.METHOD_MLKIT_OCR, {regex: true, region: topRegion});
    if (found) {
        log("检测到游戏中: " + (found.text || ""));
        return true;
    }

    var gameKeywords = ["剩余", "步数", "目标", "得分"];
    for (var i = 0; i < gameKeywords.length; i++) {
        found = global.recognize(gameKeywords[i], global.METHOD_MLKIT_OCR, {region: topRegion});
        if (found) return true;
    }

    return false;
}

module.exports = {
    autoDetectBoard: autoDetectBoard,
    waitForBoardStable: waitForBoardStable,
    isInGame: isInGame,
    detectFullBoard: detectFullBoard,
    saveDetectionResult: saveDetectionResult
};