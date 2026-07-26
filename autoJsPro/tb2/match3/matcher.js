// ============================================================
// matcher.js - 颜色采样、分类、匹配扫描、最优交换计算
// 依赖: config.js
// ============================================================

var _config    = require('./config.js')._config;
var REF_COLORS = require('./config.js').REF_COLORS;
var FIXED_REF_THRESHOLD = require('./config.js').FIXED_REF_THRESHOLD;

/** 当前棋盘颜色数据（运行中动态生成） */
var _grid = [];

// ============================================================
// 颜色工具函数
// ============================================================

function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;
    var d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s, v: v };
}

function colorDistance(c1, c2) {
    var dr = c1[0] - c2[0];
    var dg = c1[1] - c2[1];
    var db = c1[2] - c2[2];
    return Math.sqrt(dr*dr + dg*dg + db*db);
}

function intToRgb(colorInt) {
    return [
        (colorInt >> 16) & 0xFF,
        (colorInt >> 8) & 0xFF,
        colorInt & 0xFF
    ];
}

// ============================================================
// 采样
// ============================================================

/**
 * 采样棋盘所有格子的中心像素颜色（9 点采样取中值）
 */
function sampleGridColors(img, boardRect, rows, cols) {
    rows = rows || _config.rows;
    cols = cols || _config.cols;
    boardRect = boardRect || _config;

    var cellW = (boardRect.boardRight - boardRect.boardLeft) / cols;
    var cellH = (boardRect.boardBottom - boardRect.boardTop) / rows;

    var grid = [];
    for (var r = 0; r < rows; r++) {
        grid[r] = [];
        for (var c = 0; c < cols; c++) {
            var cx = Math.floor(boardRect.boardLeft + c * cellW + cellW / 2);
            var cy = Math.floor(boardRect.boardTop  + r * cellH + cellH / 2);
            var offX = Math.floor(cellW * 0.30);
            var offY = Math.floor(cellH * 0.30);
            var pts = [
                [cx, cy],
                [cx - offX, cy - offY], [cx + offX, cy - offY],
                [cx - offX, cy + offY], [cx + offX, cy + offY]
            ];

            var imgW = img.width, imgH = img.height;
            var cellSamples = [];
            for (var s = 0; s < pts.length; s++) {
                var px = Math.max(0, Math.min(pts[s][0], imgW - 1));
                var py = Math.max(0, Math.min(pts[s][1], imgH - 1));
                cellSamples.push(intToRgb(images.pixel(img, px, py)));
            }

            if (cellSamples.length === 0) {
                grid[r][c] = [0, 0, 0];
                continue;
            }

            var sortedR = cellSamples.map(function(p) { return p[0]; }).sort(function(a,b){return a-b;});
            var sortedG = cellSamples.map(function(p) { return p[1]; }).sort(function(a,b){return a-b;});
            var sortedB = cellSamples.map(function(p) { return p[2]; }).sort(function(a,b){return a-b;});
            var mid = Math.floor(cellSamples.length / 2);
            grid[r][c] = [sortedR[mid], sortedG[mid], sortedB[mid]];
        }
    }

    _grid = grid;
    return grid;
}

// ============================================================
// 分类：方案1 - 固定 RGB 参考色
// ============================================================

function classifyByFixedRef(grid) {
    var classified = [];
    var unmatched = 0, totalValid = 0;

    for (var r = 0; r < grid.length; r++) {
        classified[r] = [];
        for (var c = 0; c < grid[r].length; c++) {
            var color = grid[r][c];
            var hsv = rgb2hsv(color[0], color[1], color[2]);

            if ((color[0] < 15 && color[1] < 15 && color[2] < 15) ||
                hsv.s < 0.12 || hsv.v < 0.18) {
                classified[r][c] = -1;
                continue;
            }

            totalValid++;
            var bestIdx = -1, bestDist = FIXED_REF_THRESHOLD;
            for (var k = 0; k < REF_COLORS.length; k++) {
                var d = colorDistance(color, REF_COLORS[k].rgb);
                if (d < bestDist) { bestDist = d; bestIdx = k; }
            }

            if (bestIdx >= 0) {
                classified[r][c] = bestIdx;
            } else {
                classified[r][c] = -1;
                unmatched++;
            }
        }
    }

    return { classified: classified, unmatched: unmatched, totalValid: totalValid };
}

// ============================================================
// 分类：方案2 - 动态 RGB 聚类（回退）
// ============================================================

function classifyByClustering(grid) {
    var samples = [];
    for (var r = 0; r < grid.length; r++) {
        for (var c = 0; c < grid[r].length; c++) {
            var color = grid[r][c];
            var hsv = rgb2hsv(color[0], color[1], color[2]);
            if (color[0] < 15 && color[1] < 15 && color[2] < 15) continue;
            if (hsv.s < 0.12 || hsv.v < 0.18) continue;
            samples.push([color[0], color[1], color[2]]);
        }
    }

    if (samples.length < 6) {
        var result = [];
        for (var r = 0; r < grid.length; r++) {
            result[r] = [];
            for (var c = 0; c < grid[r].length; c++) result[r][c] = -1;
        }
        return result;
    }

    // 自动计算阈值
    var totalDist = 0, pairCount = 0;
    for (var i = 0; i < samples.length && i < 120; i++) {
        for (var j = i + 1; j < samples.length && j < 120; j++) {
            totalDist += colorDistance(samples[i], samples[j]);
            pairCount++;
        }
    }
    if (samples.length > 120) {
        var sr = samples.length / 120;
        pairCount = Math.floor(pairCount * sr * sr);
        totalDist = Math.floor(totalDist * sr * sr);
    }
    var avgDist = pairCount > 0 ? totalDist / pairCount : 65;
    var threshold = Math.max(25, Math.min(85, avgDist * 0.42));

    // Leader-Follower 聚类
    var clusters = [];
    for (var i = 0; i < samples.length; i++) {
        var col = samples[i];
        var nearest = -1, minDist = threshold;
        for (var k = 0; k < clusters.length; k++) {
            var d = colorDistance(col, clusters[k].center);
            if (d < minDist) { minDist = d; nearest = k; }
        }
        if (nearest >= 0) {
            var cl = clusters[nearest];
            cl.count++;
            cl.center[0] += Math.round((col[0] - cl.center[0]) / cl.count);
            cl.center[1] += Math.round((col[1] - cl.center[1]) / cl.count);
            cl.center[2] += Math.round((col[2] - cl.center[2]) / cl.count);
        } else {
            clusters.push({center: [col[0], col[1], col[2]], count: 1});
        }
    }

    // 合并过近的簇
    var merged = true;
    while (merged && clusters.length > 1) {
        merged = false;
        for (var i = 0; i < clusters.length && !merged; i++) {
            for (var j = i + 1; j < clusters.length && !merged; j++) {
                if (colorDistance(clusters[i].center, clusters[j].center) < threshold * 0.6) {
                    var total = clusters[i].count + clusters[j].count;
                    clusters[i].center[0] = Math.round((clusters[i].center[0] * clusters[i].count + clusters[j].center[0] * clusters[j].count) / total);
                    clusters[i].center[1] = Math.round((clusters[i].center[1] * clusters[i].count + clusters[j].center[1] * clusters[j].count) / total);
                    clusters[i].center[2] = Math.round((clusters[i].center[2] * clusters[i].count + clusters[j].center[2] * clusters[j].count) / total);
                    clusters[i].count = total;
                    clusters.splice(j, 1);
                    merged = true;
                }
            }
        }
    }

    log("动态聚类回退: " + clusters.length + " 类");

    var classified = [];
    var maxDist = threshold * 1.5;
    for (var r = 0; r < grid.length; r++) {
        classified[r] = [];
        for (var c = 0; c < grid[r].length; c++) {
            var color = grid[r][c];
            var hsv = rgb2hsv(color[0], color[1], color[2]);
            if ((color[0] < 15 && color[1] < 15 && color[2] < 15) ||
                hsv.s < 0.12 || hsv.v < 0.18) {
                classified[r][c] = -1;
                continue;
            }
            var bestDist = Infinity, bestCls = -1;
            for (var k = 0; k < clusters.length; k++) {
                var d = colorDistance(color, clusters[k].center);
                if (d < bestDist) { bestDist = d; bestCls = k; }
            }
            classified[r][c] = (bestDist <= maxDist) ? bestCls : -1;
        }
    }

    return classified;
}

// ============================================================
// 分类入口
// ============================================================

/**
 * 对采样颜色进行分类（固定 RGB 参考色 + 动态聚类回退）
 */
function classifyColors(grid, tolerance) {
    grid = grid || _grid;
    if (grid.length === 0) return [];

    var result = classifyByFixedRef(grid);
    var unmatchRatio = result.totalValid > 0 ? result.unmatched / result.totalValid : 0;

    if (unmatchRatio > 0.5) {
        log("固定参考色未匹配率 " + (unmatchRatio * 100).toFixed(0) +
            "%，回退到动态聚类");
        return classifyByClustering(grid);
    }

    return result.classified;
}

// ============================================================
// 匹配扫描
// ============================================================

function findMatches(classifiedGrid) {
    classifiedGrid = classifiedGrid || _grid;
    var rows = classifiedGrid.length;
    var cols = classifiedGrid[0].length;
    var matches = [];

    // 水平扫描
    for (var r = 0; r < rows; r++) {
        var start = 0;
        while (start < cols) {
            var colorId = classifiedGrid[r][start];
            if (colorId < 0) { start++; continue; }
            var end = start + 1;
            while (end < cols && classifiedGrid[r][end] === colorId) end++;
            var len = end - start;
            if (len >= _config.minMatchLen) {
                var cells = [];
                for (var c = start; c < end; c++) cells.push({row: r, col: c});
                matches.push({type: "horizontal", color: colorId, cells: cells, len: len});
            }
            start = end;
        }
    }

    // 垂直扫描
    for (var c = 0; c < cols; c++) {
        var start = 0;
        while (start < rows) {
            var colorId = classifiedGrid[start][c];
            if (colorId < 0) { start++; continue; }
            var end = start + 1;
            while (end < rows && classifiedGrid[end][c] === colorId) end++;
            var len = end - start;
            if (len >= _config.minMatchLen) {
                var cells = [];
                for (var r = start; r < end; r++) cells.push({row: r, col: c});
                matches.push({type: "vertical", color: colorId, cells: cells, len: len});
            }
            start = end;
        }
    }

    return matches;
}

// ============================================================
// 模拟辅助函数
// ============================================================

function swapAndClone(grid, r1, c1, r2, c2) {
    var clone = [];
    for (var r = 0; r < grid.length; r++) clone[r] = grid[r].slice();
    var tmp = clone[r1][c1];
    clone[r1][c1] = clone[r2][c2];
    clone[r2][c2] = tmp;
    return clone;
}

function applyMatches(grid, matches) {
    var result = [];
    for (var r = 0; r < grid.length; r++) result[r] = grid[r].slice();
    for (var m = 0; m < matches.length; m++) {
        for (var i = 0; i < matches[m].cells.length; i++) {
            var cell = matches[m].cells[i];
            result[cell.row][cell.col] = -1;
        }
    }
    return result;
}

function gravityDrop(grid) {
    var rows = grid.length, cols = grid[0].length;
    var result = [];
    for (var r = 0; r < rows; r++) result[r] = [];

    for (var c = 0; c < cols; c++) {
        var colVals = [];
        for (var r = 0; r < rows; r++) {
            if (grid[r][c] >= 0) colVals.push(grid[r][c]);
        }
        for (var r = rows - 1; r >= 0; r--) {
            var idx = r - (rows - colVals.length);
            if (idx >= 0 && idx < colVals.length) {
                result[r][c] = colVals[idx];
            } else {
                result[r][c] = -1;
            }
        }
    }
    return result;
}

function simulateChain(grid, r1, c1, r2, c2) {
    var sim = swapAndClone(grid, r1, c1, r2, c2);
    var chainCount = 0;

    for (var iter = 0; iter < 20; iter++) {
        var matches = findMatches(sim);
        if (matches.length === 0) break;
        chainCount += matches.length;
        sim = applyMatches(sim, matches);
        sim = gravityDrop(sim);
    }

    return chainCount;
}

// ============================================================
// 最优交换计算
// ============================================================

function scoreMove(matchCount, maxLen, chainDepth) {
    var score = matchCount * 10;
    if (maxLen >= 5) score += 80;
    else if (maxLen >= 4) score += 30;
    score += chainDepth * 15;
    return score;
}

function findBestMove(classifiedGrid, blacklist) {
    classifiedGrid = classifiedGrid || _grid;
    var rows = classifiedGrid.length, cols = classifiedGrid[0].length;
    var best = null, bestScore = -1;

    function isBlacklisted(r1, c1, r2, c2) {
        if (!blacklist) return false;
        var key = r1 + "," + c1 + "-" + r2 + "," + c2;
        var revKey = r2 + "," + c2 + "-" + r1 + "," + c1;
        return blacklist[key] === true || blacklist[revKey] === true;
    }

    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            if (classifiedGrid[r][c] < 0) continue;

            // 向右交换
            if (c + 1 < cols && classifiedGrid[r][c+1] >= 0) {
                if (!isBlacklisted(r, c, r, c+1)) {
                    var chain = simulateChain(classifiedGrid, r, c, r, c+1);
                    if (chain > 0) {
                        var matches = findMatches(swapAndClone(classifiedGrid, r, c, r, c+1));
                        var maxLen = 0;
                        for (var m = 0; m < matches.length; m++) {
                            if (matches[m].len > maxLen) maxLen = matches[m].len;
                        }
                        var score = scoreMove(matches.length, maxLen, chain);
                        if (score > bestScore) {
                            bestScore = score;
                            if (c === 0 || c === cols - 2) {
                                best = {r1: r, c1: c+1, r2: r, c2: c, score: score};
                            } else {
                                best = {r1: r, c1: c, r2: r, c2: c+1, score: score};
                            }
                        }
                    }
                }
            }

            // 向下交换
            if (r + 1 < rows && classifiedGrid[r+1][c] >= 0) {
                if (!isBlacklisted(r, c, r+1, c)) {
                    var chain = simulateChain(classifiedGrid, r, c, r+1, c);
                    if (chain > 0) {
                        var matches = findMatches(swapAndClone(classifiedGrid, r, c, r+1, c));
                        var maxLen = 0;
                        for (var m = 0; m < matches.length; m++) {
                            if (matches[m].len > maxLen) maxLen = matches[m].len;
                        }
                        var score = scoreMove(matches.length, maxLen, chain);
                        if (score > bestScore) {
                            bestScore = score;
                            best = {r1: r, c1: c, r2: r+1, c2: c, score: score};
                        }
                    }
                }
            }
        }
    }

    if (best) {
        log("最优交换: (%d,%d) ↔ (%d,%d), 评分=%d", best.r1, best.c1, best.r2, best.c2, best.score);
    } else {
        log("未找到可用的交换");
    }
    return best;
}

module.exports = {
    _grid: _grid,
    sampleGridColors: sampleGridColors,
    classifyColors: classifyColors,
    findMatches: findMatches,
    findBestMove: findBestMove,
    simulateChain: simulateChain,
    // 暴露工具函数供其他模块使用
    rgb2hsv: rgb2hsv,
    colorDistance: colorDistance,
    intToRgb: intToRgb,
    swapAndClone: swapAndClone,
    applyMatches: applyMatches,
    gravityDrop: gravityDrop
};