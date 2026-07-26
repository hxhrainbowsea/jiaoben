// ============================================================
// test_board_detection.js - 消消乐棋盘检测 v4
//
// Plan A: 自动网格周期性检测
// Plan B: 交互式两点校准（浮窗按钮版）
// Plan C: 智能暴力消除
//
// 操作方式：浮窗三个大按钮，点哪个跑哪个
// ============================================================

"auto";

// ---- 请求截图权限 ----
log("正在请求截图权限...");
sleep(500);
if (!requestScreenCapture()) {
    sleep(1000);
    if (!requestScreenCapture()) {
        log("❌ 请求截图权限失败");
        exit();
    }
}
log("✅ 截图权限已获取");

// ============================================================
// Plan A: 自动检测（基于网格周期性）
// ============================================================

function computeRowGradients(img) {
    var w = img.width, h = img.height;
    var rowGradients = [];
    var step = 2;
    for (var y = 0; y < h; y++) {
        var grad = [];
        for (var x = 0; x < w - step; x += step) {
            var c1 = images.pixel(img, x, y);
            var c2 = images.pixel(img, x + step, y);
            var r1 = (c1 >> 16) & 0xFF, g1 = (c1 >> 8) & 0xFF, b1 = c1 & 0xFF;
            var r2 = (c2 >> 16) & 0xFF, g2 = (c2 >> 8) & 0xFF, b2 = c2 & 0xFF;
            grad.push(Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2));
        }
        rowGradients.push(grad);
    }
    return rowGradients;
}

function computeColGradients(img) {
    var w = img.width, h = img.height;
    var colGradients = [];
    var step = 2;
    for (var x = 0; x < w; x++) {
        var grad = [];
        for (var y = 0; y < h - step; y += step) {
            var c1 = images.pixel(img, x, y);
            var c2 = images.pixel(img, x, y + step);
            var r1 = (c1 >> 16) & 0xFF, g1 = (c1 >> 8) & 0xFF, b1 = c1 & 0xFF;
            var r2 = (c2 >> 16) & 0xFF, g2 = (c2 >> 8) & 0xFF, b2 = c2 & 0xFF;
            grad.push(Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2));
        }
        colGradients.push(grad);
    }
    return colGradients;
}

function assessPeriodicity(signal, period) {
    var n = signal.length;
    if (n <= period * 2) return 0;
    var sum = 0;
    for (var i = 0; i < n; i++) sum += signal[i];
    var mean = sum / n;
    var centered = [];
    for (var i = 0; i < n; i++) centered.push(signal[i] - mean);
    var autoCorr = 0;
    for (var i = 0; i < n - period; i++) autoCorr += centered[i] * centered[i + period];
    autoCorr = Math.abs(autoCorr);
    var halfPeriod = Math.floor(period / 2);
    var halfCorr = 0;
    if (halfPeriod > 5) {
        for (var i = 0; i < n - halfPeriod; i++) halfCorr += centered[i] * centered[i + halfPeriod];
        halfCorr = Math.abs(halfCorr);
    }
    var energy = 0;
    for (var i = 0; i < n; i++) energy += centered[i] * centered[i];
    if (energy < 1) return 0;
    return autoCorr / energy - halfCorr / energy * 0.3;
}

function scoreRowsByPeriodicity(rowGradients, period) {
    var scores = [];
    for (var y = 0; y < rowGradients.length; y++) scores.push(assessPeriodicity(rowGradients[y], period));
    return scores;
}

function scoreColsByPeriodicity(colGradients, period) {
    var scores = [];
    for (var x = 0; x < colGradients.length; x++) scores.push(assessPeriodicity(colGradients[x], period));
    return scores;
}

function detectBoardAuto() {
    log("\n===== [Plan A] 网格周期性自动检测 =====");
    var start = new Date().getTime();
    var img = captureScreen();
    if (!img) { log("❌ 截图失败"); return null; }
    var w = img.width, h = img.height;
    log("设备: " + w + "x" + h);

    log("[1/5] 计算梯度...");
    var rowGrad = computeRowGradients(img);

    log("[2/5] 扫描最佳 tileWidth...");
    var yStart = Math.floor(h * 0.30), yEnd = Math.floor(h * 0.65);
    var bestTileW = 0, bestTileWScore = 0, rowPeriodicityScores = null;

    function evaluateTileW(tileW) {
        var period = Math.floor(tileW / 2);
        if (period < 4) return 0;
        var sumScore = 0, count = 0;
        for (var y = yStart; y < yEnd && y < rowGrad.length; y++) {
            if (rowGrad[y].length > period * 2) { sumScore += assessPeriodicity(rowGrad[y], period); count++; }
        }
        return count > 0 ? sumScore / count : 0;
    }

    var candidates = [];
    for (var tw = 55; tw <= 140; tw += 3) candidates.push({ tw: tw, score: evaluateTileW(tw) });
    candidates.sort(function(a, b) { return b.score - a.score; });
    var topCandidates = candidates.slice(0, 3);
    bestTileW = topCandidates[0].tw; bestTileWScore = topCandidates[0].score;

    if (bestTileW > 0) {
        var fineCandidates = [];
        for (var tw = bestTileW - 4; tw <= bestTileW + 4; tw++) {
            if (tw < 50 || tw > 150) continue;
            fineCandidates.push({ tw: tw, score: evaluateTileW(tw) });
        }
        fineCandidates.sort(function(a, b) { return b.score - a.score; });
        bestTileW = fineCandidates[0].tw; bestTileWScore = fineCandidates[0].score;
    }

    log("      tileWidth = " + bestTileW + "px score=" + bestTileWScore.toFixed(3));

    log("[3/5] 定位棋盘行范围...");
    var rowPeriod = Math.floor(bestTileW / 2);
    rowPeriodicityScores = scoreRowsByPeriodicity(rowGrad, rowPeriod);
    var maxScore = 0;
    for (var i = 0; i < rowPeriodicityScores.length; i++) if (rowPeriodicityScores[i] > maxScore) maxScore = rowPeriodicityScores[i];
    var threshold = maxScore * 0.40;
    var boardRows = [];
    var inBoard = false, rowStart = 0;
    for (var y = 0; y < rowPeriodicityScores.length; y++) {
        if (rowPeriodicityScores[y] > threshold) {
            if (!inBoard) { rowStart = y; inBoard = true; }
        } else {
            if (inBoard) { boardRows.push({ start: rowStart, end: y - 1, len: y - rowStart }); inBoard = false; }
        }
    }
    if (inBoard) boardRows.push({ start: rowStart, end: rowPeriodicityScores.length - 1, len: rowPeriodicityScores.length - rowStart });
    boardRows.sort(function(a, b) { return b.len - a.len; });
    if (boardRows.length === 0) { log("❌ 找不到周期性行区域"); img.recycle(); return null; }
    var bestRowRegion = boardRows[0];
    var boardTop = bestRowRegion.start, boardBottom = bestRowRegion.end;
    log("      行范围: " + boardTop + "~" + boardBottom);

    log("[4/5] 计算 tileHeight...");
    var colGrad = computeColGradients(img);
    function evaluateTileH(tileH) {
        var period = Math.floor(tileH / 2);
        if (period < 4) return 0;
        var sumScore = 0, count = 0;
        var xStart = Math.floor(w * 0.15), xEnd = Math.floor(w * 0.85);
        for (var x = xStart; x < xEnd && x < colGrad.length; x++) {
            if (colGrad[x].length > period * 2) { sumScore += assessPeriodicity(colGrad[x], period); count++; }
        }
        return count > 0 ? sumScore / count : 0;
    }
    var hCandidates = [];
    for (var th = 50; th <= 140; th += 3) hCandidates.push({ th: th, score: evaluateTileH(th) });
    hCandidates.sort(function(a, b) { return b.score - a.score; });
    var bestTileH = hCandidates.length > 0 ? hCandidates[0].th : bestTileW;
    log("      tileHeight = " + bestTileH + "px");

    log("[5/5] 推算棋盘区域...");
    var tileW = bestTileW, tileH = bestTileH || bestTileW;
    var centerY = boardTop + Math.floor((boardBottom - boardTop + 1) / 2);
    var estRows = Math.round((boardBottom - boardTop + 1) / tileH);
    if (estRows < 5) estRows = 8;
    var boardTopFinal = centerY - Math.floor(estRows * tileH / 2);
    var boardBottomFinal = centerY + Math.ceil(estRows * tileH / 2);

    var colPeriod = Math.floor(tileH / 2);
    var colPeriodicityScores = scoreColsByPeriodicity(colGrad, colPeriod);
    var maxColScore = 0;
    for (var i = 0; i < colPeriodicityScores.length; i++) if (colPeriodicityScores[i] > maxColScore) maxColScore = colPeriodicityScores[i];
    var colThreshold = maxColScore * 0.35;
    var colRegions = []; inBoard = false; colStart = 0;
    for (var x = 0; x < colPeriodicityScores.length; x++) {
        if (colPeriodicityScores[x] > colThreshold) {
            if (!inBoard) { colStart = x; inBoard = true; }
        } else {
            if (inBoard) { colRegions.push({ start: colStart, end: x - 1, len: x - colStart }); inBoard = false; }
        }
    }
    if (inBoard) colRegions.push({ start: colStart, end: colPeriodicityScores.length - 1, len: colPeriodicityScores.length - colStart });
    colRegions.sort(function(a, b) { return b.len - a.len; });
    var boardLeftFinal = Math.floor(w * 0.05), boardRightFinal = Math.floor(w * 0.95);
    if (colRegions.length > 0) { boardLeftFinal = colRegions[0].start; boardRightFinal = colRegions[0].end; }
    var cols = Math.round((boardRightFinal - boardLeftFinal) / tileW);
    if (cols < 6) cols = 8; if (cols > 10) cols = 8;
    boardRightFinal = boardLeftFinal + cols * tileW;
    boardBottomFinal = boardTopFinal + estRows * tileH;
    if (boardLeftFinal < 0) boardLeftFinal = 0;
    if (boardTopFinal < 0) boardTopFinal = 0;
    if (boardRightFinal > w) boardRightFinal = w;
    if (boardBottomFinal > h) boardBottomFinal = h;

    var result = {
        left: boardLeftFinal, top: boardTopFinal,
        right: boardRightFinal, bottom: boardBottomFinal,
        rows: estRows, cols: cols,
        tileW: tileW, tileH: tileH,
        autoScore: bestTileWScore, method: "auto"
    };

    log("      棋盘: [" + result.left + "," + result.top + "," + result.right + "," + result.bottom + "]");
    log("      网格: " + result.rows + "x" + result.cols + " tile=" + result.tileW + "x" + result.tileH);
    log("⏱ 用时: " + (new Date().getTime() - start) + "ms");

    saveBoardDebugImage(img, result);
    img.recycle();
    return result;
}

// ============================================================
// Plan B: 交互式两点校准（浮窗点击版）
// ============================================================

function calibrateBoardInteractive() {
    log("\n===== [Plan B] 交互式校准（拖动十字定位）=====");

    var w = device.width, h = device.height;
    var pos1 = null, pos2 = null;
    var step = 1;
    var finished = false;

    // ===== 全局退出开关：按音量-强制退出 =====
    var volExitRegistered = false;
    try {
        events.observeKey();
        events.onKeyDown("volume_down", function () {
            log("⚠ 音量-被按下，强制退出校准");
            finished = true;
        });
        volExitRegistered = true;
    } catch(e) {
        log("音量键监听注册失败（可能已占用），跳过");
    }

    // 十字线半长 = 屏幕短边 7%
    var crossSize = Math.floor(Math.min(w, h) * 0.07);
    var CROSS_THICK = 6;
    var TOUCH_RADIUS = Math.round(Math.min(w, h) * 0.09);

    // 准星1：屏幕中心左上方
    var INIT_CX1 = Math.floor(w * 0.35), INIT_CY1 = Math.floor(h * 0.35);
    // 准星2：屏幕中心右下方
    var INIT_CX2 = Math.floor(w * 0.65), INIT_CY2 = Math.floor(h * 0.65);
    var cx1 = INIT_CX1, cy1 = INIT_CY1;
    var cx2 = INIT_CX2, cy2 = INIT_CY2;

    var isDragging = false;
    var dragTarget = null;
    var dragOffsetX = 0, dragOffsetY = 0;

    // 用 rawWindow，vertical 布局 + button 放底部（由布局管理器渲染，文字一定完整）
    var win = floaty.rawWindow(
        <vertical bg="#33000000" w="*" h="*">
            <text id="titleText"
                  text="← 拖动红色十字对准棋盘左上角 →"
                  textSize="16sp" textColor="#ffffff" bg="#000000"
                  gravity="center" w="*"/>
            <text id="subText" text="对准后点确定"
                  textSize="13sp" textColor="#ff0000"
                  gravity="center" w="*"/>

            <frame id="canvasLayer" layout_weight="1" w="*" h="*" marginBottom="44px">
            <frame id="cross1H" bg="#ffff4444" w="220px" h="6px"/>
            <frame id="cross1V" bg="#ffff4444" w="6px" h="220px"/>
            <frame id="cross1Dot" bg="#ffff4444" w="20px" h="20px"/>
            <text id="cross1Label" text="左上角" textSize="15sp"
                  textColor="#ffff4444"/>

            <frame id="cross2H" bg="#ff4488ff" w="220px" h="6px" visible="false"/>
            <frame id="cross2V" bg="#ff4488ff" w="6px" h="220px" visible="false"/>
            <frame id="cross2Dot" bg="#ff4488ff" w="20px" h="20px" visible="false"/>
            <text id="cross2Label" text="右下角" textSize="15sp"
                  textColor="#ff4488ff" visible="false"/>
        </frame>

    <!-- 按钮栏贴底，自然覆盖在画布上方 -->
    <vertical w="*" gravity="center" padding="16 8 16 24" bg="#dd222222"
                      layout_gravity="bottom">
                <button id="btnOk" text="确定" textSize="20sp"
                        textColor="#ffffff" bg="#cc4CAF50"
                        w="*" h="56px" margin="0" />
                <button id="btnCancel" text="取消" textSize="16sp"
                        textColor="#cccccc" bg="#aa333333"
                        w="*" h="48px" margin="6 0 0 0" />
            </vertical>
        </vertical>
    );
    win.setPosition(0, 0);
    win.setSize(w, h);

    var canvasLayer = win.canvasLayer;
    var cross1H = win.cross1H, cross1V = win.cross1V, cross1Dot = win.cross1Dot, cross1Label = win.cross1Label;
    var cross2H = win.cross2H, cross2V = win.cross2V, cross2Dot = win.cross2Dot, cross2Label = win.cross2Label;
    var btnOk = win.btnOk, btnCancel = win.btnCancel;

    var CANVAS_OFFSET_Y = 56 + 36;

    function updateCross1(sx, sy) {
        var ly = sy - CANVAS_OFFSET_Y;
        cross1H.setX(sx - crossSize); cross1H.setY(ly - CROSS_THICK / 2);
        cross1V.setX(sx - CROSS_THICK / 2); cross1V.setY(ly - crossSize);
        cross1Dot.setX(sx - 10); cross1Dot.setY(ly - 10);
        cross1Label.setX(sx + crossSize + 10); cross1Label.setY(ly - 10);
    }

    function updateCross2(sx, sy) {
        var ly = sy - CANVAS_OFFSET_Y;
        cross2H.setX(sx - crossSize); cross2H.setY(ly - CROSS_THICK / 2);
        cross2V.setX(sx - CROSS_THICK / 2); cross2V.setY(ly - crossSize);
        cross2Dot.setX(sx - 10); cross2Dot.setY(ly - 10);
        cross2Label.setX(sx + crossSize + 10); cross2Label.setY(ly - 10);
    }

    // 延迟初始化十字线位置
    setTimeout(function () {
        ui.run(function () { updateCross1(cx1, cy1); });

        var btnBar = btnOk.getParent(); // 获取按钮栏容器
        var barHeight = btnBar.getHeight();
        var targetY = win.canvasLayer.getBottom() - barHeight + 44; // 上移44px
        btnBar.setY(targetY);

    }, 300);

    // canvasLayer 触摸拖动
    canvasLayer.setOnTouchListener(function (view, event) {
        var action = event.getAction();
        var ex = Math.round(event.getX());
        var ey = Math.round(event.getY()) + CANVAS_OFFSET_Y;

        if (action === event.ACTION_DOWN) {
            var d1 = Math.sqrt((ex - cx1) * (ex - cx1) + (ey - cy1) * (ey - cy1));
            if (d1 < TOUCH_RADIUS) {
                isDragging = true; dragTarget = "cross1";
                dragOffsetX = ex - cx1; dragOffsetY = ey - cy1;
                return true;
            }
            if (step === 2) {
                var d2 = Math.sqrt((ex - cx2) * (ex - cx2) + (ey - cy2) * (ey - cy2));
                if (d2 < TOUCH_RADIUS) {
                    isDragging = true; dragTarget = "cross2";
                    dragOffsetX = ex - cx2; dragOffsetY = ey - cy2;
                    return true;
                }
            }
        } else if (action === event.ACTION_MOVE && isDragging) {
            var nx = Math.max(0, Math.min(w, ex - dragOffsetX));
            var ny = Math.max(0, Math.min(h, ey - dragOffsetY));
            if (dragTarget === "cross1") { cx1 = nx; cy1 = ny; ui.run(function () { updateCross1(cx1, cy1); }); }
            else if (dragTarget === "cross2") { cx2 = nx; cy2 = ny; ui.run(function () { updateCross2(cx2, cy2); }); }
            return true;
        } else if (action === event.ACTION_UP || action === event.ACTION_CANCEL) {
            isDragging = false; return true;
        }
        return false;
    });

    // 确定
    btnOk.click(function () {
        if (step === 1) {
            pos1 = { x: cx1, y: cy1 };
            log("✅ 左上角: (" + cx1 + "," + cy1 + ")");

            ui.run(function () {
                step = 2;
                cross1H.setBackgroundColor(colors.parseColor("#ff44ff44"));
                cross1V.setBackgroundColor(colors.parseColor("#ff44ff44"));
                cross1Dot.setBackgroundColor(colors.parseColor("#ff44ff44"));
                cross1Label.setTextColor(colors.parseColor("#ff44ff44"));
                cross1Label.setText("左上角 ✓");
                updateCross2(cx2, cy2);
                cross2H.setVisibility(0); cross2V.setVisibility(0);
                cross2Dot.setVisibility(0); cross2Label.setVisibility(0);
                win.titleText.setText("← 拖动蓝色十字对准棋盘右下角 →");
                win.subText.setText("对准后点确定");
                btnOk.setText("确定 ✓");
            });
        } else if (step === 2) {
            pos2 = { x: cx2, y: cy2 };
            log("✅ 右下角: (" + cx2 + "," + cy2 + ")");
            finished = true;
        }
    });

    // 取消
    btnCancel.click(function () {
        finished = true; pos1 = null; pos2 = null;
    });

    while (!finished) { sleep(100); }

    if (volExitRegistered) { try { events.removeAllKeyDownListeners("volume_down"); } catch(e) {} }
    ui.run(function () { win.close(); });
    sleep(300);

    if (!pos1 || !pos2) { log("❌ 校准取消"); return null; }

    var boardLeft = Math.min(pos1.x, pos2.x);
    var boardTop = Math.min(pos1.y, pos2.y);
    var boardRight = Math.max(pos1.x, pos2.x);
    var boardBottom = Math.max(pos1.y, pos2.y);
    var boardW = boardRight - boardLeft;
    var boardH = boardBottom - boardTop;

    var cols = 8;
    var tileW = Math.round(boardW / cols);
    var rows = Math.round(boardH / tileW);
    if (rows < 6) rows = 9;
    var tileH = Math.round(boardH / rows);
    boardRight = boardLeft + cols * tileW;
    boardBottom = boardTop + rows * tileH;

    var result = {
        left: boardLeft, top: boardTop,
        right: boardRight, bottom: boardBottom,
        rows: rows, cols: cols,
        tileW: tileW, tileH: tileH,
        method: "calibrated"
    };

    log("      棋盘: [" + result.left + "," + result.top + "," + result.right + "," + result.bottom + "]");
    log("      网格: " + result.rows + "x" + result.cols + " tile=" + result.tileW + "x" + result.tileH);

    saveBoardConfig(result);
    var img = captureScreen();
    if (img) { saveBoardDebugImage(img, result); img.recycle(); }
    return result;
}

/**
 * 辅助：移动并重置 View 大小
 * Auto.js 中 setPosition 仅对 window 级可用，子 View 用 setX/setY + LayoutParams
 */
function moveView(view, x, y, w, h) {
    try { view.setX(x); } catch(e) {}
    try { view.setY(y); } catch(e) {}
    if (w !== undefined && h !== undefined) {
        try {
            var lp = view.getLayoutParams();
            lp.width = w;
            lp.height = h;
            view.setLayoutParams(lp);
        } catch(e) {}
    }
}

/**
 * 辅助：更新十字线视图的位置和大小
 */
function updateCrosshair(hline, vline, dot, size, cx, cy) {
    moveView(hline, cx - size, cy - 1, size * 2, 3);
    moveView(vline, cx - 1, cy - size, 3, size * 2);
    moveView(dot, cx - 5, cy - 5, 10, 10);
}

/**
 * 辅助：隐藏多个视图
 */
function setInvisible() {
    for (var i = 0; i < arguments.length; i++) {
        try { arguments[i].setVisibility(4); } catch(e) {}
    }
}

// ============================================================
// Plan C: 智能暴力消除（基于颜色分类 + 模式匹配）
// ============================================================

/**
 * Plan C 核心改进：
 *
 * 旧问题：随机交换两个相邻方块 → 成功率极低（消消乐中随机交换
 * 能消除的概率远低于1%）
 *
 * 新策略：
 *   1. 在估算棋盘内采样颜色，粗略分到6个色桶
 *   2. 扫描"差一个就成3连"的模式（两同色相邻 + 第三个是另一种颜色）
 *   3. 交换那个"第三者"位置 → 消除成功率大幅提升
 *   4. 交换后用指纹对比验证，失败则标记重新找
 */

// 6 种参考色的 HSV 范围（Hue 为主）
var _COLOR_BUCKETS = [
    { id: 0, name: "红",   hMin: 0,   hMax: 20  },
    { id: 1, name: "橙",   hMin: 21,  hMax: 45  },
    { id: 2, name: "黄",   hMin: 46,  hMax: 75  },
    { id: 3, name: "绿",   hMin: 76,  hMax: 155 },
    { id: 4, name: "蓝",   hMin: 156, hMax: 250 },
    { id: 5, name: "紫",   hMin: 251, hMax: 330 }
];

function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;
    var d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) { h = 0; }
    else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s, v: v };
}

function classifyHue(h) {
    // 红色跨越 0° 边界
    if (h > 330 || h <= 20) return 0;  // 红
    for (var i = 1; i < _COLOR_BUCKETS.length; i++) {
        if (h > _COLOR_BUCKETS[i].hMin && h <= _COLOR_BUCKETS[i].hMax) return i;
    }
    return -1; // 未分类
}

/**
 * 估算棋盘区域，采样颜色并分类
 */
function sampleRoughBoard(img) {
    var w = img.width, h = img.height;

    // 尝试多个可能的棋盘位置（从上到下尝试3个偏移量）
    var offsets = [
        { top: 0.28, bottom: 0.70 },
        { top: 0.33, bottom: 0.67 },
        { top: 0.38, bottom: 0.72 }
    ];

    var bestGrid = null, bestValidCount = 0;

    for (var oi = 0; oi < offsets.length; oi++) {
        var roughLeft = Math.floor(w * 0.05);
        var roughRight = Math.floor(w * 0.95);
        var roughTop = Math.floor(h * offsets[oi].top);
        var roughBottom = Math.floor(h * offsets[oi].bottom);

        var roughW = roughRight - roughLeft;
        var roughH = roughBottom - roughTop;

        var cols = 8;
        var tileW = Math.floor(roughW / cols);
        var rows = Math.round(roughH / tileW);
        if (rows < 6) rows = 8; if (rows > 11) rows = 9;
        var tileH = Math.floor(roughH / rows);

        var actualW = cols * tileW, actualH = rows * tileH;
        var boardLeft = roughLeft + Math.floor((roughW - actualW) / 2);
        var boardTop = roughTop + Math.floor((roughH - actualH) / 2);

        var grid = [];
        var validCount = 0;

        for (var r = 0; r < rows; r++) {
            grid[r] = [];
            for (var c = 0; c < cols; c++) {
                var cx = boardLeft + c * tileW + Math.floor(tileW / 2);
                var cy = boardTop + r * tileH + Math.floor(tileH / 2);
                try {
                    var pixel = images.pixel(img, cx, cy);
                    var rv = (pixel >> 16) & 0xFF, gv = (pixel >> 8) & 0xFF, bv = pixel & 0xFF;
                    var hsv = rgb2hsv(rv, gv, bv);
                    var maxC = Math.max(rv, gv, bv), minC = Math.min(rv, gv, bv);
                    var sat = maxC - minC;
                    var isValid = sat > 25 && hsv.s > 0.12 && hsv.v > 0.15 && hsv.v < 0.9;
                    var colorId = isValid ? classifyHue(hsv.h) : -1;

                    grid[r][c] = {
                        x: cx, y: cy, color: [rv, gv, bv],
                        valid: isValid, colorId: colorId,
                        hue: hsv.h, sat: hsv.s, val: hsv.v
                    };
                    if (isValid) validCount++;
                } catch(e) {
                    grid[r][c] = { x: cx, y: cy, color: [0,0,0], valid: false, colorId: -1 };
                }
            }
        }

        if (validCount > bestValidCount) {
            bestValidCount = validCount;
            bestGrid = {
                grid: grid, tileW: tileW, tileH: tileH,
                left: boardLeft, top: boardTop,
                rows: rows, cols: cols, validCount: validCount
            };
        }
    }

    return bestGrid;
}

/**
 * 找"差一个就成3连"的交换对
 *
 * 模式1（水平）: A A B 或 B A A → 交换 B 的位置使其变成 A A A
 * 模式2（垂直）: 同上但纵向
 *
 * 返回所有候选交换，按"消除确定性"评分排序
 */
function findGoodSwaps(gridData) {
    var grid = gridData.grid;
    var rows = gridData.rows, cols = gridData.cols;
    var swaps = [];

    function trySwap(r1, c1, r2, c2) {
        if (!grid[r1][c1].valid || !grid[r2][c2].valid) return false;
        if (grid[r1][c1].colorId < 0 || grid[r2][c2].colorId < 0) return false;
        // 同色交换没用
        if (grid[r1][c1].colorId === grid[r2][c2].colorId) return false;

        // 模拟交换后检查是否能成3连
        var newId1 = grid[r2][c2].colorId; // (r1,c1) 变成 (r2,c2) 的颜色
        var newId2 = grid[r1][c1].colorId;

        var matchScore = 0;

        // 检查水平方向 (r1,c1) 位置交换后
        if (c1 > 0 && grid[r1][c1-1].valid && grid[r1][c1-1].colorId === newId1) matchScore++;
        if (c1 < cols-1 && grid[r1][c1+1].valid && grid[r1][c1+1].colorId === newId1) matchScore++;
        // 检查垂直方向
        if (r1 > 0 && grid[r1-1][c1].valid && grid[r1-1][c1].colorId === newId1) matchScore++;
        if (r1 < rows-1 && grid[r1+1][c1].valid && grid[r1+1][c1].colorId === newId1) matchScore++;

        // 检查 (r2,c2) 位置交换后
        var matchScore2 = 0;
        if (c2 > 0 && grid[r2][c2-1].valid && grid[r2][c2-1].colorId === newId2) matchScore2++;
        if (c2 < cols-1 && grid[r2][c2+1].valid && grid[r2][c2+1].colorId === newId2) matchScore2++;
        if (r2 > 0 && grid[r2-1][c2].valid && grid[r2-1][c2].colorId === newId2) matchScore2++;
        if (r2 < rows-1 && grid[r2+1][c2].valid && grid[r2+1][c2].colorId === newId2) matchScore2++;

        var totalScore = matchScore + matchScore2;

        // 需要至少有一方交换后形成 2 个或更多匹配（加上自己就是 3 连）
        if (totalScore >= 2) {
            // 注意：原来的旧颜色也会消失，所以要检查交换后新2连+原2连
            // 简化：只要 totalScore >= 2 就认为很有希望
            swaps.push({
                r1: r1, c1: c1, r2: r2, c2: c2,
                tile1: grid[r1][c1], tile2: grid[r2][c2],
                score: totalScore
            });
        }
    }

    // 扫描所有相邻对
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            if (!grid[r][c].valid || grid[r][c].colorId < 0) continue;
            // 右邻
            if (c + 1 < cols) trySwap(r, c, r, c + 1);
            // 下邻
            if (r + 1 < rows) trySwap(r, c, r + 1, c);
        }
    }

    // 按评分排序
    swaps.sort(function(a, b) { return b.score - a.score; });
    return swaps;
}

/**
 * 计算颜色指纹
 */
function calcFingerprint(img, x, y, radius) {
    var hash = [];
    for (var dy = -radius; dy <= radius; dy += 3) {
        for (var dx = -radius; dx <= radius; dx += 3) {
            var px = x + dx, py = y + dy;
            if (px >= 0 && px < img.width && py >= 0 && py < img.height) {
                var c = images.pixel(img, px, py);
                hash.push(((c >> 16) & 0xFF) >> 3);
                hash.push(((c >> 8) & 0xFF) >> 3);
                hash.push((c & 0xFF) >> 3);
            }
        }
    }
    return hash.join(",");
}

function fingerprintDiff(fp1, fp2) {
    if (!fp1 || !fp2) return 1;
    var p1 = fp1.split(","), p2 = fp2.split(",");
    var minLen = Math.min(p1.length, p2.length);
    if (minLen === 0) return 1;
    var diff = 0;
    for (var i = 0; i < minLen; i++) {
        if (Math.abs(parseInt(p1[i]) - parseInt(p2[i])) > 2) diff++;
    }
    return diff / minLen;
}

/**
 * 执行一次交换并验证
 */
function trySwapAndVerify(tile1, tile2, radius) {
    radius = radius || 30;
    var beforeImg = captureScreen();
    if (!beforeImg) return false;

    var fpB1 = calcFingerprint(beforeImg, tile1.x, tile1.y, radius);
    var fpB2 = calcFingerprint(beforeImg, tile2.x, tile2.y, radius);
    beforeImg.recycle();

    // 滑动交换
    var extX = tile2.x !== tile1.x ? (tile2.x > tile1.x ? 25 : -25) : 0;
    var extY = tile2.y !== tile1.y ? (tile2.y > tile1.y ? 25 : -25) : 0;
    gesture(180, [tile1.x, tile1.y], [tile2.x, tile2.y], [tile2.x + extX, tile2.y + extY]);

    sleep(1200);

    var afterImg = captureScreen();
    if (!afterImg) return false;

    var fpA1 = calcFingerprint(afterImg, tile1.x, tile1.y, radius);
    var fpA2 = calcFingerprint(afterImg, tile2.x, tile2.y, radius);
    afterImg.recycle();

    var d1 = fingerprintDiff(fpB1, fpA1);
    var d2 = fingerprintDiff(fpB2, fpA2);

    var changed = d1 > 0.08 || d2 > 0.08;
    return changed;
}

function planC_bruteForceEliminate(targetCount) {
    targetCount = targetCount || 3;
    log("\n========================================");
    log("  [Plan C] 智能暴力消除");
    log("  目标: 成功消除 " + targetCount + " 次");
    log("  策略: 找'差一个成3连'的模式");
    log("========================================\n");

    var successCount = 0;
    var maxAttempts = 40;
    var attempt = 0;
    // 记录已尝试过的交换对（避免重复试同样失败的对），用 "x1,y1-x2,y2" 格式
    var failedPairs = {};

    while (successCount < targetCount && attempt < maxAttempts) {
        attempt++;
        log("\n--- 尝试 " + attempt + "/" + maxAttempts + " (已成功: " + successCount + "/" + targetCount + ") ---");

        var img = captureScreen();
        if (!img) { sleep(500); continue; }

        // 1. 采样棋盘
        var gridData = sampleRoughBoard(img);
        if (!gridData || gridData.validCount < 4) {
            log("  有效方块太少: " + (gridData ? gridData.validCount : 0));
            img.recycle(); sleep(500); continue;
        }
        log("  有效方块: " + gridData.validCount + "/" + (gridData.rows * gridData.cols) +
            " 位置偏移: " + gridData.top);

        // 2. 找候选交换
        var swaps = findGoodSwaps(gridData);
        log("  候选交换: " + swaps.length + " 个");

        // 如果没有候选，回退到随机交换（赌运气）
        if (swaps.length === 0) {
            log("  无候选模式，回退到随机交换...");
            // 随便找两个颜色不同的相邻有效方块
            var grid = gridData.grid;
            var rows = gridData.rows, cols = gridData.cols;
            var validList = [];
            for (var r = 0; r < rows; r++) {
                for (var c = 0; c < cols; c++) {
                    if (grid[r][c].valid && grid[r][c].colorId >= 0) {
                        validList.push({ r: r, c: c, data: grid[r][c] });
                    }
                }
            }
            shuffleArray(validList);
            var found = false;
            for (var vi = 0; vi < validList.length && !found; vi++) {
                var t = validList[vi];
                var dirs = [{dr:0,dc:1},{dr:1,dc:0},{dr:0,dc:-1},{dr:-1,dc:0}];
                shuffleArray(dirs);
                for (var di = 0; di < dirs.length && !found; di++) {
                    var nr = t.r + dirs[di].dr, nc = t.c + dirs[di].dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].valid) {
                        var key = t.r+","+t.c+"-"+nr+","+nc;
                        var key2 = nr+","+nc+"-"+t.r+","+t.c;
                        if (failedPairs[key] || failedPairs[key2]) continue;
                        log("  随机尝试: (" + t.r + "," + t.c + ") ↔ (" + nr + "," + nc + ")");
                        var ok = trySwapAndVerify(t.data, grid[nr][nc], Math.floor(gridData.tileW / 3));
                        if (ok) { successCount++; found = true; }
                        else { failedPairs[key] = true; failedPairs[key2] = true; }
                    }
                }
            }
            img.recycle();
            if (!found) { sleep(2000); }
            else { sleep(1500); }
            continue;
        }

        // 3. 从高到低尝试候选交换
        var swapped = false;
        for (var si = 0; si < swaps.length && !swapped; si++) {
            var s = swaps[si];
            var key = s.r1+","+s.c1+"-"+s.r2+","+s.c2;
            var key2 = s.r2+","+s.c2+"-"+s.r1+","+s.c1;
            if (failedPairs[key] || failedPairs[key2]) continue;

            log("  尝试交换 (score=" + s.score + "): (" + s.r1 + "," + s.c1 + ") ↔ (" + s.r2 + "," + s.c2 + ")" +
                " 颜色: " + s.tile1.colorId + "→" + s.tile2.colorId + " / " + s.tile2.colorId + "→" + s.tile1.colorId);

            var radius = Math.floor(gridData.tileW / 3);
            var ok = trySwapAndVerify(s.tile1, s.tile2, radius);
            if (ok) {
                successCount++;
                swapped = true;
                log("  ✅ 消除成功！(" + successCount + "/" + targetCount + ")");
            } else {
                log("  ❌ 交换失败");
                failedPairs[key] = true;
                failedPairs[key2] = true;
            }
        }

        // 即使 swappable 为空也要回收 img
        img.recycle();

        if (!swapped) {
            log("  本轮无可用的交换组合");
            var img2 = captureScreen();
            if (img2) { img2.recycle(); }
            sleep(2000);
        } else {
            sleep(1500);
        }

        if (attempt % 10 === 0 && successCount < targetCount) {
            toast("消消乐进展: " + successCount + "/" + targetCount);
        }
    }

    log("\n========================================");
    if (successCount >= targetCount) {
        log("  ✅ [Plan C] 完成！共消除 " + successCount + " 次");
    } else {
        log("  ⚠ [Plan C] 尝试 " + maxAttempts + " 次后完成 " + successCount + " 次");
        log("  建议先用 Plan A/B 校准棋盘后，再用 xiaoxiaole.js 跑");
    }
    log("========================================\n");
    return successCount >= targetCount;
}

function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
}

// ============================================================
// 通用工具：缓存、截图标注
// ============================================================

var CACHE_DIR = "/sdcard/脚本/tb2/cache/";
var CACHE_FILE = CACHE_DIR + "board_config.json";

function saveBoardConfig(config) {
    try {
        files.createWithDirs(CACHE_DIR);
        var data = { timestamp: new Date().getTime(), deviceWidth: device.width,
            deviceHeight: device.height, config: config };
        files.write(CACHE_FILE, JSON.stringify(data, null, 2));
        log("✅ 棋盘配置已缓存");
    } catch (e) { log("⚠ 保存缓存失败: " + e.message); }
}

function loadBoardConfig() {
    try {
        if (!files.exists(CACHE_FILE)) return null;
        var content = files.read(CACHE_FILE);
        var data = JSON.parse(content);
        if (!data || !data.config) return null;
        if (data.deviceWidth !== device.width || data.deviceHeight !== device.height) return null;
        return data.config;
    } catch (e) { return null; }
}

function saveBoardDebugImage(img, board) {
    try {
        var debugDir = "/sdcard/debug_xiaoxiaole/";
        files.createWithDirs(debugDir);
        var ts = new Date().getTime();
        var path = debugDir + "detect_" + board.method + "_" + ts + ".png";
        var overlay = images.copy(img);
        var canvas = new Canvas(overlay);
        var paint = new Paint();
        paint.setColor(colors.RED); paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(6);
        canvas.drawRect(board.left, board.top, board.right, board.bottom, paint);

        paint.setStrokeWidth(2); paint.setARGB(150, 255, 165, 0);
        var cols = board.cols || 8, rows = board.rows || 9;
        var tw = board.tileW || Math.round((board.right - board.left) / cols);
        var th = board.tileH || Math.round((board.bottom - board.top) / rows);
        for (var i = 0; i <= cols; i++) canvas.drawLine(board.left + i*tw, board.top, board.left + i*tw, board.bottom, paint);
        for (var i = 0; i <= rows; i++) canvas.drawLine(board.left, board.top + i*th, board.right, board.top + i*th, paint);

        var tp = new Paint(); tp.setColor(colors.YELLOW); tp.setTextSize(26);
        canvas.drawText("(" + board.left + "," + board.top + ")", board.left + 5, board.top - 8, tp);
        canvas.drawText(board.rows + "x" + board.cols + " [" + board.method + "]", board.left + 5, board.top + 26, tp);

        images.save(overlay, path); overlay.recycle();
        log("📸 标注截图: " + path);
    } catch(e) { log("⚠ 保存截图失败"); }
}

// ============================================================
// 浮窗菜单（替代音量键选择）
// ============================================================

function showMenu() {
    log("\n===== 显示选择浮窗 =====");

    var screenW = device.width;
    var screenH = device.height;

    var menuWin = floaty.rawWindow(
        <frame bg="#dd222222" layout_width="match_parent" layout_height="match_parent">
            <vertical layout_gravity="center" gravity="center" w="280dp">
                <text text="🎯 选择模式" textSize="20sp" textColor="#ffffff"
                    gravity="center" margin="0 0 0 16dp" />
                <button id="btnA" text="Plan A - 自动检测" textSize="16sp"
                    h="52dp" bg="#ff4CAF50" textColor="#ffffff" margin="8dp" />
                <button id="btnB" text="Plan B - 交互校准" textSize="16sp"
                    h="52dp" bg="#ff2196F3" textColor="#ffffff" margin="8dp" />
                <button id="btnC" text="Plan C - 暴力消除3次" textSize="16sp"
                    h="52dp" bg="#ffFF9800" textColor="#ffffff" margin="8dp" />
                <button id="btnClose" text="取消" textSize="14sp"
                    h="40dp" bg="#aa333333" textColor="#aaaaaa" margin="8dp" />
            </vertical>
        </frame>
    );
    menuWin.setPosition(0, 0);
    menuWin.setSize(screenW, screenH);
    menuWin.setTouchable(true);

    var selected = null;

    menuWin.btnA.click(function () {
        selected = "A";
        ui.run(function () { menuWin.close(); });
    });
    menuWin.btnB.click(function () {
        selected = "B";
        ui.run(function () { menuWin.close(); });
    });
    menuWin.btnC.click(function () {
        selected = "C";
        ui.run(function () { menuWin.close(); });
    });
    menuWin.btnClose.click(function () {
        selected = "CLOSE";
        ui.run(function () { menuWin.close(); });
    });

    // 等待选择
    while (selected === null) { sleep(100); }
    sleep(200);

    return selected;
}

// ============================================================
// 主程序
// ============================================================

log("\n========================================");
log("  🎯 消消乐棋盘检测 v4");
log("========================================");

var choice = showMenu();
log("选择了: " + choice);

if (choice === "A") {
    // ---- Plan A ----
    var cachedConfig = loadBoardConfig();
    if (cachedConfig) {
        log("发现缓存配置，直接使用。如需重新检测请删除缓存文件:");
        log("  " + CACHE_FILE);
        log("\n棋盘: [" + cachedConfig.left + "," + cachedConfig.top + "," +
            cachedConfig.right + "," + cachedConfig.bottom + "]");
        log("网格: " + cachedConfig.rows + "x" + cachedConfig.cols);

        var img = captureScreen();
        if (img) { saveBoardDebugImage(img, cachedConfig); img.recycle(); }

        log("\n可直接用于 jiaoxiaole() 的参数:");
        log("  jiaoxiaole({ boardLeft: " + cachedConfig.left +
            ", boardTop: " + cachedConfig.top +
            ", boardRight: " + cachedConfig.right +
            ", boardBottom: " + cachedConfig.bottom +
            ", rows: " + cachedConfig.rows + ", cols: " + cachedConfig.cols + " });");
    } else {
        log("\n请在 3 秒内切换到消消乐界面...");
        toast("切换到消消乐界面");
        sleep(3000);

        var result = detectBoardAuto();
        if (result && result.autoScore > 0.08) {
            log("\n✅ 自动检测成功！得分=" + result.autoScore.toFixed(3));
            saveBoardConfig(result);
            log("\njiaoxiaole() 参数:");
            log("  jiaoxiaole({ boardLeft: " + result.left +
                ", boardTop: " + result.top +
                ", boardRight: " + result.right +
                ", boardBottom: " + result.bottom +
                ", rows: " + result.rows + ", cols: " + result.cols + " });");
        } else {
            log("\n❌ 自动检测失败" + (result ? " (得分偏低: " + result.autoScore.toFixed(3) + ")" : ""));
            log("建议使用 Plan B 交互校准");
        }
    }

} else if (choice === "B") {
    // ---- Plan B ----
    log("\n请在 3 秒内切换到消消乐界面...");
    toast("切换到消消乐界面，然后点击浮窗按钮");
    sleep(2000);

    var calibResult = calibrateBoardInteractive();
    if (calibResult) {
        log("\n✅ 校准完成！");
        log("\njiaoxiaole() 参数:");
        log("  jiaoxiaole({ boardLeft: " + calibResult.left +
            ", boardTop: " + calibResult.top +
            ", boardRight: " + calibResult.right +
            ", boardBottom: " + calibResult.bottom +
            ", rows: " + calibResult.rows + ", cols: " + calibResult.cols + " });");
    } else {
        log("\n❌ 校准取消或失败");
    }

} else if (choice === "C") {
    // ---- Plan C ----
    log("\n请在 3 秒内切换到消消乐界面...");
    toast("切换到消消乐界面");
    sleep(3000);

    planC_bruteForceEliminate(3);

} else {
    log("已取消");
}

log("\n测试完成！");