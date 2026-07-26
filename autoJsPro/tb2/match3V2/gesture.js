// ============================================================
// gesture.js - 手势执行（交换、点击）
//
// 防风控改进（2026-07-02）：
//   使用全局 simulateClick 替代裸 click()，
//   产生完整的 DOWN→MOVE→UP 事件序列
// ============================================================

/**
 * 执行一次交换手势
 *
 * 避开边缘冲突：左边缘的块不往右滑（触发系统返回），改为从右往左滑。
 * 右边缘同理。
 *
 * 改进：第一步选中使用 simulateClick（完整事件序列），
 *       第二步滑动使用带缓动的 gesture（非等距轨迹点）。
 *
 * @param {Object} boardRect - 棋盘区域
 * @param {number} cols, rows
 * @param {Object} move - {r1, c1, r2, c2}
 */
function executeSwap(boardRect, cols, rows, move) {
    var cellW = (boardRect.boardRight - boardRect.boardLeft) / cols;
    var cellH = (boardRect.boardBottom - boardRect.boardTop) / rows;

    // 计算两个格子中心坐标
    var x1 = Math.floor(boardRect.boardLeft + move.c1 * cellW + cellW / 2);
    var y1 = Math.floor(boardRect.boardTop  + move.r1 * cellH + cellH / 2);
    var x2 = Math.floor(boardRect.boardLeft + move.c2 * cellW + cellW / 2);
    var y2 = Math.floor(boardRect.boardTop  + move.r2 * cellH + cellH / 2);

    // ---- 边缘冲突回避 ----
    // 系统返回手势对「从边缘出发的水平滑动」敏感
    // 水平交换时，把起始点放在内侧格子，滑向外侧
    if (move.r1 === move.r2) {
        if (move.c1 < move.c2) {
            // 原本从左→右，若左格在最左列 → 反向
            if (move.c1 <= 0) {
                var tx = x1; x1 = x2; x2 = tx;
                var ty = y1; y1 = y2; y2 = ty;
            }
        } else {
            // 原本从右→左，若右格在最右列 → 反向
            if (move.c1 >= cols - 1) {
                var tx = x1; x1 = x2; x2 = tx;
                var ty = y1; y1 = y2; y2 = ty;
            }
        }
    }

    log("[手势] 交换 (" + move.r1 + "," + move.c1 + ") ↔ (" + move.r2 + "," + move.c2 + ")"
        + "  得分=" + move.score);

    // 先人性化点击第一个格子（选中效果），再滑动到第二个
    global.simulateClick(x1, y1);
    sleep(60);
    // 交换滑动使用更自然的 gesture（手势时长随机化）
    var swapDuration = 80 + Math.floor(Math.random() * 80);
    // 放松坐标钳位：终点加微小随机偏移
    var rx2 = x2 + Math.floor((Math.random() - 0.5) * 6);
    var ry2 = y2 + Math.floor((Math.random() - 0.5) * 6);
    gesture(swapDuration, [x1, y1], [rx2, ry2]);
    sleep(100);
}

/**
 * 点击某个格子
 *
 * 使用全局 simulateClick 替代裸 click()，
 * 模拟完整 DOWN→MOVE→UP 事件序列。
 */
function clickCell(boardRect, cols, rows, r, c) {
    var cellW = (boardRect.boardRight - boardRect.boardLeft) / cols;
    var cellH = (boardRect.boardBottom - boardRect.boardTop) / rows;
    var x = Math.floor(boardRect.boardLeft + c * cellW + cellW / 2);
    var y = Math.floor(boardRect.boardTop  + r * cellH + cellH / 2);
    global.simulateClick(x, y);
}

module.exports = {
    executeSwap: executeSwap,
    clickCell: clickCell
};