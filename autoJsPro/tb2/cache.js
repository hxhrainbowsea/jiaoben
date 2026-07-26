// ============================================================
// cache.js - 任务缓存（基于 storages，当日有效）
// 依赖: 无（仅依赖 Auto.js 原生 storages 模块）
//
// 用途：记录 once 任务的执行状态，每天 0 点自动重置
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    var STORAGE_NAME = 'tb_task_cache';
    var storage = storages.create(STORAGE_NAME);

    /**
     * 获取今天的日期字符串 YYYY-MM-DD
     *
     * @returns {string} 如 "2026-06-26"
     *
     * @example
     * getTodayStr();  // "2026-06-26"
     */
    function getTodayStr() {
        var d = new Date();
        var y = d.getFullYear();
        var m = ('0' + (d.getMonth() + 1)).slice(-2);
        var day = ('0' + d.getDate()).slice(-2);
        return y + '-' + m + '-' + day;
    }

    /**
     * 读取缓存中所有任务状态（自动清理过期记录）
     *
     * 只保留日期等于今天的缓存项，旧日期的记录自动清除，
     * 防止缓存无限期增长。
     *
     * @returns {Object} { taskName: "2026-06-26", ... }
     *
     * @example
     * getAllCache();  // { "去签到": "2026-06-26" }
     */
    function getAllCache() {
        var raw = storage.get('tasks', '{}');
        var tasks;
        try {
            tasks = JSON.parse(raw);
        } catch (e) {
            tasks = {};
        }
        // 自动清理过期记录：只保留今天的
        var today = getTodayStr();
        var cleaned = {};
        for (var key in tasks) {
            if (tasks[key] === today) {
                cleaned[key] = tasks[key];
            }
        }
        // 如果有清理动作则回写
        if (Object.keys(cleaned).length !== Object.keys(tasks).length) {
            saveAllCache(cleaned);
        }
        return cleaned;
    }

    /**
     * 写入所有任务状态到缓存
     *
     * @param {Object} tasks - { taskName: "2026-06-26", ... }
     */
    function saveAllCache(tasks) {
        storage.put('tasks', JSON.stringify(tasks));
    }

    /**
     * 检查指定任务今天是否已完成
     *
     * 比较缓存中该任务记录日期是否等于今天，如果不相等则视为过期未完成。
     *
     * @param {string} taskName - 任务名称（taskDefines 中的 name）
     * @returns {boolean} true=今日已完成，false=未完成或缓存过期
     *
     * @example
     * isTaskDoneToday("去签到");  // true | false
     */
    scope.isTaskDoneToday = function (taskName) {
        var tasks = getAllCache();
        var today = getTodayStr();
        return tasks[taskName] === today;
    };

    /**
     * 将指定任务标记为今天已完成
     *
     * 记录格式：{ taskName: "2026-06-26" }
     * 日期过期后 isTaskDoneToday 自动返回 false，无需手动清理。
     *
     * @param {string} taskName - 任务名称（taskDefines 中的 name）
     *
     * @example
     * markTaskDone("去签到");
     */
    scope.markTaskDone = function (taskName) {
        var tasks = getAllCache();
        tasks[taskName] = getTodayStr();
        saveAllCache(tasks);
        log("已标记【" + taskName + "】今日完成");
    };

    /**
     * 获取今日所有已完成的缓存任务列表
     *
     * @returns {string[]} 已完成的任务名数组
     *
     * @example
     * var doneList = getAllDoneTasks();  // ["去签到", "领阳光"]
     */
    scope.getAllDoneTasks = function () {
        var tasks = getAllCache();
        return Object.keys(tasks);
    };

    /**
     * 清除指定任务的今日完成标记
     *
     * @param {string} taskName - 要清除的任务名
     *
     * @example
     * clearTaskCache("领阳光");
     */
    scope.clearTaskCache = function (taskName) {
        var tasks = getAllCache();
        delete tasks[taskName];
        saveAllCache(tasks);
        log("已清除【" + taskName + "】的完成标记");
    };

    /**
     * 清除今日所有任务的完成标记
     *
     * @example
     * clearAllTaskCache();
     */
    scope.clearAllTaskCache = function () {
        saveAllCache({});
        log("已清除今日所有任务的完成标记");
    };
};