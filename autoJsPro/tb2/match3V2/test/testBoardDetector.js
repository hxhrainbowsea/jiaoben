// ============================================================
// test/testBoardDetector.js — 独立棋盘检测测试（Node.js 环境）
//
// 用法：
//   node testBoardDetector.js [图片路径]              自动检测
//   node testBoardDetector.js [图片路径] -b L,T,R,B   手动指定边界
//   node testBoardDetector.js [图片路径] -g 行x列      手动指定网格尺寸
//   node testBoardDetector.js [图片路径] -b L,T,R,B -g 行x列  手动边界+网格
//   node testBoardDetector.js [图片路径] -b L,T,R,B --suggest  建议参考色
//     示例: node testBoardDetector.js a.jpg
//     示例: node testBoardDetector.js a.jpg -b 23,1030,1249,1416
//     示例: node testBoardDetector.js a.jpg -g 9x9
//     示例: node testBoardDetector.js a.jpg -b 23,1030,1249,1416 -g 9x9
//     示例: node testBoardDetector.js a.jpg -b 23,1030,1249,1416 --suggest
//
// 依赖：npm install sharp
//
// 输出：
//   - 控制台打印检测结果（位置、尺寸、置信度）
//   - 生成 debug_board.jpg（标记检测框的示意图）
// ============================================================

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ============================================================
// 1. Mock Auto.js 全局 API
// ============================================================

global.log = function (...args) {
    console.log('[检测]', ...args);
};

/**
 * 用 sharp 原始像素数据构造一个兼容 Auto.js Image 的对象
 */
function createImageFromSharp(metadata, rawBuffer) {
    const channels = metadata.channels; // 3=RGB, 4=RGBA
    return {
        width: metadata.width,
        height: metadata.height,
        _data: rawBuffer,
        _channels: channels,
        // 方便手动读像素（调试用）
        getPixel: function (x, y) {
            const idx = (y * this.width + x) * this._channels;
            return [
                this._data[idx],
                this._data[idx + 1],
                this._data[idx + 2]
            ];
        }
    };
}

// Mock images.pixel(img, x, y) → 返回 0xRRGGBB int
global.images = {
    pixel: function (img, x, y) {
        // 边界钳位
        x = Math.max(0, Math.min(x, img.width - 1));
        y = Math.max(0, Math.min(y, img.height - 1));
        const idx = (y * img.width + x) * img._channels;
        const r = img._data[idx];
        const g = img._data[idx + 1];
        const b = img._data[idx + 2];
        return (r << 16) | (g << 8) | b;
    }
};

// ============================================================
// 2. 加载图片并检测
// ============================================================

async function main() {
    // 解析命令行参数
    var args = process.argv.slice(2);
    var imagePath = path.join(__dirname, '..', 'a.jpg');
    var manualBounds = null;  // {left, top, right, bottom}
    var doSuggest = false;     // --suggest 标志
    var manualGrid = null;     // -g 行x列, e.g. "9x9" → {rows:9, cols:9}

    for (var i = 0; i < args.length; i++) {
        if (args[i] === '-b' && i + 1 < args.length) {
            var parts = args[i + 1].split(',');
            if (parts.length === 4) {
                manualBounds = {
                    boardLeft: parseInt(parts[0]),
                    boardTop: parseInt(parts[1]),
                    boardRight: parseInt(parts[2]),
                    boardBottom: parseInt(parts[3])
                };
                console.log('[信息] 手动指定边界: left=' + manualBounds.boardLeft +
                    ' top=' + manualBounds.boardTop +
                    ' right=' + manualBounds.boardRight +
                    ' bottom=' + manualBounds.boardBottom);
                i++; // skip next arg
            }
        } else if (args[i] === '-g' && i + 1 < args.length) {
            var gridStr = args[i + 1];
            // 支持 "9x9" "9,9" "9×9" 格式
            var parts2 = gridStr.split(/[xX,×]/);
            if (parts2.length === 2) {
                manualGrid = {
                    rows: parseInt(parts2[0]),
                    cols: parseInt(parts2[1])
                };
                console.log('[信息] 手动指定网格: ' + manualGrid.rows + '行×' + manualGrid.cols + '列');
                i++;
            }
        } else if (args[i] === '--suggest') {
            doSuggest = true;
        } else if (args[i] !== '-b' && args[i] !== '-g' && !args[i].startsWith('-')) {
            imagePath = args[i];
        }
    }

    if (!fs.existsSync(imagePath)) {
        console.error(`[错误] 文件不存在: ${imagePath}`);
        console.error('用法: node testBoardDetector.js [图片路径] [-b left,top,right,bottom]');
        process.exit(1);
    }

    console.log(`[信息] 加载图片: ${imagePath}`);
    const startTime = Date.now();

    // 用 sharp 解码图片 → 原始 RGB 像素
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    console.log(`[信息] 图片尺寸: ${metadata.width} × ${metadata.height}`);

    const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });

    const img = createImageFromSharp(info, data);

    // ========== 加载 boardDetector ==========
    const boardDetector = require('../boardDetector.js');

    console.log(`\n========== 自动检测 ==========`);
    const autoResult = boardDetector.detectBoard(img);
    const elapsed = Date.now() - startTime;

    console.log(`\n========== 自动检测结果 (${elapsed}ms) ==========`);
    if (autoResult) {
        console.log('✅ 检测成功');
        console.log(`   棋盘区域:`);
        console.log(`     左上: (${autoResult.boardLeft}, ${autoResult.boardTop})`);
        console.log(`     右下: (${autoResult.boardRight}, ${autoResult.boardBottom})`);
        console.log(`     宽×高: ${autoResult.boardRight - autoResult.boardLeft} × ${autoResult.boardBottom - autoResult.boardTop}`);
        console.log(`   网格: ${autoResult.cols} 列 × ${autoResult.rows} 行`);
        console.log(`   置信度: ${(autoResult.confidence * 100).toFixed(1)}%`);

        // ========== 颜色识别（先识别，再画图，以便标注分类） ==========
        var result = null;
        console.log(`\n========== 颜色识别 ==========`);
        try {
            const recognizer = require('../recognizer.js');
            result = recognizer.classifyBoard(img, autoResult, autoResult.rows, autoResult.cols);
            const colorNames = ['黄','红','紫','绿','蓝','浅绿'];
            // 按行输出
            for (var r = 0; r < autoResult.rows; r++) {
                var rowStr = '  行' + (r+1) + ': ';
                for (var c = 0; c < autoResult.cols; c++) {
                    var cid = result.grid[r][c];
                    var name = cid >= 0 ? colorNames[cid] : '?';
                    rowStr += name + ' ';
                }
                console.log(rowStr);
            }
            // 输出每个格子的 RGB 值（诊断用）
            console.log('');
            console.log('[诊断] 每个格子平均 RGB (来自 classifyBoard):');
            for (var r = 0; r < autoResult.rows; r++) {
                var rowStr = '  行' + (r+1) + ': ';
                for (var c = 0; c < autoResult.cols; c++) {
                    var rgb = result.cellColors[r][c];
                    if (rgb) {
                        rowStr += `(${rgb[0]},${rgb[1]},${rgb[2]}) `;
                    } else {
                        rowStr += '(?,?,?) ';
                    }
                }
                console.log(rowStr);
            }
            // 输出每个单元格的投票详情（紫/红混淆诊断）
            console.log('');
            console.log('[诊断] 投票详情:');
            for (var r = 0; r < autoResult.rows; r++) {
                for (var c = 0; c < autoResult.cols; c++) {
                    var v = result.stats.votes[r * autoResult.cols + c];
                    if (v) {
                        var cid = v.finalName;
                        var rgbStr = v.avgRgb ? `(${v.avgRgb[0]},${v.avgRgb[1]},${v.avgRgb[2]})` : '(?)';
                        console.log(`  [${r+1},${c+1}] ${cid} ${rgbStr} 投票:`, JSON.stringify(v.votes));
                    }
                }
            }
            // 统计有效格子数
            var valid = 0, total = autoResult.rows * autoResult.cols;
            for (var r = 0; r < autoResult.rows; r++)
                for (var c = 0; c < autoResult.cols; c++)
                    if (result.grid[r][c] >= 0) valid++;
            console.log(`  有效: ${valid}/${total}`);
        } catch (e) {
            console.log(`  [错误] 颜色识别失败: ${e.message}`);
        }

        // ========== 生成标记图片（带颜色分类标注） ==========
        await generateDebugImage(imagePath, metadata, autoResult, result ? result.grid : null);
    } else {
        console.log('❌ 自动检测失败');
        await generateDebugImage(imagePath, metadata, boardDetector._lastDetected || {});
    }

    // ========== 手动边界网格匹配 ==========
    if (manualBounds) {
        console.log(`\n========== 手动边界网格匹配 ==========`);
        console.log(`[信息] 使用坐标: (${manualBounds.boardLeft},${manualBounds.boardTop}) - (${manualBounds.boardRight},${manualBounds.boardBottom})`);
        var mw = manualBounds.boardRight - manualBounds.boardLeft;
        var mh = manualBounds.boardBottom - manualBounds.boardTop;
        console.log(`[信息] 区域: ${mw}×${mh}`);

        analyzeBoardColors(img, manualBounds);
        console.log('');
        diagnoseBoard(img, manualBounds);

        // 颜色建议模式
        if (doSuggest) {
            console.log('\n========== 颜色建议 ==========');
            suggestColors(img, manualBounds);
        }

        // 手动模式也跑颜色识别，用于图片标注
        var manualCellGrid = null;
        var manualRows = manualGrid ? manualGrid.rows : null;
        var manualCols = manualGrid ? manualGrid.cols : null;
        if (manualRows && manualCols) {
            console.log(`\n========== 手动网格颜色识别 ==========`);
            try {
                const recognizer = require('../recognizer.js');
                const manualResult = recognizer.classifyBoard(img, manualBounds, manualRows, manualCols);
                manualCellGrid = manualResult.grid;
                const colorNames = ['黄','红','紫','绿','蓝','浅绿'];
                for (var r = 0; r < manualRows; r++) {
                    var rowStr = '  行' + (r+1) + ': ';
                    for (var c = 0; c < manualCols; c++) {
                        var cid = manualResult.grid[r][c];
                        var name = cid >= 0 ? colorNames[cid] : '?';
                        rowStr += name + ' ';
                    }
                    console.log(rowStr);
                }
                var valid = 0, total = manualRows * manualCols;
                for (var r = 0; r < manualRows; r++)
                    for (var c = 0; c < manualCols; c++)
                        if (manualResult.grid[r][c] >= 0) valid++;
                console.log(`  有效: ${valid}/${total}`);
            } catch (e) {
                console.log(`  [错误] 颜色识别失败: ${e.message}`);
            }
        }

        // 用手动坐标生成另一张 debug 图（带颜色标注）
        var manualBoardInfo = {
            boardLeft: manualBounds.boardLeft,
            boardTop: manualBounds.boardTop,
            boardRight: manualBounds.boardRight,
            boardBottom: manualBounds.boardBottom
        };
        if (manualGrid) {
            manualBoardInfo.rows = manualGrid.rows;
            manualBoardInfo.cols = manualGrid.cols;
        }
        await generateDebugImage(imagePath, metadata, manualBoardInfo, manualCellGrid);
    }

    console.log('\n========== 完成 ==========');
}

// ============================================================
// 2b. 扩展诊断（当 boardDetector 找不到网格时）
// ============================================================

var REF_COLORS = require('../config.js').REF_COLORS;

function rgbDist(c1, c2) {
    var dr = c1[0] - c2[0], dg = c1[1] - c2[1], db = c1[2] - c2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

function intToRgb(c) {
    return [(c >> 16) & 0xFF, (c >> 8) & 0xFF, c & 0xFF];
}

function isBoardColor(rgb) {
    for (var i = 0; i < REF_COLORS.length; i++) {
        if (rgbDist(rgb, REF_COLORS[i].rgb) < 40) return true;
    }
    return false;
}

/**
 * 色彩分析：在检测区域内采样，统计实际像素颜色的分布
 * 帮助诊断为什么网格匹配失败
 */
function analyzeBoardColors(img, boardRect) {
    if (!boardRect || boardRect.boardLeft === undefined) {
        console.log('[色彩分析] 无棋盘区域信息');
        return;
    }

    var bl = boardRect.boardLeft, bt = boardRect.boardTop;
    var br = boardRect.boardRight, bb = boardRect.boardBottom;
    var bw = br - bl, bh = bb - bt;

    // 均匀采样棋盘区域
    var sampledColors = [];
    var step = 8;

    for (var y = bt; y <= bb; y += step) {
        for (var x = bl; x <= br; x += step) {
            var rgb = intToRgb(images.pixel(img, x, y));
            sampledColors.push(rgb);
        }
    }

    console.log(`[色彩分析] 棋盘区域采样 ${sampledColors.length} 个像素`);

    // 统计每个参考色的匹配度
    console.log(`[色彩分析] 参考色匹配情况（rgbDist < 40）:`);
    for (var i = 0; i < REF_COLORS.length; i++) {
        var ref = REF_COLORS[i];
        var matchCount = 0;
        var totalDists = 0;
        var minDist = Infinity, maxDist = 0;
        for (var s = 0; s < sampledColors.length; s++) {
            var d = rgbDist(sampledColors[s], ref.rgb);
            if (d < 40) matchCount++;
            if (d < minDist) minDist = d;
            if (d > maxDist) maxDist = d;
            totalDists += d;
        }
        var avgDist = totalDists / sampledColors.length;
        var pct = (matchCount / sampledColors.length * 100).toFixed(1);
        var bar = '';
        var barLen = Math.round(matchCount / sampledColors.length * 30);
        for (var b = 0; b < 30; b++) bar += b < barLen ? '█' : '░';
        console.log(`   ${ref.name}  ${bar}  ${pct}%  ` +
            `(dist min=${minDist.toFixed(0)} avg=${avgDist.toFixed(1)} max=${maxDist.toFixed(0)})`);
    }

    // 总命中率（任意参考色）
    var anyHit = 0;
    for (var s = 0; s < sampledColors.length; s++) {
        for (var i = 0; i < REF_COLORS.length; i++) {
            if (rgbDist(sampledColors[s], REF_COLORS[i].rgb) < 40) {
                anyHit++;
                break;
            }
        }
    }
    console.log(`[色彩分析] 任意参考色总命中率: ${(anyHit / sampledColors.length * 100).toFixed(1)}%`);

    // 查看区域边缘颜色（可能是误判的边框）
    console.log(`[色彩分析] 边缘色彩抽样（检查是否包含非棋盘区域）:`);
    var edgeSamples = [
        {label: '上边缘中', x: Math.floor((bl + br) / 2), y: bt},
        {label: '下边缘中', x: Math.floor((bl + br) / 2), y: bb},
        {label: '左边缘中', x: bl, y: Math.floor((bt + bb) / 2)},
        {label: '右边缘中', x: br, y: Math.floor((bt + bb) / 2)},
        {label: '中心', x: Math.floor((bl + br) / 2), y: Math.floor((bt + bb) / 2)}
    ];
    for (var e = 0; e < edgeSamples.length; e++) {
        var es = edgeSamples[e];
        var eRgb = intToRgb(images.pixel(img, es.x, es.y));
        var eMatch = false;
        for (var i = 0; i < REF_COLORS.length; i++) {
            if (rgbDist(eRgb, REF_COLORS[i].rgb) < 40) {
                eMatch = true;
                break;
            }
        }
        console.log(`   ${es.label} (${es.x},${es.y}): RGB(${eRgb[0]},${eRgb[1]},${eRgb[2]}) ${eMatch ? '✓匹配' : '✗不匹配'}`);
    }
}

/**
 * 颜色建议：从棋盘区域采样并聚类出 6 种主要颜色
 * 用 K-Means 自动找出实际游戏中的 6 种格子颜色
 */
function suggestColors(img, boardRect) {
    var bl = boardRect.boardLeft, bt = boardRect.boardTop;
    var br = boardRect.boardRight, bb = boardRect.boardBottom;
    var bw = br - bl, bh = bb - bt;

    // 1. 格点采样：按可能的格子中心位置采样（8×8 网格假设）
    //    而不是均匀扫所有像素，避免采到格子边框/背景
    var samples = [];
    var maxCols = 12, minCols = 6;
    var maxRows = 12, minRows = 6;

    for (var nc = minCols; nc <= maxCols; nc++) {
        for (var nr = minRows; nr <= maxRows; nr++) {
            var cellW = bw / nc, cellH = bh / nr;
            // 只尝试宽高比合理的网格
            var ratio = cellW / cellH;
            if (ratio < 0.8 || ratio > 3.5) continue;

            // 从每个格子的中心采样
            for (var r = 0; r < nr; r++) {
                for (var c = 0; c < nc; c++) {
                    var cx = Math.floor(bl + c * cellW + cellW / 2);
                    var cy = Math.floor(bt + r * cellH + cellH / 2);
                    if (cx >= bl && cx < br && cy >= bt && cy < bb) {
                        samples.push(intToRgb(images.pixel(img, cx, cy)));
                    }
                }
            }
        }
    }

    if (samples.length < 100) {
        console.log('[建议] 有效采样点不足（' + samples.length + '），退回到全区域采样');
        return suggestColorsFallback(img, boardRect);
    }

    console.log('[建议] 网格中心采样 ' + samples.length + ' 个像素');

    // 2. 过滤：跳过低饱和度（背景色）和太暗/太亮的像素
    function rgb2s(r, g, b) {
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var d = max - min;
        return max === 0 ? 0 : d / max;
    }

    var filtered = [];
    for (var s = 0; s < samples.length; s++) {
        var rgb = samples[s];
        var sat = rgb2s(rgb[0], rgb[1], rgb[2]);
        var bright = (rgb[0] + rgb[1] + rgb[2]) / 3;
        // 保留饱和度较高且亮度适中的像素（真正的格子颜色）
        if (sat > 0.20 && bright > 40 && bright < 230) {
            filtered.push(rgb);
        }
    }

    if (filtered.length < 60) {
        console.log('[建议] 过滤后仅剩 ' + filtered.length + ' 个点，用原始样本');
        filtered = samples;
    }

    console.log('[建议] 过滤背景后保留 ' + filtered.length + ' 个格子颜色像素');

    // 3. K-Means 聚类（k=8，然后过滤背景色，留 6 个）
    var K = 8;
    var maxIter = 50;

    // 初始化：选择彼此距离最远的 K 个点
    var centers = [];
    // 第一个随机选
    var idx = Math.floor(Math.random() * filtered.length);
    centers.push(filtered[idx].slice());
    // 后续选离已有中心最远的
    for (var k = 1; k < K; k++) {
        var bestD = -1, bestIdx = 0;
        for (var s = 0; s < filtered.length; s++) {
            var minD = Infinity;
            for (var j = 0; j < centers.length; j++) {
                var d = rgbDist(filtered[s], centers[j]);
                if (d < minD) minD = d;
            }
            if (minD > bestD) { bestD = minD; bestIdx = s; }
        }
        centers.push(filtered[bestIdx].slice());
    }

    // 迭代
    for (var iter = 0; iter < maxIter; iter++) {
        var assignments = [];
        for (var s = 0; s < filtered.length; s++) {
            var minD = Infinity, bestK = 0;
            for (var k = 0; k < K; k++) {
                var d = rgbDist(filtered[s], centers[k]);
                if (d < minD) { minD = d; bestK = k; }
            }
            assignments[s] = bestK;
        }

        var newCenters = [];
        var counts = [];
        for (var k = 0; k < K; k++) { newCenters[k] = [0, 0, 0]; counts[k] = 0; }

        for (var s = 0; s < filtered.length; s++) {
            var k = assignments[s];
            newCenters[k][0] += filtered[s][0];
            newCenters[k][1] += filtered[s][1];
            newCenters[k][2] += filtered[s][2];
            counts[k]++;
        }

        var moved = 0;
        for (var k = 0; k < K; k++) {
            if (counts[k] > 0) {
                newCenters[k][0] = Math.round(newCenters[k][0] / counts[k]);
                newCenters[k][1] = Math.round(newCenters[k][1] / counts[k]);
                newCenters[k][2] = Math.round(newCenters[k][2] / counts[k]);
                if (rgbDist(newCenters[k], centers[k]) > 1) moved++;
                centers[k] = newCenters[k];
            }
        }
        if (moved === 0) break;
    }

    // 4. 输出：按饱和度排序取前 6 个（排除低饱和度背景色）
    function calcSat(c) {
        var max = Math.max(c[0], c[1], c[2]), min = Math.min(c[0], c[1], c[2]);
        return max === 0 ? 0 : (max - min) / max;
    }

    var clusterInfo = [];
    for (var k = 0; k < K; k++) {
        clusterInfo.push({
            center: centers[k],
            count: counts[k] || 0,
            saturation: calcSat(centers[k])
        });
    }

    // 按饱和度排序（最鲜艳的排前面，背景色饱和度通常低）
    clusterInfo.sort(function (a, b) { return b.saturation - a.saturation; });

    // 打印全部簇（调试用）
    function calcHue(c) {
        var r = c[0]/255, g = c[1]/255, b = c[2]/255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var d = max - min;
        if (d < 0.02) return -1;
        var h;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = h * 60;
        if (h < 0) h += 360;
        return Math.round(h);
    }

    console.log('\n[建议 - 调试] 全部 ' + K + ' 个簇:');
    for (var k = 0; k < clusterInfo.length; k++) {
        var c = clusterInfo[k].center;
        var h = calcHue(c);
        var pct = (clusterInfo[k].count / filtered.length * 100).toFixed(1);
        var hex = '#' + c[0].toString(16).padStart(2, '0')
            + c[1].toString(16).padStart(2, '0')
            + c[2].toString(16).padStart(2, '0');
        var hStr = h >= 0 ? '色相' + h + '°' : '灰色';
        console.log('   ' + (k+1) + '. RGB(' + c[0] + ',' + c[1] + ',' + c[2] + ') ' + hex +
            ' 饱和' + (clusterInfo[k].saturation*100).toFixed(0) + '% ' + hStr +
            ' 占比' + pct + '%');
    }

    // 取前 6 个（排除背景色），按色相角去重
    var topColors = [];
    for (var k = 0; k < clusterInfo.length && topColors.length < 6; k++) {
        if (clusterInfo[k].count < filtered.length * 0.015) continue;
        if (clusterInfo[k].saturation < 0.35) continue; // 跳过低饱和度（背景色）
        var h = calcHue(clusterInfo[k].center);
        if (h < 0) continue; // 跳过灰色
        var duplicate = false;
        for (var t = 0; t < topColors.length; t++) {
            var h2 = calcHue(topColors[t].center);
            if (h2 >= 0 && Math.min(Math.abs(h - h2), 360 - Math.abs(h - h2)) < 20) {
                duplicate = true; break;
            }
        }
        if (!duplicate) topColors.push(clusterInfo[k]);
    }

    // 如果不够 6 个，从剩余簇中补充（降低饱和度阈值）
    if (topColors.length < 6) {
        for (var k = 0; k < clusterInfo.length && topColors.length < 6; k++) {
            if (clusterInfo[k].count < filtered.length * 0.008) continue;
            if (clusterInfo[k].saturation < 0.25) continue;
            var h = calcHue(clusterInfo[k].center);
            if (h < 0) continue;
            var duplicate = false;
            for (var t = 0; t < topColors.length; t++) {
                var h2 = calcHue(topColors[t].center);
                if (h2 >= 0 && Math.min(Math.abs(h - h2), 360 - Math.abs(h - h2)) < 25) {
                    duplicate = true; break;
                }
            }
            if (!duplicate) topColors.push(clusterInfo[k]);
        }
    }

    // 按亮度排序输出
    topColors.sort(function (a, b) {
        var ba = (a.center[0]*299 + a.center[1]*587 + a.center[2]*114) / 1000;
        var bb = (b.center[0]*299 + b.center[1]*587 + b.center[2]*114) / 1000;
        return bb - ba;
    });

    console.log('\n[建议] 提取的 ' + topColors.length + ' 种格子颜色（已过滤背景）:');
    console.log('');

    // 给颜色智能命名（根据色相）
    function hueName(r, g, b) {
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var d = max - min;
        if (d < 15) return '灰';
        var h;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
        if (h < 20) return '红';
        if (h < 45) return '橙';
        if (h < 70) return '黄';
        if (h < 160) return '绿';
        if (h < 200) return '青';
        if (h < 260) return '蓝';
        if (h < 310) return '紫';
        return '红';
    }

    console.log('// 复制以下内容到 config.js 的 REF_COLORS:\n');
    console.log('var REF_COLORS = [');
    for (var t = 0; t < topColors.length; t++) {
        var c = topColors[t].center;
        var sat = (calcSat(c) * 100).toFixed(0);
        var pct = (topColors[t].count / filtered.length * 100).toFixed(1);
        var hex = '#' + c[0].toString(16).padStart(2, '0')
            + c[1].toString(16).padStart(2, '0')
            + c[2].toString(16).padStart(2, '0');
        var name = hueName(c[0], c[1], c[2]);

        console.log('    { name: "' + name + '", rgb: [' +
            c[0] + ', ' + c[1] + ', ' + c[2] + '], id: ' + t + ' },  // ' +
            hex + ' 饱和' + sat + '% 占比' + pct + '%');
    }
    console.log('];');

    // 与现有参考色对比
    console.log('');
    console.log('[建议] 新颜色 vs 现有参考色:');
    for (var t = 0; t < topColors.length; t++) {
        var c = topColors[t].center;
        var bestMatch = -1, bestDist = Infinity;
        for (var i = 0; i < REF_COLORS.length; i++) {
            var d = rgbDist(c, REF_COLORS[i].rgb);
            if (d < bestDist) { bestDist = d; bestMatch = i; }
        }
        var matchStr = bestDist < 40 ? '✓匹配' : '✗不匹配';
        console.log('   ' + (t+1) + '. RGB(' + c[0] + ',' + c[1] + ',' + c[2] + ') → ' +
            REF_COLORS[bestMatch].name + ' (dist=' + bestDist.toFixed(0) + ') ' + matchStr);
    }
}

/**
 * 回退方案：全区域均匀采样
 */
function suggestColorsFallback(img, boardRect) {
    var bl = boardRect.boardLeft, bt = boardRect.boardTop;
    var br = boardRect.boardRight, bb = boardRect.boardBottom;
    var samples = [];
    var step = 6;

    for (var y = bt + 10; y <= bb - 10; y += step) {
        for (var x = bl + 10; x <= br - 10; x += step) {
            var rgb = intToRgb(images.pixel(img, x, y));
            var bright = (rgb[0] + rgb[1] + rgb[2]) / 3;
            if (bright > 30 && bright < 230) samples.push(rgb);
        }
    }

    console.log('[回退] 全区域采样 ' + samples.length + ' 个像素');

    // K-Means k=8，取饱和度最高的 6 个
    var K = 8;
    var centers = [];
    var idx = Math.floor(Math.random() * samples.length);
    centers.push(samples[idx].slice());
    for (var k = 1; k < K; k++) {
        var bestD = -1, bestIdx = 0;
        for (var s = 0; s < samples.length; s++) {
            var minD = Infinity;
            for (var j = 0; j < centers.length; j++) {
                var d = rgbDist(samples[s], centers[j]);
                if (d < minD) minD = d;
            }
            if (minD > bestD) { bestD = minD; bestIdx = s; }
        }
        centers.push(samples[bestIdx].slice());
    }

    for (var iter = 0; iter < 30; iter++) {
        var assignments = [];
        for (var s = 0; s < samples.length; s++) {
            var minD = Infinity, bestK = 0;
            for (var k = 0; k < K; k++) {
                var d = rgbDist(samples[s], centers[k]);
                if (d < minD) { minD = d; bestK = k; }
            }
            assignments[s] = bestK;
        }
        var newCenters = [], counts = [];
        for (var k = 0; k < K; k++) { newCenters[k] = [0, 0, 0]; counts[k] = 0; }
        for (var s = 0; s < samples.length; s++) {
            var k = assignments[s];
            newCenters[k][0] += samples[s][0];
            newCenters[k][1] += samples[s][1];
            newCenters[k][2] += samples[s][2];
            counts[k]++;
        }
        var moved = 0;
        for (var k = 0; k < K; k++) {
            if (counts[k] > 0) {
                newCenters[k][0] = Math.round(newCenters[k][0] / counts[k]);
                newCenters[k][1] = Math.round(newCenters[k][1] / counts[k]);
                newCenters[k][2] = Math.round(newCenters[k][2] / counts[k]);
                if (rgbDist(newCenters[k], centers[k]) > 1) moved++;
                centers[k] = newCenters[k];
            }
        }
        if (moved === 0) break;
    }

    function calcSat(c) {
        var max = Math.max(c[0], c[1], c[2]), min = Math.min(c[0], c[1], c[2]);
        return max === 0 ? 0 : (max - min) / max;
    }

    var clusterInfo = [];
    for (var k = 0; k < K; k++) {
        clusterInfo.push({ center: centers[k], count: counts[k] || 0, saturation: calcSat(centers[k]) });
    }
    clusterInfo.sort(function (a, b) { return b.saturation - a.saturation; });

    var top6 = [];
    for (var k = 0; k < clusterInfo.length && top6.length < 6; k++) {
        if (clusterInfo[k].count < samples.length * 0.02) continue;
        var isDuplicate = false;
        for (var t = 0; t < top6.length; t++) {
            if (rgbDist(clusterInfo[k].center, top6[t].center) < 25) { isDuplicate = true; break; }
        }
        if (!isDuplicate) top6.push(clusterInfo[k]);
    }

    console.log('\n[回退] 提取的 ' + top6.length + ' 种颜色:');
    console.log('');
    top6.sort(function (a, b) {
        var ba = (a.center[0]*299 + a.center[1]*587 + a.center[2]*114) / 1000;
        var bb = (b.center[0]*299 + b.center[1]*587 + b.center[2]*114) / 1000;
        return bb - ba;
    });

    console.log('var REF_COLORS = [');
    for (var t = 0; t < top6.length; t++) {
        var c = top6[t].center;
        var sat = (calcSat(c) * 100).toFixed(0);
        var pct = (top6[t].count / samples.length * 100).toFixed(1);
        var hex = '#' + c[0].toString(16).padStart(2, '0')
            + c[1].toString(16).padStart(2, '0')
            + c[2].toString(16).padStart(2, '0');
        console.log('    { name: "色' + t + '", rgb: [' +
            c[0] + ', ' + c[1] + ', ' + c[2] + '], id: ' + t + ' },  // ' +
            hex + ' 饱和' + sat + '% 占比' + pct + '%');
    }
    console.log('];');
}

/**
 * 扩展网格候选列表（比 boardDetector 的 COMMON_GRIDS 更多）
 */
var EXTENDED_GRIDS = [
    {rows: 8, cols: 8},
    {rows: 8, cols: 7},
    {rows: 7, cols: 8},
    {rows: 9, cols: 8},
    {rows: 8, cols: 9},
    {rows: 7, cols: 7},
    {rows: 6, cols: 8},
    {rows: 9, cols: 9},
    {rows: 10, cols: 8},
    {rows: 8, cols: 10},
    {rows: 10, cols: 10},
    {rows: 11, cols: 8},
    {rows: 8, cols: 11},
    {rows: 12, cols: 8},
    {rows: 6, cols: 7},
    {rows: 6, cols: 6},
    {rows: 5, cols: 6},
    {rows: 10, cols: 7}
];

/**
 * 扩展诊断：用宽松参数尝试所有可能网格
 */
function diagnoseBoard(img, boardRect) {
    if (!boardRect || boardRect.boardLeft === undefined) {
        console.log('[诊断] 没有可用的棋盘区域信息');
        return null;
    }

    var w = img.width, h = img.height;
    var boardLeft = boardRect.boardLeft;
    var boardTop = boardRect.boardTop;
    var boardRight = boardRect.boardRight;
    var boardBottom = boardRect.boardBottom;
    var boardW = boardRight - boardLeft;
    var boardH = boardBottom - boardTop;

    console.log(`[诊断] 棋盘区域: ${boardW}×${boardH}`);
    console.log(`[诊断] 尝试扩展网格列表（含 10~12 列）:`);

    var best = null;
    var bestScore = -1;

    for (var g = 0; g < EXTENDED_GRIDS.length; g++) {
        var cand = EXTENDED_GRIDS[g];
        var cellW = boardW / cand.cols;
        var cellH = boardH / cand.rows;

        // 比 boardDetector 更宽松的限制
        if (cellW < 15 || cellW > 160 || cellH < 15 || cellH > 160) continue;
        var ratio = cellW / cellH;
        if (ratio < 0.5 || ratio > 2.0) continue;

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
        var bar = '';
        var barLen = Math.round(score * 20);
        for (var b = 0; b < 20; b++) bar += b < barLen ? '█' : '░';

        console.log(`   ${cand.rows}×${cand.cols}  ` +
            `格 ${cellW.toFixed(0)}×${cellH.toFixed(0)}  ` +
            `${bar} ${(score * 100).toFixed(0)}%  (${hits}/${total})`);

        if (score > bestScore) {
            bestScore = score;
            best = {
                rows: cand.rows, cols: cand.cols,
                cellW: cellW, cellH: cellH,
                confidence: score
            };
        }
    }

    if (best && bestScore > 0.2) {
        console.log(`\n[诊断] ✓ 最佳匹配: ${best.rows}×${best.cols}  ` +
            `(格 ${best.cellW.toFixed(0)}×${best.cellH.toFixed(0)})  ` +
            `置信度 ${(best.confidence * 100).toFixed(0)}%`);
        return best;
    }

    console.log(`\n[诊断] ⚠ 所有网格置信度均低于 20%`);
    return null;
}

// ============================================================
// 3. 生成标记图片
// ============================================================

async function generateDebugImage(imagePath, metadata, boardInfo, cellGrid) {
    console.log(`\n[信息] 生成标记图片: debug_board.jpg ...`);

    const rgbaBuffer = await sharp(imagePath)
        .ensureAlpha()
        .raw()
        .toBuffer();

    const debugImg = {
        width: metadata.width,
        height: metadata.height,
        _data: rgbaBuffer,
        _channels: 4
    };

    const { boardLeft, boardTop, boardRight, boardBottom, rows, cols } = boardInfo;

    // 颜色分类中文名
    const colorNames = ['黄','红','紫','绿','蓝','浅绿'];

    // 原始图片 RGB 数据（用于 alpha blending）
    const origRaw = await sharp(imagePath).raw().toBuffer();
    const origMeta = await sharp(imagePath).metadata();
    const origCh = origMeta.channels || 3;

    if (boardLeft !== undefined) {
        // 棋盘外框（红色不透明）
        drawRect(debugImg, boardLeft, boardTop, boardRight, boardBottom, [255, 0, 0]);

        if (rows && cols) {
            const cellW = (boardRight - boardLeft) / cols;
            const cellH = (boardBottom - boardTop) / rows;

            // 半透明网格线：青色 40% 与原始图混合
            const gridAlpha = 0.40;
            for (let r = 1; r < rows; r++) {
                const yy = Math.floor(boardTop + r * cellH);
                drawHLineBlend(debugImg, origRaw, origCh, boardLeft, boardRight, yy, [0, 255, 255], gridAlpha);
            }
            for (let c = 1; c < cols; c++) {
                const xx = Math.floor(boardLeft + c * cellW);
                drawVLineBlend(debugImg, origRaw, origCh, xx, boardTop, boardBottom, [0, 255, 255], gridAlpha);
            }
        } else {
            // 没有网格信息，在框内标文字
            const label = 'Board Area';
            const labelY = Math.floor((boardTop + boardBottom) / 2);
            const labelX = Math.floor((boardLeft + boardRight) / 2) - 40;
            for (let i = 0; i < label.length; i++) {
                const cx = labelX + i * 14;
                drawDot(debugImg, cx, labelY, 4, [255, 255, 0]);
            }
        }
    } else {
        console.log('[信息] 无检测结果可绘制，仅输出原始图');
    }

    // 构建 SVG 中文文字标注（用 sharp composite 合成）
    let svgTexts = '';
    if (boardLeft !== undefined && rows && cols && cellGrid) {
        const cellW = (boardRight - boardLeft) / cols;
        const cellH = (boardBottom - boardTop) / rows;
        const fontSize = Math.max(14, Math.min(Math.floor(Math.min(cellW, cellH) * 0.35), 36));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let classId = (cellGrid[r] && cellGrid[r][c] !== undefined && cellGrid[r][c] >= 0)
                    ? cellGrid[r][c] : -1;
                let label = classId >= 0 ? colorNames[classId] : '?';
                let cx = Math.floor(boardLeft + c * cellW + cellW / 2);
                let cy = Math.floor(boardTop  + r * cellH + cellH / 2);
                // 白色文字 + 黑色粗描边，任何底色都清晰
                svgTexts += `<text x="${cx}" y="${cy}" font-size="${fontSize}"
                    font-family="Microsoft YaHei, SimHei, sans-serif"
                    fill="white" stroke="black" stroke-width="3"
                    text-anchor="middle" dominant-baseline="central"
                    font-weight="bold">${label}</text>`;
            }
        }
    }

    // 合成 SVG 文字到图片
    var svg = `<svg width="${metadata.width}" height="${metadata.height}"
        xmlns="http://www.w3.org/2000/svg">${svgTexts}</svg>`;

    await sharp(debugImg._data, {
        raw: { width: debugImg.width, height: debugImg.height, channels: 4 }
    })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toFile(path.join(__dirname, 'debug_board.jpg'));

    console.log(`[信息] 标记图片已保存: test/debug_board.jpg`);
}

// ============================================================
// 带 Alpha Blending 的线条绘制
// （JPEG 不支持 alpha 通道，需手动混合颜色）
// ============================================================

/**
 * 在 RGBA buffer 上画半透明水平线（与原始图 alpha blend）
 */
function drawHLineBlend(img, origRaw, origCh, x1, x2, y, color, alpha) {
    for (let x = Math.max(0, x1); x <= Math.min(x2, img.width - 1); x++) {
        const idx = (y * img.width + x) * 4;
        const oIdx = (y * img.width + x) * origCh;
        // 与原始像素 alpha 混合
        img._data[idx]     = Math.round(color[0] * alpha + origRaw[oIdx] * (1 - alpha));
        img._data[idx + 1] = Math.round(color[1] * alpha + origRaw[oIdx + 1] * (1 - alpha));
        img._data[idx + 2] = Math.round(color[2] * alpha + origRaw[oIdx + 2] * (1 - alpha));
        img._data[idx + 3] = 255;
    }
}

/**
 * 在 RGBA buffer 上画半透明垂直线（与原始图 alpha blend）
 */
function drawVLineBlend(img, origRaw, origCh, x, y1, y2, color, alpha) {
    for (let y = Math.max(0, y1); y <= Math.min(y2, img.height - 1); y++) {
        const idx = (y * img.width + x) * 4;
        const oIdx = (y * img.width + x) * origCh;
        img._data[idx]     = Math.round(color[0] * alpha + origRaw[oIdx] * (1 - alpha));
        img._data[idx + 1] = Math.round(color[1] * alpha + origRaw[oIdx + 1] * (1 - alpha));
        img._data[idx + 2] = Math.round(color[2] * alpha + origRaw[oIdx + 2] * (1 - alpha));
        img._data[idx + 3] = 255;
    }
}

/**
 * 在 RGBA buffer 上画半透明矩形边框（与原始图 alpha blend）
 */
function drawRectBlend(img, origRaw, origCh, left, top, right, bottom, color, alpha) {
    drawHLineBlend(img, origRaw, origCh, left, right, top, color, alpha);
    drawHLineBlend(img, origRaw, origCh, left, right, bottom, color, alpha);
    drawVLineBlend(img, origRaw, origCh, left, top, bottom, color, alpha);
    drawVLineBlend(img, origRaw, origCh, right, top, bottom, color, alpha);
}



// ============================================================
// 像素绘制工具
// ============================================================

/** 在 RGBA buffer 上画一个点 */
function drawDot(img, cx, cy, radius, color) {
    const r = color[0], g = color[1], b = color[2], a = color.length > 3 ? color[3] : 255;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > radius * radius) continue;
            const px = cx + dx;
            const py = cy + dy;
            if (px < 0 || px >= img.width || py < 0 || py >= img.height) continue;
            const idx = (py * img.width + px) * 4;
            img._data[idx]     = r;
            img._data[idx + 1] = g;
            img._data[idx + 2] = b;
            img._data[idx + 3] = a;
        }
    }
}

/** 画水平线 */
function drawHLine(img, x1, x2, y, color) {
    for (let x = Math.max(0, x1); x <= Math.min(x2, img.width - 1); x++) {
        const idx = (y * img.width + x) * 4;
        img._data[idx]     = color[0];
        img._data[idx + 1] = color[1];
        img._data[idx + 2] = color[2];
        if (color.length > 3) img._data[idx + 3] = color[3];
    }
}

/** 画垂直线 */
function drawVLine(img, x, y1, y2, color) {
    for (let y = Math.max(0, y1); y <= Math.min(y2, img.height - 1); y++) {
        const idx = (y * img.width + x) * 4;
        img._data[idx]     = color[0];
        img._data[idx + 1] = color[1];
        img._data[idx + 2] = color[2];
        if (color.length > 3) img._data[idx + 3] = color[3];
    }
}

/** 画矩形边框 */
function drawRect(img, left, top, right, bottom, color) {
    drawHLine(img, left, right, top, color);
    drawHLine(img, left, right, bottom, color);
    drawVLine(img, left, top, bottom, color);
    drawVLine(img, right, top, bottom, color);
}

// ============================================================
// 启动
// ============================================================

main().catch(err => {
    console.error('[错误]', err.message);
    console.error(err.stack);
    process.exit(1);
});