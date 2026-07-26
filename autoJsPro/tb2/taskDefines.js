// ============================================================
// taskDefines.js - 农场任务定义数组
// 依赖: 无（纯数据）
//
// 从 start.js 拆分出的任务定义，供 taskLoop() 使用。
// 每个任务对象说明：
//   name           - 任务名称（用于缓存标记）
//   text           - 屏幕上要识别的文字
//   totalSeconds   - 浏览时长（秒，仅 newPage 系列）
//   openType       - 打开类型：
//     'none'           - 仅点击，无需额外操作
//     'newPage'        - 进入新页面后连续滑动浏览，然后返回
//     'newTwoPage'     - 进入后再进入第二层页面浏览，然后返回
//     'newOneOrTwoPage'- 检测是否有第二层页面，有则进入，然后浏览返回
//     'newThreePage'   - 进入页面后点击 3 个商品（各开新页面）
//     'newPageAndClick'- 进入页面B，点击文本后，返回
//     'goToOtherApp'   - 跳转到别的app
//     'farmQuiz'       - 农场百科问答
//   clickText      - 进入后要点击的文字（仅 newPageAndClick）
//   offset         - 点击随机偏移量
//   once           - 是否每日只做一次
//   altTexts       - 备选文字数组，OCR 识别到其中任意一个即匹配成功（如简繁变体）
//   durationRegion - 校准区域 [x, y, w, h]，用于 OCR 识别剩余浏览时间（可选）
//   durationText   - 校准文字，可以是正则数组 ["\\d+滑动浏览"] 或单字符串 "滑动浏览"（可选）
//   condition      - 执行条件函数，返回 true 才执行该任务（可选）。常用于检查目标 app 是否安装
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    /**
     * 获取任务定义数组
     *
     * @returns {Array} 任务定义列表
     *
     * @example
     * var tasks = getTaskDefines();
     */
    scope.getTaskDefines = function () {
        return [
            {
                name: "看严选推荐商品",
                text: "看严选推荐商品",
                totalSeconds: 35,
                openType: 'newPage',
                offset: {x: 40, y: 1},
                noScroll: true
            },
            {
                name: "精选好物", text: "精选好物", totalSeconds: 32, openType: 'newPage', offset: {x: 40, y: 1},
                durationRegion: [Math.floor(device.width * 0.3), 0, Math.floor(device.width * 0.7), Math.floor(device.height * 0.2)],
                durationText: ["[^\\d\\u4e00-\\u9fa5]*\\d+[^\\d\\u4e00-\\u9fa5]*(?:滑动浏览|浏览得)"],
            },
            {
                name: "看看#经典", text: "看看#经典", totalSeconds: 20, openType: 'newPage', offset: {x: 40, y: 1},
                durationRegion: [Math.floor(device.width * 0.3), 0, Math.floor(device.width * 0.7), Math.floor(device.height * 0.2)],
                durationText: ["[^\\d\\u4e00-\\u9fa5]*\\d+[^\\d\\u4e00-\\u9fa5]*(?:滑动浏览|浏览得)"],
            },
            {
                name: "浏览页面得通用匹配",
                text: "浏览页面得",
                totalSeconds: 15,
                openType: 'newPage',
                offset: {x: 40, y: 1},
                durationRegion: [Math.floor(device.width * 0.3), 0, Math.floor(device.width * 0.7), Math.floor(device.height * 0.2)],
                durationText: ["[^\\d\\u4e00-\\u9fa5]*\\d+[^\\d\\u4e00-\\u9fa5]*(?:滑动浏览|浏览得)"],
            },
            {name: "领肥料礼包", text: "去领取", altTexts: ["去領取"], openType: 'none'},
            {
                name: "逛淘金币",
                text: "我的足迹看看",
                totalSeconds: 7,
                openType: 'newPageAndClick',
                clickText: "签到领金币",
                offset: {x: 40, y: 1},
                clickRegion: [Math.floor(device.width * 0.1), Math.floor(device.height * 0.1), Math.floor(device.width * 0.8), Math.floor(device.height * 0.3)],
                once: true
            }, {
                name: "逛淘金币",
                text: "去淘金币",
                totalSeconds: 7,
                openType: 'newPageAndClick',
                clickText: "签到领金币",
                offset: {x: 40, y: 1},
                clickRegion: [Math.floor(device.width * 0.1), Math.floor(device.height * 0.1), Math.floor(device.width * 0.8), Math.floor(device.height * 0.3)],
                once: true
            },
            {name: "天天签到", text: "天天签到", totalSeconds: 16, openType: 'newPage', offset: {x: 40, y: 1}, once: true},
            {name: "618", text: "618品牌", totalSeconds: 16, openType: 'newPage', offset: {x: 40, y: 1}, once: true},
            {
                name: "搜一搜", text: "搜一搜你", totalSeconds: 23, openType: 'newTwoPage', offset: {x: 40, y: 1},
                durationRegion: [Math.floor(device.width * 0.3), 0, Math.floor(device.width * 0.7), Math.floor(device.height * 0.2)],
                durationText: ["[^\\d\\u4e00-\\u9fa5]*\\d+[^\\d\\u4e00-\\u9fa5]*(?:滑动浏览|浏览得)"],
            },
            {name: "领取奖励", text: "领取奖励", openType: 'none'},
            {name: "去签到", text: "去签到", openType: 'none', once: true},
            {
                name: "去领60元广告",
                text: "去领60元",
                totalSeconds: 16,
                openType: 'newPage',
                offset: {x: 40, y: 1},
                once: true
            },
            {
                name: "点击3个商品",
                text: "点击3个商品",
                totalSeconds: 10,
                openType: 'newThreePage',
                offset: {x: 40, y: 1},
                once: true
            },
            {
                name: "逛一逛支付宝蚂蚁森林",
                text: "逛一逛支付宝",
                totalSeconds: 6,
                openType: 'goToOtherApp',
                offset: {x: 40, y: 1},
                once: true
            },
            {
                name: "去玩支付宝蚂蚁庄园",
                text: "支付宝蚂",
                totalSeconds: 6,
                openType: 'goToOtherApp',
                offset: {x: 40, y: 1},
                once: true
            },
            {
                name: "去蚂蚁新村收木兰币",
                text: "新村收木兰币",
                totalSeconds: 6,
                openType: 'goToOtherApp',
                offset: {x: 40, y: 1},
                once: true
            },
            {
                name: "去支付宝攒芝麻粒",
                text: "去支付宝",
                totalSeconds: 6,
                openType: 'goToOtherApp',
                offset: {x: 40, y: 1},
                once: true
            }, {
                name: "试玩农场火爆新游",
                text: "试玩农场",
                totalSeconds: 40,
                openType: 'goToOtherApp',
                offset: {x: 40, y: 1},
                noScroll: true,
                checkAfterMs: 30,
                checkTextRegion: [Math.floor(device.width * 0.6), Math.floor(device.height * 0.6), Math.floor(device.width * 0.4), Math.floor(device.height * 0.3)],
                checkText: "任务完成",
            },
            // {
            //     name: "逛逛支付宝芭芭农场",
            //     text: "逛逛支付",
            //     totalSeconds: 13,
            //     openType: 'goToOtherApp',
            //     offset: {x: 40, y: 1},
            //     once: true, noScroll: true
            // },
            {
                name: "去红包签到得肥料",
                text: "去红包签到",
                totalSeconds: 15,
                openType: 'newPage',
                offset: {x: 40, y: 1},
                once: true, noScroll: true
            },
            {
                name: "拍照立即领现金",
                text: "拍照立即",
                totalSeconds: 2,
                openType: 'newPage',
                offset: {x: 40, y: 1},
                once: true,
                noScroll: true
            },
            {
                name: "玩天天", text: "玩天天", totalSeconds: 10,
                openType: 'newPage', offset: {x: 40, y: 1}, once: true, noScroll: true
            },
            {
                name: "看精彩视频",
                text: "看精彩视频",
                totalSeconds: 20,
                openType: 'newPage',
                offset: {x: 40, y: 1},
                once: true,
                noScroll: true
            },
            {name: "农场百科答题", text: "去答题", openType: 'farmQuiz', once: true},
            {
                name: "玩消消乐得肥料",
                text: "玩消消乐",
                openType: 'xiaoxiaole',
                offset: {x: 40, y: 1},
                once: true,
                condition: function() { return global._xiaoxiaoleEnabled; }
            },
            {
                name: "品牌x农场狂补周",
                text: "浏览会场",
                openType: 'newPage',
                totalSeconds: 16,
                offset: {x: 40, y: 1},
                once: true, noScroll: true
            },
            {
                name: "天天开红包",
                text: "天天开红包",
                openType: 'newPage',
                totalSeconds: 6,
                offset: {x: 40, y: 1},
                once: true, noScroll: true, altTexts: ["天天开紅包"]
            },
            {
                name: "去小黑盒抽红包",
                text: "去小黑盒",
                openType: 'newPage',
                totalSeconds: 6,
                offset: {x: 40, y: 1},
                once: true, noScroll: true
            },
            {
                name: "去闲鱼币领现金红包",
                text: "去闲鱼币",
                totalSeconds: 8,
                openType: 'goToOtherApp',
                offset: {x: 40, y: 1},
                once: true, noScroll: true
            },
            {
                name: "去头条极速版刷热点",
                text: "去头条极",
                totalSeconds: 8,
                openType: 'goToOtherApp',
                offset: {x: 40, y: 1},
                once: true, noScroll: true,
                condition: function () { return !!getPackageName("今日头条极速版"); }
            },
            {
                name: "去头条刷热点领现金",
                text: "去头条刷",
                totalSeconds: 8,
                openType: 'goToOtherApp',
                offset: {x: 40, y: 1},
                once: true, noScroll: true,
                condition: function () { return !!getPackageName("今日头条"); }
            },
            {
                name: "玩薅羊毛免费领取话费",
                text: "浏览5s得",
                totalSeconds: 8,
                openType: 'newPage',
                offset: {x: 40, y: 1},
                once: true, noScroll: true
            },
            {
                name: "拍立淘逛感兴趣的宝贝",
                text: "浏览5秒得",
                totalSeconds: 8,
                openType: 'newPage',
                offset: {x: 40, y: 1},
                once: true, noScroll: true
            },
            //兜底方案
            {name: "浏览得奖励", text: "浏览得", totalSeconds: 21, openType: 'newOneOrTwoPage', offset: {x: 40, y: 0}},
        ];
    };
};