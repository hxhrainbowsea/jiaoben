// ============================================================
// start.js - 淘宝自动化 Demo（入口文件）
//
// 模块拆分：
//   config.js       - 全局配置常量
//   utils.js        - 工具函数
//   gesture.js      - 滑动手势
//   recognize.js    - 文字/图标识别 + PaddleOCR
//   console.show()  - 内置日志控制台
//   cache.js        - 任务状态缓存
//   navigation.js   - 页面导航/检测
//   farm.js         - 农场操作（浇水、阳光等）
//   friendHelp.js   - 助力好友
//   taskDefines.js  - 任务定义数组
//
// 启动方式：
//   方式 1：运行 picker.js 选择功能后自动调用本文件
//   方式 2：直接运行本文件（默认全功能执行）
// ============================================================

"auto";

/**
 * 初始化函数：集中管理所有启动前的初始化逻辑
 *
 * 包括：
 *   1. 从 tb_run_config 读取运行参数
 *   2. 解析消消乐棋盘参数（含后备方案）
 *   3. 写入调试配置
 *   4. 注册音量下键停止监听
 *   5. 加载所有模块（config/utils/gesture/recognize/ocrDefines/cache/navigation/taskDefines/farm/friendHelp）
 *   6. 选择识别方法（UI 选择器 / 纯 OCR）
 *   7. 请求截图权限
 *   8. 初始化 PaddleOCR
 *
 * 所有被其他函数引用的变量均挂在 global 上（如 global._taskEnabled）。
 */
function init() {
    log("[初始化] 加载运行配置...");

    // ---- 1. 读取运行配置 ----
    var _runCfg = storages.create('tb_run_config');
    global._taskEnabled = _runCfg.get('task', "true") === "true";
    global._waterEnabled = _runCfg.get('water', "true") === "true";
    global._intimacyEnabled = _runCfg.get('intimacy', "true") === "true";
    global._sunEnabled = _runCfg.get('sun', "true") === "true";
    global._waterMode = _runCfg.get('waterMode', "auto");
    global._waterNum = parseInt(_runCfg.get('waterNum', "10")) || 10;
    global._volumeEnabled = _runCfg.get('volume', "false") === "true";
    // 执行完毕强退 App 列表（JSON 数组，默认空数组 = 不退出任何）
    try {
        global._killAppList = JSON.parse(_runCfg.get('killApp', '[]'));
    } catch (e) {
        global._killAppList = [];
    }
    if (!Array.isArray(global._killAppList)) global._killAppList = [];
    global._debugSaveScreenshot = _runCfg.get('debugSaveScreenshot', "false") === "true";
    global._ocrPure = _runCfg.get('ocrPure', "false") === "true";
    global._isFromPicker = _runCfg.get('task', undefined) !== undefined;

    // ---- 2. 消消乐棋盘参数（用于 handleXiaoxiaoleTask） ----
    global._xiaoxiaoleBoardConfig = null;
    try {
        global._xiaoxiaoleBoardConfig = JSON.parse(_runCfg.get('xiaoxiaoleBoard', 'null'));
    } catch (e) {
        global._xiaoxiaoleBoardConfig = null;
    }
    // 后备：从 tb_ui_config 永久缓存重组
    if (!global._xiaoxiaoleBoardConfig) {
        try {
            var _uiCfg = storages.create('tb_ui_config');
            var left = parseInt(_uiCfg.get('xxlLeft', '0'));
            var top = parseInt(_uiCfg.get('xxlTop', '0'));
            var right = parseInt(_uiCfg.get('xxlRight', '0'));
            var bottom = parseInt(_uiCfg.get('xxlBottom', '0'));
            if (left > 0 && top > 0 && right > 0 && bottom > 0) {
                global._xiaoxiaoleBoardConfig = {
                    boardLeft: left, boardTop: top,
                    boardRight: right, boardBottom: bottom,
                    rows: parseInt(_uiCfg.get('xxlRows', '8')),
                    cols: parseInt(_uiCfg.get('xxlCols', '8')),
                    maxMoves: parseInt(_uiCfg.get('xxlMaxMoves', '5')),
                    swapInterval: parseInt(_uiCfg.get('swapInterval', '2500'))
                };
            }
        } catch (e) {
        }
    }

    // ---- 3. 消消乐开关 ----
    global._xiaoxiaoleEnabled = _runCfg.get('xiaoxiaole', "false") === "true";

    // ---- 4. 写入调试配置（其他模块可能读取 tb_debug_config） ----
    storages.create('tb_debug_config').put('saveScreenshot', global._debugSaveScreenshot);

    // ---- 5. 助力好友参数 ----
    global._helpEnabled = _runCfg.get('help', "true") === "true";
    try {
        global._helpNames = JSON.parse(_runCfg.get('helpNames', '[]'));
    } catch (e) {
        global._helpNames = [];
    }

    // ---- 6. 运行模式（task === "test" 则为测试模式） ----
    global._runMode = _runCfg.get('task', "true");

    // ---- 6b. OCR 测试参数（提前读取，因为 _runCfg 会清空） ----
    global._ocrLeft = parseFloat(_runCfg.get('ocrLeft', '0')) || 0;
    global._ocrTop = parseFloat(_runCfg.get('ocrTop', '0')) || 0;
    global._ocrWidth = parseFloat(_runCfg.get('ocrWidth', '0')) || 0;
    global._ocrHeight = parseFloat(_runCfg.get('ocrHeight', '0')) || 0;
    global._ocrMethod = _runCfg.get('ocrMethod', 'METHOD_PADDLE_OCR');

    // ---- 6c. 消消乐/斗地主测试参数（独立于任务设置） ----
    global._testXxlBoard = null;
    try {
        global._testXxlBoard = JSON.parse(_runCfg.get('testXxlBoard', 'null'));
    } catch (e) {
        global._testXxlBoard = null;
    }

    // 读取后清理缓存，避免下次误读旧数据
    _runCfg.clear();

    // ---- 7. 音量下键停止监听 ----
    global._stopFlag = false;
    global._killCountdownActive = false; // 强制退出倒计时进行中
    global._killAbort = false;           // 倒计时中按音量-取消强杀
    threads.start(function () {
        events.observeKey();
        events.on("key_down", function (keyCode, event) {
            if (keyCode === 25) { // 25 = volume_down
                if (global._killCountdownActive) {
                    // 强制退出倒计时期间：仅取消本次强杀，不终止整个脚本
                    global._killAbort = true;
                    console.log("检测到音量下键按下，取消强制退出");
                } else {
                    global._stopFlag = true;
                    console.log("检测到音量下键按下，停止脚本");
                    exit();
                }
            }
        });
    });

    // ---- 8. 加载模块（工厂模式：传 runtime 和 global，把函数注册到 scope） ----
    log("[初始化] 加载模块...");
    require('./config.js')(runtime, global);
    require('./utils.js')(runtime, global);
    require('./gesture.js')(runtime, global);
    require('./recognize.js')(runtime, global);

    // 根据 UI 开关覆盖识别方法
    if (!global._ocrPure) {
        global.CURRENT_METHOD = global.METHOD_UI_SELECTOR;
        log("使用 UI 选择器模式（无障碍）");
    } else {
        global.CURRENT_METHOD = global.METHOD_MLKIT_OCR;
        log("使用纯 OCR 模式");
    }

    require('./ocrDefines.js')(runtime, global);
    require('./iconDefines.js')(runtime, global);
    require('./cache.js')(runtime, global);
    require('./navigation.js')(runtime, global);
    require('./taskDefines.js')(runtime, global);
    require('./farm.js')(runtime, global);
    require('./friendHelp.js')(runtime, global);

    // ---- 9. 请求截图权限 ----
    log("[初始化] 请求截图权限...");
    sleep(500);
    var _capRet = requestScreenCapture();
    if (!_capRet) {
        sleep(1000);
        _capRet = requestScreenCapture();
    }
    if (!_capRet) {
        log("请求截图权限失败，请手动授予截图权限后重试");
        log("建议: 设置 -> 应用管理 -> Auto.js -> 权限管理 -> 允许截图");
        exit();
    }
    log("截图权限已获取");

    // ---- 10. 初始化 PaddleOCR ----
    log("[初始化] 初始化 PaddleOCR...");
    global.paddlePredictor = initPaddleOcr();
    if (!global.paddlePredictor) {
        if (global._ocrPure) {
            log("PaddleOCR 初始化失败，纯OCR模式需要PaddleOCR");
            exit();
        } else {
            log("PaddleOCR 初始化失败，当前使用UI选择器模式，继续运行");
        }
    }

    log("[初始化] 完成");
}

// ============================================================
// 3. 任务循环（保留在入口，与 taskDefines 紧密耦合）
// ============================================================

/**
 * 任务类型 openType 说明：
 *   'none'          - 仅点击，无需额外操作
 *   'newPage'       - 进入新页面后连续滑动浏览指定秒数，然后返回
 *   'newTwoPage'    - 进入后再进入第二层页面浏览，然后返回
 *   'newOneOrTwoPage'- 检测是否有第二层页面，有则进入，然后浏览返回
 *   'newThreePage'  - 进入页面后点击 3 个商品（各开新页面），每个点击后立即返回
 *   'newPageAndClick' - 进入页面B，点击文本后，返回
 *   'goToOtherApp'  - 跳转到别的app
 *   'farmQuiz'      - 农场百科问答
 *
 * @returns {void}
 */
function taskLoop() {
    var taskDefines = getTaskDefines();

    // ---- 初始化运行时 done 状态 ----
    for (var d = 0; d < taskDefines.length; d++) {
        var td = taskDefines[d];
        td.done = td.once && isTaskDoneToday(td.name);
        if (td.done) {
            log("【" + td.name + "】今日已完成，跳过");
        }
        // 检查执行条件（如目标 app 是否安装）
        if (!td.done && td.condition && !td.condition()) {
            td.done = true;
            log("【" + td.name + "】条件不满足（未安装所需应用），跳过");
        }
    }

    var completedCount = 0;

    var idlePass = 0;
    var maxIdlePass = 1;

    // 任务搜索区域：X > 22% 宽度，Y > 30% 高度（避开顶部横幅/导航等区域）
    var searchRegion = [
        Math.floor(device.width * 0.22),
        Math.floor(device.height * 0.30),
        Math.floor(device.width * 0.78),
        Math.floor(device.height * 0.70)
    ];

    while (idlePass < maxIdlePass) {
        idlePass++;
        var foundInThisPass = false;

        while (true) {
            // ★ 优化：每页只截一次图、OCR 一次，循环对比所有任务 ★
            var ocrResults = ocrCaptureAll(searchRegion, METHOD_MLKIT_OCR);

            var foundOnThisPage = false;

            for (var i = 0; i < taskDefines.length; i++) {
                var t = taskDefines[i];
                if (t.done) continue;

                // 在缓存 OCR 结果中搜索，不重新截图
                // 先尝试主 text，再尝试 altTexts 备选文字（如简繁变体）
                var canFind = findTextInResultsAndClick(ocrResults, t.text, {
                    offsetX: t.offset ? t.offset.x : undefined,
                    offsetY: t.offset ? t.offset.y : undefined
                });
                if (!canFind && t.altTexts && t.altTexts.length > 0) {
                    for (var k = 0; k < t.altTexts.length; k++) {
                        canFind = findTextInResultsAndClick(ocrResults, t.altTexts[k], {
                            offsetX: t.offset ? t.offset.x : undefined,
                            offsetY: t.offset ? t.offset.y : undefined
                        });
                        if (canFind) break;
                    }
                }
                if (canFind) {
                    foundOnThisPage = true;
                    foundInThisPass = true;
                    let taskStatus = true;
                    randomSleep(805, null, 705);
                    if (t.openType === 'newPage') {
                        waitInTaskPage(t);
                        backToTaskPage();
                    } else if (t.openType === 'none') {
                        randomSleep(500, null, 300);
                    } else if (t.openType === 'newTwoPage') {
                        let click = ocrWaitForText("搜索发现", {
                            timeout: 5000,
                            clickWhenFound: true,
                            dx: 300,
                            dy: 200
                        });
                        if (!click) {
                            log("【" + t.name + "】点击搜索发现失败");
                            backToTaskPage();
                            continue;
                        }
                        waitInTaskPage(t);
                        simulateSwipeBack();
                        backToTaskPage();
                    } else if (t.openType === 'newOneOrTwoPage') {
                        randomSleep(805, null, 705);
                        var isTowPage = ocrRecognize("搜索发现") !== null;
                        if (isTowPage) {
                            ocrFindClick("搜索发现", {dx: 300, dy: 200});
                        }
                        waitInTaskPage(t);
                        backToTaskPage();
                    } else if (t.openType === 'newThreePage') {
                        //逻辑:进入页面B，分别点击3个商品，新开页面C，然后可以立即返回页面B
                        randomSleep(2005, null, 1655);
                        var maxAttempts = 3;
                        let k = 0;
                        for (k = 0; k < maxAttempts; k++) {
                            var found = ocrFindClick("点我得", {offsetY: 1});
                            if (found) {
                                randomSleep(3000, null, 2750);
                                simulateSwipeBack();
                            } else {
                                break;
                            }
                        }
                        if (k !== 3) {
                            taskStatus = false;
                        }
                        iconFindClick("close");
                        randomSleep(1005, null, 755);
                        backToTaskPage();
                    } else if (t.openType === 'newPageAndClick') {
                        //逻辑:进入页面B，点击文本后，返回
                        console.hide();
                        ocrWaitForText(t.clickText, {
                            region: t.clickRegion,
                            method: CURRENT_METHOD,
                            clickWhenFound: true
                        });
                        console.show();
                        waitInTaskPage(t);
                        backToTaskPage();
                    } else if (t.openType === 'goToOtherApp') {
                        //跳转到别的app
                        waitInTaskPage(t);

                        // 任务结束后强行停止指定 app（如美团短视频任务结束后强杀美团）
                        if(t.text === '去美团短视频'){
                            app.launch("com.taobao.taobao");
                            simulateSwipeBack();
                            simulateSwipeBack();
                            simulateSwipeBack();
                            simulateSwipeBack();
                        }
                        app.launch("com.taobao.taobao");
                        backToTaskPage(true);
                        if (t.killAppAfter) {
                            forceStopApp(t.killAppAfter);
                            app.launch("com.taobao.taobao");
                        }
                    } else if (t.openType === 'farmQuiz') {
                        var hasPlay = handleFarmQuizTask(t.text, t.offset, searchRegion, t.altTexts);
                        if (!hasPlay) {
                            taskStatus = false;
                        }
                    } else if (t.openType === 'xiaoxiaole') {
                        let hasPlay = handleXiaoxiaoleTask();
                        if (!hasPlay) {
                            taskStatus = false;
                            exit();
                        }
                    }
                    // once 任务标记为已完成（运行时 + 持久缓存）
                    // && taskStatus
                    if (t.once) {
                        t.done = true;
                        markTaskDone(t.name);
                    }
                    completedCount++;
                    randomSleep(805, null, 705);
                    break;
                }
            }

            // 找到了任务 → 重新截图（因为已经执行了点击/跳转，页面内容变了）
            if (foundOnThisPage) continue;

            // 当前页没有可做的任务 → 下滑，检测是否到底
            if (checkEdge('bottom')) {
                break;
            }
        }

        if (foundInThisPass) {
            log("本轮已完成任务，重置空闲轮次");
            idlePass = 0; // 重置空闲轮次，让下一轮继续往下滑找任务
        }
    }
    dismissPopups(2);
    log("所有任务已完成或不存在，共完成 " + completedCount + " 个");
}

/**
 * 处理农场百科问答任务
 *
 * 兼容两种布局：
 *   模式1（上下排列）：选项以 A. XXXX / B. XXXX 纵向排列 → 点击 A. / B. 文字
 *   模式2（左右布局）：左右各一个选项，下方有"选Ta"按钮 → 点击"选Ta"
 *
 * 两种模式共用后续逻辑（查领取奖励→关闭弹窗→返回）。
 *
 * @param {string} taskText     - 任务入口文字
 * @param {object} taskOffset   - 点击偏移 {x, y}
 * @param {Array}  searchRegion - 任务搜索区域 [x,y,w,h]
 * @param {Array}  [altTexts]   - 备选文字数组（如简繁变体），重找任务入口时也会尝试
 * @returns {boolean} 是否全部答完并领取成功
 */
function handleFarmQuizTask(taskText, taskOffset, searchRegion, altTexts) {
    log("===== 处理农场百科问答任务 =====");
    randomSleep(1500, null, 1000);

    var clickOptions = {
        offsetX: 1, offsetY: 1, dx: 200,
        region: [0, Math.floor(device.height * 0.5), device.width, Math.floor(device.height * 0.5)]
    };

    var quizBottomRegion = clickOptions.region;

    // ---- 检测答题模式 ----
    var detectXuanTa = function () {
        var results = ocrCaptureAll(quizBottomRegion, METHOD_PADDLE_OCR);
        var buttons = [];
        if (results) {
            for (var ri = 0; ri < results.length; ri++) {
                var txt = results[ri].text || '';
                if (/选[Tt][Aa]/.test(txt)) {
                    buttons.push(results[ri]);
                }
            }
        }
        buttons.sort(function (a, b) { return a.bounds.left - b.bounds.left; });
        return buttons;
    };

    var xuanTaButtons = detectXuanTa();
    var isLeftRightMode = xuanTaButtons.length >= 2;
    if (isLeftRightMode) {
        log("检测到左右布局(选Ta)，共 " + xuanTaButtons.length + " 个按钮");
    } else {
        log("检测到上下排列(A./B.)模式");
    }

    for (var qa = 0; qa < 2; qa++) {
        var clicked = false;

        if (isLeftRightMode) {
            if (xuanTaButtons[qa]) {
                log("点击第" + (qa + 1) + "个选Ta");
                clickWithOffset(xuanTaButtons[qa].bounds, 1, 1, 0, 0);
                clicked = true;
            } else {
                log("未找到第" + (qa + 1) + "个选Ta按钮");
            }
        } else {
            var choice = qa === 0 ? "B." : "A.";
            log("尝试选择: " + choice);
            clicked = findTextAndClick(choice, METHOD_MLKIT_OCR, clickOptions);
            if (!clicked) {
                log("未找到选项: " + choice);
            }
        }

        if (!clicked) {
            return false;
        }

        randomSleep(2000, null, 1500);

        var has500 = ocrFindClick("领取奖励");
        if (has500) {
            log("找到领取奖励，点击完成");
            randomSleep(2000, null, 1500);
            clicked = clickJiFeiLiao();
            if (!clicked) {
                log("未找到集肥料图标");
                return false;
            }
            return true;
        }

        log("未找到领取奖励，关闭弹窗");
        dismissPopups(2, [Math.floor(device.width * 0.7), Math.floor(device.height * 0.2), Math.floor(device.width * 0.3), Math.floor(device.height * 0.6)]);
        randomSleep(1500, null, 1000);
        clicked = clickJiFeiLiao();
        if (!clicked) {
            log("未找到集肥料图标");
            return false;
        }

        if (qa === 0) {
            randomSleep(1200, null, 1000);
            // 回到任务页后重新截图搜索任务入口（含备选文字）
            var refound = findTextAndClick(
                taskText, METHOD_MLKIT_OCR,
                {
                    offsetX: taskOffset ? taskOffset.x : undefined,
                    offsetY: taskOffset ? taskOffset.y : undefined,
                    region: searchRegion
                }
            );
            if (!refound && altTexts && altTexts.length > 0) {
                for (var ai = 0; ai < altTexts.length; ai++) {
                    refound = findTextAndClick(
                        altTexts[ai], METHOD_MLKIT_OCR,
                        {
                            offsetX: taskOffset ? taskOffset.x : undefined,
                            offsetY: taskOffset ? taskOffset.y : undefined,
                            region: searchRegion
                        }
                    );
                    if (refound) break;
                }
            }
            // 如果是在左右布局模式，重新检测"选Ta"按钮（页面已刷新）
            if (isLeftRightMode) {
                randomSleep(1500, null, 1000);
                xuanTaButtons = detectXuanTa();
                if (xuanTaButtons.length < 2) {
                    log("重新进入后未检测到选Ta按钮，切换为文字模式");
                    isLeftRightMode = false;
                } else {
                    log("重新检测到 " + xuanTaButtons.length + " 个选Ta按钮");
                }
            }
        }
        randomSleep(1000, null, 800);
    }
    return false;
}

/**
 * 处理"玩消消乐得肥料"任务
 *
 * 从任务页面点击"玩消消乐"进入后的完整流程：
 *   1. 等待"连连消"出现（屏幕上方20%）
 *   2. 点击 jiaoshui_close.jpg 关闭弹窗 x5
 *   3. 匹配"第x关"并点击（屏幕下方40%，正则）
 *   4. 点击"开始"（屏幕高度50%~80%）
 *   5. 等待"第x关"出现在左上角（高度<30%，宽度<50%）
 *   6. 出现后点击关闭 x5
 *   7. 开始玩游戏（V2 引擎，maxMoves=5）
 *
 * @returns {void}
 */
function handleXiaoxiaoleTask() {
    log("===== 处理玩消消乐得肥料任务 =====");

    // ---- 0. 检查棋盘配置（必须先在 UI 中设置） ----
    if (!_xiaoxiaoleBoardConfig) {
        log("⚠ 未设置消消乐棋盘参数，请在 UI 中配置后再执行");
        return false;
    }
    log("[棋盘] [" + _xiaoxiaoleBoardConfig.boardLeft + "," + _xiaoxiaoleBoardConfig.boardTop + "]-["
        + _xiaoxiaoleBoardConfig.boardRight + "," + _xiaoxiaoleBoardConfig.boardBottom + "]"
        + "  " + _xiaoxiaoleBoardConfig.rows + "×" + _xiaoxiaoleBoardConfig.cols);

    // ---- 1. 等待"连连消"出现在屏幕上方 20% 区域 ----
    var foundLianLian = iconWaitFor("xiaoxiaole_exit");

    if (!foundLianLian) {
        log("进入游戏超时！");
        return false;
    } else {
        log("【连连消】已出现");
    }
    randomSleep(5000, null, 4700);
    // ---- 2. 点击 jiaoshui_close.jpg 5 次（关掉各种弹窗） ----
    log("点击关闭弹窗...");
    for (var ci = 0; ci < 5; ci++) {
        iconFindClick("jiaoshui_close");
        iconFindClick("xiaoxiaole_close");
        randomSleep(1000, null, 700);
    }

    // ---- 3. 屏幕下方 40% 区域正则匹配"第x关"并点击 ----
    var bottomRegion = [0, Math.floor(device.height * 0.6), device.width, Math.floor(device.height * 0.4)];
    log("在屏幕下方匹配关卡...");
    var levelClicked = ocrFindClick("第\\d+关", {
        region: bottomRegion
    });
    if (!levelClicked) {
        log("未找到关卡选项");
        return false;
    }
    randomSleep(1200, null, 900);

    // ---- 4. 识别"开始"在屏幕高度 50%~80% 并点击 ----
    log("点击【开始】...");
    var startClicked = ocrFindClick("开始");
    if (!startClicked) {
        log("未找到【开始】按钮");
        return false;
    }
    // ---- 5. 等待"第x关"出现在屏幕左上角（高度<30%，宽度<50%） ----
    var levelRegion = [0, 0, Math.floor(device.width * 0.5), Math.floor(device.height * 0.3)];
    log("等待游戏加载...");
    var levelTitle = ocrWaitForText("第\\d+关", {
        timeout: 10000,
        interval: 1000,
        region: levelRegion
    });

    // ---- 6. 出现后点击关闭 5 次 ----
    if (levelTitle) {
        log("游戏已加载，关闭弹窗...");
        for (var ci2 = 0; ci2 < 3; ci2++) {
            iconFindClick("jiaoshui_close");
            iconFindClick("xiaoxiaole_close");
            randomSleep(1000, null, 700);
        }
    } else {
        log("未检测到关卡标题，继续尝试...");
        return false;
    }

    // ---- 7. 开始玩游戏（V2 引擎） ----
    log("加载 V2 消消乐引擎，maxMoves=" + (_xiaoxiaoleBoardConfig.maxMoves || 200) + "...");
    var v2 = require('./match3V2/index.js');
    v2.play(_xiaoxiaoleBoardConfig, _xiaoxiaoleBoardConfig.maxMoves || 200);

    // ---- 返回任务页面 ----
    log("消消乐任务完成，返回任务页面");
    let click = iconFindClick("xiaoxiaole_exit");
    if (!click) {
        log("消消乐返回失败!");
        return false;
    }
    return true;
}

// ============================================================
// 4. 主流程
// ============================================================

/**
 * 主流程入口
 *
 * 完整执行顺序：
 * 1. 创建日志悬浮窗
 * 2. 调低媒体音量防止任务发声
 * 3. 打开任务页面
 * 4. 执行任务循环（taskLoop）
 * 5. 收集阳光
 * 6. 执行其他任务（亲密度等）
 * 7. 执行浇水任务
 * 8. 助力好友
 *
 * @returns {void}
 */
function main() {
    log("脚本启动");

    // 根据音量开关决定是否调低媒体音量
    if (_volumeEnabled) {
        log("调低媒体音量...");
        var am = context.getSystemService(context.AUDIO_SERVICE);
        //am.setStreamVolume(3, 0, 0);   不生效
        // 3 = STREAM_MUSIC，0 = 静音
        for (var i = 0; i < 20; i++) {
            am.adjustStreamVolume(3, android.media.AudioManager.ADJUST_LOWER, 0);
        }
    } else {
        log("音量开关未开启，保持当前音量");
    }

    if (_helpEnabled) {
        helpFriends();
    }
    openNongChangPage();
    if (_taskEnabled) {
        let click = clickJiFeiLiao();
        if (!click) {
            randomSleep(1200)
            click = clickJiFeiLiao();
            if (!click) {
                log("集肥料图标点击失败!");
            }
        }
        click = ocrWaitForText("前往支付宝");
        if (!click) {
            checkIsTaskPage(true)
        }

        taskLoop();
        dismissPopups(2);
        // 再次执行任务循环，确保所有任务完成
        // taskLoop();
        // dismissPopups(2);
    }
    if (_sunEnabled) {
        collectSun();
        dismissPopups(2);
    }

    if (_waterEnabled) {
        jiaoshui();
    }
    if (_intimacyEnabled) {
        processOtherTasks();
    }
    if (_waterEnabled) {
        jiaoshui();
    }
    log("全部执行完毕");

    // 执行完毕后，按系统设置强行退出勾选的 App（清理后台）
    if (global._killAppList && global._killAppList.length > 0) {
        log("【系统设置】执行完毕，强行退出：" + global._killAppList.join(", "));
        global._killAbort = false; // 重置强杀终止标志
        // 把 Auto.js Pro 自身放到最后杀，避免提前结束脚本运行环境
        var _SELF_PKG = "org.autojs.autojspro";
        var _ordered = global._killAppList.slice().sort(function (a, b) {
            var aSelf = (a === _SELF_PKG) ? 1 : 0;
            var bSelf = (b === _SELF_PKG) ? 1 : 0;
            return aSelf - bSelf;
        });
        for (var k = 0; k < _ordered.length; k++) {
            forceStopApp(_ordered[k]);
            if (global._killAbort) {
                // 倒计时中按音量-取消，跳过剩余强杀
                log("已取消强制退出，剩余 App 不处理");
                break;
            }
        }
        log("已强行退出所勾选的 App");
    }
}


function test() {
    sleep(2000)
    log("测试模式：截图");
    var screen = captureScreen();
    if (screen) {
        log("截图成功，尺寸: " + screen.getWidth() + "x" + screen.getHeight());
        screen.recycle();
    }
    log("测试完成");
}

function test11(){
    sleep(2000)
    iconFindClick("shifei", {dy: 0});
    // sleep(2000)
    // iconFindClick("jiaoshui5", {dy: 0});
}

/**
 * 多尺度模板匹配（支持指定区域）
 * @param {Image} screen      - 当前屏幕截图
 * @param {Image} template    - 原始模板图片
 * @param {Array} region      - 搜索区域 [x, y, width, height]，传 null 或 undefined 则全屏搜索
 * @param {Object} options    - 可选配置 { minScale, maxScale, step, threshold }
 * @returns {Object|null}     - 匹配结果 { x, y, scale, score } 或 null
 */
function findCardInRegion(screen, template, region, options) {
    // 1. 解析配置参数
    let minScale = options.minScale || 0.3;
    let maxScale = options.maxScale || 0.5;
    let step = options.step || 0.1;
    let threshold = options.threshold || 0.75;

    // 2. 校验 region 合法性（防止越界导致崩溃）
    let safeRegion = null;
    if (region && region.length === 4) {
        let [rx, ry, rw, rh] = region;
        let sw = screen.getWidth();
        let sh = screen.getHeight();

        // 自动修正超出屏幕边界的区域
        rx = Math.max(0, Math.min(rx, sw - 1));
        ry = Math.max(0, Math.min(ry, sh - 1));
        rw = Math.min(rw, sw - rx);
        rh = Math.min(rh, sh - ry);

        if (rw > 0 && rh > 0) {
            safeRegion = [rx, ry, rw, rh];
        } else {
            log("⚠️ 警告: 传入的 region 无效，已降级为全屏搜索");
        }
    }

    let bestMatch = null;
    let bestScore = 0;

    // 3. 遍历缩放比例进行匹配
    for (let scale = minScale; scale <= maxScale + 0.001; scale += step) {
        // 缩放模板
        let scaledWidth = Math.round(template.getWidth() * scale);
        let scaledHeight = Math.round(template.getHeight() * scale);

        // 如果缩放后的模板比搜索区域还大，直接跳过
        if (safeRegion && (scaledWidth > safeRegion[2] || scaledHeight > safeRegion[3])) {
            continue;
        }
        let scaledTemplate = images.resize(template, [scaledWidth, scaledHeight]);
        try {
            // 构建 matchTemplate 配置
            let matchConfig = {
                method: "CCOEFF_NORMED",
                threshold: threshold
            };
            // 🔥 核心：将安全校验后的 region 注入配置
            if (safeRegion) {
                matchConfig.region = safeRegion;
            }
            let result = images.matchTemplate(screen, scaledTemplate, matchConfig);
            // matchTemplate 返回的是 Matches 对象，取最高分
            if (result && result.matches && result.matches.length > 0) {
                let topMatch = result.matches[0];
                console.log(scale + "：得分：" + topMatch.similarity)
                if (topMatch.similarity > bestScore) {
                    bestScore = topMatch.similarity;
                    bestMatch = {
                        x: topMatch.point.x,
                        y: topMatch.point.y,
                        w: scaledWidth,
                        h: scaledHeight,
                        scale: parseFloat(scale.toFixed(2)),
                        score: parseFloat(topMatch.similarity.toFixed(3))
                    };
                }
            }
        } catch (e) {
            // 捕获个别极端尺寸导致的底层报错，防止中断循环
            console.error(`Scale ${scale.toFixed(2)} failed: ${e}`);
        } finally {
            // ⚠️ 必须回收缩放后的临时图片，防止内存泄漏！
            if (scaledTemplate) scaledTemplate.recycle();
        }
    }

    return bestMatch;
}

/**
 * 消消乐独立测试 —— 直接从测试 tab 传入棋盘参数，不依赖任务环境
 */
function testXxl() {
    log("===== 消消乐测试模式 =====");
    sleep(3000);
    var board = global._testXxlBoard;
    if (!board) {
        log("消消乐测试参数缺失");
        exit();
        return;
    }
    log("[棋盘] [" + board.boardLeft + "," + board.boardTop + "]-["
        + board.boardRight + "," + board.boardBottom + "] "
        + board.rows + "×" + board.cols + "  maxMoves=" + board.maxMoves);
    var v2 = require('./match3V2/index.js');
    v2.play(board, board.maxMoves || 200);
    log("消消乐测试完成");
}

/**
 * OCR 识别测试 —— 从 ui.js 的 OCR 测试面板调用
 */
function ocrTest() {
    var leftRatio = global._ocrLeft || 0;
    var topRatio = global._ocrTop || 0;
    var widthRatio = global._ocrWidth || 0;
    var heightRatio = global._ocrHeight || 0;
    var methodName = global._ocrMethod || 'METHOD_PADDLE_OCR';
    var method = global[methodName];
    if (!method) {
        console.error("未知的 OCR 方法: " + methodName + "，使用默认 PaddleOCR");
        method = global.METHOD_PADDLE_OCR;
    }

    var h = device.height;
    var w = device.width;
    var region = [
        Math.floor(w * leftRatio),
        Math.floor(h * topRatio),
        Math.floor(w * widthRatio),
        Math.floor(h * heightRatio)
    ];

    console.log("==========================================");
    console.log("  OCR 识别测试");
    console.log("==========================================");
    console.log("区域比例: [" + leftRatio + ", " + topRatio + ", " + widthRatio + ", " + heightRatio + "]");
    console.log("区域像素: [" + region[0] + ", " + region[1] + ", " + region[2] + ", " + region[3] + "]");
    console.log("识别方法: " + method);
    console.log("");

    sleep(3000);

    var allResults = ocrCaptureAll(region, method);
    console.log(allResults);

    console.log("");
    console.log("==========================================");
    console.log("OCR 测试完成");
    console.log("==========================================");
}


// ============================================================
// 6. 执行
// ============================================================

try {
    console.show();
    init();
    if (global._runMode === "test") {
        test();
    } else if (global._runMode === "ocrTest") {
        ocrTest();
    } else if (global._runMode === "testXxl") {
        testXxl();
    } else if (global._runMode === "testDdz") {
        testDdz();
    } else if (global._runMode === "calibScale") {
        calibrateOpponentScale();
    } else {
        main();
    }

    try {
        exit();
    } catch (e) {
    }
} catch (e) {
    log("│  错误信息: " + (e.message || e));
    // 打印详细堆栈
    try {
        if (e.stack) {
            var stackLines = e.stack.split("\n");
            for (var sl = 0; sl < Math.min(stackLines.length, 20); sl++) {
                log("│  " + stackLines[sl]);
            }
        } else if (e.getStackTrace) {
            var st = e.getStackTrace();
            log("│  堆栈 (" + st.length + " 层):");
            for (var si = 0; si < Math.min(st.length, 15); si++) {
                var el = st[si].toString();
                // 过滤掉 Android 系统内部调用，只显示 JS 相关
                if (el.indexOf("org.mozilla.javascript") >= 0 || el.indexOf("android.os") >= 0) continue;
                log("│    at " + el);
            }
        } else if (e.printStackTrace) {
            e.printStackTrace();
        }
        // JS 错误位置
        if (e.fileName) log("│  文件: " + e.fileName);
        if (e.lineNumber) log("│  行号: " + e.lineNumber);
        if (e.columnNumber) log("│  列号: " + e.columnNumber);
    } catch (e2) {
        // 忽略
    }
}