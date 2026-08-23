// ============================================================
// farm.js - 农场操作（浇水、施肥、收集阳光等）
// 依赖: config.js, utils.js, gesture.js, recognize.js, cache.js, navigation.js
//
// 从 start.js 拆分出的农场相关函数：
//   processOtherTasks, handleWaterRoutine, jiaoshui,
//   jiaoshuiAuto, jiaoshuiToTarget, collectSun
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    /** 理论肥料剩余值（首次OCR初始化，后续手动扣减+OCR校检） */
    var _fertilizerTheoretical = -1;

    /**
     * 处理其他任务（领取亲密度 + 浇水）
     *
     * 流程：
     * 1. 打开农场任务页
     * 2. 查找"亲密度"并点击
     * 3. 循环点击"立即领取"（最多 3 次）
     * 4. 关闭两次弹窗确认
     *
     * @returns {void}
     *
     * @example
     * processOtherTasks();
     */
    scope.processOtherTasks = function () {
        openNongChangPage();
        //领取亲密度
        var isClicked = ocrFindClick("亲密度");
        if (isClicked) {
            randomSleep(800, null, 600);
            var maxAttempts = 3;
            for (var i = 0; i < maxAttempts; i++) {
                randomSleep(1200, null, 1000);
                isClicked = ocrFindClick("立即领取");
                if (!isClicked) {
                    break;
                }
            }
            dismissPopups(2);
        } else {
            log("【领取亲密度】未找到，跳过领取");
        }
    };

    var guangFoundHasDoneToday = false;
    /** 全屏广告今日是否已处理过（同「逛精选商品」模式：处理成功后标记，当天不再重复 OCR 检测） */
    var adHasDoneToday = false;

    // ============================================================
    // 全屏广告拦截（浇水过程中可能突然弹出全屏广告，每天只处理一次）
    //
    // 两处识别，任一命中即进入处理：
    //   A. 弹框刚弹出：屏幕下方 30% 区域，同时出现 "立即领取" 和 "2400"
    //   B. 已在广告浏览页 B（误操作已点进/弹框已点）：屏幕上方 25% 区域出现 "完成所有任务得2400肥料"
    //
    // 处理流程：
    //   1. 弹框状态先点击 "立即领取" 进入广告浏览页 B（已在 B 则跳过点击）
    //   2. 滑动浏览，最长 _AD_BROWSE_SECONDS 秒（默认 70）
    //   3. 屏幕上方出现 "恭喜完成所有任务" 则提前结束
    //   4. 返回浇水页面，继续浇水
    //   5. markTaskDone("全屏广告2400") 标记今日已完成，当天不再重复 OCR 检测
    // ============================================================

    var _AD_BROWSE_SECONDS = 100;     // 广告浏览页 B 最长浏览时长（秒）

    /**
     * 检测并处理浇水过程中弹出的全屏广告（两处识别，每天只处理一次）
     *
     * 参照「逛精选商品」模式：OCR_DEFS 配置 + ocrRecognize/ocrFindClick 调用 + hasDoneToday 标记。
     *
     * 识别A（弹框）：OCR_DEFS「2400」（MLKIT+下方30%）确认弹框特征，
     *   再 ocrFindClick「立即领取」（extraOptions 覆盖为 MLKIT+下方30%+模糊匹配）点击进入浏览页。
     * 识别B（已在浏览页B）：OCR_DEFS「完成所有任务得2400肥料」（MLKIT+上方25%），
     *   广告瞬间弹出时可能误点进 B（正在滑动浏览），跳过点击直接进入浏览处理。
     *
     * @returns {boolean} true=检测到广告并已处理；false=未检测到广告或今日已处理过
     */
    scope.handleWaterAd = function () {
        // 每天只处理一次：已标记完成则直接跳过，不再 OCR（同「逛精选商品」）
        if (adHasDoneToday) return false;

        var w = device.width;
        var h = device.height;
        var topRegion = [0, 0, w, Math.floor(h * 0.25)];    // 浏览页B特征文字区域（同「恭喜完成所有任务」）
        var bottomRegion = [0, Math.floor(h * 0.7), w, Math.floor(h * 0.3)];  // 弹框识别区域（下方30%）

        // ---- 1. 两处识别（任一命中即进入处理） ----
        // 识别B：已在广告浏览页 B（误操作已点进，正处于滑动浏览）→ 不点击，直接浏览
        //   OCR_DEFS「完成所有任务得2400肥料」= MLKIT + 上方25%
        var inPageB = ocrRecognize("完成所有任务得2400肥料") !== null;
        // 识别A：弹框刚弹出（下方30%「立即领取」+「2400」同屏）→ 需先点击领取
        //   「2400」走 OCR_DEFS 配置（MLKIT+下方30%）验证弹框特征；
        //   「立即领取」覆盖为 MLKIT+下方30%+模糊匹配（OCR_DEFS 默认 PADDLE+中上40%+exactMatch，点击偏移默认 CLICK_OFFSET 10/10）
        var clicked = false;
        if (!inPageB && ocrRecognize("2400") !== null) {
            clicked = ocrFindClick("立即领取", {method: METHOD_MLKIT_OCR, region: bottomRegion, exactMatch: false});
        }
        // 两处都未命中 → 无广告
        if (!inPageB && !clicked) {
            log("【广告拦截】未检测到广告（弹框「立即领取」+「2400」/ 浏览页「完成所有任务得2400肥料」均未命中）");
            return false;
        }

        // ---- 2. 进入浏览页（弹框状态先点击领取，已在 B 则跳过） ----
        if (clicked) {
            log("【广告拦截】检测到全屏广告（立即领取 + 2400），点击「立即领取」进入浏览页");
            randomSleep(2500, null, 2000);
        } else {
            log("【广告拦截】已在广告浏览页 B（识别到「完成所有任务得2400肥料」），直接开始浏览");
        }

        // ---- 3. 广告浏览页 B：滑动浏览，最长 _AD_BROWSE_SECONDS 秒 ----
        //      屏幕上方出现 "恭喜完成所有任务" 则提前结束（公用 waitInTaskPage，强制 MLKIT 识别）
        waitInTaskPage({
            totalSeconds: _AD_BROWSE_SECONDS,
            checkText: "恭喜完成所有任务",
            checkTextRegion: topRegion,
            checkAfterSeconds: 65,       // 60秒后才开始检测完成文字
            method: METHOD_MLKIT_OCR    // 广告页是 WebView，UI 树不可靠，必须像素级 OCR
        });
        simulateSwipeBack();
        log("【广告拦截】浏览结束（最长 " + _AD_BROWSE_SECONDS + " 秒）");

        // ---- 4. 返回浇水页面（广告页未自动关闭时才需要返回） ----
        // 复用 OCR_DEFS「亲密度」配置（region 已内置），uiSel:true 允许走 UI_SELECTOR 快路径：
        // 浇水页 UI 树精确命中，广告页 UI 树无此文字 → null → 正确判断不在农场页
        var isOnFarmPage = function () {
            return ocrRecognize("亲密度") !== null;
        };
        if (!isOnFarmPage()) {
            randomSleep(800, null, 600);
            simulateSwipeBack();
            randomSleep(1500, null, 1200);
            if (!isOnFarmPage()) {
                log("【广告拦截】浏览页未完全关闭，再退一层");
                simulateSwipeBack();
                randomSleep(1500, null, 1200);
            }
        } else {
            log("【广告拦截】已在农场浇水页，无需返回");
        }

        // ---- 5. 标记今日已完成（同「逛精选商品」：当天不再重复 OCR 检测） ----
        markTaskDone("全屏广告2400");
        adHasDoneToday = true;

        log("【广告拦截】处理完成，继续浇水");
        return true;
    };

    /**
     * 浇水后处理弹框（逛精选商品、施肥弹框、关闭弹框）
     * @returns {boolean} true=还有奖励可领
     */
    scope.handleWaterRoutine = function () {
        // ★ 全屏广告拦截：浇水过程中可能突然弹出全屏广告，检测到则浏览广告后返回继续
        handleWaterAd();
        // "逛精选商品"每天只出现一次，已处理过则跳过 OCR
        var guangFound = false;
        if (!guangFoundHasDoneToday) {
            guangFound = ocrFindClick("逛精选商品");
            if (guangFound) {
                scrollVerticalMultiple({totalSeconds: 22});
                simulateSwipeBack();
                randomSleep(1000, null, 800);
                markTaskDone("逛精选商品");
                guangFoundHasDoneToday = true;
            }
        }
        let hasFound = iconFindClick("jiaoshui_feiliao");
        if (hasFound) {
            randomSleep(1000, null, 800);
        }
        //关闭浇水时的弹框
        iconFindClick("jiaoshui_close", {region: [Math.floor(device.width * 0.4), Math.floor(device.height * 0.5), Math.floor(device.width * 0.5), Math.floor(device.height * 0.4)]});
        // 第二次检查（如果当天还没处理过才需要）——全屏广告同「逛精选商品」，处理完弹框后再补查一次

        handleWaterAd();

        // 第二次检查（如果当天还没处理过才需要）
        if (!guangFoundHasDoneToday) {
            guangFound = ocrFindClick("逛精选商品");
            if (guangFound) {
                scrollVerticalMultiple({totalSeconds: 22});
                simulateSwipeBack();
                randomSleep(1000, null, 800);
                markTaskDone("逛精选商品");
                guangFoundHasDoneToday = true;
            }
        }
        //检查还有没有奖励
        return ocrRecognize(["次可领","加码"]) !== null;
    };

    /**
     * 浇水施肥（主入口）
     *
     * 四种模式：
     *   auto      = 浇水至所有奖励领完
     *   count     = 固定浇水指定次数
     *   target    = 浇水至目标次数（默认 204 次）
     *   fertilizer = 用完所有肥料
     */
    scope.jiaoshui = function () {
        // 先进入农场页面（所有模式都需要）
        openNongChangPage();

        // 检查 1：浇水次数是否已达上限
        var curCount = getMyWaterCount();
        if (curCount >= 200) {
            log("【浇水】当前已浇水 " + curCount + " 次，已达上限200，跳过");
            return;
        }

        // 检查 2：剩余肥料是否够浇至少1次（600）
        var fertCount = scope.getFertilizerCount();
        if (fertCount >= 0 && fertCount < 600) {
            log("【浇水】剩余肥料 " + fertCount + " < 600，跳过");
            return;
        }
        guangFoundHasDoneToday = isTaskDoneToday("逛精选商品");
        adHasDoneToday = isTaskDoneToday("全屏广告2400");
        if (_waterMode === "count") {
            if (_waterNum <= 0) {
                log("【固定浇水】次数无效，跳过本次浇水");
                return;
            }
            // 多次确认：精确浇到目标总次数（curCount + _waterNum，封顶 204），只补差额、不超额（最多 5 轮）
            var _targetTotal = Math.min(curCount + _waterNum, 204);
            var _prevConfirm = -1;
            for (var _retry = 0; _retry < 5; _retry++) {
                // 首轮用已知次数，后续轮重新读取（jiaoshuiToTarget 只浇差额，重试不会超额）
                var _current = _retry === 0 ? curCount : undefined;
                jiaoshuiToTarget(_targetTotal, _current);
                // 重新检查当前浇水次数
                var _confirmCount = getMyWaterCount();
                if (_confirmCount >= _targetTotal) {
                    log("【固定浇水】确认已达 " + _confirmCount + " 次（目标 " + _targetTotal + " 次），浇水完成");
                    break;
                }
                if (_confirmCount === _prevConfirm) {
                    log("【固定浇水】次数未变化（" + _confirmCount + " 次），可能已达上限，停止重试");
                    break;
                }
                _prevConfirm = _confirmCount;
                if (_confirmCount === -1) {
                    log("【固定浇水】确认次数失败，继续尝试");
                } else {
                    log("【固定浇水】当前 " + _confirmCount + " 次，未达目标 " + _targetTotal + " 次，继续第 " + (_retry + 2) + " 轮");
                }
            }
        } else if (_waterMode === "target") {
            // 循环浇水直到确认达到目标次数（最多 5 轮）
            var _prevConfirm = -1;
            for (var _retry = 0; _retry < 5; _retry++) {
                var _current = _retry === 0 ? curCount : undefined;
                jiaoshuiToTarget(204, _current);
                // 重新检查当前浇水次数
                var _confirmCount = getMyWaterCount();
                if (_confirmCount >= 204 || _confirmCount >= 200) {
                    log("【浇水】确认已达 " + _confirmCount + " 次，浇水完成");
                    break;
                }
                if (_confirmCount === _prevConfirm) {
                    log("【浇水】次数未变化（" + _confirmCount + " 次），可能已达上限，停止重试");
                    break;
                }
                _prevConfirm = _confirmCount;
                if (_confirmCount === -1) {
                    log("【浇水】确认次数失败，继续尝试");
                } else {
                    log("【浇水】当前 " + _confirmCount + " 次，未达目标，继续第 " + (_retry + 2) + " 轮");
                }
            }
        } else if (_waterMode === "fertilizer") {
            jiaoshuiAllFertilizer();
        } else {
            // 自动模式：多次确认，奖励全部领完才结束（最多 5 轮）
            for (var _retry = 0; _retry < 5; _retry++) {
                jiaoshuiAuto();
                // 重新检查是否还有奖励可领（handleWaterRoutine 会顺手处理本轮奖励）
                var _hasReward = handleWaterRoutine();
                if (!_hasReward) {
                    log("【自动浇水】确认奖励已全部领取，浇水完成");
                    break;
                }
                log("【自动浇水】第 " + (_retry + 1) + " 轮后仍有奖励，继续第 " + (_retry + 2) + " 轮");
            }
        }
    };

    /**
     * 浇水至奖励领完（自动模式）
     *
     * 每次浇水5次，直到没有奖励为止。
     */
    scope.jiaoshuiAuto = function () {
        log("【自动浇水】模式：至奖励领完");

        //设置每次浇水5次
        iconFindClick("jiaoshui1");

        var maxAttempts = 30;
        var beforeFertForCheck = -1;  // 3轮前记录的肥料值
        var c = 0;
        var _shifeiRetryAuto = 0;
        for (var i = 0; i < maxAttempts; i++) {
            c++;
            // 每3轮：先校验3轮前记录的值，再记录当前值供3轮后用
            if (c > 0 && c % 3 === 0) {
                if (c > 3) {
                    if (beforeFertForCheck >= 0 && !scope.checkFertilizerConsumed(beforeFertForCheck)) {
                        break;
                    }
                }
                beforeFertForCheck = scope.getFertilizerCount();
            }

            var hasReward = handleWaterRoutine();
            if (!hasReward) {
                //sb老弹窗，需要二次确认
                randomSleep(1500);
                hasReward = handleWaterRoutine();
                if (!hasReward) {
                    log("【自动浇水】所有奖励已领取完毕");
                    break;
                }
            }
            //施肥进入下一轮（会自动浇水5次）
            if (!iconFindClick("shifei")) {
                _shifeiRetryAuto++;
                if (_shifeiRetryAuto >= 5) {
                    log("【施肥】连续失败5次，跳出循环");
                    break;
                }
                log("【施肥】失败，重试");
                randomSleep(1500, null, 1000);
                i--;
                c--;
                continue;
            }
            randomSleep(1200, null, 1000);

            // 扣减理论值（5次×600=3000）
            scope.consumeFertilizer(5 * 600);
        }
    };


    /**
     * 从亲密度弹框中获取当前浇水次数
     *
     * 流程：
     * 1. 在农场页面点击"亲密度"
     * 2. 弹框显示合种成员列表，其中包含"我自己"和"施肥 X 次"
     * 3. OCR 识别"我自己"位置 → 向上找"施肥 X 次" → 提取数字
     * 4. 关闭弹框
     *
     * @returns {number} 当前浇水次数，失败返回 -1
     */
    scope.getMyWaterCount = function () {
        // 点击亲密度
        var clicked = ocrFindClick("亲密度");
        if (!clicked) {
            log("【浇水次数】未找到亲密度入口");
            return -1;
        }
        randomSleep(1500, null, 1200);

        let result = ocrWaitForText("我自己")
        if (!result) {
            log("【浇水次数】OCR 未识别到任何文字");
            dismissPopups(2);
            return -1;
        }
        let myBounds = result.bounds;
        log("【浇水次数】找到我自己 at (" + myBounds.left + "," + myBounds.top + ")");

        // 向上 10% 屏幕高度范围内找"施肥 X 次"
        var textWidth = myBounds.right - myBounds.left;
        var expandX = Math.floor(textWidth * 1.0);
        var upperHeight = Math.floor(device.height * 0.10);
        var upperRegion = [
            Math.max(device.width * 0.1, myBounds.left - expandX),
            Math.max(device.height * 0.50, myBounds.top - upperHeight),
            Math.min(device.width, myBounds.right + expandX) - Math.max(0, myBounds.left - expandX),
            upperHeight
        ];

        var upperResults = ocrCaptureAll(upperRegion, METHOD_MLKIT_OCR);
        if (!upperResults || upperResults.length === 0) {
            upperResults = ocrCaptureAll(upperRegion, METHOD_PADDLE_OCR);
        }

        var count = -1;
        if (upperResults) {
            for (var k = 0; k < upperResults.length; k++) {
                var item = upperResults[k];
                var text = item.label || item.text || "";
                if (text.indexOf("施肥") >= 0 && text.indexOf("次") >= 0) {
                    var match = text.match(/(\d+)/);
                    if (match) {
                        count = parseInt(match[1]);
                        break;
                    }
                }
            }
            // 降级：找含"次"的
            if (count === -1) {
                for (var m = 0; m < upperResults.length; m++) {
                    var item2 = upperResults[m];
                    var text2 = item2.label || item2.text || "";
                    if (text2.indexOf("次") >= 0) {
                        var match2 = text2.match(/(\d+)/);
                        if (match2) {
                            count = parseInt(match2[1]);
                            break;
                        }
                    }
                }
            }
        }

        // 关闭亲密度弹框
        dismissPopups(2);
        randomSleep(500, null, 400);

        if (count === -1) {
            log("【浇水次数】未能提取到浇水次数");
        } else {
            log("【浇水次数】当前已浇水 " + count + " 次");
        }
        return count;
    };

    /** OCR 识别肥料剩余次数 */
    scope.getFertilizerCount = function () {
        var searchRegion = [
            Math.floor(device.width * 0.20),
            Math.floor(device.height * 0.50),
            Math.floor(device.width * 0.50),
            Math.floor(device.height * 0.50)
        ];

        var results = ocrCaptureAll(searchRegion, METHOD_MLKIT_OCR);
        if (!results || results.length === 0) {
            results = ocrCaptureAll(searchRegion, METHOD_PADDLE_OCR);
        }

        var raw = -1;
        if (results && results.length > 0) {
            for (var j = 0; j < results.length; j++) {
                var item = results[j];
                var rawText = item.label || item.text || "";
                var cleaned = rawText.replace(/^[^\u4e00-\u9fff]+/, "");
                if (cleaned.indexOf("肥料") === 0) {
                    var match = cleaned.match(/(\d+)/);
                    if (match) {
                        raw = parseInt(match[1]);
                        break;
                    }
                }
            }
        }

        if (raw < 0) {
            log("【肥料识别】OCR 未识别到肥料数据，使用理论值 " + (_fertilizerTheoretical >= 0 ? _fertilizerTheoretical : "无"));
            return _fertilizerTheoretical >= 0 ? _fertilizerTheoretical : -1;
        }

        // ---- 理论值校检（防错误OCR识别打乱计数器） ----
        // 真实剩余 >= 理论值 - 6000 → 可信（允许有误差），更新理论值
        // 真实剩余 <  理论值 - 6000 → OCR可能读错了，抛弃
        if (_fertilizerTheoretical < 0) {
            log("【肥料识别】首次进入浇水，初始化理论值=" + raw);
            _fertilizerTheoretical = raw;
        } else if (raw >= _fertilizerTheoretical - 6000) {
            log("【肥料识别】OCR=" + raw + " >= 理论=" + _fertilizerTheoretical + " - 6000，可信，更新理论值");
            _fertilizerTheoretical = raw;
        } else {
            log("【肥料识别】OCR=" + raw + " << 理论=" + _fertilizerTheoretical + "（差 " + (_fertilizerTheoretical - raw) + " > 6000），不可置信，跳过");
        }
        return _fertilizerTheoretical;
    };

    /**
     * 手动扣减理论肥料值（浇水成功后调用）
     * @param {number} amount - 消耗的肥料数（5次×600=3000）
     */
    scope.consumeFertilizer = function (amount) {
        if (_fertilizerTheoretical >= 0) {
            _fertilizerTheoretical -= amount;
            if (_fertilizerTheoretical < 0) _fertilizerTheoretical = 0;
            log("【肥料跟踪】理论剩余 " + _fertilizerTheoretical + "（已消耗 " + amount + "）");
        }
    };

    /**
     * 重置理论肥料值（进入浇水时调用，重新从OCR初始化）
     */
    scope.resetFertilizerTracking = function () {
        _fertilizerTheoretical = -1;
        log("【肥料跟踪】理论值已重置");
    };

    /**
     * 校验浇水后肥料是否确实消耗了
     *
     * 在所有浇水方法中通用：浇水前记录肥料数 → 浇水后OCR对比。
     * 如果肥料数不变，说明浇水未生效（被拦截/已达上限/按钮未响应），
     * 调用方应终止浇水。
     *
     * @param {number} beforeCount - 浇水前的肥料数量，-1 跳过校验
     * @returns {boolean} true=肥料已消耗（正常），false=肥料未变（异常）
     */
    scope.checkFertilizerConsumed = function (beforeCount) {
        if (beforeCount < 0) return true; // 未知则不判断
        var afterCount = scope.getFertilizerCount();
        if (afterCount < 0) return true;  // OCR失败不阻塞
        if (afterCount === beforeCount) {
            log("【肥料校验】肥料未减少（" + beforeCount + " → " + afterCount + "），浇水未生效，终止脚本");
            return false;
        }
        log("【肥料校验】肥料已消耗（" + beforeCount + " → " + afterCount + "）");
        return true;
    };

    /**
     * 检查肥料是否足够浇指定次数
     *
     * 在芭芭农场页面检测，OCR 识别"肥料"开头的文本，
     * 去掉前面可能的非中文字符，提取数字判断 > 600 × times
     *
     * @param {number} times - 计划浇水次数
     * @returns {boolean} true=肥料充足
     */
    scope.checkFertilizerEnough = function (times) {
        var count = scope.getFertilizerCount();
        if (count < 0) {
            return true; // 识别失败默认充足，避免卡死
        }
        var need = 600 * times;
        var enough = count >= need;
        log("【肥料检查】肥料 " + count + "，需要 " + need + "（" + times + "次×600），" + (enough ? "充足" : "不足"));
        return enough;
    };

    /**
     * 浇水至目标次数
     * @param {number} target - 目标次数
     * @param {number} [knownCurrent] - 已知的当前次数（避免重复OCR）
     * @returns {boolean} true=正常完成，false=提前终止（肥料不足/校验失败）
     */
    scope.jiaoshuiToTarget = function (target, knownCurrent) {
        // 使用已知次数（入口传的）或重新读取
        var current = knownCurrent !== undefined ? knownCurrent : getMyWaterCount();
        if (current === -1) {
            log("【目标浇水】获取当前次数失败，跳过");
            return false;
        }
        if (current >= target) {
            log("【目标浇水】当前 " + current + " 次，已达目标 " + target + " 次，跳过");
            return true;
        }
        if (current >= 200) {
            log("【目标浇水】当前 " + current + " 次，已达最大限制，跳过");
            return true;
        }

        var need = target - current;
        log("【目标浇水】当前 " + current + " 次，目标 " + target + " 次，还需 " + need + " 次");

        // 拆分：先用 1 次档补 5 的余数，再用 5 次档快速浇完剩余部分
        // 例：当前100、再浇33次(目标133) → 单次3次(→103) + 5次×6轮(→133)
        var oneTimeCount = need % 5;
        var fiveTimeCount = Math.floor(need / 5);

        var aborted = false;
        var beforeFert = -1;
        var beforeFertForCheck = -1;  // 用于校验的值（3轮前记录的）
        var c = 0;  // 共用计数器，每次浇水+1

        if (oneTimeCount > 0) {
            log("【目标浇水】先切 1次档，浇 " + oneTimeCount + " 次");
            // 切到 1次档
            iconFindClick("jiaoshui5");
            randomSleep(500, null, 400);

            var _shifeiRetry1 = 0;
            for (var i = 0; i < oneTimeCount; i++) {
                c++;
                // 每3轮：先校验3轮前记录的值，再记录当前值供3轮后用
                if (c > 0 && c % 3 === 0) {
                    if (c > 3) {
                        // 校验3轮前保存的值：肥料应已减少
                        if (beforeFertForCheck >= 0 && !scope.checkFertilizerConsumed(beforeFertForCheck)) {
                            aborted = true;
                            break;
                        }
                    }
                    // 记录当前肥料值，供3轮后校验使用
                    beforeFertForCheck = scope.getFertilizerCount();
                }
                if (aborted) break;

                handleWaterRoutine();
                if (!iconFindClick("shifei")) {
                    _shifeiRetry1++;
                    if (_shifeiRetry1 >= 5) {
                        log("【施肥】连续失败5次，终止浇水");
                        aborted = true;
                        break;
                    }
                    log("【施肥】失败，重试");
                    randomSleep(1500, null, 1000);
                    i--;
                    c--;
                    continue;
                }
                randomSleep(1200, null, 1000);

                // 扣减理论值（1次×600=600）
                scope.consumeFertilizer(1 * 600);
            }
        }

        if (!aborted && fiveTimeCount > 0) {
            log("【目标浇水】切 5次档，浇 " + fiveTimeCount + " 轮（每轮 5 次）");
            // 切到 5次档
            iconFindClick("jiaoshui1");
            randomSleep(500, null, 400);

            // 入口 jiaoshui() 已初始化理论值，直接使用（省一次重复OCR）
            var estimatedFertilizer = _fertilizerTheoretical >= 0 ? _fertilizerTheoretical : scope.getFertilizerCount();

            var _shifeiRetry5 = 0;
            for (var i = 0; i < fiveTimeCount; i++) {
                c++;
                // 每3轮：先校验3轮前记录的值，再记录当前值供3轮后用
                if (c > 0 && c % 3 === 0) {
                    if (c > 3) {
                        // 校验3轮前保存的值：肥料应已减少
                        if (beforeFertForCheck >= 0 && !scope.checkFertilizerConsumed(beforeFertForCheck)) {
                            aborted = true;
                            break;
                        }
                    }
                    // 记录当前肥料值，供3轮后校验使用
                    beforeFertForCheck = scope.getFertilizerCount();
                    if (beforeFertForCheck >= 0) {
                        estimatedFertilizer = beforeFertForCheck;
                    }
                }
                if (aborted) break;

                // 检查是否够5次（5×600=3000）
                if (estimatedFertilizer < 5 * 600) {
                    log("【目标浇水】肥料不足（剩余 " + estimatedFertilizer + "），停止浇水");
                    aborted = true;
                    break;
                }

                handleWaterRoutine();
                if (!iconFindClick("shifei")) {
                    _shifeiRetry5++;
                    if (_shifeiRetry5 >= 5) {
                        log("【施肥】连续失败5次，终止浇水");
                        aborted = true;
                        break;
                    }
                    log("【施肥】失败，重试");
                    randomSleep(1500, null, 1000);
                    i--;
                    c--;
                    continue;
                }
                randomSleep(1200, null, 1000);

                // 扣减理论值（后续OCR会校检修正）
                scope.consumeFertilizer(5 * 600);
                estimatedFertilizer = _fertilizerTheoretical;
            }
        }

        if (aborted) {
            log("【目标浇水】提前终止（肥料不足或校验失败）");
        } else {
            log("【目标浇水】完成，已达 " + target + " 次");
        }
        return !aborted;
    };

    /**
     * 耗尽所有肥料（用完即止）
     *
     * 逻辑：
     *   1. 肥料 >= 3000（5次）→ 勾选浇水5次，循环浇水
     *   2. 肥料 < 3000 → 切为单次浇水
     *   3. 肥料 < 600（1次）→ 停止
     *
     * 每3轮校验肥料消耗，连续施肥失败5次则终止。
     */
    scope.jiaoshuiAllFertilizer = function () {
        log("【耗尽肥料】模式：用完所有肥料");
        scope.resetFertilizerTracking();

        // 初始判断：用5次档还是1次档
        var fertCount = scope.getFertilizerCount();
        var useFiveMode = fertCount >= 5 * 600;
        if (useFiveMode) {
            log("【耗尽肥料】肥料=" + fertCount + "，先使用5次档");
            iconFindClick("jiaoshui1");
        } else {
            log("【耗尽肥料】肥料=" + fertCount + "，使用1次档");
            iconFindClick("jiaoshui5");
        }
        randomSleep(500, null, 400);

        var _shifeiRetryF = 0;
        var c = 0;
        var beforeFertForCheck = -1;

        for (var round = 0; round < 100; round++) {
            fertCount = scope.getFertilizerCount();

            // 肥料不够1次，结束
            if (fertCount >= 0 && fertCount < 600) {
                log("【耗尽肥料】肥料=" + fertCount + " < 600，肥料已用完");
                break;
            }

            // 检查是否需要从5次档切换到1次档
            if (useFiveMode && fertCount >= 0 && fertCount < 5 * 600) {
                log("【耗尽肥料】肥料=" + fertCount + " < 3000，切换为1次档");
                iconFindClick("jiaoshui5");
                randomSleep(500, null, 400);
                useFiveMode = false;
            }

            c++;
            // 每3轮校验肥料消耗
            if (c > 0 && c % 3 === 0) {
                if (c > 3 && beforeFertForCheck >= 0 && !scope.checkFertilizerConsumed(beforeFertForCheck)) {
                    break;
                }
                beforeFertForCheck = scope.getFertilizerCount();
            }

            handleWaterRoutine();
            if (!iconFindClick("shifei")) {
                _shifeiRetryF++;
                if (_shifeiRetryF >= 5) {
                    log("【施肥】连续失败5次，终止");
                    break;
                }
                log("【施肥】失败，重试");
                randomSleep(1500, null, 1000);
                c--;
                continue;
            }
            _shifeiRetryF = 0;
            randomSleep(1200, null, 1000);
            scope.consumeFertilizer(useFiveMode ? 5 * 600 : 600);
        }
        log("【耗尽肥料】完成");
    };

    /**
     * 通用处理：点击"万"或"亿"文字 → 处理升级弹窗 → 循环直到无更多可升级项
     * @param {string} char - 要识别的文字 ("万" 或 "亿")
     */
    function clickFontAndHandleUpgrade(char) {
        var click = ocrFindClick(char);
        while (click) {
            randomSleep(800, null, 600);
            var hasFloatWin = ocrFindClick("取升级阳光");
            if (hasFloatWin) {
                randomSleep(800, null, 600);
            }
            hasFloatWin = iconFindClick("jiaoshui_close", {threshold: 0.7});
            if (hasFloatWin) {
                randomSleep(800, null, 600);
            }
            click = ocrFindClick(char);
        }
    }

    /**
     * 收集屏幕上的阳光图标（sun.jpg），遇到"浏览得奖励"或"去得阳光"则浏览后返回再收
     */
    function collectSunIcons() {
        let checkTextRegion = [Math.floor(device.width * 0.3), 0, Math.floor(device.width * 0.7), Math.floor(device.height * 0.2)];
        var click = iconFindClick("sun");
        while (click) {
            randomSleep(800, null, 600);
            var isBrowseReward = ocrFindClick("浏览得奖励");
            if (isBrowseReward) {
                scrollVerticalMultiple({totalSeconds: 23, checkText: "任务完成", checkTextRegion: checkTextRegion});
                simulateSwipeBack();
            }
            isBrowseReward = ocrFindClick("去得阳光");
            if (isBrowseReward) {
                scrollVerticalMultiple({totalSeconds: 23, checkText: "任务完成", checkTextRegion: checkTextRegion});
                simulateSwipeBack();
            }
            click = iconFindClick("sun");
        }
    }

    /**
     * 收集阳光任务
     *
     * 流程：
     * 1. 打开芭芭农场页面
     * 2. 点击阳光入口图标（sun_entry.jpg）
     * 3. 在阳光页面点击"领阳光"签到
     * 4. 循环执行"浏览15秒"任务获取阳光
     * 5. 收集屏幕上所有阳光图标（sun.jpg），有"浏览得奖励"则浏览后返回再收
     * 6. PaddleOCR 识别含"万"/"亿"的字体区域并点击升级，处理"立即领取升级阳光"弹窗
     * 7. 再次收集剩余阳光，直到无阳光可收
     *
     * @returns {void}
     *
     * @example
     * collectSun();
     */
    scope.collectSun = function () {
        openNongChangPage();
        randomSleep(1000, null, 800);
        var click = ocrFindClick("集阳光");
        if (!click) {
            click = iconFindClick("sun_entry");
            if (!click) {
                log("未找到入口");
                return;
            }
        }
        click = ocrWaitForText("领阳光") != null
        if (!click) {
            console.log("打开阳光页面失败");
            return;
        }
        console.hide();
        //处理立即去收集的弹窗
        ocrFindClick("立即去收");
        let checkTextRegion = [Math.floor(device.width * 0.3), 0, Math.floor(device.width * 0.7), Math.floor(device.height * 0.2)];
        // 领阳光（每日一次，缓存记录）
        if (!isTaskDoneToday("领阳光")) {
            click = ocrFindClick("领阳光");
            if (click) {
                randomSleep(800, null, 600);
                click = ocrFindClick("来阳光农场");
                if (click) {
                    randomSleep(3000, null, 2800);
                }
                var goToNewPage = true;
                click = true;
                while (goToNewPage && click) {
                    click = ocrFindClick("浏览15秒");
                    if (!click) {
                        markTaskDone("领阳光");
                        break;
                    }
                    scrollVerticalMultiple({totalSeconds: 18, checkText: "任务完成", checkTextRegion: checkTextRegion});
                    simulateSwipeBack();
                    randomSleep(1000, null, 800);
                }
                dismissPopups(1, [Math.floor(device.width * 0.7), Math.floor(device.height * 0.2), Math.floor(device.width * 0.3), Math.floor(device.height * 0.3)]);
            }
        } else {
            log("【领阳光】今日已完成，跳过");
        }
        randomSleep(800, null, 600);
        collectSunIcons();
        clickFontAndHandleUpgrade("万");
        let hasFloatWin = ocrFindClick("取升级阳光");
        if (hasFloatWin) {
            randomSleep(800, null, 600);
        }
        clickFontAndHandleUpgrade("亿");
        hasFloatWin = ocrFindClick("取升级阳光");
        if (hasFloatWin) {
            randomSleep(800, null, 600);
        }
        randomSleep(800, null, 600);
        collectSunIcons();
        console.show();
        simulateSwipeBack();
        log("收集阳光完成！");
    };

}