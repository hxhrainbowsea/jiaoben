// ============================================================
// index.js - 消消乐 V2 模块入口
// ============================================================

var recognizer = require('./recognizer.js');

// Auto.js 环境下加载 UI 增强（浮窗标注等）
try {
    require('./recognizer_autojs.js').enhance(recognizer);
} catch (e) {
    // Node.js 环境下 JSX 不可用，跳过
}

var matcher    = require('./matcher.js');
var gesture    = require('./gesture.js');
var boardUtil  = require('./board.js');
var main       = require('./main.js');

module.exports = {
    // 颜色识别
    classifyBoard: recognizer.classifyBoard,
    runRecognitionTest: recognizer.runRecognitionTest,
    REF_COLORS: recognizer.REF_COLORS,

    // 匹配 & 交换
    findBestMove: matcher.findBestMove,
    debugPrintGrid: matcher.debugPrintGrid,
    executeSwap: gesture.executeSwap,

    // 稳定检测
    waitForBoardStable: boardUtil.waitForBoardStable,

    // 主循环
    play: main.play
};