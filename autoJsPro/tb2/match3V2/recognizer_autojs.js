// ============================================================
// recognizer_autojs.js — Auto.js 专用 UI 增强（含 JSX 浮窗）
//
// 在 Auto.js 环境中加载此文件可获得浮窗标注等交互功能。
// Node.js 测试不需要此文件。
//
// require 方式：
//   var recognizer = require('./recognizer.js');
//   require('./recognizer_autojs.js').enhance(recognizer);
//   之后 recognizer.showResultOverlay(...) 可用
// ============================================================

/**
 * 为 recognizer 模块注入 Auto.js 专属 UI 函数
 * @param {Object} recognizer - require('./recognizer.js') 的结果
 */
function enhance(recognizer) {
    if (typeof floaty === 'undefined') {
        // 非 Auto.js 环境，注入空壳
        recognizer.showResultOverlay = function(grid, cellColors, boardRect, rows, cols, durationMs) {
            console.log('[recognizer_autojs] floaty 不可用，跳过浮窗标注');
        };
        recognizer.runRecognitionTest = function(boardConfig) {
            console.log('[recognizer_autojs] floaty 不可用，跳过测试');
        };
        return;
    }

    var REF_COLORS = recognizer.REF_COLORS;
    var classifyBoard = recognizer.classifyBoard;

    var _colorBgMap = {
        "黄":  "#FFE6B800",
        "紫":  "#FF9C27B0",
        "红":  "#FFE53935",
        "绿":  "#FF43A047",
        "蓝":  "#FF1E88E5",
        "浅绿":"#FF66BB6A",
        "?" :  "#FF888888"
    };

    /**
     * 在屏幕上标注每个格子的识别结果
     */
    function showResultOverlay(grid, cellColors, boardRect, rows, cols, durationMs) {
        durationMs = durationMs || 4000;
        var cellW = (boardRect.boardRight - boardRect.boardLeft) / cols;
        var cellH = (boardRect.boardBottom - boardRect.boardTop) / rows;

        log("===== 消消乐 V2 识别结果 =====");
        log("棋盘: (" + boardRect.boardLeft + "," + boardRect.boardTop +
            ") → (" + boardRect.boardRight + "," + boardRect.boardBottom +
            ")  " + rows + "×" + cols);

        var header = "   ";
        for (var c = 0; c < cols; c++) header += "  Col" + c;
        log(header);

        for (var r = 0; r < rows; r++) {
            var line = "Row" + r + " ";
            for (var c = 0; c < cols; c++) {
                var id = grid[r][c];
                var name = id >= 0 ? REF_COLORS[id].name : "?";
                line += name + " ";
                if (cellColors && cellColors[r] && cellColors[r][c]) {
                    var rgb = cellColors[r][c];
                    line += "(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ") ";
                }
            }
            log(line);
        }

        var counts = {};
        var valid = 0;
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var id = grid[r][c];
                if (id >= 0) {
                    var name = REF_COLORS[id].name;
                    counts[name] = (counts[name] || 0) + 1;
                    valid++;
                }
            }
        }
        log("有效格: " + valid + "/" + (rows * cols));
        log("颜色分布: " + JSON.stringify(counts));

        // 浮窗标注
        var windows = [];
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var id = grid[r][c];
                var name = id >= 0 ? REF_COLORS[id].name : "?";
                var bgColor = _colorBgMap[name] || _colorBgMap["?"];

                var cx = Math.floor(boardRect.boardLeft + c * cellW + cellW / 2);
                var cy = Math.floor(boardRect.boardTop + r * cellH + cellH / 2);

                try {
                    var ui = (
                        <frame bg={bgColor} w="44" h="44" gravity="center">
                            <text text={name} textSize="16sp" textColor="#FFFFFF"
                                gravity="center" style="bold" />
                        </frame>
                    );
                    var w = floaty.rawWindow(ui);
                    w.setPosition(cx - 22, cy - 22);
                    w.setSize(44, 44);
                    w.setTouchable(false);
                    windows.push(w);
                } catch (e) {
                    // floaty 可能不可用
                }
            }
        }

        setTimeout(function () {
            for (var i = 0; i < windows.length; i++) {
                try { if (windows[i]) { windows[i].close(); windows[i] = null; } } catch (e) {}
            }
        }, durationMs);
    }

    /**
     * 执行识别测试
     */
    function runRecognitionTest(boardConfig) {
        log("===== 消消乐 V2 颜色识别测试 =====");
        log("参考色 (RGB → HSV):");
        REF_COLORS.forEach(function (c) {
            log("  " + c.name + "  RGB(" + c.rgb.join(",") + ")  " +
                "H=" + Math.round(c.hsv.h) + "° S=" + c.hsv.s.toFixed(2) + " V=" + c.hsv.v.toFixed(2));
        });
        log("综合距离阈值=" + 0.35 + "  模糊间隙=" + 0.04);

        if (!boardConfig) {
            log("⚠ 未提供棋盘配置，使用默认值（需手动调整）");
            log("  请在 UI 中设置棋盘 Left/Top/Right/Bottom/行数/列数");
            return;
        }

        log("棋盘配置: " + JSON.stringify(boardConfig));
        var rows = boardConfig.rows || 9;
        var cols = boardConfig.cols || 8;

        log("截图...");
        var img = captureScreen();
        if (!img) {
            log("⚠ 截图失败");
            return;
        }
        log("截图尺寸: " + img.width + "×" + img.height);

        log("采样并分类...");
        var result = classifyBoard(img, boardConfig, rows, cols);

        showResultOverlay(result.grid, result.cellColors, boardConfig, rows, cols);
        log("===== 测试完成 =====");
    }

    // 注入
    recognizer.showResultOverlay = showResultOverlay;
    recognizer.runRecognitionTest = runRecognitionTest;
}

module.exports = { enhance: enhance };