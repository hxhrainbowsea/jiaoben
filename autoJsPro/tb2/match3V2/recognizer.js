// ============================================================
// recognizer.js - 消消乐 V2 颜色识别（全新算法）
// ============================================================
//
// 与 V1 的关键区别：
// 1. 密集采样（每格 5×5=25 点），每个点是 3×3 像素块平均
// 2. HSV 主分类（比 RGB 距离更感知均匀）
// 3. 多数投票（消除噪点/特效干扰）
// 4. 绿/浅绿：Hue 重叠时用饱和度区分
//
// ============================================================

var REF_COLORS = require('./config.js').REF_COLORS;
var CLASSIFY   = require('./config.js').CLASSIFY;

// ============================================================
// 工具函数
// ============================================================

/** RGB int → [R, G, B] */
function intToRgb(c) {
    return [(c >> 16) & 0xFF, (c >> 8) & 0xFF, c & 0xFF];
}

/** RGB → HSV */
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

/** 圆形 Hue 差值（0-360），结果在 [0, 180] 范围内 */
function hueDiff(h1, h2) {
    var d = Math.abs(h1 - h2);
    return d > 180 ? 360 - d : d;
}

/** RGB 欧氏距离 */
function rgbDist(c1, c2) {
    var dr = c1[0] - c2[0], dg = c1[1] - c2[1], db = c1[2] - c2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

// ============================================================
// 采样
// ============================================================

/**
 * 在单个格子内密集采样
 *
 * 策略：
 * - 在格子内均匀分布 5×5 = 25 个采样点
 * - 每个采样点是 3×3 像素块的平均值（降噪）
 * - 返回所有采样点的 RGB 数组
 *
 * @param {Image} img       - 截图
 * @param {number} cellX    - 格子左上角 X
 * @param {number} cellY    - 格子左上角 Y
 * @param {number} cellW    - 格子宽度
 * @param {number} cellH    - 格子高度
 * @returns {Array<Array<number>>} [[R,G,B], ...]
 */
function sampleCell(img, cellX, cellY, cellW, cellH) {
    var imgW = img.width, imgH = img.height;
    var SAMPLES_PER_SIDE = 5;          // 5×5 网格
    var PATCH_SIZE = 3;                // 3×3 像素块平均
    var halfPatch = Math.floor(PATCH_SIZE / 2);

    var samples = [];
    // 内边距：避免采样到格子边框
    var marginX = Math.floor(cellW * 0.15);
    var marginY = Math.floor(cellH * 0.15);
    var innerW = cellW - 2 * marginX;
    var innerH = cellH - 2 * marginY;

    for (var gy = 0; gy < SAMPLES_PER_SIDE; gy++) {
        for (var gx = 0; gx < SAMPLES_PER_SIDE; gx++) {
            // 采样点坐标（格子内部均匀分布）
            var sx = cellX + marginX + Math.floor((gx + 0.5) * innerW / SAMPLES_PER_SIDE);
            var sy = cellY + marginY + Math.floor((gy + 0.5) * innerH / SAMPLES_PER_SIDE);

            // 3×3 像素块平均
            var sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (var py = -halfPatch; py <= halfPatch; py++) {
                for (var px = -halfPatch; px <= halfPatch; px++) {
                    var px2 = Math.max(0, Math.min(sx + px, imgW - 1));
                    var py2 = Math.max(0, Math.min(sy + py, imgH - 1));
                    var rgb = intToRgb(images.pixel(img, px2, py2));
                    sumR += rgb[0]; sumG += rgb[1]; sumB += rgb[2];
                    count++;
                }
            }
            samples.push([Math.round(sumR / count), Math.round(sumG / count), Math.round(sumB / count)]);
        }
    }
    return samples;
}

// ============================================================
// 分类
// ============================================================

/** 最大 RGB 距离（对角线） */
var MAX_RGB_DIST = Math.sqrt(255 * 255 + 255 * 255 + 255 * 255);  // ≈442

/**
 * 对单个采样点的 RGB 值进行分类
 *
 * 策略（V2 改进）：
 * 1. 如果饱和度或亮度太低 → 判为无效（-1）
 * 2. 遍历参考色，计算「Hue 圆形差 + RGB 欧氏距离」的**加权综合距离**:
 *      compositeDist = 0.5 × (hueDiff/180) + 0.5 × (rgbDist/442)
 *    两项均归一化到 [0,1]，综合越小越匹配
 * 3. 综合距离超出阈值 → 判无效
 * 4. 如果是 绿/浅绿 这对近色 → 用饱和度二次确认
 *
 * 纯 Hue 分类在「实际颜色偏黄绿」时会把绿色误判为黄色，
 * 综合距离引入 RGB 通道约束，大幅降低此问题。
 *
 * @param {Array<number>} rgb - [R, G, B]
 * @returns {number} 参考色 ID (0-5)，或 -1（无效）
 */
function classifySample(rgb) {
    var hsv = rgb2hsv(rgb[0], rgb[1], rgb[2]);

    // 过滤无效格（背景、暗色、去饱和）
    if (hsv.s < CLASSIFY.MIN_SATURATION || hsv.v < CLASSIFY.MIN_VALUE) {
        return -1;
    }

    // 计算到每个参考色的综合距离
    var COMPOSITE_THRESHOLD = 0.35;      // 综合距离阈值（超出判无效）
    var AMBIGUITY_GAP = 0.04;            // 最佳与次佳差距小于此值 → 不确定
    var HUE_WEIGHT  = 0.5;               // Hue 权重
    var RGB_WEIGHT  = 0.5;               // RGB 权重

    var bestIdx = -1, bestDist = COMPOSITE_THRESHOLD;
    var secondDist = COMPOSITE_THRESHOLD;

    for (var i = 0; i < REF_COLORS.length; i++) {
        var dh = hueDiff(hsv.h, REF_COLORS[i].hsv.h) / 180;       // [0, 1]
        var dr = rgbDist(rgb, REF_COLORS[i].rgb) / MAX_RGB_DIST;  // [0, 1]
        var composite = HUE_WEIGHT * dh + RGB_WEIGHT * dr;

        if (composite < bestDist) {
            secondDist = bestDist;
            bestDist = composite;
            bestIdx = i;
        } else if (composite < secondDist) {
            secondDist = composite;
        }
    }

    // 最佳与次佳太接近 → 模糊，判不确定
    if (bestIdx >= 0 && (secondDist - bestDist) < AMBIGUITY_GAP) {
        return -1;
    }

    if (bestIdx < 0) return -1;

    // 特殊处理绿/浅绿：Hue 接近时用饱和度区分
    var bestName = REF_COLORS[bestIdx].name;
    if (bestName === "绿" || bestName === "浅绿") {
        var greenRef = REF_COLORS[3];   // 绿（校正后 H≈76°, S≈0.66）
        var lgRef    = REF_COLORS[5];   // 浅绿 H≈129°, S≈0.32
        var dGreen = hueDiff(hsv.h, greenRef.hsv.h);
        var dLg    = hueDiff(hsv.h, lgRef.hsv.h);

        if (dGreen <= dLg) {
            return hsv.s >= CLASSIFY.GREEN_LIGHTGREEN_S_THRESHOLD ? 3 : -1;
        } else {
            return hsv.s < CLASSIFY.GREEN_LIGHTGREEN_S_THRESHOLD ? 5 : -1;
        }
    }

    return bestIdx;
}

/**
 * 对整个棋盘的格子进行分类
 *
 * @param {Image} img        - 截图
 * @param {Object} boardRect - {boardLeft, boardTop, boardRight, boardBottom}
 * @param {number} rows      - 行数
 * @param {number} cols      - 列数
 * @returns {Object} { grid: [[colorId,...],...], details: {...} }
 */
function classifyBoard(img, boardRect, rows, cols) {
    var cellW = (boardRect.boardRight - boardRect.boardLeft) / cols;
    var cellH = (boardRect.boardBottom - boardRect.boardTop) / rows;

    var grid = [];
    var cellColors = [];   // 每个格子的平均 RGB（用于显示）
    var stats = { totalCells: rows * cols, validCells: 0, votes: [] };

    for (var r = 0; r < rows; r++) {
        grid[r] = [];
        cellColors[r] = [];
        for (var c = 0; c < cols; c++) {
            var cx = Math.floor(boardRect.boardLeft + c * cellW);
            var cy = Math.floor(boardRect.boardTop + r * cellH);

            // 密集采样
            var samples = sampleCell(img, cx, cy, Math.floor(cellW), Math.floor(cellH));

            // 对每个采样点分类
            var votes = {};
            var validSamples = 0;
            for (var s = 0; s < samples.length; s++) {
                var id = classifySample(samples[s]);
                if (id >= 0) {
                    votes[id] = (votes[id] || 0) + 1;
                    validSamples++;
                }
            }

            // 多数投票
            var finalId = -1;
            var maxVotes = 0;
            var totalVotes = 0;
            for (var k in votes) {
                totalVotes += votes[k];
                if (votes[k] > maxVotes) {
                    maxVotes = votes[k];
                    finalId = parseInt(k);
                }
            }

            // 得票比例需超过阈值才确认
            if (validSamples > 0 && totalVotes > 0) {
                var ratio = maxVotes / validSamples;
                if (ratio < CLASSIFY.MAJORITY_THRESHOLD) {
                    finalId = -1;  // 得票太分散，不确认
                }
            }

            grid[r][c] = finalId;
            if (finalId >= 0) stats.validCells++;

            // 计算该格子的平均 RGB（所有采样点的中值）
            var sortedR = samples.map(function(p){return p[0];}).sort(function(a,b){return a-b;});
            var sortedG = samples.map(function(p){return p[1];}).sort(function(a,b){return a-b;});
            var sortedB = samples.map(function(p){return p[2];}).sort(function(a,b){return a-b;});
            var mid = Math.floor(samples.length / 2);
            cellColors[r][c] = [sortedR[mid], sortedG[mid], sortedB[mid]];

            stats.votes.push({
                row: r, col: c,
                finalId: finalId,
                finalName: finalId >= 0 ? REF_COLORS[finalId].name : "?",
                votes: votes,
                avgRgb: cellColors[r][c]
            });
        }
    }

    return { grid: grid, cellColors: cellColors, stats: stats };
}

// ============================================================
// 可视化
// ============================================================

var _colorBgMap = {
    "黄":  "#FFE6B800",
    "紫":  "#FF9C27B0",
    "红":  "#FFE53935",
    "绿":  "#FF43A047",
    "蓝":  "#FF1E88E5",
    "浅绿":"#FF66BB6A",
    "?" :  "#FF888888"
};

// showResultOverlay 和 runRecognitionTest 已移至 recognizer_autojs.js
// （它们使用了 Auto.js 特有的 JSX 语法，Node.js 无法解析）
// 在 Auto.js 中这样启用：
//   var recognizer = require('./recognizer.js');
//   require('./recognizer_autojs.js').enhance(recognizer);

module.exports = {
    intToRgb: intToRgb,
    sampleCell: sampleCell,
    classifySample: classifySample,
    classifyBoard: classifyBoard,
    REF_COLORS: REF_COLORS
};