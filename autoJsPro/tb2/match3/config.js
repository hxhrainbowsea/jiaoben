// ============================================================
// config.js - 消消乐专用参数配置
// ============================================================

/**
 * 消消乐默认配置（可在 calibrate 后自动填充，或手动修改）
 *
 * 外部可通过 jiaoxiaole(options) 传入覆盖
 */
var _config = {
    // 棋盘区域（像素坐标）
    boardLeft:   0,
    boardTop:    0,
    boardRight:  0,
    boardBottom: 0,

    // 棋盘格子数（默认 8x9，可根据实际游戏调整）
    rows: 9,
    cols: 8,

    // 颜色聚类容差（RGB 欧氏距离），越大合并越激进
    colorTolerance: 45,

    // 最小匹配长度（3 = 经典 3 连消）
    minMatchLen: 3,

    // 无解时最大重试次数
    maxRetries: 3,

    // 每次交换后等待动画稳定时间（ms）
    animWaitBase: 800,
    animWaitRange: 300,

    // 交换后最大等待次数（防止死循环）
    maxMoves: 200,

    // 调试模式：保存每步截图
    debug: false
};

// 固定 RGB 参考色（6 色）
var REF_COLORS = [
    { name: "黄", rgb: [255, 220,  50] },    // 0  #FFDC32
    { name: "紫", rgb: [210,  80, 220] },    // 1  #D250DC
    { name: "红", rgb: [240,  90,  70] },    // 2  #F05A46
    { name: "绿", rgb: [120, 230, 140] },    // 3  #78E68C
    { name: "蓝", rgb: [ 80, 200, 240] },    // 4  #50C8F0
    { name: "浅绿",rgb: [150, 220, 160] }    // 5  #96DCA0
];
var FIXED_REF_THRESHOLD = 30;

/** 特殊道具类型常量 */
var SPECIAL_NONE          = 0;
var SPECIAL_VERT_STRIPE   = 1;  // 垂直多色条纹
var SPECIAL_MUSHROOM      = 2;  // 蘑菇形轮廓

module.exports = {
    _config: _config,
    REF_COLORS: REF_COLORS,
    FIXED_REF_THRESHOLD: FIXED_REF_THRESHOLD,
    SPECIAL_NONE: SPECIAL_NONE,
    SPECIAL_VERT_STRIPE: SPECIAL_VERT_STRIPE,
    SPECIAL_MUSHROOM: SPECIAL_MUSHROOM
};