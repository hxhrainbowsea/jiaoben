// doudizhu/index.js - 斗地主自动游戏模块
// 开发中，敬请期待！
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    // 占位：后续版本将实现斗地主自动游戏功能
    scope.playDoudizhu = function () {
        console.log("[斗地主] 模块开发中，暂不可用");
        return false;
    };

    scope.preheatCardTemplates = function () {
        // 占位
    };

    scope.recycleCardTemplates = function () {
        // 占位
    };
};