// ============================================================
// config.js - 全局配置常量
//
// 所有常量通过 scope 注册，供 utils/gesture/recognize 等模块使用
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    /**
     * =============================================
     *  识别方法常量 @type {string}
     * =============================================
     */

    /** UI 控件选择器识别（基于控件树 text/desc 查找） */
    scope.METHOD_UI_SELECTOR = "ui_selector";
    /** MLKit OCR 文字识别（Google 原生 OCR） */
    scope.METHOD_MLKIT_OCR   = "mlkit_ocr";
    /** PaddleOCR 文字识别（百度飞桨，离线模型） */
    scope.METHOD_PADDLE_OCR  = "paddle_ocr";
    /** TesserOCR 文字识别（保留未用） */
    scope.METHOD_TESSER_OCR  = "tesser_ocr";

    /** ★ 当前使用的识别方法（可在 UI 系统 Tab 切换「使用纯OCR」） */
    scope.CURRENT_METHOD = scope.METHOD_UI_SELECTOR;

    /**
     * =============================================
     *  点击偏移参数
     * =============================================
     */

    /** 点击时 X 方向随机偏移范围（像素），防风控 */
    scope.CLICK_OFFSET_X = 10;
    /** 点击时 Y 方向随机偏移范围（像素），防风控 */
    scope.CLICK_OFFSET_Y = 10;

    /**
     * =============================================
     *  返回滑动参数（simulateSwipeBack 系列）
     * =============================================
     */

    /** 左滑返回起点 X = 屏幕宽度 × 此比例（默认 0.98 ≈ 右侧边缘） */
    scope.BACK_SWIPE_START_RATIO_X    = 0.98;
    /** 左滑返回终点 X = 屏幕宽度 × 此比例（滑到约一半即可触发返回，无需横跨全屏） */
    scope.BACK_SWIPE_END_RATIO_X      = 0.48;
    /** 返回手势起点 Y = 屏幕高度 × 此比例（默认 0.7） */
    scope.BACK_SWIPE_START_RATIO_Y    = 0.7;
    /** 返回手势最小持续时间（ms） */
    scope.BACK_SWIPE_DURATION_MIN     = 120;
    /** 返回手势最大持续时间（ms） */
    scope.BACK_SWIPE_DURATION_MAX     = 480;

    /**
     * =============================================
     *  上下滑动参数（scrollVertical 系列）
     * =============================================
     */

    /** 下滑起点 Y = 屏幕高度 × 此比例（默认 0.25 ≈ 屏幕上部） */
    scope.SCROLL_START_RATIO_Y_TOP    = 0.25;
    /** 上滑起点 Y = 屏幕高度 × 此比例（默认 0.75 ≈ 屏幕下部） */
    scope.SCROLL_START_RATIO_Y_BOTTOM = 0.75;
    /** 上下滑动最小持续时间（ms） */
    scope.SCROLL_DURATION_MIN         = 400;
    /** 上下滑动最大持续时间（ms） */
    scope.SCROLL_DURATION_MAX         = 900;

    /**
     * =============================================
     *  图标识别参数（模板匹配 + 多点找色）
     * =============================================
     */

    /** 模板匹配相似度阈值（0~1），1=精确匹配，默认 0.70 */
    scope.ICON_MATCH_THRESHOLD       = 0.80;
    /** 多点找色颜色容差（默认 10），数值越大容差越高 */
    scope.ICON_MULTI_COLOR_THRESHOLD = 10;

    /**
     * =============================================
     *  调试开关
     * =============================================
     */

    /** 设为 true 时，每次 click 会在点击位置画红点（开发调试用） */
    scope.DEBUG_CLICK_MARKER = false;

    /**
     * 设为 true 时，每次 OCR 识别后会将截图保存到 ./debug/ 目录，
     * 文件名格式：{targetText}_{timestamp}.png，用于排查识别不到的问题。
     */
    scope.DEBUG_SAVE_SCREENSHOT = false;

    /**
     * =============================================
     *  滑动避让区域
     * =============================================
     *
     * 滑动操作的起始点若落在此区域内，手势可能被悬浮窗拦截导致失败。
     * 所有值为屏幕比例（0~1）。
     *
     * @property {number} leftRatio   - 区域左边缘（默认 0）
     * @property {number} topRatio    - 区域上边缘（默认 0）
     * @property {number} widthRatio  - 区域宽度比例（默认 2/3）
     * @property {number} heightRatio - 区域高度比例（默认 0.4 = 2/5）
     */
    scope.AVOID_RECT = {
        leftRatio:   0,
        topRatio:    0,
        widthRatio:  2/3,
        heightRatio: 0.4
    };
};