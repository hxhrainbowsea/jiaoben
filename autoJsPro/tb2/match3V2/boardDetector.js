// ============================================================
// boardDetector.js - 自动识别棋盘位置
//
// 极简算法：
// 1. 逐行扫描，找「第一次出现 6 色匹配的行」→ boardTop
// 2. 继续扫，直到「匹配色消失」→ boardBottom
// 3. 在 [top, bottom] 区间内逐列扫描 → boardLeft / boardRight
// ============================================================

var REF_COLORS = require('./config.js').REF_COLORS;

function rgbDist(c1, c2) {
    var dr = c1[0] - c2[0], dg = c1[1] - c2[1], db = c1[2] - c2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

function intToRgb(c) {
    return [(c >> 16) & 0xFF, (c >> 8) & 0xFF, c & 0xFF];
}

function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    var h, s = max === 0 ? 0 : d / max, v = max;
    if (max === min) {
        h = 0;
    } else if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    } else if (max === g) {
        h = ((b - r) / d + 2) * 60;
    } else {
        h = ((r - g) / d + 4) * 60;
    }
    return { h: h, s: s, v: v };
}

function hueDiff(h1, h2) {
    var d = Math.abs(h1 - h2);
    return d > 180 ? 360 - d : d;
}

/** MAX_RGB_DIST = sqrt(255^2 + 255^2 + 255^2) ≈ 442 */
var MAX_RGB_DIST = Math.sqrt(255 * 255 + 255 * 255 + 255 * 255);

/**
 * 综合距离：0.5 × 色相差归一化 + 0.5 × RGB距离归一化
 * 阈值 0.35 对应：即使 RGB 很远，色相近也能通过，反之亦然
 */
function compositeDist(rgb, refRgb, refHsv) {
    var hsv = rgb2hsv(rgb[0], rgb[1], rgb[2]);
    // 提高饱和度阈值到 0.35：游戏色饱和度 > 0.60，背景色 ~0.29，可有效区分
    if (hsv.s < 0.35 || hsv.v < 0.15) return 1.0;
    var dh = hueDiff(hsv.h, refHsv.h) / 180;
    var dr = rgbDist(rgb, refRgb) / MAX_RGB_DIST;
    return 0.5 * dh + 0.5 * dr;
}

/** 是否是棋盘颜色（用综合距离替代纯 RGB 距离） */
function isBoardColor(rgb) {
    for (var i = 0; i < REF_COLORS.length; i++) {
        var ref = REF_COLORS[i];
        var cd = compositeDist(rgb, ref.rgb, ref.hsv);
        if (cd < 0.28) return true; // 收紧阈值从 0.35→0.28
    }
    return false;
}

var COMMON_GRIDS = [
    // 正方形
    {rows: 6, cols: 6}, {rows: 7, cols: 7}, {rows: 8, cols: 8}, {rows: 9, cols: 9},
    {rows: 10, cols: 10},
    // 宽 > 高（常见于横屏/宽屏消消乐）
    {rows: 6, cols: 7}, {rows: 6, cols: 8}, {rows: 6, cols: 9}, {rows: 6, cols: 10},
    {rows: 7, cols: 8}, {rows: 7, cols: 9}, {rows: 7, cols: 10},
    {rows: 8, cols: 9}, {rows: 8, cols: 10}, {rows: 8, cols: 11}, {rows: 8, cols: 12},
    {rows: 9, cols: 10}, {rows: 9, cols: 11}, {rows: 9, cols: 12},
    {rows: 10, cols: 11}, {rows: 10, cols: 12},
    // 高 > 宽
    {rows: 7, cols: 6}, {rows: 8, cols: 6}, {rows: 8, cols: 7},
    {rows: 9, cols: 7}, {rows: 9, cols: 8}, {rows: 10, cols: 8}, {rows: 10, cols: 9},
    // 经典消消乐
    {rows: 8, cols: 7}, {rows: 8, cols: 8}, {rows: 8, cols: 9},
    {rows: 7, cols: 8}, {rows: 9, cols: 8},
    // 少行多列（如 3×9, 4×8 等）
    {rows: 3, cols: 7}, {rows: 3, cols: 8}, {rows: 3, cols: 9}, {rows: 3, cols: 10},
    {rows: 4, cols: 7}, {rows: 4, cols: 8}, {rows: 4, cols: 9}, {rows: 4, cols: 10},
    {rows: 5, cols: 8}, {rows: 5, cols: 9}, {rows: 5, cols: 10}
];

/**
 * 自动检测棋盘位置
 *
 * 先扫 Y 找上下边界，再扫 X 找左右边界。
 * 支持手动指定网格尺寸（跳过自动网格搜索）。
 *
 * @param {Image} img - 截图
 * @param {Object} [manualGrid] - 可选，手动指定网格 {rows, cols}
 * @returns {Object|null} {boardLeft, boardTop, boardRight, boardBottom, rows, cols}
 */
function detectBoard(img, manualGrid) {
    var w = img.width, h = img.height;
    log("[检测] 截图 " + w + "×" + h + "，检测棋盘...");

    var step = 4;  // 扫描步长（px）

    // ============ Y 方向：找上下边界 ============
    var rowCounts = [];           // rowCounts[ri] = 该行匹配像素数
    var rowIndices = [];          // rowIndices[ri] = 实际 Y 坐标
    var maxRowHits = 0;

    for (var y = 0; y < h; y += step) {
        var ri = Math.floor(y / step);
        var count = 0;
        for (var x = 0; x < w; x += step) {
            if (isBoardColor(intToRgb(images.pixel(img, x, y)))) count++;
        }
        rowCounts[ri] = count;
        rowIndices[ri] = y;
        if (count > maxRowHits) maxRowHits = count;
    }

    if (maxRowHits === 0) {
        log("[检测] 未找到任何匹配色，检测失败");
        module.exports._lastDetected = null;
        return null;
    }

    // ============ 滑动窗口法找 Y 边界 ============
    // 思路：棋盘通常占截图高度的 10%~20%（8行格子约 350~450px）
    // 滑动一个 400px 窗口，找累计匹配像素最多的区域
    var totalRows = rowCounts.length;
    var windowH = Math.min(500, Math.max(300, Math.floor(h * 0.18)));
    var windowRows = Math.floor(windowH / step);
    if (windowRows < 10) windowRows = Math.min(80, totalRows - 1);

    // 前缀和加速滑动窗口计算
    var prefixSums = [0];
    for (var ri = 0; ri < totalRows; ri++) {
        prefixSums[ri + 1] = prefixSums[ri] + (rowCounts[ri] || 0);
    }

    // 计算每个窗口的总匹配数，找最佳窗口
    var bestSum = 0, bestRi = 0;
    for (var ri = 0; ri + windowRows <= totalRows; ri++) {
        var sum = prefixSums[ri + windowRows] - prefixSums[ri];
        if (sum > bestSum) {
            bestSum = sum;
            bestRi = ri;
        }
    }

    if (bestSum === 0) {
        log("[检测] 滑动窗口未找到有效区域，检测失败");
        return null;
    }

    // 在最佳窗口内精确定位上下边界
    // 从上往下找第一个密度 >= 峰值 25% 的行
    var edgeThresh = Math.max(5, maxRowHits * 0.25);
    var boardTop = rowIndices[bestRi + windowRows - 1]; // 默认窗口底部
    for (var ri = bestRi; ri < bestRi + windowRows; ri++) {
        if (rowCounts[ri] >= edgeThresh) {
            boardTop = rowIndices[ri];
            break;
        }
    }
    // 从下往上找最后一个密度 >= 峰值 25% 的行
    var boardBottom = rowIndices[bestRi]; // 默认窗口顶部
    for (var ri = bestRi + windowRows - 1; ri >= bestRi; ri--) {
        if (rowCounts[ri] >= edgeThresh) {
            boardBottom = rowIndices[ri];
            break;
        }
    }

    log("[检测] Y边界: top=" + boardTop + " bottom=" + boardBottom
        + " (窗口内总匹配=" + bestSum + ")");

    // ============ Y 方向精修 ============
    // 棋盘底部的 UI 元素可能有匹配色，导致 bottom 偏大。
    // 用"密度组"裁剪法：从底部向上找最后一个属于密集组的行。
    // 密集组 = 连续 5 行中至少 3 行密度 > 中位数的一半
    var startRi = Math.floor(boardTop / step);
    var endRi = Math.floor(boardBottom / step);

    // 计算窗口内中位数密度
    var densVals = [];
    for (var ri = startRi; ri <= endRi; ri++) {
        densVals.push(rowCounts[ri] || 0);
    }
    densVals.sort(function(a, b) { return b - a; });
    var medianDens = densVals[Math.floor(densVals.length / 2)] || 1;
    var groupThresh = Math.max(3, medianDens * 0.40);

    // 从底部向上，找最后一个密集组（连续 5 行中 >=3 行高于阈值）
    var newBottom = boardBottom;
    for (var ri = endRi; ri >= startRi + 4; ri--) {
        var aboveCount = 0;
        for (var dr = 0; dr < 5; dr++) {
            if ((rowCounts[ri - dr] || 0) >= groupThresh) aboveCount++;
        }
        if (aboveCount >= 3) {
            newBottom = rowIndices[ri];
            break;
        }
    }
    boardBottom = newBottom;

    // 从顶部向下，找第一个密集组
    var newTop = boardTop;
    for (var ri = startRi; ri <= endRi - 4; ri++) {
        var aboveCount = 0;
        for (var dr = 0; dr < 5; dr++) {
            if ((rowCounts[ri + dr] || 0) >= groupThresh) aboveCount++;
        }
        if (aboveCount >= 3) {
            newTop = rowIndices[ri];
            break;
        }
    }
    boardTop = newTop;

    log("[检测] Y精修: top=" + boardTop + " bottom=" + boardBottom
        + " (中位数=" + medianDens + " 组阈值=" + groupThresh.toFixed(0) + ")");

    // ============ X 方向：在 Y 区间内找左右边界 ============
    var colCounts = [];
    var colMax = 0;

    for (var x = 0; x < w; x += step) {
        var ci = Math.floor(x / step);
        var count = 0;
        for (var y = boardTop; y <= boardBottom; y += step) {
            if (isBoardColor(intToRgb(images.pixel(img, x, y)))) count++;
        }
        colCounts[ci] = count;
        if (count > colMax) colMax = count;
    }

    var minColHits = Math.max(3, Math.floor(colMax * 0.15));
    var boardLeft = -1, boardRight = -1;

    for (var ci = 0; ci < colCounts.length; ci++) {
        if (colCounts[ci] >= minColHits) {
            if (boardLeft < 0) boardLeft = ci * step;
            boardRight = ci * step;
        }
    }

    // 强匹配微调（使用降低的阈值，避免过度裁剪左右边缘）
    // 原50%阈值太严格，导致detected left=40(应为23) right=1228(应为1249)
    var strongColThresh = colMax * 0.25;
    for (var ci = 0; ci < colCounts.length; ci++) {
        if (colCounts[ci] >= strongColThresh) {
            boardLeft = ci * step;
            break;
        }
    }
    for (var ci = colCounts.length - 1; ci >= 0; ci--) {
        if (colCounts[ci] >= strongColThresh) {
            boardRight = ci * step;
            break;
        }
    }

    if (boardLeft < 0) {
        log("[检测] 未找到有效列，检测失败");
        return null;
    }

    log("[检测] X边界: left=" + boardLeft + " right=" + boardRight);

    // ============ 估算网格尺寸 ============
    var boardW = boardRight - boardLeft;
    var boardH = boardBottom - boardTop;
    log("[检测] 棋盘区域: " + boardW + "×" + boardH
        + "  [" + boardLeft + "," + boardTop + "]-[" + boardRight + "," + boardBottom + "]");

    var best = null;
    var bestScore = -1;

    // 如果指定了手动网格，直接验证使用
    if (manualGrid) {
        var cellW = boardW / manualGrid.cols;
        var cellH = boardH / manualGrid.rows;
        var hits = 0, total = manualGrid.rows * manualGrid.cols;
        for (var rr = 0; rr < manualGrid.rows; rr++) {
            for (var cc = 0; cc < manualGrid.cols; cc++) {
                var cx = Math.floor(boardLeft + cc * cellW + cellW / 2);
                var cy = Math.floor(boardTop  + rr * cellH + cellH / 2);
                if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
                    if (isBoardColor(intToRgb(images.pixel(img, cx, cy)))) hits++;
                }
            }
        }
        bestScore = hits / total;
        log("[检测] 手动网格 " + manualGrid.rows + "×" + manualGrid.cols
            + "  cell=" + cellW.toFixed(0) + "×" + cellH.toFixed(0)
            + "  命中=" + hits + "/" + total + "  " + (bestScore * 100).toFixed(0) + "%");
        best = {
            boardLeft: boardLeft, boardTop: boardTop,
            boardRight: boardRight, boardBottom: boardBottom,
            rows: manualGrid.rows, cols: manualGrid.cols, confidence: bestScore
        };
    } else {
        // 自动搜索最佳网格
        for (var g = 0; g < COMMON_GRIDS.length; g++) {
            var cand = COMMON_GRIDS[g];
            var cellW = boardW / cand.cols;
            var cellH = boardH / cand.rows;

            // 只过滤极端不合理大小（游戏格通常在 30~250px 之间）
            if (cellW < 25 || cellW > 250 || cellH < 20 || cellH > 250) continue;
            // 不强制比例限制，让命中率自然筛选最佳配置

            var hits = 0, total = cand.rows * cand.cols;
            for (var rr = 0; rr < cand.rows; rr++) {
                for (var cc = 0; cc < cand.cols; cc++) {
                    var cx = Math.floor(boardLeft + cc * cellW + cellW / 2);
                    var cy = Math.floor(boardTop  + rr * cellH + cellH / 2);
                    if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
                        if (isBoardColor(intToRgb(images.pixel(img, cx, cy)))) hits++;
                    }
                }
            }

            var score = hits / total;

            // 格子比例惩罚：消消乐格子通常接近正方形
            // cellRatio = 宽/高（取大除小），偏离 1 越多越可疑
            var cellRatio = cellW > cellH ? cellW / cellH : cellH / cellW;
            var ratioPenalty = cellRatio <= 1.5 ? 1.0 : (2.0 / cellRatio);

            var adjScore = score * ratioPenalty;

            log("[检测]   " + cand.rows + "×" + cand.cols
                + "  cell=" + cellW.toFixed(0) + "×" + cellH.toFixed(0)
                + "  命中=" + hits + "/" + total + "  " + (score * 100).toFixed(0) + "%"
                + (ratioPenalty < 1 ? "  adj=" + (adjScore * 100).toFixed(0) + "%" : ""));

            if (adjScore > bestScore) {
                bestScore = adjScore;
                best = {
                    boardLeft: boardLeft, boardTop: boardTop,
                    boardRight: boardRight, boardBottom: boardBottom,
                    rows: cand.rows, cols: cand.cols, confidence: score
                };
            }
        }
    }

    if (!best || bestScore < 0.3) {
        log("[检测] ⚠ 无匹配网格（最佳=" + (bestScore * 100).toFixed(0) + "%）");
        // 保存检测到的边界信息供诊断用
        module.exports._lastDetected = {
            boardLeft: boardLeft, boardTop: boardTop,
            boardRight: boardRight, boardBottom: boardBottom
        };
        return null;
    }

    // ============ 网格精修：Y 方向对齐搜索 ============
    // 滑动窗口 + 密度组找到的 Y 边界可能有偏差（被上方 UI 元素干扰）。
    // 选定网格后，用可靠的左右边界计算 cellW，然后独立搜索最佳 Y 位置。
    // 搜索策略：命中率 × 高度惩罚 × 边界惩罚
    // - 高度惩罚：倾向于格子接近正方形（cellH/cellW ≈ 理想比例）
    // - 边界惩罚：正确位置时，网格上下方不应有棋盘色
    if (!manualGrid && best.rows > 1 && best.confidence > 0.5) {
        var cellW = (boardRight - boardLeft) / best.cols;
        var bestYTop = boardTop;
        var bestCellH = cellW;
        var bestScore = 0;

        // 确定搜索范围：从图片 15% 高度到 80% 高度（棋盘通常在中下部）
        var searchStart = Math.max(0, Math.floor(h * 0.05));
        var searchEnd = h - Math.ceil(best.rows * cellW * 0.85);
        // 但为了性能，限制在 boardTop 周围 ±150px 范围内搜索
        searchStart = Math.max(searchStart, boardTop - 150);
        searchEnd = Math.min(searchEnd, boardTop + 150);

        log("[检测] Y搜索范围: " + searchStart + " ~ " + searchEnd);

        for (var testTop = searchStart; testTop <= searchEnd; testTop += 2) {
            for (var ratio = 0.85; ratio <= 0.98; ratio += 0.01) {
                var testCellH = cellW * ratio;
                var testBottom = testTop + best.rows * testCellH;
                if (testBottom > h) continue;

                // ---- 1. 网格命中率 ----
                var hits = 0;
                for (var r = 0; r < best.rows; r++) {
                    var cy = testTop + r * testCellH + testCellH / 2;
                    for (var c = 0; c < best.cols; c++) {
                        var cx = boardLeft + c * cellW + cellW / 2;
                        if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
                            if (isBoardColor(intToRgb(images.pixel(img, Math.round(cx), Math.round(cy))))) hits++;
                        }
                    }
                }
                var hitRate = hits / (best.rows * best.cols);
                if (hitRate < 0.5) continue; // 命中率太低直接跳过

                // ---- 2. 高度惩罚：倾向 cellH ≈ cellW * 0.90 ----
                var idealRatio = 0.90;
                var ratioDiff = Math.abs(ratio - idealRatio);
                var heightPenalty = Math.max(0.1, 1 - 5 * ratioDiff);

                // ---- 3. 边界惩罚：网格上下方不应有棋盘色 ----
        // 正确位置时，网格边界上方和下方应为空白/背景色。
        // 注意：棋盘视觉区域比网格大（有边框），所以检查距离要足够远，
        // 确保检查点落在棋盘视觉区域之外。
        // 修正：降低触发阈值 0.25（原0.4太宽松导致偏上不被惩罚）；
        //       增加第三远端扫描点 cellH/0.8（~150px）精准捕捉偏上情形
        var BOUNDARY_RATIO_THRESH = 0.25;   // 原 0.4 → 2 列有色即触发边界惩罚
        var boundaryPenalty = 1.0;
        var scans = [
            { offset: Math.max(8, Math.round(testCellH / 4)), weight: 0.4 },   // 近距 ~30px
            { offset: Math.max(16, Math.round(testCellH / 1.2)), weight: 0.5 }, // 中距 ~100px
            { offset: Math.max(24, Math.round(testCellH / 0.8)), weight: 0.6 }  // 远距 ~150px
        ];

                for (var si = 0; si < scans.length; si++) {
                    var scan = scans[si];

                    // 检查上方
                    var aboveY = testTop - scan.offset;
                    if (aboveY >= 0) {
                        var aboveHits = 0;
                        for (var c = 0; c < best.cols; c++) {
                            var cx = Math.round(boardLeft + c * cellW + cellW / 2);
                            if (isBoardColor(intToRgb(images.pixel(img, cx, aboveY)))) aboveHits++;
                        }
                        var aboveRatio = aboveHits / best.cols;
                        if (aboveRatio > BOUNDARY_RATIO_THRESH) boundaryPenalty *= (1 - scan.weight * aboveRatio);
                    }

                    // 检查下方
                    var belowY = testBottom + scan.offset;
                    if (belowY < h) {
                        var belowHits = 0;
                        for (var c = 0; c < best.cols; c++) {
                            var cx = Math.round(boardLeft + c * cellW + cellW / 2);
                            if (isBoardColor(intToRgb(images.pixel(img, cx, belowY)))) belowHits++;
                        }
                        var belowRatio = belowHits / best.cols;
                        if (belowRatio > BOUNDARY_RATIO_THRESH) boundaryPenalty *= (1 - scan.weight * belowRatio);
                    }
                }

                // ---- 综合得分 ----
                var score = hitRate * heightPenalty * boundaryPenalty;
                if (score > bestScore) {
                    bestScore = score;
                    bestYTop = testTop;
                    bestCellH = testCellH;
                }
            }
        }

        // 调试：输出关键位置的得分
        var debugPositions = [1026, 1028, 1030, 1032, 1034, 1036, 1038, 1040, 1042, 1044, 1046, 1048, 1050, 1060, 1070, 1080, 1082, 1090, 1092, 1100];
        for (var di = 0; di < debugPositions.length; di++) {
            var dp = debugPositions[di];
            if (dp >= searchStart && dp <= searchEnd) {
                for (var dr = 0.85; dr <= 0.98; dr += 0.01) {
                    var dCellH = cellW * dr;
                    var dBot = dp + best.rows * dCellH;
                    if (dBot > h) continue;
                    var dHits = 0;
                    for (var r = 0; r < best.rows; r++) {
                        var cy = dp + r * dCellH + dCellH / 2;
                        for (var c = 0; c < best.cols; c++) {
                            var cx = Math.round(boardLeft + c * cellW + cellW / 2);
                            if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
                                if (isBoardColor(intToRgb(images.pixel(img, cx, Math.round(cy))))) dHits++;
                            }
                        }
                    }
                    var dRate = dHits / (best.rows * best.cols);
                    if (dRate >= 0.5) {
                        var dRatio = Math.abs(dr - 0.90);
                        var dHp = Math.max(0.1, 1 - 5 * dRatio);

                        var dBp = 1.0;
                        var dScans = [
                            { offset: Math.max(8, Math.round(dCellH / 4)), weight: 0.4 },
                            { offset: Math.max(16, Math.round(dCellH / 1.2)), weight: 0.5 },
                            { offset: Math.max(24, Math.round(dCellH / 0.8)), weight: 0.6 }
                        ];
                        for (var dsi = 0; dsi < dScans.length; dsi++) {
                            var ds = dScans[dsi];
                            var dAy = dp - ds.offset;
                            if (dAy >= 0) {
                                var dAh = 0;
                                for (var dc = 0; dc < best.cols; dc++) {
                                    var dCx = Math.round(boardLeft + dc * cellW + cellW / 2);
                                    if (isBoardColor(intToRgb(images.pixel(img, dCx, dAy)))) dAh++;
                                }
                                if (dAh / best.cols > 0.25) dBp *= (1 - ds.weight * dAh / best.cols);
                            }
                            var dBy = dBot + ds.offset;
                            if (dBy < h) {
                                var dBh = 0;
                                for (var dc = 0; dc < best.cols; dc++) {
                                    var dCx = Math.round(boardLeft + dc * cellW + cellW / 2);
                                    if (isBoardColor(intToRgb(images.pixel(img, dCx, dBy)))) dBh++;
                                }
                                if (dBh / best.cols > 0.25) dBp *= (1 - ds.weight * dBh / best.cols);
                            }
                        }
                        var dScore = dRate * dHp * dBp;
                        log("[Y调试] top=" + dp + " ratio=" + dr.toFixed(2) + " cellH=" + dCellH.toFixed(1) +
                            " bottom=" + dBot.toFixed(0) + " 命中率=" + (dRate*100).toFixed(0) + "%" +
                            " HPenalty=" + dHp.toFixed(2) + " BPenalty=" + dBp.toFixed(2) +
                            " 得分=" + (dScore*100).toFixed(0) + "%");
                    }
                }
            }
        }

        // 始终应用Y对齐结果（除非搜索得分实在太低）
        if (bestScore > 0.3) {
            var oldTop = best.boardTop;
            var oldBottom = best.boardBottom;
            best.boardTop = Math.round(bestYTop);
            best.boardBottom = Math.round(bestYTop + best.rows * bestCellH);
            best.confidence = Math.max(best.confidence, bestScore);
            log("[检测] Y对齐: top=" + oldTop + "→" + best.boardTop
                + " bottom=" + oldBottom + "→" + best.boardBottom
                + "  cellH=" + bestCellH.toFixed(1) + " 得分=" + (bestScore * 100).toFixed(0) + "%");
        } else {
            log("[检测] Y对齐搜索得分过低 (" + (bestScore * 100).toFixed(0) + "%)，保留原位置");
        }
    }

    log("[检测] ✓ " + best.rows + "×" + best.cols
        + "  置信度 " + (best.confidence * 100).toFixed(0) + "%"
        + "  精修后: [" + best.boardLeft + "," + best.boardTop
        + "]-[" + best.boardRight + "," + best.boardBottom + "]");
    module.exports._lastDetected = best;
    return best;
}

module.exports = { detectBoard: detectBoard };