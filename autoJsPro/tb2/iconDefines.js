// ============================================================
// iconDefines.js - 图标模板匹配配置定义
//
// 统一管理所有图标模板匹配的默认参数，
// 避免每次调用都重复传 path/region/threshold 等。
//
// 提供三个增强函数：
//   iconFindClick(name, extraOptions) - 识别并点击
//   iconRecognize(name, extraOptions) - 仅识别
//   iconWaitFor(name, extraOptions)   - 等待出现
//
// 函数自动将 name 解析为 ./images/{name}.jpg，
// 并合并 ICON_DEFS 中的默认选项，extraOptions 可覆盖。
//
// 支持批量（数组）：依次匹配，返回第一个命中的结果。
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    var ICON_DEFS = {
        // ---- 通用 ----
        "close": {},

        // ---- 浇水 ----
        "jiaoshui1": {
            colorCompare: true, threshold: 0.85,
            region: [
                Math.floor(device.width * 0.2), Math.floor(device.height * 0.2),
                Math.floor(device.width * 0.6), Math.floor(device.height * 0.6)
            ]
        },
        "jiaoshui5": {
            colorCompare: true, threshold: 0.85,
            region: [
                Math.floor(device.width * 0.2), Math.floor(device.height * 0.2),
                Math.floor(device.width * 0.6), Math.floor(device.height * 0.6)
            ]
        },
        "jiaoshui_close": {},
        "jiaoshui_feiliao": {
            region: [
                Math.floor(device.width * 0.2), Math.floor(device.height * 0.2),
                Math.floor(device.width * 0.6), Math.floor(device.height * 0.6)
            ]
        },

        // ---- 集肥料 ----
        "jifeiliao_icon": {
            timeout: 20000, interval: 1500, threshold: 0.6,
            region: [
                Math.floor(device.width * 0.5), Math.floor(device.height * 0.7),
                Math.floor(device.width * 0.4), Math.floor(device.height * 0.2)
            ]
        },

        // ---- 施肥 ----
        "shifei": {
            dy: 200,
            region: [
                Math.floor(device.width * 0.2), Math.floor(device.height * 0.2),
                Math.floor(device.width * 0.6), Math.floor(device.height * 0.6)
            ]
        },

        // ---- 阳光 ----
        "sun": {
            region: [0, 0, device.width, Math.floor(device.height * 0.5)]
        },
        "sun_entry": {
            threshold: 0.7, colorCompare: true,
            region: [
                Math.floor(device.width * 0.7), Math.floor(device.height * 0.3),
                Math.floor(device.width * 0.3), Math.floor(device.height * 0.4)
            ]
        },

        // ---- 弹窗关闭 ----
        "taskPageClose": {
            threshold: 0.6
        },
        "tuzi": {
            threshold: 0.7,
            region: [
                0, Math.floor(device.height * 0.4),
                Math.floor(device.width * 0.4), Math.floor(device.height * 0.3)
            ]
        },

        // ---- 消消乐 ----
        "xiaoxiaole_close": {},
        "xiaoxiaole_exit": {
            timeout: 15000, interval: 1000, threshold: 0.7,
            region: [
                Math.floor(device.width * 0.7), 0,
                Math.floor(device.width * 0.3), Math.floor(device.height * 0.2)
            ]
        },
    };

    /**
     * 解析图标选项：合并 ICON_DEFS 默认配置 + extraOptions
     *
     * @param {string} name - 图标名称
     * @param {Object} [extraOptions] - 额外/覆盖选项
     * @returns {Object} 合并后的选项对象
     */
    function _resolveIconOptions(name, extraOptions) {
        var def = ICON_DEFS[name] || {};
        var options = {};
        for (var k in def) {
            if (def.hasOwnProperty(k)) options[k] = def[k];
        }
        if (extraOptions) {
            for (var k in extraOptions) {
                if (extraOptions.hasOwnProperty(k)) options[k] = extraOptions[k];
            }
        }
        return options;
    }

    /**
     * 解析图标路径：name → ./images/{name}.jpg
     *
     * @param {string} name - 图标名称（不含路径和后缀）
     * @returns {string} 图片相对路径
     */
    function _resolveIconPath(name) {
        return "./images/" + name + ".jpg";
    }

    /**
     * 根据 ICON_DEFS 识别并点击图标
     *
     * 自动将 name 解析为图片路径，合并默认选项后调用 findIconAndClick。
     * 支持数组：依次匹配，返回第一个点击成功的结果。
     *
     * @param {string|string[]} name - 图标名称（或数组批量匹配）
     * @param {Object} [extraOptions] - 额外/覆盖选项（如 region, threshold, dx, dy 等）
     * @returns {boolean} true=点击成功
     *
     * @example
     * iconFindClick("shifei");
     * iconFindClick("jiaoshui_close", { threshold: 0.7 });     // 覆盖阈值
     * iconFindClick(["close", "taskPageClose"]);                // 备选关闭
     */
    scope.iconFindClick = function (name, extraOptions) {
        // 数组模式：依次尝试，点击成功立即返回
        if (Array.isArray(name)) {
            for (var i = 0; i < name.length; i++) {
                if (scope.iconFindClick(name[i], extraOptions)) return true;
            }
            return false;
        }
        var options = _resolveIconOptions(name, extraOptions);
        var path = _resolveIconPath(name);
        return scope.findIconAndClick("template", path, options);
    };

    /**
     * 根据 ICON_DEFS 识别图标（不点击）
     *
     * @param {string} name - 图标名称
     * @param {Object} [extraOptions] - 额外/覆盖选项
     * @returns {Object|null} { x, y, w, h, centerX, centerY } 或 null
     *
     * @example
     * var pos = iconRecognize("shifei");
     */
    scope.iconRecognize = function (name, extraOptions) {
        var options = _resolveIconOptions(name, extraOptions);
        var path = _resolveIconPath(name);
        return scope.findIconByTemplate(path, options);
    };

    /**
     * 根据 ICON_DEFS 等待图标出现（可选自动点击）
     *
     * @param {string|string[]} name - 图标名称（数组则等待任意一个出现）
     * @param {Object} [extraOptions] - 额外/覆盖选项（含 timeout, interval, clickWhenFound, closePopup 等）
     * @returns {Object|boolean|null} 同 waitForIcon
     *
     * @example
     * iconWaitFor("xiaoxiaole_exit", { timeout: 15000, threshold: 0.7 });
     * iconWaitFor("jifeiliao_icon", { timeout: 20000, closePopup: { templatePath: "./images/taskPageClose.jpg", threshold: 0.7 } });
     */
    scope.iconWaitFor = function (name, extraOptions) {
        // 数组模式：依次尝试，返回第一个出现的结果
        if (Array.isArray(name)) {
            for (var i = 0; i < name.length; i++) {
                var result = scope.iconWaitFor(name[i], extraOptions);
                if (result) return result;
            }
            return null;
        }
        var options = _resolveIconOptions(name, extraOptions);
        var path = _resolveIconPath(name);
        return scope.waitForIcon(path, options);
    };
};