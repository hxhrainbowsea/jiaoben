// ============================================================
// ocrDefines.js - OCR 识别配置定义
//
// 统一管理所有文字识别的默认参数（method + options），
// 避免每次调用都重复传 CURRENT_METHOD/exactMatch 等。
//
// 提供两个增强函数：
//   ocrRecognize(text, extraOptions) - 根据定义识别
//   ocrFindClick(text, extraOptions)  - 根据定义识别并点击
//
// extraOptions 可覆盖定义中的任意字段（如 region、dx 等）
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    // ---- 识别配置定义 ----
    // key=目标文字, value={ method, exactMatch, regex, ... }
    // method 不传则默认 scope.CURRENT_METHOD
    var OCR_DEFS = {
        // ---- 导航页 ----
        "我的淘宝": {
            method: scope.METHOD_PADDLE_OCR,
            exactMatch: true, checkDesc: true, uiSel: true,
            region: [0, Math.floor(device.height * 0.8), device.width, Math.floor(device.height * 0.2)]
        },
        "芭芭农场": {method: scope.CURRENT_METHOD, exactMatch: true, uiSel: true},
        "点击领取": {
            method: scope.CURRENT_METHOD, checkDesc: true, uiSel: true,
            region: [Math.floor(device.width * 0.6), Math.floor(device.height * 0.6), Math.floor(device.width * 0.4), Math.floor(device.height * 0.3)],
            // 别名：OCR 有时把"领"误识成繁体"領"，一并匹配
            alias: ["点击領取"]
        },
        "前往支付宝": {
            method: scope.METHOD_PADDLE_OCR,
            region: [0, Math.floor(device.height * 4 / 5), device.width, Math.floor(device.height / 5)]
        },

        // ---- 任务页 ----
        "搜索发现": {
            method: scope.METHOD_PADDLE_OCR,
            exactMatch: true, uiSel: true,
            region: [0, Math.floor(device.height * 0.2), Math.floor(device.width * 0.4), Math.floor(device.height * 0.3)]
        },
        "点我得": {method: scope.CURRENT_METHOD, uiSel: true},
        "集肥料": {
            exactMatch: true, uiSel: true,
        },
        "逛精选商品": {
            method: scope.METHOD_PADDLE_OCR, exactMatch: true, uiSel: true,
            region: [Math.floor(device.width * 0.2), Math.floor(device.height * 0.5), Math.floor(device.width * 0.6), Math.floor(device.height * 0.4)],
        },
        "次可领": {
            method: scope.CURRENT_METHOD,
            region: [Math.floor(device.width * 0.3), Math.floor(device.height * 0.5), Math.floor(device.width * 0.5), Math.floor(device.height * 0.2)]
        },
        "加码": {
            method: scope.CURRENT_METHOD,
            region: [Math.floor(device.width * 0.3), Math.floor(device.height * 0.5), Math.floor(device.width * 0.5), Math.floor(device.height * 0.2)]
        },
        "取消": {//任务页面有时候会弹窗，取消和再试一次，返回失效，贼恶心
            method: scope.CURRENT_METHOD, uiSel: true, exactMatch: true,
            region: [Math.floor(device.width * 0.2), Math.floor(device.height * 0.4), Math.floor(device.width * 0.8), Math.floor(device.height * 0.40)]
        },
        // ---- 农场 ----
        "亲密度": {
            method: scope.CURRENT_METHOD, uiSel: true,
            region: [Math.floor(device.width * 0.5), 0, Math.floor(device.width * 0.4), Math.floor(device.height * 0.2)]
        },
        "我自己": {
            method: scope.CURRENT_METHOD,
            region: [
                Math.floor(device.width * 0.1),
                Math.floor(device.height * 0.50),
                Math.floor(device.width * 0.8),
                Math.floor(device.height * 0.30)
            ]
        },
        "立即领取": {
            method: scope.METHOD_PADDLE_OCR, exactMatch: true,
            region: [0, Math.floor(device.height * 0.4), device.width, Math.floor(device.height * 0.2)]
        },
        // ---- 广告拦截（浇水过程中弹出的全屏广告）----
        // 识别B：已在广告浏览页B，特征文字在上方25%（同「恭喜完成所有任务」区域），WebView 须 MLKIT 像素级 OCR
        "完成所有任务得2400肥料": {
            method: scope.METHOD_MLKIT_OCR,
            region: [0, 0, device.width, Math.floor(device.height * 0.25)]
        },
        // 识别A辅助：广告弹框奖励数「2400」（下方30%），与「立即领取」同屏验证用（防误触）
        "2400": {
            method: scope.METHOD_MLKIT_OCR,
            region: [0, Math.floor(device.height * 0.7), device.width, Math.floor(device.height * 0.3)]
        },
        "取升级阳光": {
            method: scope.METHOD_PADDLE_OCR,
            region: [Math.floor(device.width * 0.2), Math.floor(device.height * 0.6), Math.floor(device.width * 0.6), Math.floor(device.height * 0.3)]
        },
        "浏览得奖励": {
            method: scope.CURRENT_METHOD, uiSel: true,
            region: [Math.floor(device.width * 0.2), Math.floor(device.height * 0.5), Math.floor(device.width * 0.6), Math.floor(device.height * 0.3)]
        },
        "去得阳光": {
            method: scope.CURRENT_METHOD, exactMatch: true, uiSel: true,
            region: [Math.floor(device.width * 0.2), Math.floor(device.height * 0.5), Math.floor(device.width * 0.6), Math.floor(device.height * 0.3)],
        },
        "集阳光": {
            method: scope.METHOD_MLKIT_OCR, exactMatch: true, dy: 120,
            region: [Math.floor(device.width * 0.7), 0, Math.floor(device.width * 0.3), device.height]
        },
        "立即去收": {
            method: scope.METHOD_MLKIT_OCR,
            region: [0, Math.floor(device.height * 0.6), device.width, Math.floor(device.height * 0.3)]
        },
        "领阳光": {
            method: scope.METHOD_MLKIT_OCR, exactMatch: true,
            region: [Math.floor(device.width * 0.6), 0, Math.floor(device.width * 0.4), device.height],
            dx: 50, dy: -70,
        },
        // 来阳光农场签到领阳光
        "来阳光农场": {
            method: scope.METHOD_PADDLE_OCR,
            region: [Math.floor(device.width * 0.1), Math.floor(device.height * 0.3), Math.floor(device.width * 0.6), Math.floor(device.height * 0.2)]
        },
        "浏览15秒": {
            method: scope.CURRENT_METHOD, uiSel: true,
            region: [Math.floor(device.width * 0.1), Math.floor(device.height * 0.4), Math.floor(device.width * 0.6), Math.floor(device.height * 0.4)]
        },

        // ---- 阳光升级 ---- 
        "万": {
            method: scope.METHOD_PADDLE_OCR,
            offsetX: 1,
            offsetY: 1,
            dx: -25,
            dy: -55,
            region: [Math.floor(device.width * 0.25), Math.floor(device.height * 0.2), Math.floor(device.width * 0.55), Math.floor(device.height * 0.5)]
        },
        "亿": {
            method: scope.METHOD_PADDLE_OCR,
            offsetX: 1,
            offsetY: 1,
            dx: -25,
            dy: -55,
            region: [Math.floor(device.width * 0.25), Math.floor(device.height * 0.2), Math.floor(device.width * 0.55), Math.floor(device.height * 0.5)]
        },

        // ---- 助力 ----
        "消息": {
            method: scope.METHOD_PADDLE_OCR,
            exactMatch: true,
            region: [0, Math.floor(device.height * 0.8), device.width, Math.floor(device.height * 0.2)],
            offsetX: 1, offsetY: 1, dy: -100
        },
        "立即助力": {
            method: scope.CURRENT_METHOD, exactMatch: true, uiSel: true,
            region: [Math.floor(device.width * 0.25), Math.floor(device.height * 0.5), Math.floor(device.width * 0.55), Math.floor(device.height * 0.3)]
        },
        "你也可以领": {method: scope.CURRENT_METHOD, uiSel: true},
        "拜托帮我助力一下": {method: scope.CURRENT_METHOD, uiSel: true},

        // ---- 消消乐 ----
        "第\\d+关": {method: scope.METHOD_PADDLE_OCR, regex: true},
        "开始": {
            method: scope.METHOD_PADDLE_OCR,
            region: [0, Math.floor(device.height * 0.5), device.width, Math.floor(device.height * 0.3)]
        },

        // ---- 答题 ----
        "领取奖励": {
            method: scope.METHOD_PADDLE_OCR,
            region: [0, Math.floor(device.height * 0.6), device.width, Math.floor(device.height * 0.4)]
        },
        "领取鼓励奖励": {
            method: scope.METHOD_PADDLE_OCR,
            region: [0, Math.floor(device.height * 0.6), device.width, Math.floor(device.height * 0.4)]
        },
    };

    /**
     * 规范化识别目标：统一处理「别名(alias)」与「数组输入」
     *
     * 一进来先判断 text 是字符串还是数组：
     *  - 字符串：查 OCR_DEFS，若配置了 alias 则展开成 [text, ...alias]；否则原样返回字符串。
     *  - 数组：逐元素展开各自的 alias，并去重，返回展开后的数组。
     *
     * 返回的 target 若为数组，调用方应进入 multi 处理流程（一次截图批量匹配）；
     * 若为字符串，说明无别名，走单文字识别即可。
     *
     * @param {string|string[]} text - 原始目标（单字符串或字符串数组）
     * @returns {string[]} 规范化后的目标
     */
    function _resolveOcrTarget(text) {
        var expanded = [];
        var seen = {};
        if (Array.isArray(text)) {
            for (var i = 0; i < text.length; i++) {
                var t = text[i];
                if (t == null) continue;
                if (!seen[t]) {
                    seen[t] = true;
                    expanded.push(t);
                }
                let adef = OCR_DEFS[t];
                if (adef && adef.alias && adef.alias.length) {
                    for (let a = 0; a < adef.alias.length; a++) {
                        let al = adef.alias[a];
                        if (!seen[al]) {
                            seen[al] = true;
                            expanded.push(al);
                        }
                    }
                }
            }
        } else {
            expanded.push(text);
            let def = OCR_DEFS[text];
            if (def && def.alias && def.alias.length) {
                for (let a = 0; a < def.alias.length; a++) {
                    let al = def.alias[a];
                    if (!seen[al]) {
                        seen[al] = true;
                        expanded.push(al);
                    }
                }
            }
        }
        return expanded;
    }

    /**
     * 规范化识别选项：合并 extraOptions 与 OCR_DEFS 中的配置
     * extraOptions 会覆盖 OCR_DEFS定义的属性
     * @param {string[]} textArray - 目标文字数组（单个字符串或字符串数组，）
     * @param {Object} extraOptions - 额外/覆盖选项（如 region、dx、dy，或 method）
     * @returns {{}}
     * @private
     */
    function _resolveOcrOptions(textArray, extraOptions) {
        let options = {
            method: scope.CURRENT_METHOD,
        };
        for (let i = 0; i < textArray.length; i++) {
            let t = textArray[i];
            if (t == null) continue;
            let def = OCR_DEFS[t];
            if (def) {
                Object.assign(options, def);
            }
        }
        if (extraOptions) {
            Object.assign(options, extraOptions);
        }
        return options;
    }

    /**
     * 根据 OCR_DEFS 识别文字
     *
     * 支持两种调用方式：
     * 1. 单文字：ocrRecognize("我的淘宝") — 与原来一致
     * 2. 多文字：ocrRecognize(["搜索发现", "我的淘宝"]) — 一次截图批量识别，
     *    只要命中任一文字即返回 { text, bounds }
     *
     * 别名处理：无论传单文字还是数组，凡是 OCR_DEFS 中配置了 alias 的项，
     * 都会自动展开其别名一并匹配（一次截图内完成），无需调用方手动列出变体。
     *
     * 多文字模式使用 ocrCaptureAll 截图一次，再从结果中遍历匹配所有目标文字，
     * 返回第一个命中的结果。region / method 优先取 extraOptions，
     * 其次取 OCR_DEFS 中第一个有定义的文字的配置。
     *
     * @param {string|string[]} text - 目标文字（单个字符串或字符串数组）
     * @param {Object} [extraOptions] - 额外/覆盖选项（如 region、dx、dy，或 method）
     * @returns {Object|null} { text, bounds } 或 null
     *
     * @example
     * ocrRecognize("我的淘宝");
     * ocrRecognize("500", { region: quizRegion });
     * ocrRecognize(["搜索发现", "我的淘宝"]);                          // 批量识别
     * ocrRecognize(["红包", "签到"], { region: bottomRegion });        // 指定区域
     * ocrRecognize(["逛精选商品", "施肥"], { method: METHOD_PADDLE_OCR }); // 指定方法
     */
    scope.ocrRecognize = function (text, extraOptions) {
        // ---- UI_SELECTOR 模式：仅对标记了 uiSel 的文字生效 ----
        if (global._ocrPure !== true) {
            let target = _resolveOcrTarget(text);
            if (target.length > 0) {
                let def = OCR_DEFS[target[0]];
                if (def && def.uiSel) {
                    let options = {};
                    // 仅复制 UI_SELECTOR 支持的文本匹配属性
                    if (def.exactMatch !== undefined) options.exactMatch = def.exactMatch;
                    if (def.checkDesc !== undefined) options.checkDesc = def.checkDesc;
                    if (def.regex !== undefined) options.regex = def.regex;
                    if (extraOptions) Object.assign(options, extraOptions);
                    for (var i = 0; i < target.length; i++) {
                        var result = scope.recognize(target[i], scope.METHOD_UI_SELECTOR, options);
                        if (result) return result;
                    }
                    return null;
                }
            }
            // 无 uiSel 标记的文字：fall through 到 OCR 模式
        }

        // ---- OCR 模式：走 OCR_DEFS 配置表（保留 METHOD_PADDLE_OCR 硬编码） ----
        let target = _resolveOcrTarget(text);
        let options = _resolveOcrOptions(target, extraOptions);
        // 命中数组 → 进入 multi 处理流程（一次截图批量匹配多个文字）
        if (target.length > 1) {
            return _ocrRecognizeMulti(target, options);
        }
        return scope.recognize(target[0], options.method, options);
    };

    /**
     * 内部：一次截图 + OCR，批量匹配多个文字，返回第一个命中的结果
     *
     * @param {string[]} texts       - 目标文字数组
     * @param {Object}   [extraOpts] - 额外选项（method, region, exactMatch, regex）
     * @returns {Object|null} { text, bounds } 或 null
     */
    function _ocrRecognizeMulti(texts, extraOpts) {
        let method = extraOpts.method;
        let region = extraOpts.region;
        console.log("[ocrRecognize] 批量识别 " + texts.length + " 个: " + texts.join(", ") + "  method=" + method);

        // 一次截图 + OCR
        var allResults = scope.ocrCaptureAll(region, method);
        if (!allResults || allResults.length === 0) {
            console.log("[ocrRecognize] OCR 无结果");
            return null;
        }

        // 逐个匹配，返回第一个命中的
        for (var i = 0; i < texts.length; i++) {
            var target = texts[i];
            var result = scope.findTextInOcrResults(allResults, target, extraOpts.exactMatch, extraOpts.regex);
            if (result) {
                console.log("[ocrRecognize] 【" + target + "】批量命中 (" + method + "): text=" + result.text);
                return result;
            }
        }
        console.log("[ocrRecognize] 批量未命中: " + texts.join(", "));
        return null;
    }

    /**
     * 根据 OCR_DEFS 识别并点击文字
     *
     * @param {string|Array} text - 目标文字
     * @param {Object} [extraOptions] - 额外/覆盖选项（含 offsetX/dx 等点击参数，或 method）
     * @returns {boolean} true=点击成功
     *
     * @example
     * ocrFindClick("我的淘宝");
     * ocrFindClick("消息", { region: bottomRegion, dy: -100 });
     */
    scope.ocrFindClick = function (text, extraOptions) {
        // 合并 OCR_DEFS + extraOptions，确保 dy/dx/offsetX/offsetY 生效
        var target = _resolveOcrTarget(text);
        var options = _resolveOcrOptions(target, extraOptions);
        var hit = scope.ocrRecognize(text, extraOptions);
        if (hit && hit.bounds) {
            var offsetX = options.offsetX !== undefined ? options.offsetX : scope.CLICK_OFFSET_X;
            var offsetY = options.offsetY !== undefined ? options.offsetY : scope.CLICK_OFFSET_Y;
            scope.clickWithOffset(hit.bounds, offsetX, offsetY, options.dx || 0, options.dy || 0);
            console.log("已点击【" + hit.text + "】");
            return true;
        }
        console.log("未找到可点击文字: " + (Array.isArray(text) ? text.join("/") : text));
        return false;
    };

    /**
     * 根据 OCR_DEFS 等待文字出现（可选自动点击）
     *
     * 自动查找 text 对应的默认 method 和 options，再与 extraOptions 合并。
     *
     * @param {string|Array} text - 目标文字
     * @param {Object} [extraOptions] - 额外/覆盖选项（如 timeout, region, dx/dy, clickWhenFound, 或 method）
     * @returns {Object|boolean|null} 同 waitForText 返回值
     *
     * @example
     * ocrWaitForText("搜索发现", { timeout: 5000, clickWhenFound: true, dx: 300, dy: 200 });
     * ocrWaitForText("第\\d+关", { timeout: 10000, region: levelRegion });
     */
    scope.ocrWaitForText = function (text, extraOptions) {
        // UI_SEL 模式：对标记了 uiSel 的文字走 UI_SELECTOR 等待
        if (global._ocrPure !== true) {
            let target = _resolveOcrTarget(text);
            if (target.length > 0) {
                let def = OCR_DEFS[target[0]];
                if (def && def.uiSel) {
                    let options = {};
                    if (def.exactMatch !== undefined) options.exactMatch = def.exactMatch;
                    if (def.checkDesc !== undefined) options.checkDesc = def.checkDesc;
                    if (def.regex !== undefined) options.regex = def.regex;
                    // waitForText 自身支持数组，直接传入即可
                    if (extraOptions) Object.assign(options, extraOptions);
                    return scope.waitForText(target, scope.METHOD_UI_SELECTOR, options);
                }
            }
        }
        let target = _resolveOcrTarget(text);
        let options = _resolveOcrOptions(target, extraOptions);
        return scope.waitForText(target, options.method, options);
    };
};