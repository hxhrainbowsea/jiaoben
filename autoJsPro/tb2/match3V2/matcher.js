// ============================================================
// matcher.js - 匹配扫描 + 最优交换计算
// ============================================================

var REF_COLORS = require('./config.js').REF_COLORS;

var COLOR_CHARS = ["黄","紫","红","绿","蓝","浅"];

/**
 * 在分类结果中扫描所有 3+ 连消
 */
function findMatches(grid) {
    var rows = grid.length, cols = grid[0].length;
    var matches = [];

    // 水平
    for (var r = 0; r < rows; r++) {
        var start = 0;
        while (start < cols) {
            var id = grid[r][start];
            if (id < 0) { start++; continue; }
            var end = start + 1;
            while (end < cols && grid[r][end] === id) end++;
            var len = end - start;
            if (len >= 3) {
                var cells = [];
                for (var c = start; c < end; c++) cells.push({row: r, col: c});
                matches.push({type: "h", color: id, cells: cells, len: len});
            }
            start = end;
        }
    }

    // 垂直
    for (var c = 0; c < cols; c++) {
        var start = 0;
        while (start < rows) {
            var id = grid[start][c];
            if (id < 0) { start++; continue; }
            var end = start + 1;
            while (end < rows && grid[end][c] === id) end++;
            var len = end - start;
            if (len >= 3) {
                var cells = [];
                for (var r = start; r < end; r++) cells.push({row: r, col: c});
                matches.push({type: "v", color: id, cells: cells, len: len});
            }
            start = end;
        }
    }

    return matches;
}

/**
 * 交换两个格子，返回新 grid（浅拷贝）
 */
function swapCells(grid, r1, c1, r2, c2) {
    var newGrid = [];
    for (var r = 0; r < grid.length; r++) {
        newGrid[r] = grid[r].slice();
    }
    var tmp = newGrid[r1][c1];
    newGrid[r1][c1] = newGrid[r2][c2];
    newGrid[r2][c2] = tmp;
    return newGrid;
}

/**
 * 计算一次交换的得分（能消除的格子数）
 */
function evaluateMove(grid, r1, c1, r2, c2) {
    var newGrid = swapCells(grid, r1, c1, r2, c2);
    var matches = findMatches(newGrid);
    var eliminated = {};
    for (var m = 0; m < matches.length; m++) {
        for (var c = 0; c < matches[m].cells.length; c++) {
            var cell = matches[m].cells[c];
            eliminated[cell.row + "," + cell.col] = true;
        }
    }
    return Object.keys(eliminated).length;
}

/**
 * 找出最优交换
 *
 * @param {Array<Array<number>>} grid - 棋盘网格
 * @param {Object} [options] - 选项
 * @param {number} [options.randomizeTopK=0] - >0 时启用回退模式，从得分 Top K 中随机选一个交换
 * @returns {Object|null} {r1, c1, r2, c2, score}
 */
function findBestMove(grid, options) {
    options = options || {};
    var randomizeTopK = options.randomizeTopK || 0;

    var rows = grid.length, cols = grid[0].length;
    var allMoves = [];  // 收集所有有效交换
    var searched = 0;

    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            if (grid[r][c] < 0) continue;

            // 右交换
            if (c + 1 < cols && grid[r][c + 1] >= 0) {
                var score = evaluateMove(grid, r, c, r, c + 1);
                allMoves.push({r1: r, c1: c, r2: r, c2: c + 1, score: score});
                searched++;
            }

            // 下交换
            if (r + 1 < rows && grid[r + 1][c] >= 0) {
                var score = evaluateMove(grid, r, c, r + 1, c);
                allMoves.push({r1: r, c1: c, r2: r + 1, c2: c, score: score});
                searched++;
            }
        }
    }

    if (allMoves.length === 0) {
        log("[最优] 搜索 " + searched + " 个交换，无可用交换");
        return null;
    }

    // 按得分降序排序
    allMoves.sort(function(a, b) { return b.score - a.score; });

    // ----- 回退模式：从得分 Top K 中随机选一个（避免因识别错误陷入死循环） -----
    if (randomizeTopK > 0 && allMoves.length > 1) {
        var k = Math.min(randomizeTopK, allMoves.length);
        // 过滤出得分 > 0 的可用交换（得分 0 的交换毫无意义）
        var viable = [];
        for (var i = 0; i < allMoves.length && allMoves[i].score > 0; i++) {
            viable.push(allMoves[i]);
        }
        if (viable.length > 1) {
            var pickK = Math.min(k, viable.length);
            var pickIdx = Math.floor(Math.random() * pickK);
            var picked = viable[pickIdx];
            log("[最优] 回退模式：从 Top " + pickK + " 中随机选 (得分=" + picked.score + ")");
            return picked;
        }
        // 只有 1 个得分>0 的交换，回退到最佳模式
    }

    // ----- 普通模式：返回得分最高的交换 -----
    var best = allMoves[0];
    if (best.score < 3) {
        log("[最优] ~~ 最高分仅 " + best.score + "，可能已无可用消除");
    }
    log("[最优] 搜索 " + searched + " 个交换，最佳得分=" + best.score);
    return best;
}

/**
 * 打印棋盘
 */
function debugPrintGrid(grid) {
    for (var r = 0; r < grid.length; r++) {
        var line = "";
        for (var c = 0; c < grid[r].length; c++) {
            var id = grid[r][c];
            line += (id >= 0 ? COLOR_CHARS[id] : "?") + " ";
        }
        log(line);
    }
}

module.exports = {
    findMatches: findMatches,
    findBestMove: findBestMove,
    debugPrintGrid: debugPrintGrid
};