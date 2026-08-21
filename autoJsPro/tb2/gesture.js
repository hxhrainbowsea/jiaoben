// ============================================================
// gesture.js - 滑动手势
// 依赖: config.js（scoped BACK_SWIPE_* / SCROLL_* 等参数）
//       utils.js（scope.randInt, scope.randomSleep）
//
// 防风控改进（2026-07-02）：
//   1. 缓动函数：easeInOutCubic 使轨迹点非等距分布，模拟
//      真人手指的加速启动 → 匀速滑行 → 减速停止
//   2. 所有多点轨迹生成均使用缓动函数，不再使用线性插值
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    // ============================================================
    // 缓动函数（Easing Functions）：用于生成非等距轨迹点，
    // 模拟真人手指的加速启动→匀速滑行→减速停止
    // ============================================================

    /**
     * 缓动函数枚举，用于多点轨迹生成时选择不同的加速度曲线
     * @readonly
     * @enum {string}
     */
    var EASE = {
        LINEAR: "linear",       // 等速（无加减速，保留用于调试）
        EASE_IN: "easeIn",       // 仅加速（慢→快）
        EASE_OUT: "easeOut",      // 仅减速（快→慢）
        EASE_IN_OUT: "easeInOut"     // 先加速后减速（默认，最自然）
    };

    /**
     * 三次缓入缓出（easeInOutCubic）：先加速后减速
     *
     * 真人手指滑动时：启动慢 → 中间快 → 停止慢。
     * 使用三次函数使轨迹点疏密不均，避免等距点被风控识别。
     *
     * @param {number} t - 归一化时间 [0, 1]
     * @returns {number} 缓动后的归一化位置 [0, 1]
     *
     * @example
     * easeInOutCubic(0.25)  // ≈ 0.156（密集，慢速）
     * easeInOutCubic(0.50)  // = 0.500（正常速度）
     * easeInOutCubic(0.75)  // ≈ 0.844（密集，慢速）
     */
    function easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * 三次缓入（easeInCubic）：仅加速，用于手势开始时模拟手指启动
     *
     * @param {number} t - 归一化时间 [0, 1]
     * @returns {number} 缓动后的归一化位置 [0, 1]
     */
    function easeInCubic(t) {
        return t * t * t;
    }

    /**
     * 三次缓出（easeOutCubic）：仅减速，用于手势结束时模拟手指停止
     *
     * @param {number} t - 归一化时间 [0, 1]
     * @returns {number} 缓动后的归一化位置 [0, 1]
     */
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * 根据缓动类型获取缓动函数
     *
     * @param {string} type - 缓动类型（EASE 枚举值）
     * @returns {Function} 缓动函数 (t) => eased_t
     */
    function getEasingFn(type) {
        switch (type) {
            case EASE.EASE_IN:
                return easeInCubic;
            case EASE.EASE_OUT:
                return easeOutCubic;
            case EASE.EASE_IN_OUT:
                return easeInOutCubic;
            default:
                return function (t) {
                    return t;
                }; // linear
        }
    }

    /**
     * 生成带缓动效果的多点手势路径
     *
     * 将 [0,1] 等分后通过缓动函数重新映射，使轨迹点疏密不均：
     * - 起点附近：点密集（模拟手指缓慢启动）
     * - 中间段：点稀疏（模拟快速滑动）
     * - 终点附近：点密集（模拟手指缓慢停止）
     * 每个点还叠加随机偏移，进一步增加自然感。
     *
     * @param {number} sX       - 起点 X
     * @param {number} sY       - 起点 Y
     * @param {number} eX       - 终点 X
     * @param {number} eY       - 终点 Y
     * @param {number} dur      - 手势总时长（ms）
     * @param {number} [ptCount]- 分段数（不含起点，含终点），默认 4，共生成 ptCount+1 个轨迹点
     * @param {string} [ease]   - 缓动类型，默认 EASE_IN_OUT
     * @param {number} [jitter] - 坐标随机抖动幅度（px），默认 20
     * @returns {Array} [[duration], [sX,sY], [x1,y1], [x2,y2], ..., [eX,eY]]
     *                    起点 → 缓动中间点 → 终点，共 ptCount+1 个轨迹点
     */
    scope.buildEasedGesturePoints = function (sX, sY, eX, eY, dur, ptCount, ease, jitter) {
        ptCount = ptCount || scope.randInt(3, 5);
        ease = ease || EASE.EASE_IN_OUT;
        jitter = jitter || 20;

        var easingFn = getEasingFn(ease);
        var width = device.width;
        var height = device.height;

        var pts = [[dur]];
        // ★ 修复：pi 从 0 开始，包含起点 (sX,sY) 作为手势首点（手指按下位置）
        //   旧代码 pi 从 1 开始跳过起点，导致边缘返回手势离屏幕太远无法触发系统返回
        for (var pi = 0; pi <= ptCount; pi++) {
            var t = pi / ptCount;
            // 缓动：使轨迹点疏密不均
            var ratio = easingFn(t);
            var px = sX + (eX - sX) * ratio;
            var py = sY + (eY - sY) * ratio;
            // 仅中间点添加抖动，起点/终点保持精确坐标
            if (pi > 0 && pi < ptCount) {
                px += scope.randInt(-jitter, jitter);
                py += scope.randInt(-8, 8);
                // 中间段额外增加横向抖动，模拟真实滑动中的自然摆动
                if (ratio > 0.35 && ratio < 0.75) {
                    px += scope.randInt(-15, 15);
                }
            }
            px = Math.max(0, Math.min(px, width));
            py = Math.max(5, Math.min(py, height - 5));
            pts.push([Math.floor(px), Math.floor(py)]);
        }
        return pts;
    };

    /**
     * 生成带大拇指弧线轨迹的手势点（拇指弧线）
     *
     * 模拟大拇指在屏幕上的自然滑动弧线：
     * - 右手握持时，拇指根部在右下角
     * - 右侧：上面 X 大（贴近边缘），下面 X 小（内收）
     * - 左侧：上面 X 小，下面 X 大（反向弧线）
     * - 使用二次贝塞尔曲线，控制点向屏幕中心方向偏移
     *
     * @param {number} sX       - 起点 X
     * @param {number} sY       - 起点 Y
     * @param {number} eX       - 终点 X（已含拇指弧线偏移）
     * @param {number} eY       - 终点 Y
     * @param {number} dur      - 手势总时长（ms）
     * @param {number} [ptCount]- 分段数，默认 4~6
     * @param {string} [ease]   - 缓动类型，默认 EASE_IN_OUT
     * @returns {Array} [[duration], [sX,sY], [x1,y1], ..., [eX,eY]]
     */
    scope.buildThumbArcPoints = function (sX, sY, eX, eY, dur, ptCount, ease) {
        ptCount = ptCount || scope.randInt(4, 6);
        ease = ease || EASE.EASE_IN_OUT;
        var easingFn = getEasingFn(ease);
        var width = device.width;
        var height = device.height;

        // 控制点：向屏幕中心方向偏移，使轨迹呈弧形
        var midX = (sX + eX) / 2;
        var centerX = width / 2;
        // 拉力方向：朝向屏幕中心
        var pullDir = centerX - midX >= 0 ? 1 : -1;
        // 拉力幅度 = max(距中心距离 × 30%~50%, 屏宽 × 2.5%~4.5%)
        // 后者确保中间起点也有明显的弧线弯曲
        var pullFromDist = Math.abs(centerX - midX) * scope.randInt(30, 50) / 100;
        var pullMin = width * scope.randInt(25, 45) / 1000;
        var pullAmount = Math.max(pullFromDist, pullMin);
        var ctrlX = midX + pullDir * pullAmount + scope.randInt(-15, 15);
        var ctrlY = (sY + eY) / 2 + scope.randInt(-10, 10);

        var pts = [[dur]];
        for (var pi = 0; pi <= ptCount; pi++) {
            var t = pi / ptCount;
            var ratio = easingFn(t);

            // 二次贝塞尔曲线 B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
            var inv = 1 - t;
            var px = inv * inv * sX + 2 * inv * t * ctrlX + t * t * eX;
            var py = inv * inv * sY + 2 * inv * t * ctrlY + t * t * eY;

            // 中间点加抖动
            if (pi > 0 && pi < ptCount) {
                px += scope.randInt(-10, 10);
                py += scope.randInt(-8, 8);
            }

            px = Math.max(0, Math.min(px, width));
            py = Math.max(5, Math.min(py, height - 5));
            pts.push([Math.floor(px), Math.floor(py)]);
        }
        return pts;
    };

    /**
     * 根据拇指弧线规则计算上下滑动的终点 X 偏移
     *
     * 核心规则：右侧（startX > center）上面 X 大、下面 X 小，左侧反之。
     * 因为拇指根部在右下角，手指在屏幕上方时更贴近右侧边缘，下方时内收。
     *
     * 右侧 (startX >= center)：
     *   上滑 (bottom→top)：起小→终大，endX = startX + offset
     *   下滑 (top→bottom)：起大→终小，endX = startX - offset
     * 左侧 (startX < center)：与右侧相反
     *   上滑 (bottom→top)：起大→终小，endX = startX - offset
     *   下滑 (top→bottom)：起小→终大，endX = startX + offset
     *
     * @param {number} startX    - 起点 X
     * @param {number} direction - "up" 或 "down"
     * @param {number} width     - 屏幕宽度
     * @returns {number} 按弧线规则偏移后的终点 X
     */
    function calcThumbArcEndX(startX, direction, width) {
        var centerX = width / 2;
        // X 偏移量：屏幕宽度的 5%~12%
        var xOffset = Math.floor(width * scope.randInt(5, 12) / 100);
        xOffset += scope.randInt(-10, 10);

        var endX;
        if (startX >= centerX) {
            // 右侧：上面 X 大，下面 X 小
            endX = direction === "up" ? startX + xOffset : startX - xOffset;
        } else {
            // 左侧：下面 X 大，上面 X 小
            endX = direction === "up" ? startX - xOffset : startX + xOffset;
        }
        return Math.max(10, Math.min(endX, width - 10));
    }

    /**
     * 总的滑动返回方法（70% 左滑 + 30% 右滑）
     *
     * 模拟人类操作习惯，以 70% 概率从右侧向左滑动返回，
     * 30% 概率从左侧向右滑动返回，以降低风控检测。
     *
     * @param {Object}  [options]              - 可选参数，会透传给 simulateBackSwipe 或 simulateForwardSwipe
     * @param {number}  [options.startXRatio]  - 起点 X 比例（0~1），覆盖默认值
     * @param {number}  [options.endXRatio]    - 终点 X 比例（0~1），覆盖默认值
     * @param {number}  [options.yRatio]       - 起点 Y 比例（0~1），覆盖默认值
     * @param {number}  [options.durationMin]  - 手势最小持续时间（ms），覆盖默认值
     * @param {number}  [options.durationMax]  - 手势最大持续时间（ms），覆盖默认值
     *
     * @example
     * simulateSwipeBack();                    // 随机左滑或右滑
     * simulateSwipeBack({ yRatio: 0.5 });     // 指定在屏幕中间区域滑动返回
     */
    scope.simulateSwipeBack = function (options) {
        scope.randomSleep(1500, null, 750);

        if (Math.random() < 0.7) {
            scope.simulateBackSwipe(options);
        } else {
            scope.simulateForwardSwipe(options);
        }

        scope.randomSleep(2000, null, 1400);
    };

    /**
     * 从屏幕右侧边缘向左滑动（模拟 Android 返回手势）
     *
     * 使用 4 点弧线轨迹模拟手指弯曲滑动，随机偏移坐标和时长以规避检测。
     *
     * @param {Object}  [options]              - 配置参数
     * @param {number}  [options.startXRatio]  - 起点 X 比例，默认 BACK_SWIPE_START_RATIO_X（0.98）
     * @param {number}  [options.endXRatio]    - 终点 X 比例，默认 BACK_SWIPE_END_RATIO_X（0.15）
     * @param {number}  [options.yRatio]       - 滑动位置 Y 比例，默认 BACK_SWIPE_START_RATIO_Y（0.7）
     * @param {number}  [options.durationMin]  - 最小时长（ms），默认 BACK_SWIPE_DURATION_MIN
     * @param {number}  [options.durationMax]  - 最大时长（ms），默认 BACK_SWIPE_DURATION_MAX
     *
     * @example
     * simulateBackSwipe();                              // 默认参数
     * simulateBackSwipe({ startXRatio: 0.95, yRatio: 0.5 });  // 从屏幕偏中部左滑
     */
    scope.simulateBackSwipe = function (options) {
        options = options || {};

        var width = device.width;
        var height = device.height;

        var baseStartX = Math.floor(width * (options.startXRatio || scope.BACK_SWIPE_START_RATIO_X));
        var baseEndX = Math.floor(width * (options.endXRatio || scope.BACK_SWIPE_END_RATIO_X));
        var baseY = Math.floor(height * (options.yRatio || scope.BACK_SWIPE_START_RATIO_Y));

        var startX = baseStartX + scope.randInt(-15, 15);
        var endX = baseEndX + scope.randInt(-20, 20);

        var yOffsetRatio = scope.randInt(10, 25) / 100;
        var startY = baseY + Math.floor(height * yOffsetRatio * (Math.random() > 0.5 ? 1 : -1));
        // ★ 加大 Y 弧线：终点相对起点偏移 ±4% 屏高，避免一条横线
        var endY = startY + Math.floor(height * scope.randInt(-4, 4) / 100);

        var duration = scope.randInt(
            options.durationMin || scope.BACK_SWIPE_DURATION_MIN,
            options.durationMax || scope.BACK_SWIPE_DURATION_MAX
        );

        startX = Math.max(0, Math.min(startX, width));
        endX = Math.max(0, Math.min(endX, width));
        startY = Math.max(0, Math.min(startY, height));
        endY = Math.max(0, Math.min(endY, height));

        // 使用缓动函数生成非等距轨迹点
        var easedPts = scope.buildEasedGesturePoints(startX, startY, endX, endY, duration, 4, EASE.EASE_IN_OUT);
        gesture.apply(null, easedPts);
    };

    /**
     * 从屏幕左侧边缘向右滑动（模拟正向滑动，与返回相反方向）
     *
     * @param {Object}  [options]              - 配置参数
     * @param {number}  [options.startXRatio]  - 起点 X 比例，默认 0.05
     * @param {number}  [options.endXRatio]    - 终点 X 比例，默认 0.80
     * @param {number}  [options.yRatio]       - 滑动位置 Y 比例，默认 BACK_SWIPE_START_RATIO_Y（0.7）
     * @param {number}  [options.durationMin]  - 最小时长（ms），默认 BACK_SWIPE_DURATION_MIN
     * @param {number}  [options.durationMax]  - 最大时长（ms），默认 BACK_SWIPE_DURATION_MAX
     *
     * @example
     * simulateForwardSwipe();
     */
    scope.simulateForwardSwipe = function (options) {
        console.log("模拟右滑...");
        options = options || {};

        var width = device.width;
        var height = device.height;

        var baseStartX = Math.floor(width * (options.startXRatio || 0.05));
        var baseEndX = Math.floor(width * (options.endXRatio || 0.55));
        var baseY = Math.floor(height * (options.yRatio || scope.BACK_SWIPE_START_RATIO_Y));

        var startX = baseStartX + scope.randInt(-10, 10);
        var endX = baseEndX + scope.randInt(-20, 20);

        var yOffsetRatio = scope.randInt(10, 25) / 100;
        var startY = baseY + Math.floor(height * yOffsetRatio * (Math.random() > 0.5 ? 1 : -1));
        // ★ 加大 Y 弧线：终点相对起点偏移 ±4% 屏高，避免一条横线
        var endY = startY + Math.floor(height * scope.randInt(-4, 4) / 100);

        var duration = scope.randInt(
            options.durationMin || scope.BACK_SWIPE_DURATION_MIN,
            options.durationMax || scope.BACK_SWIPE_DURATION_MAX
        );

        startX = Math.max(0, Math.min(startX, width));
        endX = Math.max(0, Math.min(endX, width));
        startY = Math.max(0, Math.min(startY, height));
        endY = Math.max(0, Math.min(endY, height));

        console.log("模拟右滑: (" + startX + "," + startY + ") -> (" + endX + "," + endY + ")  耗时 " + duration + "ms");

        // 使用缓动函数生成非等距轨迹点
        var easedPts = scope.buildEasedGesturePoints(startX, startY, endX, endY, duration, 4, EASE.EASE_IN_OUT);
        gesture.apply(null, easedPts);
    };

    /**
     * 模拟手指上下滑动屏幕
     *
     * 支持上滑、下滑、随机方向三种模式，使用 4~5 点弧线轨迹模拟真实手指滑动。
     * 下滑时自动检测并避让左上角日志浮窗区域（Y 下移 + X 右移双重避让）。
     *
     * @param {Object}  [options]                - 配置对象
     * @param {string}  [options.direction]      - 滑动方向："up" | "down" | "random"，默认 "random"
     * @param {number}  [options.distanceRatio]  - 滑动距离占屏幕高度的比例（0.1~0.8），默认 0.35
     * @param {number}  [options.startXRatio]    - 起点 X 占屏幕宽的比例（0~1），默认随机 0.3~0.7
     * @param {number}  [options.startYRatio]    - 起点 Y 占屏幕高的比例（仅上滑/下滑时有效），
     *                                             上滑默认 SCROLL_START_RATIO_Y_BOTTOM（0.75），
     *                                             下滑默认 SCROLL_START_RATIO_Y_TOP（0.25）
     * @param {number}  [options.duration]       - 手势总时长（ms），有此参数时忽略 durationMin/durationMax
     * @param {number}  [options.durationMin]    - 最小时长（ms），默认 SCROLL_DURATION_MIN（400）
     * @param {number}  [options.durationMax]    - 最大时长（ms），默认 SCROLL_DURATION_MAX（900）
     * @param {number}  [options.prePause]       - 滑动前停顿（ms），默认 800
     * @param {number}  [options.postPause]      - 滑动后停顿（ms），默认 600
     *
     * @example
     * scrollVertical({ direction: "up" });                               // 上滑
     * scrollVertical({ direction: "down", distanceRatio: 0.5 });         // 下滑 50% 屏高
     * scrollVertical({ direction: "up", startYRatio: 0.8, duration: 600 });
     */
    scope.scrollVertical = function (options) {
        options = options || {};

        var prePause = options.prePause || 800;
        scope.randomSleep(prePause, null, Math.floor(prePause * 0.4));

        var width = device.width;
        var height = device.height;

        var direction = options.direction || "random";
        if (direction === "random") {
            direction = Math.random() < 0.5 ? "up" : "down";
        }

        var distRatio = options.distanceRatio || 0.35;
        distRatio = Math.max(0.1, Math.min(distRatio, 0.8));
        var swipeDistance = Math.floor(height * distRatio);

        var startXRatio = options.startXRatio !== undefined
            ? options.startXRatio
            : (0.3 + Math.random() * 0.4);
        var startX = Math.floor(width * startXRatio) + scope.randInt(-15, 15);
        startX = Math.max(0, Math.min(startX, width));

        // ---- 避开日志浮窗区域（左上角），右移起点 X ----
        function avoidFloatWin(x, y) {
            var _ar = scope.AVOID_RECT;
            if (!_ar) return {x: x, y: y};
            var avoidRightX = Math.floor(width * (_ar.leftRatio + _ar.widthRatio));
            var avoidBottomY = Math.floor(height * (_ar.topRatio + _ar.heightRatio));
            if (y < avoidBottomY && x < avoidRightX) {
                x = avoidRightX + scope.randInt(15, 50);
                x = Math.min(x, width - 10);
            }
            return {x: x, y: y};
        }

        // ---- "up_down" 复合方向：先上滑再下滑，模拟"回看一下又继续往下" ----
        if (direction === "up_down") {
            var upRatio = 0.3 + Math.random() * 0.4;
            var downRatio = 1 - upRatio;
            var midY = Math.floor(height * (options.startYRatio || scope.SCROLL_START_RATIO_Y_BOTTOM)) + scope.randInt(-20, 20);
            var upEndY = midY - Math.floor(swipeDistance * upRatio) + scope.randInt(-20, 20);
            var downEndY = midY + Math.floor(swipeDistance * downRatio) + scope.randInt(-20, 20);
            midY = Math.max(5, Math.min(midY, height - 5));
            upEndY = Math.max(5, Math.min(upEndY, height - 5));
            downEndY = Math.max(5, Math.min(downEndY, height - 5));

            // 避开浮窗
            var adj = avoidFloatWin(startX, midY);
            startX = adj.x;
            midY = adj.y;

            // 拇指弧线：上滑段终点 X 左移/右移，下滑段终点 X 反向偏移
            var midX = calcThumbArcEndX(startX, "up", width);
            // 保证 midX 与 startX 有足够差异，且方向正确
            var endX2 = calcThumbArcEndX(midX, "down", width);

            // 上滑段：拇指弧线轨迹
            var upPoints = scope.buildThumbArcPoints(startX, midY, midX, upEndY, scope.randInt(300, 600));
            gesture.apply(null, upPoints);
            // 下滑段：拇指弧线轨迹
            var downPoints = scope.buildThumbArcPoints(midX, upEndY, endX2, downEndY, scope.randInt(300, 600));
            gesture.apply(null, downPoints);
            scope.randomSleep(options.postPause || 600, null, (options.postPause || 600) - 300);
            return;
        }

        // ---- "down_up" 复合方向：先下滑再上滑 ----
        if (direction === "down_up") {
            var downRatio2 = 0.3 + Math.random() * 0.4;
            var upRatio2 = 1 - downRatio2;
            var midY2 = Math.floor(height * (options.startYRatio || scope.SCROLL_START_RATIO_Y_TOP)) + scope.randInt(-20, 20);
            var downEndY2 = midY2 + Math.floor(swipeDistance * downRatio2) + scope.randInt(-20, 20);
            var upEndY2 = midY2 - Math.floor(swipeDistance * upRatio2) + scope.randInt(-20, 20);
            midY2 = Math.max(5, Math.min(midY2, height - 5));
            downEndY2 = Math.max(5, Math.min(downEndY2, height - 5));
            upEndY2 = Math.max(5, Math.min(upEndY2, height - 5));

            // 避开浮窗
            var adj2 = avoidFloatWin(startX, midY2);
            startX = adj2.x;
            midY2 = adj2.y;

            // 拇指弧线：下滑段终点 X 右移/左移，上滑段终点 X 反向偏移
            var midX2 = calcThumbArcEndX(startX, "down", width);
            var endX3 = calcThumbArcEndX(midX2, "up", width);

            // 下滑段：拇指弧线轨迹
            var downPoints2 = scope.buildThumbArcPoints(startX, midY2, midX2, downEndY2, scope.randInt(300, 600));
            gesture.apply(null, downPoints2);
            // 上滑段：拇指弧线轨迹
            var upPoints2 = scope.buildThumbArcPoints(midX2, downEndY2, endX3, upEndY2, scope.randInt(300, 600));
            gesture.apply(null, upPoints2);
            scope.randomSleep(options.postPause || 600, null, (options.postPause || 600) - 300);
            return;
        }

        // ---- 使用拇指弧线规则计算终点 X 偏移 ----
        var endX = calcThumbArcEndX(startX, direction, width);

        var startY, endY;
        if (direction === "up") {
            startY = Math.floor(height * (options.startYRatio || scope.SCROLL_START_RATIO_Y_BOTTOM)) + scope.randInt(-20, 20);
            endY = startY - swipeDistance + scope.randInt(-20, 20);
        } else {
            startY = Math.floor(height * (options.startYRatio || scope.SCROLL_START_RATIO_Y_TOP)) + scope.randInt(-20, 20);
            endY = startY + swipeDistance + scope.randInt(-20, 20);
            // 下滑时，确保起点在日志浮窗（左上角）下方，否则手势会被拦截
            var _ar = scope.AVOID_RECT;
            if (_ar) {
                var avoidBottom = Math.floor(height * (_ar.topRatio + _ar.heightRatio));
                if (startY < avoidBottom) {
                    startY = avoidBottom + scope.randInt(20, 60);
                    endY = startY + swipeDistance + scope.randInt(-20, 20);
                    console.log("下滑起点下移至浮窗下方: startY=" + startY);
                }
            }
        }
        startY = Math.max(5, Math.min(startY, height - 5));
        endY = Math.max(5, Math.min(endY, height - 5));

        // ---- 起点 X 避开浮窗区域 ----
        // 仅当起点 Y 在浮窗高度范围内时，才需要右移 X；
        // 若 Y 已在浮窗下方（如下滑下移后，或上滑起点），X 在左侧也不用移
        var _arX = scope.AVOID_RECT;
        if (_arX) {
            var avoidRightX = Math.floor(width * (_arX.leftRatio + _arX.widthRatio));
            var avoidBottomY = Math.floor(height * (_arX.topRatio + _arX.heightRatio));
            if (startY < avoidBottomY && startX < avoidRightX) {
                startX = avoidRightX + scope.randInt(15, 50);
                startX = Math.min(startX, width - 10);
                // 右移后用拇指弧线重新计算 endX
                endX = calcThumbArcEndX(startX, direction, width);
                console.log("起点在浮窗区域内，右移至 (" + startX + "," + startY + ")");
            }
        }

        var duration;
        if (options.duration !== undefined) {
            var range = Math.floor(options.duration * 0.3);
            duration = scope.randInt(options.duration - range, options.duration + range);
        } else {
            duration = scope.randInt(
                options.durationMin || scope.SCROLL_DURATION_MIN,
                options.durationMax || scope.SCROLL_DURATION_MAX
            );
        }
        duration = Math.max(100, duration);

        // 使用拇指弧线轨迹生成手势点（贝塞尔曲线模拟大拇指弧度）
        var arcPts = scope.buildThumbArcPoints(startX, startY, endX, endY, duration, scope.randInt(4, 6), EASE.EASE_IN_OUT);
        gesture.apply(null, arcPts);

        var postPause = options.postPause || 600;
        scope.randomSleep(postPause, null, Math.floor(postPause * 0.5));
    };

    /**
     * 校准任务剩余时间：在指定区域 OCR 识别剩余时间文字，提取数字秒数
     *
     * 在 durationRegion 区域内用 durationText 正则数组逐一匹配，
     * 匹配成功后从文本中提取数字作为剩余秒数。
     *
     * @param {Array}  durationRegion - OCR 搜索区域 [x, y, w, h]
     * @param {Array}  durationText   - 正则表达式数组，如 ["\\d+滑动浏览", "\\d+浏览得"]
     * @returns {number} 剩余秒数，校准失败返回 -1
     *
     * @example
     *  scope._calibrateDuration([100, 500, 300, 100], ["\\d+滑动浏览"]);
     * // 若 OCR 识别到 "32滑动浏览" → 返回 32
     */
    scope._calibrateDuration = function (durationRegion, durationText) {
        if (!durationRegion || !durationText) return -1;

        // 兼容传入单个字符串：自动包装为数组
        if (typeof durationText === 'string') {
            durationText = [durationText];
        }
        if (!Array.isArray(durationText) || durationText.length === 0) return -1;
        if (typeof scope.recognize !== 'function') return -1;

        for (var i = 0; i < durationText.length; i++) {
            var item = durationText[i];

            // 判断是否是正则字符串（包含 \d \w 等特殊转义）
            var isRegex = typeof item === 'string' && /[\\\^\[\]\$\.\|\?\*\+\(\)]/.test(item);

            // 先尝试模糊匹配（indexOf），对纯文本更友好
            var result;
            if (!isRegex) {
                result = scope.recognize(item, scope.CURRENT_METHOD, {
                    region: durationRegion,
                    exactMatch: false  // indexOf 模糊匹配
                });
            }
            // 没命中且是正则模式，再用正则匹配
            if (!result && isRegex) {
                result = scope.recognize(item, scope.CURRENT_METHOD, {
                    region: durationRegion,
                    regex: true
                });
            }
            if (result && result.text) {
                var match = result.text.match(/(\d+)/);
                if (match) {
                    var seconds = parseInt(match[1]);
                    if (seconds > 0) {
                        console.log("校准: OCR识别到「" + result.text + "」提取剩余 " + seconds + "s");
                        return seconds;
                    }
                }
            }
        }
        return -1;
    }


    /**
     * 按总时长连续上下滑动（用于长时间浏览页面任务）
     *
     * 在指定时间内反复随机上下滑动（每次方向、距离随机），模拟用户浏览页面。
     * 可选在指定时间后检测特定文字，找到则提前终止。
     *
     * 支持 durationRegion/durationText 校准：
     *   任务执行超过 10s 后，在 durationRegion 区域 OCR 识别剩余时间，
     *   提取秒数后调整总等待时长，避免预设 duration 与实际任务要求不一致。
     *
     * @param {Object}  [options]                  - 配置对象
     * @param {number}  [options.totalSeconds]     - 总浏览时长（秒），默认 30
     * @param {string}  [options.checkText]        - 检测到后提前终止的文字，默认 "继续赚奖励"
     * @param {number}  [options.checkAfterSeconds] - 多少秒后开始检测 checkText，默认 16
     * @param {Array}   [options.checkTextRegion]   - 检测 checkText 的搜索区域 [x, y, w, h]，默认 null（全屏）
     * @param {number}  [options.intervalMin]      - 两次滑动间最小停顿（ms），默认 800
     * @param {number}  [options.intervalMax]      - 两次滑动间最大停顿（ms），默认 2500
     * @param {Array}   [options.durationRegion]   - 校准区域 [x, y, w, h]，用于 OCR 识别剩余时间
     * @param {Array}   [options.durationText]     - 校准正则数组，如 ["\\d+滑动浏览", "\\d+浏览得"]
     * @param {string}  [options.method]           - checkText 识别方法，默认 CURRENT_METHOD（WebView 页请传 METHOD_MLKIT_OCR）
     *
     * @example
     * scrollVerticalMultiple({ totalSeconds: 30 });                       // 浏览 30 秒
     * scrollVerticalMultiple({ totalSeconds: 20, checkText: "继续赚奖励", checkAfterSeconds: 10 });
     * scrollVerticalMultiple({ totalSeconds: 15, intervalMin: 500, intervalMax: 1500 });
     */
    scope.scrollVerticalMultiple = function (options) {
        scope.randomSleep(805, null, 705);
        options = options || {};
        var totalMs = (options.totalSeconds || 30) * 1000;
        var elapsed = 0;
        var count = 0;

        // ---- 检查阶段参数 ----
        var checkText = options.checkText || "继续赚奖励";          // 要检测的文字
        var checkAfterMs = (options.checkAfterSeconds || 16) * 1000;  // 多少毫秒后开始检测
        var checkTextRegion = options.checkTextRegion || [Math.floor(device.width * 0.2), Math.floor(device.height * 0.5), Math.floor(device.width * 0.6), Math.floor(device.height * 0.3)];        // 检测区域，默认全屏
        var checkStarted = false;

        // ---- 校准参数 ----
        var durationRegion = options.durationRegion;
        var durationText = options.durationText;
        var calibrationDone = false;
        var calibrationFailCount = 0;

        while (elapsed < totalMs) {
            // ---- 校准：超过10s后OCR识别实际剩余时间，最多重试2次 ----
            if (!calibrationDone && durationRegion && durationText && elapsed >= 10000) {
                var remainingSec =  scope._calibrateDuration(durationRegion, durationText);
                if (remainingSec > 0) {
                    calibrationDone = true;
                    // 剩余秒数再加随机1~2秒缓冲
                    remainingSec += Math.random() < 0.5 ? 1 : 2;
                    // OCR 提取到的就是剩余秒数，直接重算总时长
                    var newTotalMs = elapsed + remainingSec * 1000;
                    console.log("校准: OCR识别剩余" + remainingSec + "s，总时长从" + Math.floor(totalMs / 1000) + "s调整为" + Math.floor(newTotalMs / 1000) + "s（已过" + Math.floor(elapsed / 1000) + "s）");
                    totalMs = newTotalMs;
                } else {
                    calibrationFailCount++;
                    console.log("校准: OCR未识别到剩余时间（第" + calibrationFailCount + "次失败）" + (calibrationFailCount >= 2 ? "，放弃校准" : "，下次循环重试"));
                    if (calibrationFailCount >= 2) {
                        calibrationDone = true;
                    }
                }
            }
            // ---- 如果已进入检查阶段，每轮滑动前先检测 ----
            if (checkText && elapsed >= checkAfterMs) {
                checkStarted = true;
                var foundIt = scope.recognize(checkText, options.method || scope.CURRENT_METHOD, {region: checkTextRegion}) !== null;
                if (foundIt) {
                    console.log("检测到【" + checkText + "】，终止滑动");
                    break;
                }
            }

            count++;
            var isShortScroll = Math.random() < 0.2;
            // 如果指定了方向则用指定方向，否则前2次固定上滑，之后随机
            var dir = options.direction || (count <= 2 ? "up" : (function () {
                var r = Math.random();
                if (r < 0.25) return "up_down";
                if (r < 0.5) return "down_up";
                if (r < 0.75) return "up";
                return "down";
            })());
            // 复合方向（up_down / down_up）使用较小的单侧滑动距离
            var isCompound = (dir === "up_down" || dir === "down_up");
            var scrollOptions = {
                direction: dir,
                distanceRatio: isShortScroll
                    ? scope.randInt(5, 12) / 100
                    : (isCompound ? scope.randInt(12, 30) / 100 : scope.randInt(20, 50) / 100),
                durationMin: isShortScroll ? 200 : 350,
                durationMax: isShortScroll ? 400 : 800,
            };

            console.log("浏览滑动 " + count + "...");
            var scrollStart = new Date().getTime();
            scope.scrollVertical(scrollOptions);
            var scrollCost = new Date().getTime() - scrollStart;
            elapsed += scrollCost;

            if (elapsed >= totalMs) break;

            var interval = scope.randInt(options.intervalMin || 800, options.intervalMax || 2500);
            interval = Math.min(interval, totalMs - elapsed);
            if (interval > 0) {
                sleep(interval);
                elapsed += interval;
            }
        }

        // ---- 如果已经开始检查但还没检测到，最后再查一次 ----
        if (checkStarted && checkText) {
            var finalFound = scope.recognize(checkText, options.method || scope.CURRENT_METHOD, {region: checkTextRegion}) !== null;
            if (finalFound) {
                console.log("检测到【" + checkText + "】，终止滑动");
            }
        }

        console.log("浏览滑动结束，共滑动 " + count + " 次，总耗时约 " + Math.floor(elapsed / 100) / 10 + "s");
    };

    /**
     * 等待任务页面（支持滚动/无滚动两种模式）
     *
     * 有滚动时：交给 scrollVerticalMultiple 处理（滑动 + 文本检测 + 校准）
     * 无滚动时：每 1s 检测一次 checkText，检测到则提前返回，避免无谓等待
     *
     * 支持 durationRegion/durationText 校准（无滚动模式）：
     *   任务执行超过 10s 后，在 durationRegion 区域 OCR 识别剩余时间，
     *   提取秒数后调整总等待时长。
     *
     * @param {Object} options
     * @param {number} options.totalSeconds - 总等待时长（秒）
     * @param {boolean} [options.noScroll] - 是否无滚动模式
     * @param {string} [options.checkText] - 要检测的文本（如"继续赚奖励"）
     * @param {number} [options.checkAfterSeconds] - 多少秒后开始检测（仅滚动模式，默认 16）
     * @param {Array} [options.checkTextRegion] - 检测区域 [x, y, w, h]
     * @param {string} [options.direction] - 滑动方向（仅滚动模式）
     * @param {Array} [options.durationRegion] - 校准区域 [x, y, w, h]，用于 OCR 识别剩余时间
     * @param {Array} [options.durationText] - 校准正则数组，如 ["\\d+滑动浏览", "\\d+浏览得"]
     * @param {string} [options.method] - checkText 识别方法，默认 CURRENT_METHOD（WebView 页请传 METHOD_MLKIT_OCR）
     */
    scope.waitInTaskPage = function (options) {
        options = options || {};
        if (!options.noScroll) {
            // 有滚动：交给 scrollVerticalMultiple（它内部已支持校准）
            scrollVerticalMultiple(options);
            return;
        }

        // ---- 无滚动模式：每 1s 检测一次 checkText，提前返回 ----
        var totalMs = (options.totalSeconds || 30) * 1000;
        var checkText = options.checkText || '继续赚奖励';
        var checkAfterMs = (options.checkAfterSeconds || 16) * 1000;
        var checkTextRegion = options.checkTextRegion || [Math.floor(device.width * 0.2), Math.floor(device.height * 0.5), Math.floor(device.width * 0.6), Math.floor(device.height * 0.3)];
        var elapsed = 0;
        var intervalMs = 1000;

        // ---- 校准参数 ----
        var durationRegion = options.durationRegion;
        var durationText = options.durationText;
        var calibrationDone = false;
        var calibrationFailCount = 0;

        while (elapsed < totalMs) {
            // ---- 校准：超过10s后OCR识别实际剩余时间，最多重试2次 ----
            if (!calibrationDone && durationRegion && durationText && elapsed >= 10000) {
                var remainingSec =  scope._calibrateDuration(durationRegion, durationText);
                if (remainingSec > 0) {
                    calibrationDone = true;
                    // 剩余秒数再加随机1~2秒缓冲
                    remainingSec += Math.random() < 0.5 ? 1 : 2;
                    // OCR 提取到的就是剩余秒数，直接重算总时长
                    var newTotalMs = elapsed + remainingSec * 1000;
                    console.log("校准: OCR识别剩余" + remainingSec + "s，总时长从" + Math.floor(totalMs / 1000) + "s调整为" + Math.floor(newTotalMs / 1000) + "s（已过" + Math.floor(elapsed / 1000) + "s）");
                    totalMs = newTotalMs;
                } else {
                    calibrationFailCount++;
                    console.log("校准: OCR未识别到剩余时间（第" + calibrationFailCount + "次失败）" + (calibrationFailCount >= 2 ? "，放弃校准" : "，下次循环重试"));
                    if (calibrationFailCount >= 2) {
                        calibrationDone = true;
                    }
                }
            }

            if (elapsed >= checkAfterMs) {
                var foundIt = scope.recognize(checkText, options.method || scope.CURRENT_METHOD, {region: checkTextRegion}) !== null;
                if (foundIt) {
                    console.log("检测到【" + checkText + "】，提前结束等待");
                    return;
                }
            }
            var sleepMs = Math.min(intervalMs, totalMs - elapsed);
            if (sleepMs > 0) {
                sleep(sleepMs);
                elapsed += sleepMs;
            }
        }
    };

};