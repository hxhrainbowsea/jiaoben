// ============================================================
// cache.js - 消消乐缓存（与 test_board_detection.js 共享）
// ============================================================

var _cacheDir = "/sdcard/脚本/tb2/cache/";
var _cacheFile = _cacheDir + "board_config.json";

/**
 * 从缓存加载棋盘配置（由 test_board_detection.js 保存）
 *
 * @returns {Object|null} {left, top, right, bottom, rows, cols, tileW, tileH} 或 null
 */
function loadCachedBoardConfig() {
    try {
        if (!files.exists(_cacheFile)) {
            return null;
        }
        var content = files.read(_cacheFile);
        var data = JSON.parse(content);
        if (!data || !data.config) {
            return null;
        }
        // 检查设备是否匹配
        if (data.deviceWidth !== device.width || data.deviceHeight !== device.height) {
            log("⚠ 缓存设备不匹配（缓存: " + data.deviceWidth + "x" + data.deviceHeight +
                " 当前: " + device.width + "x" + device.height + "），忽略");
            return null;
        }
        return data.config;
    } catch (e) {
        return null;
    }
}

module.exports = {
    loadCachedBoardConfig: loadCachedBoardConfig,

    // 导出路径供外部引用
    _cacheFile: _cacheFile,
    _cacheDir: _cacheDir
};