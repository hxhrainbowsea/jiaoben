// ============================================================
// board.js - 棋盘稳定检测
// ============================================================

/**
 * 计算棋盘的哈希（比较稳定性用）
 * 对每个格子采样中心像素 RGB → 拼接到哈希
 */
function boardHash(img, boardRect, rows, cols) {
    var cellW = (boardRect.boardRight - boardRect.boardLeft) / cols;
    var cellH = (boardRect.boardBottom - boardRect.boardTop) / rows;
    var hash = [];

    for (var r = 0; r < rows; r++) {
        hash[r] = [];
        for (var c = 0; c < cols; c++) {
            var cx = Math.floor(boardRect.boardLeft + c * cellW + cellW / 2);
            var cy = Math.floor(boardRect.boardTop + r * cellH + cellH / 2);

            // 钳位
            cx = Math.max(0, Math.min(cx, img.width - 1));
            cy = Math.max(0, Math.min(cy, img.height - 1));

            var rgb = images.pixel(img, cx, cy);
            // 保留低 8 位（足够比较稳定性）
            hash[r][c] = rgb & 0xFFFFFF;
        }
    }
    return hash;
}

/**
 * 比较两个哈希，计算变化率
 * @returns {number} 0-1，变化格子数 / 总格数
 */
function boardChangeRate(hash1, hash2, rows, cols) {
    var changes = 0;
    var total = rows * cols;
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            if (hash1[r][c] !== hash2[r][c]) {
                changes++;
            }
        }
    }
    return changes / total;
}

/**
 * 等待棋盘稳定（动画结束）
 * @param {Object} boardRect - 棋盘区域
 * @param {number} rows, cols - 行列数
 * @param {number} [timeoutMs=5000] - 超时毫秒（超过就认为稳定）
 * @param {number} [threshold=0.08] - 变化率 < 此值算稳定
 * @param {number} [checkInterval=300] - 检查间隔
 * @returns {boolean} 是否稳定
 */
function waitForBoardStable(boardRect, rows, cols, timeoutMs, threshold, checkInterval) {
    timeoutMs = timeoutMs || 5000;
    threshold = threshold || 0.08;
    checkInterval = checkInterval || 300;

    var startTime = Date.now();

    // 第一次哈希
    var img1 = captureScreen();
    var hash1 = boardHash(img1, boardRect, rows, cols);
    img1.recycle();

    while (Date.now() - startTime < timeoutMs) {
        sleep(checkInterval);

        var img2 = captureScreen();
        var hash2 = boardHash(img2, boardRect, rows, cols);
        var rate = boardChangeRate(hash1, hash2, rows, cols);
        img2.recycle();

        if (rate < threshold) {
            log("[稳定] 变化率 " + (rate * 100).toFixed(1) + "% < " + (threshold * 100) + "%，稳定");
            return true;
        }

        log("[稳定] 变化率 " + (rate * 100).toFixed(1) + "%，继续等待...");
        hash1 = hash2;
    }

    log("[稳定] 超时 " + timeoutMs + "ms，继续（假设稳定）");
    return false;
}

module.exports = {
    boardHash: boardHash,
    boardChangeRate: boardChangeRate,
    waitForBoardStable: waitForBoardStable
};