// ============================================================
// gesture.js - 手势执行、特殊道具检测
// 依赖: config.js, matcher.js
// ============================================================

var _config    = require('./config.js')._config;
var SPECIAL_NONE = require('./config.js').SPECIAL_NONE;
var SPECIAL_VERT_STRIPE = require('./config.js').SPECIAL_VERT_STRIPE;
var SPECIAL_MUSHROOM = require('./config.js').SPECIAL_MUSHROOM;
var rgb2hsv = require('./matcher.js').rgb2hsv;

// ============================================================
// 坐标转换
// ============================================================

function gridToScreen(row, col, boardRect) {
    boardRect = boardRect || _config;
    var cellW = (boardRect.boardRight - boardRect.boardLeft) / _config.cols;
    var cellH = (boardRect.boardBottom - boardRect.boardTop) / _config.rows;

    return {
        x: Math.floor(boardRect.boardLeft + col * cellW + cellW / 2),
        y: Math.floor(boardRect.boardTop  + row * cellH + cellH / 2)
    };
}

// ============================================================
// 执行交换
// ============================================================

/**
 * 执行一次交换操作（手指滑动从格子1到格子2）
 */
function executeMove(move, boardRect) {
    boardRect = boardRect || _config;
    if (!move) return false;

    var p1 = gridToScreen(move.r1, move.c1, boardRect);
    var p2 = gridToScreen(move.r2, move.c2, boardRect);

    var cellW = (boardRect.boardRight - boardRect.boardLeft) / _config.cols;
    var cellH = (boardRect.boardBottom - boardRect.boardTop) / _config.rows;
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    var extend = 0.5;
    if (dx !== 0) {
        p2.x += dx > 0 ? Math.floor(cellW * extend) : -Math.floor(cellW * extend);
    }
    if (dy !== 0) {
        p2.y += dy > 0 ? Math.floor(cellH * extend) : -Math.floor(cellH * extend);
    }

    var scrW = device.width, scrH = device.height;
    function clampPt(pt) {
        pt.x = Math.max(2, Math.min(pt.x, scrW - 2));
        pt.y = Math.max(2, Math.min(pt.y, scrH - 2));
    }
    clampPt(p1);
    clampPt(p2);

    log("执行交换: (%d,%d) → (%d,%d)", move.r1, move.c1, move.r2, move.c2);

    var pointCount = 4;
    var gesturePoints = [];
    var arcDir = Math.random() > 0.5 ? 1 : -1;
    for (var i = 1; i <= pointCount; i++) {
        var ratio = i / pointCount;
        var gx = Math.floor(p1.x + (p2.x - p1.x) * ratio);
        var gy = Math.floor(p1.y + (p2.y - p1.y) * ratio);
        if (ratio > 0.2 && ratio < 0.8) {
            if (Math.abs(dx) > Math.abs(dy)) {
                gy += arcDir * randInt(3, 8);
            } else {
                gx += arcDir * randInt(3, 8);
            }
        }
        gx += randInt(-3, 3);
        gy += randInt(-3, 3);
        gx = Math.max(2, Math.min(gx, scrW - 2));
        gy = Math.max(2, Math.min(gy, scrH - 2));
        gesturePoints.push([gx, gy]);
    }

    var dur = randInt(200, 350);
    gesture.apply(null, [dur].concat(gesturePoints));

    randomSleep(_config.animWaitBase, 0.3, _config.animWaitBase);

    return true;
}

// ============================================================
// 特殊道具检测
// ============================================================

/**
 * 检测单个单元格是否为特殊道具
 */
function detectSpecialInCell(img, cx, cy, cellW, cellH) {
    var imgW = img.width, imgH = img.height;

    // 检测 1：垂直多色条纹
    var hueSet = {};
    var sampleStep = Math.max(1, Math.floor(cellW / 12));
    var minHueDist = 25;
    var prevHue = -999;

    for (var x = -Math.floor(cellW * 0.4); x <= Math.floor(cellW * 0.4); x += sampleStep) {
        var px = Math.max(1, Math.min(cx + x, imgW - 2));
        var py = Math.max(1, Math.min(cy, imgH - 2));
        var pixel = images.pixel(img, px, py);
        var r = (pixel >> 16) & 0xFF;
        var g = (pixel >> 8) & 0xFF;
        var b = pixel & 0xFF;
        var hsv = rgb2hsv(r, g, b);

        if (hsv.s > 0.35 && hsv.v > 0.4) {
            var hueBucket = Math.round(hsv.h / 10) * 10;
            if (hueBucket >= 360) hueBucket = 0;

            var dh = Math.abs(hueBucket - prevHue);
            if (dh > 180) dh = 360 - dh;
            if (dh >= minHueDist) {
                if (hueBucket === 350) hueBucket = 0;
                hueSet[String(hueBucket)] = true;
                prevHue = hueBucket;
            }
        }
    }

    var hueCount = 0;
    for (var k in hueSet) { if (hueSet.hasOwnProperty(k)) hueCount++; }

    if (hueCount >= 3) return SPECIAL_VERT_STRIPE;

    // 检测 2：蘑菇形轮廓
    function measureWidthAtY(sampleY) {
        sampleY = Math.max(1, Math.min(sampleY, imgH - 2));
        var findEdge = function(startX, dir) {
            var x = startX;
            var maxStep = Math.floor(cellW * 0.55);
            while (Math.abs(x - cx) < maxStep) {
                var xx = Math.max(1, Math.min(x, imgW - 2));
                var c = images.pixel(img, xx, sampleY);
                var cr = (c >> 16) & 0xFF, cg = (c >> 8) & 0xFF, cb = c & 0xFF;
                var h = rgb2hsv(cr, cg, cb);
                if (h.s < 0.12 || h.v < 0.18) {
                    return dir > 0 ? x - 2 : x + 2;
                }
                x += dir * 2;
            }
            return dir > 0 ? cx + Math.floor(cellW * 0.4) : cx - Math.floor(cellW * 0.4);
        };
        var le = findEdge(cx, -1);
        var re = findEdge(cx, 1);
        return { left: le, right: re, width: Math.abs(re - le) };
    }

    var wTop = measureWidthAtY(cy - Math.floor(cellH * 0.30));
    var wMid = measureWidthAtY(cy);
    var wBot = measureWidthAtY(cy + Math.floor(cellH * 0.30));

    if (wMid.width > 0 && wTop.width > wMid.width * 1.15 && wBot.width >= wMid.width * 0.9) {
        return SPECIAL_MUSHROOM;
    }

    return SPECIAL_NONE;
}

/**
 * 扫描整个棋盘，返回所有特殊道具的位置列表
 *
 * 注意：特殊道具检测算法目前识别准确率不足，已禁用
 * （始终返回空数组，跳过特殊道具处理）
 */
function scanSpecialItems(img, boardRect) {
    // [禁用] 特殊道具检测算法识别过于宽泛，暂时屏蔽
    return [];
}

/**
 * 双击格子（激活特殊道具）
 */
function doubleClickCell(row, col, boardRect) {
    boardRect = boardRect || _config;
    var p = gridToScreen(row, col, boardRect);
    var scrW = device.width, scrH = device.height;
    var cx = Math.max(2, Math.min(p.x, scrW - 2));
    var cy = Math.max(2, Math.min(p.y, scrH - 2));

    log("双击特殊道具: (%d,%d) 位置 (%d,%d)", row, col, cx, cy);

    click(cx, cy);
    sleep(randInt(80, 150));
    click(cx, cy);

    randomSleep(1200, null, 1200);
}

// ============================================================
// 辅助
// ============================================================

/**
 * 随机等待（基值 + 随机范围）
 */
function randomSleep(base, range) {
    var ms = base + Math.floor(Math.random() * range);
    sleep(ms);
}

/**
 * 随机整数 [min, max]
 */
function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

module.exports = {
    executeMove: executeMove,
    scanSpecialItems: scanSpecialItems,
    doubleClickCell: doubleClickCell,
    gridToScreen: gridToScreen,
    randomSleep: randomSleep,
    randInt: randInt
};