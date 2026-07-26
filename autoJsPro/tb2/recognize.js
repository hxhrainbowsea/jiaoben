// ============================================================
// recognize.js - 文字 / 图标识别
// Auto.js Pro 兼容版（只替换 OCR API，其余完全保持原样）
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    // ---- 控件选择器 ----

    /**
     * UI 控件文字识别
     *
     * @param {string}   targetText             - 要查找的文字
     * @param {Object}   [options]              - 可选配置
     * @param {boolean}  [options.exactMatch]   - 精确匹配，默认 false（模糊）
     * @param {boolean}  [options.checkDesc]    - 是否额外查 description，默认 false
     * @param {boolean}  [options.regex]        - 是否正则匹配，默认 false
     * @param {number}   [options.findTimeout]  - 等待超时(ms)，不传=findOnce()立即返回
     * @returns {Object|null} { text, bounds } 或 null
     */
    scope.recognizeByUISelector = function (targetText, options) {
        options = options || {};
        var exactMatch = options.exactMatch || false;
        var checkDesc = options.checkDesc || false;
        var regex = options.regex || false;
        var findTimeout = options.findTimeout;

        // findTimeout 为空 → findOnce() 零等待；有值 → findOne(ms) 等待指定时间
        var _find = function (selector) {
            return findTimeout ? selector.findOne(findTimeout) : selector.findOnce();
        };

        var widget;
        if (regex && targetText) {
            widget = _find(textMatches(new RegExp(targetText)));
            if (!widget && checkDesc) {
                widget = _find(descMatches(new RegExp(targetText)));
            }
        } else if (exactMatch) {
            widget = _find(text(targetText));
            if (!widget && checkDesc) {
                widget = _find(desc(targetText));
            }
        } else {
            widget = _find(textContains(targetText)) || _find(text(targetText));
            if (!widget && checkDesc) {
                widget = _find(descContains(targetText)) || _find(desc(targetText));
            }
        }

        if (widget) {
            var bounds = widget.bounds();
            return {text: widget.text(), bounds: bounds};
        }
        return null;
    };

    // ---- 通用 OCR 结果解析 ----

    scope.findTextInOcrResults = function (results, targetText, exactMatch, regex) {
        if (!results || results.length === 0) {
            return null;
        }
        for (var i = 0; i < results.length; i++) {
            var line = results[i];
            var label = line.label || line.text || "";
            var bounds = line.bounds;
            var matched;
            if (regex) {
                var re = new RegExp(targetText);
                matched = re.test(label);
            } else {
                matched = exactMatch ? (label === targetText) : (label.indexOf(targetText) >= 0);
            }
            if (matched && bounds) {
                return {text: label, bounds: bounds};
            }
            if (line.elements && line.elements.length > 0) {
                for (var j = 0; j < line.elements.length; j++) {
                    var el = line.elements[j];
                    var elLabel = el.label || el.text || "";
                    var elMatched;
                    if (regex) {
                        var re2 = new RegExp(targetText);
                        elMatched = re2.test(elLabel);
                    } else {
                        elMatched = exactMatch ? (elLabel === targetText) : (elLabel.indexOf(targetText) >= 0);
                    }
                    if (elMatched && el.bounds) {
                        return {text: elLabel, bounds: el.bounds};
                    }
                }
            }
        }
        return null;
    };

    scope.recognize = function (targetText, method, options) {
        options = options || {};
        var result;
        switch (method) {
            case scope.METHOD_UI_SELECTOR:
                result = scope.recognizeByUISelector(targetText, options);
                break;
            case scope.METHOD_MLKIT_OCR:
                result = scope.recognizeByMlkitOcr(targetText, options.region, options.exactMatch, options.regex);
                break;
            case scope.METHOD_PADDLE_OCR:
                result = scope.recognizeByPaddleOcr(targetText, options.region, options.exactMatch, options.regex);
                break;
            default:
                console.log("未知方法: " + method + "，回退 UI Selector");
                result = scope.recognizeByUISelector(targetText, options);
        }
        if (result && result.bounds) {
            console.log("【" + targetText + "】命中 (" + method + "): text=" + result.text + ", bounds=" + JSON.stringify(result.bounds));
        } else {
            console.log("【" + targetText + "】未找到 (" + method + ")");
        }
        return result;
    };

    // ---- MLKit OCR（Pro 兼容版）----

    /**
     * 【Pro 适配】使用 $plugins.load 加载 MLKit OCR 插件，
     * 替换原版的全局 $mlKitOcr
     */
    scope.recognizeByMlkitOcr = function (targetText, region, exactMatch, regex) {
        try {
            var MLKitOCR = $plugins.load('org.autojs.autojspro.plugin.mlkit.ocr');
            var ocr = new MLKitOCR();
        } catch (e) {
            console.log("错误: 当前环境不支持 MLKit OCR 插件: " + e.message);
            return null;
        }
        var fullImg = captureScreen();
        if (!fullImg) {
            console.log("[MLKit OCR] 截图失败");
            return null;
        }
        scope.saveDebugScreenshot(fullImg, targetText, region);
        var img = fullImg;
        var offsetX = 0, offsetY = 0;
        var clipped = null;
        try {
            if (region && Array.isArray(region) && region.length >= 4) {
                offsetX = region[0];
                offsetY = region[1];
                clipped = images.clip(fullImg, region[0], region[1], region[2], region[3]);
                if (!clipped) {
                    console.log("截图裁剪失败");
                    return null;
                }
                img = clipped;
                console.log("[MLKit OCR] 裁剪区域: (" + region[0] + "," + region[1] + " " + region[2] + "x" + region[3] + ")");
            }
            var results = ocr.detect(img);
            var ocrResult = scope.findTextInOcrResults(results, targetText, exactMatch, regex);
            if (ocrResult && ocrResult.bounds && region) {
                ocrResult.bounds = {
                    left: ocrResult.bounds.left + offsetX,
                    top: ocrResult.bounds.top + offsetY,
                    right: ocrResult.bounds.right + offsetX,
                    bottom: ocrResult.bounds.bottom + offsetY
                };
            }
            return ocrResult;
        } finally {
            if (fullImg) fullImg.recycle();
            if (clipped) clipped.recycle();
        }
    };

    // ---- PaddleOCR（Pro 兼容版）----

    /**
     * 【Pro 适配】使用 $ocr.detect(capture) 替换原版的 predictor.runOcr(bitmap)
     */
    scope.recognizeByPaddleOcr = function (targetText, region, exactMatch, regex) {
        if (typeof paddlePredictor === "undefined" || !paddlePredictor) {
            console.log("错误: PaddleOCR 未初始化");
            return null;
        }
        var fullImg = captureScreen();
        if (!fullImg) {
            console.log("[PaddleOCR] 截图失败");
            return null;
        }
        scope.saveDebugScreenshot(fullImg, targetText, region);
        var img = fullImg;
        var offsetX = 0, offsetY = 0;
        var clipped = null;
        try {
            if (region && Array.isArray(region) && region.length >= 4) {
                offsetX = region[0];
                offsetY = region[1];
                clipped = images.clip(fullImg, region[0], region[1], region[2], region[3]);
                if (!clipped) {
                    console.log("[PaddleOCR] 截图裁剪失败");
                    return null;
                }
                img = clipped;
                console.log("[PaddleOCR] 裁剪区域: (" + region[0] + "," + region[1] + " " + region[2] + "x" + region[3] + ")");
            }
            // Pro 版：ocr.detect 接收截图对象，而非 bitmap
            var results = paddlePredictor.detect(img);
            var ocrResult = scope.findTextInOcrResults(results, targetText, exactMatch, regex);
            if (ocrResult && ocrResult.bounds && region) {
                ocrResult.bounds = {
                    left: ocrResult.bounds.left + offsetX,
                    top: ocrResult.bounds.top + offsetY,
                    right: ocrResult.bounds.right + offsetX,
                    bottom: ocrResult.bounds.bottom + offsetY
                };
            }
            return ocrResult;
        } finally {
            if (fullImg) fullImg.recycle();
            if (clipped) clipped.recycle();
        }
    };

    /**
     * 保存截图到 ./debug/ 目录（仅 DEBUG_SAVE_SCREENSHOT=true 时生效）
     *
     * @param {*}      img       - 截图对象（captureScreen 返回值）
     * @param {string} targetText - 正在识别的文字，用于文件名标识
     * @param {Array}  [region]  - 可选裁剪区域，有则保存裁剪图
     * @param {boolean} [forceSave] - 是否强制保存，忽略 DEBUG_SAVE_SCREENSHOT
     */
    scope.saveDebugScreenshot = function (img, targetText, region,forceSave) {
        if (!forceSave) {
            var _s = storages.create('tb_debug_config');
            if (!_s.get('saveScreenshot', false)) return;
        }
        if (!img) return;

        try {
            var dir = "./debug/";
            files.createWithDirs(dir);

            var ts = new Date();
            var stamp = ts.getFullYear()
                + ('0' + (ts.getMonth() + 1)).slice(-2)
                + ('0' + ts.getDate()).slice(-2) + '_'
                + ('0' + ts.getHours()).slice(-2)
                + ('0' + ts.getMinutes()).slice(-2)
                + ('0' + ts.getSeconds()).slice(-2);
            var safeName = (targetText || "unknown").replace(/[\/\\?%*:|"<>]/g, '_');

            if (region && Array.isArray(region) && region.length >= 4) {
                var clip = images.clip(img, region[0], region[1], region[2], region[3]);
                if (clip) {
                    var clipPath = dir + safeName + '_clip_' + stamp + '.png';
                    images.save(clip, clipPath);
                    clip.recycle();
                }
            } else {
                var fullPath = dir + safeName + '_' + stamp + '.png';
                images.save(img, fullPath);
            }
        } catch (e) {
            console.log("[DEBUG] 保存截图失败: " + e.message);
        }
    };

    /**
     * 识别文字 + 随机偏移点击（一站式操作）
     *
     * @param {string}   targetText       - 要识别的文字
     * @param {string}   method           - 识别方法
     * @param {*}        extraParam       - 额外参数（如 paddlePredictor）
     * @param {Object}   [options]        - 可选配置
     * @param {number}   [options.offsetX]       - X 随机偏移，默认 CLICK_OFFSET_X
     * @param {number}   [options.offsetY]       - Y 随机偏移，默认 CLICK_OFFSET_Y
     * @param {Object}   [options.fallbackBounds] - 兜底坐标 {left,top,right,bottom}
     * @param {number}   [options.dx]             - X 定向偏移
     * @param {number}   [options.dy]             - Y 定向偏移
     * @param {Array}    [options.region]         - 搜索区域 [x,y,w,h]
     * @param {boolean}  [options.exactMatch]     - 是否精确匹配，默认 false（模糊）
     */
    scope.findTextAndClick = function (targetText, method, options) {
        method = method || scope.CURRENT_METHOD;
        options = options || {};
        var offsetX = options.offsetX !== undefined ? options.offsetX : scope.CLICK_OFFSET_X;
        var offsetY = options.offsetY !== undefined ? options.offsetY : scope.CLICK_OFFSET_Y;
        var dx = options.dx || 0;
        var dy = options.dy || 0;
        var region = options.region || null;
        var fallbackBounds = options.fallbackBounds || null;
        var exactMatch = options.exactMatch || false;

        var result = scope.recognize(targetText, method, {
            region: region,
            exactMatch: exactMatch,
            regex: options.regex,
            checkDesc: options.checkDesc
        });

        if (result && result.bounds) {
            scope.clickWithOffset(result.bounds, offsetX, offsetY, dx, dy);
            console.log("已点击【" + targetText + "】");
            return true;
        }
        if (fallbackBounds) {
            console.log("OCR 未找到，使用 fallback 坐标");
            scope.clickWithOffset(fallbackBounds, offsetX, offsetY, dx, dy);
            console.log("已 fallback 点击【" + targetText + "】区域");
            return true;
        }
        return false;
    };

    /**
     * 等待文字出现（轮询识别，可选自动点击）
     *
     * 持续识别目标文字，直到出现或超时。
     * 参数与 findTextAndClick 类似，默认不点击。
     *
     * 支持传入字符串数组进行批量匹配：
     * 一次截图 + OCR 同时匹配多个目标文字，返回第一个命中的结果。
     *
     * @param {string|string[]}   targetText       - 要识别的文字（或文字数组）
     * @param {string}            method           - 识别方法
     * @param {Object}            [options]        - 可选配置
     * @param {number}   [options.timeout]        - 最大等待时间(ms)，默认 10000
     * @param {number}   [options.interval]       - 轮询间隔(ms)，默认 1000
     * @param {Array}    [options.region]         - 搜索区域 [x,y,w,h]
     * @param {boolean}  [options.exactMatch]     - 是否精确匹配，默认 false（模糊）
     * @param {boolean}  [options.regex]          - 是否正则匹配，默认 false
     * @param {boolean}  [options.checkDesc]      - 是否额外查 description，默认 false（仅单文字模式有效）
     * @param {boolean}  [options.clickWhenFound] - 找到后是否自动点击，默认 false
     * @param {number}   [options.offsetX]        - 点击时 X 随机偏移，默认 CLICK_OFFSET_X（仅 clickWhenFound=true 有效）
     * @param {number}   [options.offsetY]        - 点击时 Y 随机偏移，默认 CLICK_OFFSET_Y（仅 clickWhenFound=true 有效）
     * @param {number}   [options.dx]             - 点击时 X 定向偏移（仅 clickWhenFound=true 有效）
     * @param {number}   [options.dy]             - 点击时 Y 定向偏移（仅 clickWhenFound=true 有效）
     * @returns {Object|boolean|null}
     *   clickWhenFound=false（默认）→ 返回 { text, bounds } 或 null
     *   clickWhenFound=true        → 找到并点击返回 true，超时返回 false
     *
     * @example
     * // 单文字等待
     * var el = waitForText("立即领取", METHOD_MLKIT_OCR, {timeout: 8000});
     * if (el) { click(el.bounds.centerX(), el.bounds.centerY()); }
     *
     * // 批量等待（一次截图匹配多个文字，命中任一即返回）
     * var ok = waitForText(["出牌", "叫地主", "抢地主"], METHOD_MLKIT_OCR, {timeout: 15000});
     *
     * // 等待并自动点击（true/false）
     * var ok = waitForText("确认支付", CURRENT_METHOD, {timeout: 10000, clickWhenFound: true});
     * if (ok) { console.log("确认支付已点击"); }
     */
    scope.waitForText = function (targetText, method, options) {
        // 支持数组：一次截图批量匹配多个文字
        if (Array.isArray(targetText)) {
            if (targetText.length>1){
                return _waitForTextBatch(targetText, method, options);
            }else{
                targetText = targetText[0]
            }
        }
        method = method || scope.CURRENT_METHOD;
        options = options || {};
        var timeout = options.timeout || 10000;
        var interval = options.interval || 1000;
        var region = options.region || null;
        var exactMatch = options.exactMatch || false;
        var regex = options.regex || false;
        var checkDesc = options.checkDesc || false;
        var clickWhenFound = options.clickWhenFound || false;

        var elapsed = 0;
        var result;
        console.log("【" + targetText + "】开始等待（超时 " + timeout + "ms，间隔 " + interval + "ms）" + (clickWhenFound ? "，找到后自动点击" : ""));

        while (elapsed < timeout) {
            result = scope.recognize(targetText, method, {
                region: region,
                exactMatch: exactMatch,
                regex: regex,
                checkDesc: checkDesc
            });

            if (result && result.bounds) {
                console.log("【" + targetText + "】已出现（等待约 " + elapsed + "ms）");
                if (clickWhenFound) {
                    var offsetX = options.offsetX !== undefined ? options.offsetX : scope.CLICK_OFFSET_X;
                    var offsetY = options.offsetY !== undefined ? options.offsetY : scope.CLICK_OFFSET_Y;
                    var dx = options.dx || 0;
                    var dy = options.dy || 0;
                    scope.clickWithOffset(result.bounds, offsetX, offsetY, dx, dy);
                    console.log("已点击【" + targetText + "】");
                    return true;
                }
                return result;
            }

            sleep(interval);
            elapsed += interval;
        }

        console.log("【" + targetText + "】等待超时（" + timeout + "ms）");
        return clickWhenFound ? false : null;
    };

    /**
     * 内部：批量等待文字（一次截图 + OCR，匹配多个目标文字）
     *
     * @param {string[]} texts - 目标文字数组
     * @param {string} [method] - 识别方法
     * @param {Object} [options] - 可选配置（同 waitForText）
     * @returns {Object|boolean|null}
     */
    function _waitForTextBatch(texts, method, options) {
        method = method || scope.CURRENT_METHOD;
        options = options || {};
        var timeout = options.timeout || 10000;
        var interval = options.interval || 1000;
        var region = options.region || null;
        var exactMatch = options.exactMatch || false;
        var regex = options.regex || false;
        var clickWhenFound = options.clickWhenFound || false;

        var elapsed = 0;
        console.log("【批量】等待 " + texts.length + " 个文字: " + texts.join(", ") + "（超时 " + timeout + "ms，间隔 " + interval + "ms）" + (clickWhenFound ? "，找到后自动点击" : ""));

        while (elapsed < timeout) {
            var allResults = scope.ocrCaptureAll(region, method);
            if (allResults && allResults.length > 0) {
                for (var i = 0; i < texts.length; i++) {
                    var target = texts[i];
                    var result = scope.findTextInOcrResults(allResults, target, exactMatch, regex);
                    if (result && result.bounds) {
                        console.log("【" + target + "】已出现（等待约 " + elapsed + "ms）");
                        if (clickWhenFound) {
                            var offsetX = options.offsetX !== undefined ? options.offsetX : scope.CLICK_OFFSET_X;
                            var offsetY = options.offsetY !== undefined ? options.offsetY : scope.CLICK_OFFSET_Y;
                            var dx = options.dx || 0;
                            var dy = options.dy || 0;
                            scope.clickWithOffset(result.bounds, offsetX, offsetY, dx, dy);
                            console.log("已点击【" + target + "】");
                            return true;
                        }
                        return result;
                    }
                }
            }

            sleep(interval);
            elapsed += interval;
        }

        console.log("【批量】等待超时（" + timeout + "ms）: " + texts.join(", "));
        return clickWhenFound ? false : null;
    }

    /**
     * 等待图片/图标出现（模板匹配版 waitForText）
     *
     * 持续识别目标图标，直到出现或超时。
     * 支持在等待过程中自动关闭弹窗（如活动弹窗、广告等）。
     *
     * @param {string}   templatePath     - 模板图片路径（如 "./images/close.jpg"）
     * @param {Object}   [options]        - 可选配置
     * @param {number}   [options.timeout]        - 最大等待时间(ms)，默认 10000
     * @param {number}   [options.interval]       - 轮询间隔(ms)，默认 1000
     * @param {Array}    [options.region]         - 搜索区域 [x,y,w,h]
     * @param {number}   [options.threshold]      - 模板匹配阈值，默认 ICON_MATCH_THRESHOLD(0.9)
     * @param {boolean}  [options.colorCompare]   - 是否启用色彩匹配，默认 false（灰度）
     * @param {boolean}  [options.clickWhenFound] - 找到后是否自动点击，默认 false
     * @param {number}   [options.offsetX]        - 点击 X 随机偏移（仅 clickWhenFound=true）
     * @param {number}   [options.offsetY]        - 点击 Y 随机偏移
     * @param {number}   [options.dx]             - 点击 X 定向偏移
     * @param {number}   [options.dy]             - 点击 Y 定向偏移
     * @param {Object}   [options.closePopup]     - 自动关闭弹窗配置（子选项）
     * @param {string}   [options.closePopup.templatePath] - 关闭按钮模板图片路径（如 "./images/taskPageClose.jpg"）
     * @param {number}   [options.closePopup.threshold]    - 关闭按钮匹配阈值，默认 ICON_MATCH_THRESHOLD
     * @param {Array}    [options.closePopup.region]       - 关闭按钮搜索区域 [x,y,w,h]
     * @returns {Object|boolean|null}
     *   clickWhenFound=false（默认）→ 返回 { x, y, w, h, centerX, centerY } 或 null
     *   clickWhenFound=true        → 找到并点击返回 true，超时返回 false
     *
     * @example
     * // 等待图片出现
     * var icon = waitForIcon("./images/taskPageClose.jpg", {timeout: 8000, threshold: 0.8});
     * if (icon) { click(icon.centerX, icon.centerY); }
     *
     * // 等待图片并自动点击
     * var ok = waitForIcon("./images/taskPageClose.jpg", {timeout: 5000, clickWhenFound: true});
     *
     * // 等待过程中自动关闭弹窗
     * var icon = waitForIcon("./images/taskPageClose.jpg", {
     *     timeout: 15000,
     *     closePopup: {
     *         templatePath: "./images/taskPageClose.jpg",
     *         threshold: 0.7,
     *         region: [600, 0, 400, 300]
     *     }
     * });
     */
    scope.waitForIcon = function (templatePath, options) {
        options = options || {};
        var timeout      = options.timeout || 10000;
        var interval     = options.interval || 1000;
        var region       = options.region || null;
        var threshold    = options.threshold !== undefined ? options.threshold : scope.ICON_MATCH_THRESHOLD;
        var colorCompare = options.colorCompare || false;
        var clickWhenFound = options.clickWhenFound || false;
        var closePopup   = options.closePopup || null;

        var elapsed = 0;
        var fileName = templatePath.split('/').pop().split('\\').pop();
        var closePopupEnabled = closePopup && closePopup.templatePath;
        console.log('【' + fileName + '】开始等待图片出现（超时 ' + timeout + 'ms，间隔 ' + interval + 'ms）' + (clickWhenFound ? '，找到后自动点击' : '') + (closePopupEnabled ? '，已启用弹窗关闭' : ''));

        while (elapsed < timeout) {
            var result = scope.findIconByTemplate(templatePath, {
                region: region,
                threshold: threshold,
                colorCompare: colorCompare
            });

            if (result && result.centerX > 0) {
                console.log('【' + fileName + '】已出现（等待约 ' + elapsed + 'ms）');
                if (clickWhenFound) {
                    var offsetX = options.offsetX !== undefined ? options.offsetX : scope.CLICK_OFFSET_X;
                    var offsetY = options.offsetY !== undefined ? options.offsetY : scope.CLICK_OFFSET_Y;
                    var dx = options.dx || 0;
                    var dy = options.dy || 0;
                    scope.clickWithOffset({
                        left: result.x,
                        top: result.y,
                        right: result.x + result.w,
                        bottom: result.y + result.h
                    }, offsetX, offsetY, dx, dy);
                    console.log('已点击图片【' + fileName + '】');
                    return true;
                }
                return result;
            }

            // 每次循环都尝试关闭弹窗（如果启用了 closePopup）
            if (closePopupEnabled) {
                var closed = scope.findIconAndClick('template', closePopup.templatePath, closePopup);
                if (closed) {
                    console.log('【' + fileName + '】已关闭弹窗，继续等待目标图片');
                }
            }

            sleep(interval);
            elapsed += interval;
        }

        console.log('【' + fileName + '】等待图片超时（' + timeout + 'ms）');
        return clickWhenFound ? false : null;
    };


    // ============================================================
    // 批量 OCR（截图一次 + OCR 一次，返回全部结果）
    // 用于 taskLoop 中每页只截一次图、循环对比所有任务的优化
    // ============================================================

    /**
     * UI_SELECTOR 模式：收集当前页面所有可见文本
     * 返回格式同 ocrCaptureAll（{text, bounds}[]），兼容 findTextInOcrResults
     *
     * @returns {Array|null} [{text, bounds}, ...]
     */
    scope._captureUiAllText = function () {
        try {
            // textContains("") 匹配所有包含文本的控件
            var all = textContains("").find();
            if (!all || all.length === 0) return null;

            var results = [];
            for (var i = 0; i < all.length; i++) {
                try {
                    var text = all[i].text();
                    if (!text || text.trim().length === 0) continue;
                    var bounds = all[i].bounds();
                    if (bounds) {
                        results.push({text: text, bounds: bounds});
                    }
                } catch (_e) {}
            }
            return results.length > 0 ? results : null;
        } catch (e) {
            console.log("[ocrCaptureAll] UI_SEL 收集文本异常: " + e.message);
            return null;
        }
    };

    /**
     * 批量识别页面上的所有文字
     *
     * @param {Array}  [region] - 搜索区域 [x, y, w, h]（仅 OCR 模式有效）
     * @param {string} [method] - 识别方法，默认 METHOD_MLKIT_OCR
     * @returns {Array|null} 全部识别结果 [{text, bounds}, ...]
     *
     * @example
     * var results = ocrCaptureAll(searchRegion, METHOD_MLKIT_OCR);
     */
    scope.ocrCaptureAll = function (region, method) {
        method = method || scope.METHOD_MLKIT_OCR;

        if (method === scope.METHOD_UI_SELECTOR) {
            return scope._captureUiAllText();
        }
        if (method === scope.METHOD_MLKIT_OCR) {
            return scope._captureAndOcrMlkit(region);
        }
        if (method === scope.METHOD_PADDLE_OCR) {
            return scope._captureAndOcrPaddle(region);
        }
        console.log("[ocrCaptureAll] 不支持的识别方法: " + method + "，仅支持 MLKit/Paddle");
        return null;
    };

    /**
     * MLKit OCR：截图 → 裁剪 → 识别 → 返回全部结果（bounds 已修正为全屏坐标）
     *
     * @param {Array} [region] - 裁剪区域 [x, y, w, h]
     * @returns {Array|null} 全部 OCR 结果
     */
    scope._captureAndOcrMlkit = function (region) {
        try {
            var MLKitOCR = $plugins.load('org.autojs.autojspro.plugin.mlkit.ocr');
            var ocr = new MLKitOCR();
        } catch (e) {
            console.log("[batch OCR] MLKit 插件加载失败: " + e.message);
            return null;
        }

        var fullImg = captureScreen();
        if (!fullImg) {
            console.log("[batch OCR]MLKit 截图失败");
            return null;
        }
        scope.saveDebugScreenshot(fullImg, "ALL", region);
        var img = fullImg;
        var offsetX = 0, offsetY = 0;
        var clipped = null;

        try {
            if (region && Array.isArray(region) && region.length >= 4) {
                offsetX = region[0];
                offsetY = region[1];
                clipped = images.clip(fullImg, region[0], region[1], region[2], region[3]);
                if (!clipped) {
                    console.log("[batch OCR] 裁剪失败");
                    return null;
                }
                img = clipped;
            }

            var results = ocr.detect(img);

            // 将所有 bounds 从裁剪坐标修正为全屏坐标
            if (region && results && results.length > 0) {
                scope._offsetOcrBounds(results, offsetX, offsetY);
            }

            return results;
        } finally {
            if (fullImg) fullImg.recycle();
            if (clipped) clipped.recycle();
        }
    };

    /**
     * PaddleOCR：截图 → 裁剪 → 识别 → 返回全部结果（bounds 已修正）
     *
     * @param {Array} [region] - 裁剪区域 [x, y, w, h]
     * @returns {Array|null} 全部 OCR 结果
     */
    scope._captureAndOcrPaddle = function (region) {
        if (typeof paddlePredictor === "undefined" || !paddlePredictor) {
            console.log("[batch OCR] PaddleOCR 未初始化");
            return null;
        }

        var fullImg = captureScreen();
        if (!fullImg) {
            console.log("[batch OCR] 截图失败");
            return null;
        }
        scope.saveDebugScreenshot(fullImg, "[batch OCR]PaddleOCR ALL", region);
        var img = fullImg;
        var offsetX = 0, offsetY = 0;
        var clipped = null;

        try {
            if (region && Array.isArray(region) && region.length >= 4) {
                offsetX = region[0];
                offsetY = region[1];
                clipped = images.clip(fullImg, region[0], region[1], region[2], region[3]);
                if (!clipped) {
                    console.log("[batch OCR] 裁剪失败");
                    return null;
                }
                img = clipped;
            }

            var results = paddlePredictor.detect(img);

            // 将所有 bounds 从裁剪坐标修正为全屏坐标
            if (region && results && results.length > 0) {
                scope._offsetOcrBounds(results, offsetX, offsetY);
            }

            return results;
        } finally {
            if (fullImg) fullImg.recycle();
            if (clipped) clipped.recycle();
        }
    };

    /**
     * 递归修正 OCR 结果中所有 bounds（裁剪坐标 → 全屏坐标）
     *
     * @param {Array}  results - OCR 结果数组（会被原地修改）
     * @param {number} offsetX - 裁剪区域左上角 X
     * @param {number} offsetY - 裁剪区域左上角 Y
     */
    scope._offsetOcrBounds = function (results, offsetX, offsetY) {
        for (var r = 0; r < results.length; r++) {
            if (results[r].bounds) {
                results[r].bounds = {
                    left: results[r].bounds.left + offsetX,
                    top: results[r].bounds.top + offsetY,
                    right: results[r].bounds.right + offsetX,
                    bottom: results[r].bounds.bottom + offsetY
                };
            }
            if (results[r].elements && results[r].elements.length > 0) {
                for (var e = 0; e < results[r].elements.length; e++) {
                    if (results[r].elements[e].bounds) {
                        results[r].elements[e].bounds = {
                            left: results[r].elements[e].bounds.left + offsetX,
                            top: results[r].elements[e].bounds.top + offsetY,
                            right: results[r].elements[e].bounds.right + offsetX,
                            bottom: results[r].elements[e].bounds.bottom + offsetY
                        };
                    }
                }
            }
        }
    };

    /**
     * 在预计算的 OCR 结果中搜索指定文字，找到则点击
     *
     * 不重新截图、不重新 OCR，直接利用 ocrCaptureAll 返回的缓存结果。
     *
     * @param {Array}    ocrResults       - ocrCaptureAll 返回的结果数组
     * @param {string}   targetText       - 要搜索的文字
     * @param {Object}   [options]        - 可选配置
     * @param {number}   [options.offsetX]       - X 随机偏移
     * @param {number}   [options.offsetY]       - Y 随机偏移
     * @param {number}   [options.dx]             - X 定向偏移
     * @param {number}   [options.dy]             - Y 定向偏移
     * @param {boolean}  [options.exactMatch]     - 是否精确匹配
     * @returns {boolean} 是否找到并点击
     *
     * @example
     * var results = ocrCaptureAll(region, METHOD_MLKIT_OCR);
     * var ok = findTextInResultsAndClick(results, "看严选推荐商品", {offsetX: 40, offsetY: 1});
     */
    scope.findTextInResultsAndClick = function (ocrResults, targetText, options) {
        if (!ocrResults || ocrResults.length === 0) return false;

        options = options || {};
        var offsetX = options.offsetX !== undefined ? options.offsetX : scope.CLICK_OFFSET_X;
        var offsetY = options.offsetY !== undefined ? options.offsetY : scope.CLICK_OFFSET_Y;
        var dx = options.dx || 0;
        var dy = options.dy || 0;
        var exactMatch = options.exactMatch || false;

        var result = scope.findTextInOcrResults(ocrResults, targetText, exactMatch, false);

        if (result && result.bounds) {
            scope.clickWithOffset(result.bounds, offsetX, offsetY, dx, dy);
            console.log("【" + targetText + "】已点击 (batch OCR)");
            return true;
        }
        console.log("【" + targetText + "】未找到 (batch OCR)");
        return false;
    };

    // ============================================================
    // 图标 / 图像识别（不变）
    // ============================================================

    scope.findIconByTemplate = function (templatePath, options) {
        options = options || {};
        var threshold = options.threshold || scope.ICON_MATCH_THRESHOLD;
        var region = options.region || null;
        var colorCompare = options.colorCompare || false;
        var externalScreen = options._screen || null;   // 内部用：外部传入已截好的图，避免重截图

        console.log("[模板匹配] 加载模板: " + templatePath);
        var template = images.read(templatePath);
        if (!template) {
            console.log("模板图片读取失败: " + templatePath);
            return null;
        }

        var screen = externalScreen || captureScreen();
        if (!screen) {
            console.log("截图失败");
            template.recycle();
            return null;
        }

        var matchImg, matchTemplate, toRecycle;

        if (colorCompare) {
            matchImg = screen;
            matchTemplate = template;
            toRecycle = [screen, template];
        } else {
            var grayScreen = images.grayscale(screen);
            var grayTemplate = images.grayscale(template);
            matchImg = images.cvtColor(grayScreen, 'GRAY2BGRA');
            matchTemplate = images.cvtColor(grayTemplate, 'GRAY2BGRA');
            toRecycle = [screen, template, grayScreen, grayTemplate, matchImg, matchTemplate];
        }
        scope.saveDebugScreenshot(matchImg, "匹配图片" + templatePath, region);
        scope.saveDebugScreenshot(matchTemplate, "样例图片" + templatePath);
        var point = images.findImage(matchImg, matchTemplate, {region: region, threshold: threshold});
        var result = null;
        if (point) {
            result = {
                x: point.x, y: point.y,
                w: template.getWidth(), h: template.getHeight(),
                centerX: Math.floor(point.x + template.getWidth() / 2),
                centerY: Math.floor(point.y + template.getHeight() / 2),
                confidence: 1.0
            };
            console.log("[模板匹配] 找到图标 at (" + result.centerX + ", " + result.centerY + ")");
        } else {
            console.log("[模板匹配] 未找到图标");
        }

        // 回收：_screen 由调用方管理，不在此回收
        for (var i = 0; i < toRecycle.length; i++) {
            if (toRecycle[i] !== externalScreen) {
                toRecycle[i].recycle();
            }
        }
        return result;
    };

    scope.findIconByMultiColor = function (options) {
        options = options || {};
        var color = options.color || "#FFFFFF";
        var points = options.points || [];
        var threshold = options.threshold || scope.ICON_MULTI_COLOR_THRESHOLD;
        var region = options.region || null;

        if (points.length === 0) {
            console.log("[多点找色] 未提供偏移点");
            return null;
        }
        console.log("[多点找色] 基准色: " + color + ", " + points.length + " 个偏移点");

        var screen = captureScreen();
        if (!screen) {
            console.log("截图失败");
            return null;
        }

        if (!region) {
            var w = device.width, h = device.height;
            region = [Math.floor(w * 0.5), 0, Math.floor(w * 0.5), Math.floor(h * 0.35)];
        }

        var point = images.findMultiColors(screen, color, points, {region: region, threshold: threshold});
        if (point) {
            console.log("[多点找色] 找到匹配 at (" + point.x + ", " + point.y + ")");
        } else {
            console.log("[多点找色] 未找到匹配");
        }
        screen.recycle();
        return point;
    };

    scope.findCloseByUI = function (options) {
        options = options || {};
        console.log("[UI控件] 查找关闭按钮...");
        var keywords = ["关闭", "关闭按钮", "close", "取消"];
        var findTimeout = options.findTimeout;
        var _find = function (selector) {
            return findTimeout ? selector.findOne(findTimeout) : selector.findOnce();
        };
        for (var i = 0; i < keywords.length; i++) {
            var widget = _find(descContains(keywords[i])) || _find(textContains(keywords[i]));
            if (widget) {
                var bounds = widget.bounds();
                console.log("[UI控件] 找到关闭按钮: " + keywords[i] + ", bounds: " + JSON.stringify(bounds));
                return {bounds: bounds};
            }
        }
        return null;
    };

    scope.findXCloseButton = function (options) {
        options = options || {};

        var uiResult = scope.findCloseByUI();
        if (uiResult) return uiResult;

        var region = options.region;
        if (!region) {
            var w = device.width, h = device.height;
            region = [Math.floor(w * 0.6), 0, Math.floor(w * 0.4), Math.floor(h * 0.3)];
        }

        var screen = captureScreen();
        if (!screen) {
            console.log("截图失败");
            return null;
        }

        var threshold = 20;
        var whitePoints = [
            [15, 0, "#FFFFFF"], [-15, 0, "#FFFFFF"],
            [0, 15, "#FFFFFF"], [0, -15, "#FFFFFF"],
        ];
        var point = images.findMultiColors(screen, "#FFFFFF", whitePoints, {region: region, threshold: threshold});
        if (!point) {
            var grayPoints = [
                [12, 0, "#CCCCCC"], [-12, 0, "#CCCCCC"],
                [0, 12, "#CCCCCC"], [0, -12, "#CCCCCC"],
            ];
            point = images.findMultiColors(screen, "#CCCCCC", grayPoints, {region: region, threshold: threshold});
        }
        screen.recycle();

        if (point) {
            console.log("[X关闭按钮] 找到匹配 at (" + point.x + ", " + point.y + ")");
            return {bounds: {left: point.x - 20, top: point.y - 20, right: point.x + 20, bottom: point.y + 20}};
        }

        console.log("[X关闭按钮] 所有方法均未找到");
        return null;
    };

    scope.findIconAndClick = function (type, extraParam, options) {
        options = options || {};
        var offsetX = options.offsetX || scope.CLICK_OFFSET_X;
        var offsetY = options.offsetY || scope.CLICK_OFFSET_Y;
        var dx = options.dx || 0;
        var dy = options.dy || 0;
        console.log("正在识别图标【" + type + "】...");
        var result = null;

        switch (type) {
            case "template":
                var iconResult = scope.findIconByTemplate(extraParam, options);
                if (iconResult) {
                    result = {
                        bounds: {
                            left: iconResult.x,
                            top: iconResult.y,
                            right: iconResult.x + iconResult.w,
                            bottom: iconResult.y + iconResult.h
                        }
                    };
                }
                break;
            case "x_close":
                result = scope.findXCloseButton(options);
                break;
            case "multi_color":
                if (extraParam && extraParam.color && extraParam.points) {
                    var pt = scope.findIconByMultiColor({
                        color: extraParam.color,
                        points: extraParam.points,
                        region: options.region || null
                    });
                    if (pt) {
                        result = {bounds: {left: pt.x - 20, top: pt.y - 20, right: pt.x + 20, bottom: pt.y + 20}};
                    }
                }
                break;
        }

        if (result && result.bounds) {
            scope.clickWithOffset(result.bounds, offsetX, offsetY, dx, dy);
            console.log("已点击图标【" + type + "】");
            return true;
        }
        console.log("未找到图标【" + type + "】");
        return false;
    };

    // ---- PaddleOCR 初始化（Pro 兼容版）----

    /**
     * 【Pro 适配】使用 $ocr.create() 替代旧的 importClass Predictor
     */
    scope.initPaddleOcr = function () {
        try {
            if (typeof $ocr === "undefined") {
                console.log("错误: 当前环境不支持 $ocr");
                return null;
            }
            var ocr = $ocr.create({models: 'default'});
            console.log("PaddleOCR 初始化成功");
            return ocr;
        } catch (e) {
            console.log("PaddleOCR 不可用: " + e.message);
            return null;
        }
    };
};