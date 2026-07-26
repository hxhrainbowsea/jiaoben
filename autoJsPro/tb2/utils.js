// ============================================================
// utils.js - 工具函数
// 依赖: config.js（scoped CLICK_OFFSET_X, CLICK_OFFSET_Y）
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    /**
     * 生成 [min, max] 间的随机整数
     *
     * @param {number} min - 最小值（包含）
     * @param {number} max - 最大值（包含）
     * @returns {number} min~max 范围内的随机整数
     *
     * @example
     * randInt(10, 20)  // 可能返回 10~20 中的任意整数
     */
    scope.randInt = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    /**
     * 生成服从对数正态分布的随机数
     *
     * 人类操作间隔服从对数正态分布（Log-Normal Distribution），
     * 即：间隔时间的对数服从正态分布。
     * 相比均匀分布，它产生的值更集中在均值附近，偶尔有长尾大值，
     * 更符合真实人类的反应时间特征。
     *
     * @param {number} mean     - 分布的均值（ms），即大部分值集中在此附近
     * @param {number} sigma    - 分布的形状参数（对数标准差），
     *                            默认 0.3。越大则值越分散，长尾越明显。
     *                            sigma=0.3 → 约 95% 值在 [mean×0.55, mean×1.8] 范围
     * @returns {number} 服从对数正态分布的随机 ms 值
     *
     * @example
     * randomLogNormal(1200)      // 大多在 660~2160ms 之间，偶尔更长
     * randomLogNormal(800, 0.2)  // sigma 更小，分布更集中
     */
    scope.randomLogNormal = function (mean, sigma) {
        sigma = sigma || 0.3;
        // Box-Muller 变换生成标准正态分布
        var u1 = Math.random();
        var u2 = Math.random();
        var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        // 对数正态：ln(X) ~ N(ln(mean) - sigma^2/2, sigma^2)
        // 这样 E[X] = mean
        var logMean = Math.log(mean) - (sigma * sigma) / 2;
        var result = Math.exp(logMean + z * sigma);
        // 保证非负且不过大（封顶 5 倍均值，避免极端异常）
        return Math.min(result, mean * 5);
    };

    /**
     * 随机停留一段时间，模拟人类操作的不规律性，用于防风控
     *
     * 实际等待时间服从对数正态分布（更接近真人节奏）：
     * - 大部分值集中在 durationMs 附近
     * - 偶尔有较长的间隔（如思考、犹豫）或较短的间隔（如连续操作）
     * - 不再使用均匀分布 ±rangeMs（机器感强，易被风控识别）
     *
     * @param {number} durationMs - 基准等待时间（ms）
     * @param {number} [sigma]    - 对数正态分布的形状参数，默认 0.3。
     *                              不传则使用默认值，保持调用处简洁
     *
     * @example
     * randomSleep(1200)      // 对数正态分布，大多在 660~2160ms
     * randomSleep(800, 0.2)  // sigma=0.2，分布更集中
     */
    scope.randomSleep = function (durationMs, sigma, minMs) {
        var actual = scope.randomLogNormal(durationMs, sigma || 0.3);
        if (minMs !== undefined && minMs !== null) {
            actual = Math.max(minMs, actual);
        }
        sleep(Math.max(50, Math.floor(actual)));
    };

    /**
     * 模拟人性化点击（完整的 DOWN → MOVE(微动) → UP 事件序列）
     *
     * 区别于 Auto.js 裸 `click(x, y)`（仅产生 DOWN+UP，风控易识别），
     * 本函数通过 `gesture()` 产生完整的触摸事件链：
     *   1. 手指按下（DOWN）
     *   2. 微小移动（MOVE），模拟手指按下的自然颤抖（1~4px 偏移）
     *   3. 手指抬起（UP）
     *
     * 同时模拟了真人点击的特征：
     * - 按下时手指会先触到目标点附近，再微调
     * - 点击持续时间有微小差异（60~180ms）
     * - 每次按下和抬起位置不完全重合（弹性形变恢复）
     *
     * @param {number} x - 点击目标 X 坐标
     * @param {number} y - 点击目标 Y 坐标
     *
     * @example
     * simulateClick(540, 960);  // 在 (540,960) 处模拟一次完整的人性化点击
     */
    scope.simulateClick = function (x, y) {
        // 按下位置：目标点附近 ±2px（模拟手指定位误差）
        var pressX = x + scope.randInt(-2, 2);
        var pressY = y + scope.randInt(-2, 2);

        // 抬起位置：在按下位置基础上再偏移 ±1~3px（模拟手指弹性恢复）
        var releaseX = x + scope.randInt(-3, 3);
        var releaseY = y + scope.randInt(-3, 3);

        // 点击持续时间：60~180ms，对数正态分布更自然
        var holdMs = Math.floor(scope.randomLogNormal(100, 0.35));
        holdMs = Math.max(50, Math.min(holdMs, 250));

        // 3 点 gesture = DOWN → MOVE(微调) → UP
        gesture(holdMs, [pressX, pressY], [releaseX, releaseY]);
    };

    /**
     * 在 bounds 区域内以随机偏移点击，模拟真人点击防风控
     *
     * 逻辑：计算 bounds 中心点 → 加上定向偏移 (dx, dy) → 加上随机偏移 (±offset) → 执行
     *
     * 改进：使用 simulateClick 替代裸 click()，产生完整的 DOWN→MOVE→UP 事件序列，
     * 避免风控识别到不自然的事件缺失。
     *
     * @param {Object}   bounds  - 目标区域的边界，格式：{ left, top, right, bottom }
     * @param {number}   [offsetX] - X 方向随机偏移范围（像素），默认取 CLICK_OFFSET_X（config.js）
     * @param {number}   [offsetY] - Y 方向随机偏移范围（像素），默认取 CLICK_OFFSET_Y（config.js）
     * @param {number}   [dx]     - X 方向定向偏移（像素），在中心点基础上额外偏移
     * @param {number}   [dy]     - Y 方向定向偏移（像素），在中心点基础上额外偏移
     *
     * @example
     * clickWithOffset({ left:100, top:200, right:300, bottom:400 })
     * clickWithOffset(bounds, 15, 10)       // 偏移范围 15px × 10px
     * clickWithOffset(bounds, null, null, 40, 1)  // 中心点右移 40px + 随机偏移
     */
    scope.clickWithOffset = function (bounds, offsetX, offsetY, dx, dy) {
        offsetX = offsetX !== undefined ? offsetX : scope.CLICK_OFFSET_X;
        offsetY = offsetY !== undefined ? offsetY : scope.CLICK_OFFSET_Y;
        dx = dx || 0;
        dy = dy || 0;

        var centerX = Math.floor((bounds.left + bounds.right) / 2) + dx;
        var centerY = Math.floor((bounds.top + bounds.bottom) / 2) + dy;

        var clickX = centerX + scope.randInt(-offsetX, offsetX);
        var clickY = centerY + scope.randInt(-offsetY, offsetY);

        clickX = Math.max(0, Math.min(clickX, device.width));
        clickY = Math.max(0, Math.min(clickY, device.height));

        scope.simulateClick(clickX, clickY);

        // ---- 调试：在点击位置画标记（红圈 + 坐标文字） ----
        if (scope.DEBUG_CLICK_MARKER) {
            scope.drawClickMarker(clickX, clickY);
        }
    };

    /**
     * 自定义位置的 Toast 提示（使用悬浮窗实现）
     *
     * 在指定坐标位置显示一条半透明背景的文字提示，指定时间后自动消失
     *
     * @param {string}  msg        - 提示文字内容
     * @param {number}  [duration] - 显示时长（ms），默认 2000ms
     * @param {number}  [x]        - 悬浮窗的 X 坐标（像素），默认屏幕水平居中
     * @param {number}  [y]        - 悬浮窗的 Y 坐标（像素），默认屏幕 15% 高度处
     * @param {string}  [bgColor]  - 背景色（CSS 格式，含透明度），默认 "#CC333333"
     * @param {string}  [textColor]- 文字色，默认 "#ffffff"
     * @returns {Object} 悬浮窗对象（可自行调用 close() 提前关闭）
     *
     * @example
     * toastCustom("任务完成");
     * toastCustom("警告", 3000, 100, 500);
     */
    scope.toastCustom = function (msg, duration, x, y, bgColor, textColor) {
        duration  = duration || 2000;
        bgColor   = bgColor   || "#CC333333";
        textColor = textColor || "#ffffff";

        var ui = (
            <frame id="container" bg={bgColor} w="auto" h="auto" padding="12 8">
                <text id="msg" textColor={textColor} textSize="14sp" gravity="center"/>
            </frame>
        );

        var w = floaty.rawWindow(ui);

        var width  = device.width;
        var height = device.height;
        x = x !== undefined ? x : Math.floor(width / 2);
        y = y !== undefined ? y : Math.floor(height * 0.15);
        w.setPosition(x, y);
        w.msg.setText(msg);

        setTimeout(function () {
            if (w) { w.close(); w = null; }
        }, duration);

        return w;
    };

    /**
     * 调试：在指定坐标画红点标记，2 秒后自动消失
     * 仅在 config.js 中 DEBUG_CLICK_MARKER = true 时被调用
     *
     * @param {number} x - 标记中心 X 坐标（像素）
     * @param {number} y - 标记中心 Y 坐标（像素）
     *
     * @example
     * drawClickMarker(540, 960)  // 在屏幕中心画一个红点
     */
    scope.drawClickMarker = function (x, y) {
        var dot = (
            <frame w="16" h="16" bg="#ff0000" alpha="0.9" />
        );
        var w = floaty.rawWindow(dot);
        w.setPosition(x - 8, y - 8);
        w.setSize(16, 16);
        w.setTouchable(false);

        setTimeout(function () {
            if (w) { w.close(); w = null; }
        }, 2000);
    };
};