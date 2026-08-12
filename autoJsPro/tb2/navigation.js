// ============================================================
// navigation.js - 页面导航 / 页面检测
// 依赖: config.js, utils.js, gesture.js, recognize.js, cache.js
//
// 从 start.js 拆分出的导航相关函数：
//   checkIsTaskPage, backToTaskPage, scrollToTop, checkEdge,
//   dismissPopups, openNongChangPage,
//   reLaunchTB, openNongChangByClose
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    /** 跨调用保持上一次的裁剪图（按方向区分） */
    var _edgeClip = {};

    /**
     * 重新打开淘宝并返回首页（不强制停止 App，避免截图权限丢失）
     *
     * 流程：启动淘宝 → 连续返回 → 检测底部"首页" → 确认回到首页
     *
     * @returns {boolean} 是否成功回到淘宝首页
     *
     * @example
     * if (reopenTBToHome()) { log("已回到首页"); }
     */
    scope.reopenTBToHome = function () {
        log("启动淘宝并返回首页...");
        app.launch("com.taobao.taobao");
        randomSleep(1000);
        app.launch("com.taobao.taobao");
        randomSleep(1000);
        // 用 UI 控件选择器检测首页，不受高亮/选中状态影响（读无障碍树）
        var isHome = function () {
            return ocrRecognize("我的淘宝") !== null;
        };

        if (isHome()) {
            log("已在首页");
            return true;
        }

        for (var i = 0; i < 6; i++) {
            simulateSwipeBack();
            randomSleep(1000, null, 800);
            if (isHome()) {
                log("检测到首页，已回到淘宝首页");
                return true;
            }
        }

        log("无法回到淘宝首页");
        return false;
    };

    /**
     * 检查当前页面是否为任务页面
     *
     * 通过识别页面上特定文字"前往支付宝"来判断是否在正确的任务页面。
     * 若 isStop 为 true 且页面不正确，直接退出脚本。
     *
     * @param {boolean} [isStop] - 页面不正确时是否直接退出脚本
     * @param {boolean} forceStop
     * @returns {boolean} 当前页面是否为任务页面
     *
     * @example
     * if (!checkIsTaskPage()) { log("不在任务页面"); }
     * checkIsTaskPage(true);  // 不对则 exit
     */
    scope.checkIsTaskPage = function (isStop) {
        var isRightPage = ocrRecognize("前往支付宝") !== null;
        if (!isRightPage) {
            log("当前页面不正确...");
            if (isStop) {
                // 页面即将重新加载，清除 edge 裁剪缓存，否则 checkEdge 会拿旧缓存比对新页面
                _edgeClip = {};

                // 不强制关闭 App（关闭后截图权限丢失），改用柔和方式返回首页
                if (!reopenTBToHome()) {
                    log("返回首页失败，已停止");
                    exit();
                }

                // 从首页走正常路径进入农场 → 任务页
                openNongChangPage();
                randomSleep(1000, null, 800);
                dismissPopups(2);
                randomSleep(1000, null, 800);
                clickJiFeiLiao();
                randomSleep(1500, null, 1000);

                if (checkIsTaskPage()) {
                    log("已进入任务页面");
                    return true;
                } else {
                    log("页面寻找失败,已停止");
                    exit();
                }
            }
        }
        return isRightPage;
    };

    /**
     * 返回任务页面（多重尝试）
     *
     * 尝试多次模拟返回手势，每次返回后检查是否回到任务页面。
     * 最多 4 次返回 + 1 次最终检查（失败则 exit）。
     *
     * @returns {boolean} 是否成功回到任务页面
     *
     * @example
     * backToTaskPage();
     */
    scope.backToTaskPage = function (noSwipeFirst) {
        if (!noSwipeFirst) {
            simulateSwipeBack();
        }
        randomSleep(1000, null, 700);
        if (checkIsTaskPage()) return true;

        simulateSwipeBack();
        if (checkIsTaskPage()) return true;

        simulateSwipeBack();
        if (checkIsTaskPage()) return true;

        let click = scope.ocrFindClick("取消");
        if (click) {
            if (checkIsTaskPage()) return true;
        }

        simulateSwipeBack();
        if (checkIsTaskPage(true)) return true;
    };

    /**
     * 下滑到任务列表顶部
     *
     * @returns {void}
     *
     * @example
     * scrollToTop();
     */
    scope.scrollToTop = function () {
        dismissPopups(2, [Math.floor(device.width * 0.75), 0, Math.floor(device.width * 0.25), Math.floor(device.height * 0.5)]);
        randomSleep(2000, null, 1700);
        clickJiFeiLiao();
        randomSleep(1000, null, 800);
    };

    /**
     * 检测页面底部 + 滚动（二合一）
     *
     * 截图对比法：滚动前后截取屏幕底部区域，若内容无变化则判定已到底部。
     *
     * @returns {boolean} true = 已到底部，false = 还有更多内容
     *
     * @example
     * if (checkEdge('bottom')) break;
     * if (checkEdge('top')) break;
     */
    scope.checkEdge = function (edge) {
        var isTop = edge === "top" || edge === "up";

        // 截图区域：底部中间一块
        var rx = Math.floor(device.width * 0.22);
        var ry = Math.floor(device.height * 0.75);
        var rw = Math.floor(device.width * 0.70);
        var rh = Math.floor(device.height * 0.15);

        var full = captureScreen();
        if (!full) return false;
        var clip = images.clip(full, rx, ry, rw, rh);
        full.recycle();
        if (!clip) return false;

        var key = "edge_" + edge;
        var oldClip = _edgeClip[key];

        if (!oldClip) {
            _edgeClip[key] = clip;
            scrollVertical({
                direction: isTop ? "down" : "up",
                startYRatio: isTop ? 0.10 : 0.80,
                distanceRatio: 0.3,
                durationMin: 500, durationMax: 900,
                prePause: 400, postPause: 200
            });
            randomSleep(1200, null, 1000);
            return false;
        }

        var found = images.findImage(clip, oldClip, {threshold: 0.90});
        oldClip.recycle();
        delete _edgeClip[key];

        if (found) {
            clip.recycle();
            return true;
        }

        _edgeClip[key] = clip;
        scrollVertical({
            direction: isTop ? "down" : "up",
            startYRatio: isTop ? 0.10 : 0.80,
            distanceRatio: 0.3,
            durationMin: 500, durationMax: 900,
            prePause: 400, postPause: 200
        });
        randomSleep(1200, null, 1000);
        return false;
    };

    /**
     * 关闭可能的弹出窗口（最多尝试 2 次）
     *
     * 使用模板匹配查找并点击关闭按钮图片。
     * 若一次关掉了弹窗，会再检查一次确认是否还有更多弹窗。
     *
     * @param {number} [maxAttempts] - 最大尝试次数，默认 2
     * @param {Array} [region] - 搜索区域，默认 null 表示全屏
     *
     * @example
     * dismissPopups();
     * dismissPopups(3);
     */
    scope.dismissPopups = function (maxAttempts, region) {
        maxAttempts = maxAttempts || 2;
        for (var i = 0; i < maxAttempts; i++) {
            randomSleep(800, null, 600);
            var closed = null;
            if (region) {
                closed = iconFindClick("taskPageClose", {region: region});
            } else {
                closed = iconFindClick("taskPageClose");
            }

            if (!closed) {
                log("无弹窗或已关闭");
                break;
            }
            log("已关闭弹窗 (" + (i + 1) + "/" + maxAttempts + ")");
        }
    };


    /**
     * 打开芭芭农场任务页面（多重路径导航）
     *
     * 根据当前页面状态选择合适的导航路径：
     * - 已在任务页 → 不做操作
     * - 在集肥料页 → 不做操作（由调用者处理）
     * - 在芭芭农场主页 → 点击"芭芭农场"进入
     * - 在我的淘宝页 → 先点"我的淘宝"→ 再点"芭芭农场"
     * - 其他页面 → 冷启动淘宝 App，按"我的淘宝" → "芭芭农场" 路径导航
     * 最后统一关闭弹窗 + 点击任务入口。
     *
     * @returns {boolean} 是否成功
     *
     * @example
     * openNongChangPage();
     */
    scope.openNongChangPage = function () {
        randomSleep(1000, null, 800);
        let isOnTaskPage = false;
        if (checkIsTaskPage()) {
            isOnTaskPage = true;
        } else if (isJiFeiLiaoPage()) {
            isOnTaskPage = true;
        } else if (ocrRecognize("芭芭农场") !== null) {
            log("在芭芭农场主页，导航到任务页面...");
            ocrFindClick("芭芭农场");
            randomSleep(2000, null, 1700);

        } else if (ocrRecognize("我的淘宝") !== null) {
            log("在我的淘宝页面，导航到任务页面...");
            ocrFindClick("我的淘宝");
            randomSleep(2000, null, 1500);
            ocrFindClick("芭芭农场");
            randomSleep(2000, null, 1700);
        } else {
            reopenTBToHome();
            randomSleep(5000, null, 3000);
            ocrFindClick("我的淘宝");
            randomSleep(2000, null, 1500);
            ocrFindClick("芭芭农场");
            randomSleep(2000, null, 1700);
        }
        if (!isOnTaskPage) {
            iconWaitFor("jifeiliao_icon", {
                threshold: 0.7,
                closePopup: {
                    templatePath: "./images/taskPageClose.jpg",
                    threshold: 0.7
                }
            });
        }
        dismissPopups(2);
        iconFindClick("tuzi");

        // 每天只点一次"点击领取"
        if (!isTaskDoneToday("点击领取")) {
            randomSleep(1000, null, 700);
            let click = ocrFindClick("点击领取");
            if (click) {
                markTaskDone("点击领取");
            }
        }

        return true;
    };

    /**
     * 强行重启淘宝 App
     *
     * 通过系统设置 → 强行停止 → 冷启动的方式彻底重启淘宝。
     * 找不到强行停止按钮时，回退到最近任务列表划掉。
     *
     * @example
     * reLaunchTB();
     */
    scope.reLaunchTB = function () {
        log("通过系统设置强行停止淘宝进程...");
        app.openAppSetting("com.taobao.taobao");
        randomSleep(2000, null, 1700);
        // 查找"强行停止"按钮
        var stopBtn = text("强行停止").findOne(3000)
            || text("强制停止").findOne(2000)
            || text("强行关闭").findOne(2000)
            || text("Force stop").findOne(2000)
            || textStartsWith("强行").findOne(1500)
            || textStartsWith("强制").findOne(1500);
        if (stopBtn) {
            log("找到停止按钮，点击...");
            stopBtn.click();
            randomSleep(1000, null, 800);
            // 第一次确认弹窗
            var confirmBtn = text("强行停止").findOne(1000)
                || text("强制停止").findOne(1000)
                || text("强行关闭").findOne(1000)
                || text("Force stop").findOne(1000)
                || textStartsWith("强行").findOne(1000)
                || textStartsWith("强制").findOne(1000)
                || text("确定").findOne(1000)
                || text("确认").findOne(1000)
                || text("OK").findOne(1000);
            if (confirmBtn) {
                confirmBtn.click();
                log("点击强行停止确认弹窗");
                randomSleep(800, null, 600);
                // 部分 ROM 有二次确认弹窗，再点一次
                var confirm2 = text("强行停止").findOne(1000)
                    || text("强制停止").findOne(1000)
                    || text("强行关闭").findOne(1000)
                    || text("Force stop").findOne(1000)
                    || textStartsWith("强行").findOne(1000)
                    || textStartsWith("强制").findOne(1000)
                    || text("确定").findOne(1000)
                    || text("确认").findOne(1000)
                    || text("OK").findOne(1000);
                if (confirm2) {
                    confirm2.click();
                    log("点击二次确认弹窗");
                    randomSleep(500, null, 400);
                }
            }
            log("已停止淘宝进程");
        } else {
            log("未找到停止按钮，回退到最近任务划掉");
            home();
            randomSleep(500, null, 400);
            recents();
            randomSleep(1500, null, 1200);
            var fx = Math.floor(device.width / 2);
            var fy0 = Math.floor(device.height * 0.6);
            var fy1 = Math.floor(device.height * 0.02);
            gesture(350, [fx, fy0], [fx, fy1]);
        }
        randomSleep(2000, null, 1500);
        log("重新启动淘宝并导航到芭芭农场...");
        app.launch("com.taobao.taobao");
        randomSleep(5000, null, 3000);
    };

    /**
     * 通过系统设置强行停止某个 App（不重新打开）
     *
     * 复用 reLaunchTB 的"强行停止"思路：打开应用设置 → 点击强行停止 → 处理确认弹窗。
     * 与 reLaunchTB 不同之处在于：本函数只杀进程、不冷启动，用于"执行完毕后清理后台"。
     *
     * @param {string} pkg - 应用包名，如 com.taobao.taobao / com.eg.android.AlipayGphone
     * @returns {boolean} 是否尝试了停止操作
     *
     * @example
     * forceStopApp("com.taobao.taobao");
     * forceStopApp("com.eg.android.AlipayGphone");
     */
    /**
     * 包名 → 显示名（用于倒计时提示）
     */
    function pkgNameToLabel(pkg) {
        if (pkg === "com.taobao.taobao") return "淘宝";
        if (pkg === "com.eg.android.AlipayGphone") return "支付宝";
        if (pkg === "org.autojs.autojspro") return "Auto.js Pro";
        return pkg;
    }

    scope.forceStopApp = function (pkg) {
        if (!pkg) return false;
        var _name = pkgNameToLabel(pkg);
        console.log("【强制退出】准备退出 " + _name + " (" + pkg + ")");

        // 倒计时 5 秒，给用户"按音量-终止"的机会
        global._killCountdownActive = true;
        for (var _c = 5; _c >= 1; _c--) {
            console.log("将在 " + _c + " 秒后强制退出 " + _name + "（按音量-可终止）");
            sleep(1000);
            if (global._killAbort) {
                global._killCountdownActive = false;
                console.log("【强制退出】已终止退出 " + _name);
                return false;
            }
        }
        global._killCountdownActive = false;

        log("通过系统设置强行停止 " + pkg + " ...");
        try {
            app.openAppSetting(pkg);
        } catch (e) {
            log("打开 " + pkg + " 应用设置失败: " + (e.message || e));
            return false;
        }
        randomSleep(2000, null, 1700);

        // 查找"强行停止"按钮（兼容多种 ROM 文案）
        var stopBtn = text("强行停止").findOne(3000)
            || text("强制停止").findOne(2000)
            || text("强行关闭").findOne(2000)
            || text("Force stop").findOne(2000)
            || textStartsWith("强行").findOne(1500)
            || textStartsWith("强制").findOne(1500);

        if (stopBtn) {
            log("找到停止按钮，点击...");
            stopBtn.click();
            randomSleep(1000, null, 800);

            // 第一次确认弹窗
            var confirmBtn = text("强行停止").findOne(1000)
                || text("强制停止").findOne(1000)
                || text("强行关闭").findOne(1000)
                || text("Force stop").findOne(1000)
                || textStartsWith("强行").findOne(1000)
                || textStartsWith("强制").findOne(1000)
                || text("确定").findOne(1000)
                || text("确认").findOne(1000)
                || text("OK").findOne(1000);
            if (confirmBtn) {
                confirmBtn.click();
                log("点击强行停止确认弹窗");
                randomSleep(800, null, 600);
                // 部分 ROM 有二次确认弹窗，再点一次
                var confirm2 = text("强行停止").findOne(1000)
                    || text("强制停止").findOne(1000)
                    || text("强行关闭").findOne(1000)
                    || text("Force stop").findOne(1000)
                    || textStartsWith("强行").findOne(1000)
                    || textStartsWith("强制").findOne(1000)
                    || text("确定").findOne(1000)
                    || text("确认").findOne(1000)
                    || text("OK").findOne(1000);
                if (confirm2) {
                    confirm2.click();
                    log("点击二次确认弹窗");
                    randomSleep(500, null, 400);
                }
            }
            log("已停止 " + pkg + " 进程");
        } else {
            log("未找到停止按钮，无法强制退出 " + pkg);
            return false;
        }
        randomSleep(1000, null, 800);
        home();
        return true;
    };

    /**
     * 杀掉淘宝进程，重新打开芭芭农场
     *
     * 先强制停止淘宝，等待进程释放，再走完整的打开流程。
     * 适用于页面卡死、无法正常返回等场景。
     *
     * @returns {boolean} 是否成功进入
     *
     * @example
     * openNongChangByClose();
     */
    scope.openNongChangByClose = function () {
        reopenTBToHome();
        ocrFindClick("我的淘宝");
        randomSleep(2000, null, 1500);
        ocrFindClick("芭芭农场");
        randomSleep(2000, null, 1700);
        dismissPopups(2);
        iconFindClick("tuzi");

        // 每天只点一次"点击领取"
        if (!isTaskDoneToday("点击领取")) {
            randomSleep(1000, null, 700);
            ocrFindClick("点击领取");
            markTaskDone("点击领取");
        }
        return true;
    };

    /**
     * 通过 jifeiliao_icon 图标查找并点击"集肥料"按钮
     *
     * 替代原有的 OCR 文字识别方式，使用模板匹配图标，
     * 更稳定、更快速。默认在屏幕右半侧中下部搜索。
     *
     * @param {Object} [options] - 可选参数，覆盖 findIconAndClick 默认值
     * @param {Array} [options.region] - 搜索区域 [x, y, w, h]，默认屏幕右半侧中下部
     * @param {number} [options.threshold] - 模板匹配阈值，默认 0.7
     * @returns {boolean} true=点击成功, false=未找到图标
     *
     * @example
     * clickJiFeiLiao();
     * clickJiFeiLiao({ region: [0, 0, device.width, device.height], threshold: 0.8 });
     */
    scope.clickJiFeiLiao = function (options) {
        // UI_SEL 模式：优先用 UI_SELECTOR 文字匹配（原始行为）
        if (global._ocrPure !== true) {
            if (scope.ocrFindClick("集肥料")) return true;
        }
        randomSleep(800);
        return iconFindClick("jifeiliao_icon", options);
    };

    /**
     * 检测当前页面是否存在"集肥料"按钮（图标匹配）
     *
     * @param {Object} [options] - 可选参数，覆盖 findIconByTemplate 默认值
     * @param {Array} [options.region] - 搜索区域，默认屏幕右半侧中下部
     * @param {number} [options.threshold] - 模板匹配阈值，默认 0.7
     * @returns {boolean} true=页面上有集肥料
     *
     * @example
     * if (isJiFeiLiaoPage()) { log("在集肥料页面"); }
     * if (isJiFeiLiaoPage({ threshold: 0.8 })) { log("精确匹配"); }
     */
    scope.isJiFeiLiaoPage = function (options) {
        // UI_SEL 模式：优先用 UI_SELECTOR 文字匹配
        if (global._ocrPure !== true) {
            if (scope.ocrRecognize("集肥料")) return true;
        }
        options = options || {};
        if (!options.region) {
            options.region = [
                Math.floor(device.width * 0.5),
                Math.floor(device.height * 0.7),
                Math.floor(device.width * 0.4),
                Math.floor(device.height * 0.2)
            ];
        }
        if (options.threshold === undefined) options.threshold = 0.7;
        return findIconByTemplate("./images/jifeiliao_icon.jpg", options) !== null;
    };
};