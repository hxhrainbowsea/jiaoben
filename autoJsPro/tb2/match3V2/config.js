// ============================================================
// config.js - 消消乐 V2 颜色配置
// ============================================================
// 6 色参考 + 预计算 HSV，避免运行时重复转换

/** RGB → HSV */
function _rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    var h, s = max === 0 ? 0 : d / max, v = max;
    if (max === min) {
        h = 0;
    } else if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    } else if (max === g) {
        h = ((b - r) / d + 2) * 60;
    } else {
        h = ((r - g) / d + 4) * 60;
    }
    return { h: h, s: s, v: v };
}

/** 6 色参考数据：RGB + 预计算 HSV（基于实际截图 K-Means 聚类优化） */
var REF_COLORS = [
    { name: "黄", rgb: [248, 210,  58], id: 0 },   // #f8d23a — 黄色（原[251,212,55]→微调）
    { name: "红", rgb: [237, 112,  80], id: 1 },   // #ed7050 — 红色（原[240,90,70]→微调）
    { name: "紫", rgb: [214,  86, 237], id: 2 },   // #d656ed — 紫色（原[210,80,220]→微调）
    { name: "绿", rgb: [185, 223,  83], id: 3 },   // #b9df53 — 绿色（原[191,230,79]→微调）
    { name: "蓝", rgb: [ 73, 228, 240], id: 4 },   // #49e4f0 — 蓝色/青色（原[80,200,240]→偏青）
    { name: "浅绿",rgb: [150, 220, 160], id: 5 }    // 未在本截图出现，暂保留原值
];

// 预计算 HSV
REF_COLORS.forEach(function (c) {
    var hsv = _rgb2hsv(c.rgb[0], c.rgb[1], c.rgb[2]);
    c.hsv = { h: hsv.h, s: hsv.s, v: hsv.v };
});

/**
 * 分类参数
 */
var CLASSIFY = {
    // 有效单元格的最小 HSV 阈值（低于此值判为空白/无效）
    MIN_SATURATION: 0.10,
    MIN_VALUE:     0.15,

    // 色调容差（度）：一个采样点与参考色的 Hue 差在此范围内才算匹配
    HUE_TOLERANCE: 25,

    // 绿/浅绿特殊处理：校正前两者 Hue 仅差 2°（已修正），保留逻辑做安全兜底
    // 绿 H≈76°  浅绿 H≈129°  现由 Hue 即可区分，饱和度仅做二次确认
    GREEN_LIGHTGREEN_S_THRESHOLD: 0.40,

    // 多数投票阈值：某个颜色得票占比 ≥ 此值才算确认
    MAJORITY_THRESHOLD: 0.50
};

module.exports = {
    REF_COLORS: REF_COLORS,
    CLASSIFY: CLASSIFY
};