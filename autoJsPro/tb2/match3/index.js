// ============================================================
// index.js - 消消乐模块统一入口
// 引用方式: require('./match3/index')(runtime, scope)
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    var main  = require('./main.js');
    var boardM = require('./board.js');
    var matcherM = require('./matcher.js');
    var gestureM = require('./gesture.js');
    var configData = require('./config.js');
    var debugOverlay = require('./debug_overlay.js');

    // ---- 注入到 scope 的对外接口 ----
    scope.jiaoxiaole           = main.jiaoxiaole;
    scope.playXiaoxiaole       = main.playXiaoxiaole;
    scope.calibrateBoard       = main.calibrateBoard;
    scope.autoDetectBoard      = boardM.autoDetectBoard;
    scope.sampleGridColors     = matcherM.sampleGridColors;
    scope.classifyColors       = matcherM.classifyColors;
    scope.findMatches          = matcherM.findMatches;
    scope.findBestMove         = matcherM.findBestMove;
    scope.executeMove          = gestureM.executeMove;
    scope.waitForBoardStable   = boardM.waitForBoardStable;
    scope.isInGame             = boardM.isInGame;
    scope.scanSpecialItems     = gestureM.scanSpecialItems;
    scope.doubleClickCell      = gestureM.doubleClickCell;
    scope.debugPrintGrid       = main.debugPrintGrid;
    scope.detectBoardSimple    = main.detectBoardSimple;
    scope._xiaoxiaoleConfig    = configData._config;

    // 调试可视化
    scope.testXiaoxiaoleDetection = debugOverlay.testXiaoxiaoleDetection;

    // 特殊道具常量
    scope.SPECIAL_NONE         = configData.SPECIAL_NONE;
    scope.SPECIAL_VERT_STRIPE  = configData.SPECIAL_VERT_STRIPE;
    scope.SPECIAL_MUSHROOM     = configData.SPECIAL_MUSHROOM;

    log("[match3] 消消乐模块已加载 (" + configData.REF_COLORS.length + "色参考)");
};