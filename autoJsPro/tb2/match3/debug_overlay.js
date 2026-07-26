// ============================================================
// debug_overlay.js - 消消乐颜色识别可视化（浮窗标注）
//
// 用法：打开消消乐游戏页面，在控制台调用：
//   testXiaoxiaoleDetection()
//
// 流程：
//   1. 截图
//   2. 棋盘检测（自动或使用缓存）
//   3. 采样颜色 → 分类
//   4. 在每个格子位置弹出带颜色名称的浮窗
//      （黄/紫/红/绿/蓝/浅绿，灰色标"?")
//   5. 棋盘外框用红色矩形标注
// ============================================================

var _config    = require('./config.js')._config;
var REF_COLORS = require('./config.js').REF_COLORS;
var loadCache  = require('./cache.js').loadCachedBoardConfig;
var boardM     = require('./board.js');
var matcherM   = require('./matcher.js');
var gestureM   = require('./gesture.js');

// 颜色名 → 浮窗背景色
var _colorBgMap = {
    "黄":  "#FFE6B800",  // 金底
    "紫":  "#FF9C27B0",  // 紫底
    "红":  "#FFE53935",  // 红底
    "绿":  "#FF43A047",  // 绿底
    "蓝":  "#FF1E88E5",  // 蓝底
    "浅绿":"#FF66BB6A",  // 浅绿底
    "?" :  "#FF888888"   // 灰底（未识别）
};

/**
 * 在屏幕指定位置弹一个颜色小浮窗（2秒自动消失）
 *
 * @param {number} x        - 浮窗中心 X
 * @param {number} y        - 浮窗中心 Y
 * @param {string} label    - 显示文字（如 "黄"）
 * @param {string} bgColor  - 背景色（如 "#FFE6B800"）
 */
function showLabelFloaty(x, y, label, bgColor) {
    bgColor = bgColor || _colorBgMap["?"];
    var ui = (
        <frame bg={bgColor} w="44" h="44" gravity="center">
            <text text={label} textSize="18sp" textColor="#FFFFFF"
                gravity="center" style="bold" />
        </frame>
    );
    var w = floaty.rawWindow(ui);
    w.setPosition(x - 22, y - 22);
    w.setSize(44, 44);
    w.setTouchable(false);

    setTimeout(function () {
        try { if (w) { w.close(); w = null; } } catch (e) {}
    }, 2500);
}

/**
 * 画棋盘边框浮窗（红色半透明框）
 */
function showBoardBorder(left, top, right, bottom) {
    var ui = (
        <frame bg="#44FF0000" />
    );
    var w = floaty.rawWindow(ui);
    w.setPosition(left, top);
    w.setSize(right - left, bottom - top);
    w.setTouchable(false);

    setTimeout(function () {
        try { if (w) { w.close(); w = null; } } catch (e) {}
    }, 2500);
}

/**
 * 主函数：棋盘颜色识别可视化
 *
 * 流程：
 *   1. 尝试加载缓存棋盘配置
 *   2. 截图 → 采样 → 分类
 *   3. 每个格子弹浮窗标注颜色名
 *
 * 按音量-键可随时退出。
 *
 * @param {Object} [customBoard] - 可选，手动指定棋盘 {left,top,right,bottom,rows,cols}
 *
 * @example
 * testXiaoxiaoleDetection();                          // 自动检测
 * testXiaoxiaoleDetection({left:60,top:380,right:700,bottom:1050}); // 指定区域
 */
function testXiaoxiaoleDetection(customBoard) {
    log("===== 消消乐颜色识别可视化测试 =====");

    // 注册音量-退出
    var volExitRegistered = false;
    try {
        events.observeKey();
        events.onKeyDown("volume_down", function () {
            log("⚠ 音量-被按下，退出");
            try { exit(); } catch(e) {}
        });
        volExitRegistered = true;
        log("音量-退出已注册");
    } catch(e) {
        log("音量键监听注册失败（可能已占用），继续");
    }

    // 1. 确定棋盘区域
    var boardRect = null;

    if (customBoard) {
        // 手动指定
        boardRect = {
            boardLeft:   customBoard.left   || customBoard.boardLeft   || 0,
            boardTop:    customBoard.top    || customBoard.boardTop    || 0,
            boardRight:  customBoard.right  || customBoard.boardRight  || 0,
            boardBottom: customBoard.bottom || customBoard.boardBottom || 0
        };
        _config.boardLeft   = boardRect.boardLeft;
        _config.boardTop    = boardRect.boardTop;
        _config.boardRight  = boardRect.boardRight;
        _config.boardBottom = boardRect.boardBottom;
        if (customBoard.rows) _config.rows = customBoard.rows;
        if (customBoard.cols) _config.cols = customBoard.cols;
        log("使用手动指定棋盘: [" + boardRect.boardLeft + "," + boardRect.boardTop +
            "," + boardRect.boardRight + "," + boardRect.boardBottom + "]");
    } else {
        // 尝试缓存
        var cached = loadCache();
        if (cached) {
            boardRect = {
                boardLeft:   cached.left,
                boardTop:    cached.top,
                boardRight:  cached.right,
                boardBottom: cached.bottom
            };
            _config.boardLeft   = cached.left;
            _config.boardTop    = cached.top;
            _config.boardRight  = cached.right;
            _config.boardBottom = cached.bottom;
            if (cached.rows) _config.rows = cached.rows;
            if (cached.cols) _config.cols = cached.cols;
            log("使用缓存棋盘: [" + boardRect.boardLeft + "," + boardRect.boardTop +
                "," + boardRect.boardRight + "," + boardRect.boardBottom + "]");
        } else {
            // 自动检测
            log("无缓存，自动检测棋盘...");
            var detected = boardM.autoDetectBoard();
            if (!detected) {
                log("棋盘检测失败，使用兜底坐标");
                var w = device.width, h = device.height;
                _config.boardLeft   = Math.floor(w * 0.05);
                _config.boardTop    = Math.floor(h * 0.25);
                _config.boardRight  = Math.floor(w * 0.95);
                _config.boardBottom = Math.floor(h * 0.90);
            }
            boardRect = _config;
        }
    }

    log("最终棋盘: [" + _config.boardLeft + "," + _config.boardTop +
        "," + _config.boardRight + "," + _config.boardBottom + "]");
    log("网格: " + _config.rows + "x" + _config.cols);

    // 2. 校验棋盘坐标
    if (_config.boardLeft >= _config.boardRight || _config.boardTop >= _config.boardBottom) {
        log("⚠ 棋盘坐标无效，请先校准");
        toastCustom("棋盘坐标无效，请先校准", 3000);
        return;
    }

    // 3. 截图 → 采样 → 分类
    var screen = captureScreen();
    if (!screen) {
        log("截图失败");
        return;
    }

    var colorGrid = matcherM.sampleGridColors(screen, _config);
    var classified = matcherM.classifyColors(colorGrid);

    // 4. 计算每个格子的屏幕坐标并弹浮窗
    var rows = classified.length;
    var cols = classified[0].length;
    var cellW = (_config.boardRight - _config.boardLeft) / cols;
    var cellH = (_config.boardBottom - _config.boardTop) / rows;

    log("棋盘 " + rows + "x" + cols + "，格子 " + cellW.toFixed(0) + "x" + cellH.toFixed(0) + "px");
    log("正在弹出颜色标注...");

    // 先弹棋盘边框
    showBoardBorder(_config.boardLeft, _config.boardTop,
        _config.boardRight, _config.boardBottom);

    // 逐个格子弹浮窗
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var cx = Math.floor(_config.boardLeft + c * cellW + cellW / 2);
            var cy = Math.floor(_config.boardTop  + r * cellH + cellH / 2);

            var cls = classified[r][c];
            var label, bgColor;

            if (cls >= 0 && cls < REF_COLORS.length) {
                label   = REF_COLORS[cls].name;
                bgColor = _colorBgMap[label] || _colorBgMap["?"];
            } else if (cls === -1) {
                label   = "?";
                bgColor = _colorBgMap["?"];
            } else {
                label   = String(cls);
                bgColor = _colorBgMap["?"];
            }

            // 加一点延迟分批弹出，避免卡顿
            var delay = (r * cols + c) * 15;
            if (delay > 2000) delay = 2000; // 最多延时2秒
            setTimeout(showLabelFloaty, delay, cx, cy, label, bgColor);
        }
    }

    // 5. 日志输出分类矩阵
    log("===== 分类矩阵 =====");
    for (var r = 0; r < rows; r++) {
        var rowStr = "  Row" + r + ": ";
        for (var c = 0; c < cols; c++) {
            var cls = classified[r][c];
            if (cls >= 0 && cls < REF_COLORS.length) {
                rowStr += REF_COLORS[cls].name;
            } else {
                rowStr += "?";
            }
            if (c < cols - 1) rowStr += " ";
        }
        log(rowStr);
    }

    // 统计各类数量
    var clsCount = {};
    var unknownCount = 0;
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var cls = classified[r][c];
            if (cls >= 0 && cls < REF_COLORS.length) {
                var name = REF_COLORS[cls].name;
                clsCount[name] = (clsCount[name] || 0) + 1;
            } else {
                unknownCount++;
            }
        }
    }
    log("颜色分布:");
    for (var name in clsCount) {
        log("  " + name + ": " + clsCount[name] + " 格");
    }
    if (unknownCount > 0) log("  未识别: " + unknownCount + " 格");

    log("===== 测试完成 =====");
    log("浮窗将在约 2.5 秒后自动消失");
    log("提示：右上角 console 日志中有完整分类矩阵");

    // 清理音量键监听，避免影响后续操作
    if (volExitRegistered) {
        try { events.removeAllKeyDownListeners("volume_down"); } catch(e) {}
    }
}

module.exports = {
    testXiaoxiaoleDetection: testXiaoxiaoleDetection
};