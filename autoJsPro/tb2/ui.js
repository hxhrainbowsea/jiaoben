"ui";

// ============================================================
// ui.js - 功能选择页面（Tab 切换）
// ============================================================

// ---- 工具：dp 转 px ----
var _displayMetrics = context.getResources().getDisplayMetrics();
function dip2px(dp) {
    return android.util.TypedValue.applyDimension(
        android.util.TypedValue.COMPLEX_UNIT_DIP, dp, _displayMetrics
    );
}

ui.layout(
    <vertical bg="#FFEEEEEE" h="*">
        <!-- 标题 -->
        <horizontal gravity="center" margin="0 24 0 8">
            <text text="🌾 淘宝自动化" textSize="22sp" gravity="center"
                textColor="#FF333333" />
            <text id="helpBtn" text="❓" textSize="18sp" textColor="#FF999999"
                margin="8 0 0 0" clickable="true" />
        </horizontal>

        <!-- Tab 栏 -->
        <horizontal id="tabBar" bg="#FFFFFFFF" margin="8 8 8 0" padding="0">
            <text id="tabTask" text="📋 任务设置" textSize="14sp" textColor="#FF4CAF50"
                bg="#FFFFFFFF" padding="12 10" layout_weight="1" gravity="center"
                clickable="true" />
            <text id="tabSys" text="⚙ 系统" textSize="14sp" textColor="#FF888888"
                bg="#FFEEEEEE" padding="12 10" layout_weight="1" gravity="center"
                clickable="true" />
            <text id="tabTest" text="🧪 测试" textSize="14sp" textColor="#FF888888"
                bg="#FFEEEEEE" padding="12 10" layout_weight="1" gravity="center"
                clickable="true" />
        </horizontal>

        <!-- Tab 内容区域 -->
        <frame h="0" layout_weight="1" margin="0 0 0 0">

            <!-- ============================================================ -->
            <!-- Tab 1: 任务设置 -->
            <!-- ============================================================ -->
            <scroll id="pageTask" visibility="visible" bg="#FFEEEEEE">
                <vertical padding="8 8 8 0">

                    <!-- 执行任务（默认展开） -->
                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="0" gravity="center_vertical">
                        <horizontal id="taskSectionHeader" gravity="center_vertical" padding="16 0" h="52">
                            <text text="📋  执行任务" textSize="16sp" textColor="#FF333333" layout_weight="1" />
                            <Switch id="taskSw" checked="true" />
                            <text id="taskSectionArrow" text="▼" textSize="13sp" textColor="#FF999999" margin="4 0 0 0" />
                        </horizontal>
                        <vertical id="taskSectionBody" visibility="visible" margin="0 0 8 8">

                            <!-- 消消乐 -->
                            <vertical w="*" bg="#FFF5F5F5" margin="0 4 0 0" padding="0" gravity="center_vertical">
                                <horizontal id="xxlSectionHeader" gravity="center_vertical" padding="12 0" h="44">
                                    <text text="🎮  消消乐" textSize="15sp" textColor="#FF333333" layout_weight="1" />
                                    <Switch id="xiaoxiaoleSw" checked="false" />
                                    <text id="xxlSectionArrow" text="▶" textSize="13sp" textColor="#FF999999" margin="4 0 0 0" />
                                </horizontal>
                                <vertical id="xxlSectionBody" visibility="gone" margin="0 0 0 0" padding="8" bg="#FFF0F0F0">
                                    <text text="棋盘区域配置" textSize="11sp" textColor="#FF999999" />
                                    <horizontal margin="0 4 0 0">
                                        <vertical layout_weight="1">
                                            <text text="Left" textSize="11sp" textColor="#FF666666" />
                                            <input id="xxlLeft" text="" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                        </vertical>
                                        <vertical layout_weight="1" margin="4 0">
                                            <text text="Top" textSize="11sp" textColor="#FF666666" />
                                            <input id="xxlTop" text="" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                        </vertical>
                                        <vertical layout_weight="1">
                                            <text text="Right" textSize="11sp" textColor="#FF666666" />
                                            <input id="xxlRight" text="" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                        </vertical>
                                        <vertical layout_weight="1" margin="4 0">
                                            <text text="Bottom" textSize="11sp" textColor="#FF666666" />
                                            <input id="xxlBottom" text="" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                        </vertical>
                                    </horizontal>
                                    <horizontal margin="0 4 0 0">
                                        <vertical layout_weight="1">
                                            <text text="行数" textSize="11sp" textColor="#FF666666" />
                                            <input id="xxlRows" text="8" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                        </vertical>
                                        <vertical layout_weight="1" margin="4 0">
                                            <text text="列数" textSize="11sp" textColor="#FF666666" />
                                            <input id="xxlCols" text="8" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                        </vertical>
                                        <vertical layout_weight="1" margin="4 0">
                                            <text text="最大步数" textSize="11sp" textColor="#FF666666" />
                                            <input id="xxlMaxMoves" text="5" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                        </vertical>
                                    </horizontal>
                                    <horizontal margin="0 4 0 0">
                                        <vertical layout_weight="1">
                                            <text text="交换间隔(毫秒)" textSize="11sp" textColor="#FF666666" />
                                            <input id="xxlSwapInterval" text="2500" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                        </vertical>
                                        <frame layout_weight="1" />
                                        <frame layout_weight="1" />
                                        <frame layout_weight="1" margin="4 0" />
                                    </horizontal>
                                    <text id="xxlTip" text="⚠ 必须先填写棋盘区域配置才可以正常运行" textSize="12sp" textColor="#FFE53935" margin="4 4 0 0" />
                                </vertical>
                            </vertical>

                            </vertical>
                    </vertical>

                    <!-- 浇水施肥（默认收起） -->
                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="0" gravity="center_vertical">
                        <horizontal id="waterSectionHeader" gravity="center_vertical" padding="16 0" h="52">
                            <text text="💧  浇水施肥" textSize="16sp" textColor="#FF333333" layout_weight="1" />
                            <Switch id="waterSw" checked="true" />
                            <text id="waterSectionArrow" text="▶" textSize="13sp" textColor="#FF999999" margin="4 0 0 0" />
                        </horizontal>
                        <vertical id="waterSectionBody" visibility="gone" margin="0 0 8 8">
                            <radiogroup id="waterModeGroup" orientation="vertical">
                                <horizontal gravity="center_vertical" margin="0 8 0 0" h="40" bg="#FFF5F5F5" padding="8 0">
                                    <radio id="waterAutoRadio" checked="true" />
                                    <text text="🌊  浇水至奖励领完" textSize="13sp" textColor="#FF666666" layout_weight="1" />
                                </horizontal>
                                <horizontal gravity="center_vertical" margin="0 4 0 0" h="40" bg="#FFF5F5F5" padding="8 0">
                                    <radio id="waterFixedRadio" />
                                    <text text="固定浇水次数：" textSize="13sp" textColor="#FF666666" />
                                    <input id="waterNumInput" text="10" textSize="13sp" w="70" inputType="number" textColor="#FF333333" bg="#FFEEEEEE" gravity="center" />
                                </horizontal>
                                <horizontal gravity="center_vertical" margin="0 4 0 0" h="40" bg="#FFF5F5F5" padding="8 0">
                                    <radio id="waterTargetRadio" />
                                    <text text="🎯  浇水至目标(204次)" textSize="13sp" textColor="#FF666666" layout_weight="1" />
                                </horizontal>
                                <horizontal gravity="center_vertical" margin="0 4 0 0" h="40" bg="#FFF5F5F5" padding="8 0">
                                    <radio id="waterFertilizerRadio" />
                                    <text text="🌱  用完所有肥料" textSize="13sp" textColor="#FF666666" layout_weight="1" />
                                </horizontal>
                            </radiogroup>
                            <text id="waterModeTip" text="" textSize="11sp" textColor="#FFE53935" margin="8 0 0 4" />
                        </vertical>
                    </vertical>

                    <!-- 领取亲密度 -->
                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="16 0" h="52" gravity="center_vertical">
                        <horizontal gravity="center_vertical">
                            <text text="❤️  领取亲密度" textSize="16sp" textColor="#FF333333" layout_weight="1" />
                            <Switch id="intimacySw" checked="true" />
                        </horizontal>
                    </vertical>

                    <!-- 收集阳光 -->
                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="16 0" h="52" gravity="center_vertical">
                        <horizontal gravity="center_vertical">
                            <text text="☀️  收集阳光" textSize="16sp" textColor="#FF333333" layout_weight="1" />
                            <Switch id="sunSw" checked="true" />
                        </horizontal>
                    </vertical>

                    <!-- 助力好友（内嵌固定高度，保持展开） -->
                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="16 0">
                        <horizontal gravity="center_vertical">
                            <text text="🤝  助力好友" textSize="16sp" textColor="#FF333333" layout_weight="1" />
                            <Switch id="helpSw" checked="true" />
                            {/*<text id="helpCountText" text="" textSize="12sp" textColor="#FF999999" margin="0 8 0 0" />*/}
                        </horizontal>
                        <text text="好友列表（勾选=本次助力，✕=删除）" textSize="11sp" textColor="#FF999999" margin="4 4 0 4" />
                        <scroll h="150" bg="#FFF5F5F5" margin="4 4">
                            <vertical id="dlgHelpList" />
                        </scroll>
                        <horizontal margin="4 4">
                            <input id="dlgHelpInput" hint="输入好友名称" textSize="13sp"
                                layout_weight="1" bg="#FFEEEEEE" padding="8 0" h="42" />
                            <button id="dlgHelpAddBtn" text="添加" textSize="13sp"
                                bg="#FF4CAF50" textColor="#FFFFFFFF" w="56" h="42" />
                        </horizontal>
                        <button id="dlgHelpClearBtn" text="清除已助力记录" textSize="12sp"
                            bg="#FFE0E0E0" textColor="#FF666666" w="*" h="40" margin="4 4" />
                    </vertical>

                    <frame w="*" h="16" />

                </vertical>
            </scroll>

            <!-- ============================================================ -->
            <!-- Tab 2: 系统 -->
            <!-- ============================================================ -->
            <scroll id="pageSys" visibility="gone" bg="#FFEEEEEE">
                <vertical padding="8 8 8 0">

                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="16 0" h="52" gravity="center_vertical">
                        <horizontal gravity="center_vertical">
                            <text text="🔍  使用纯OCR" textSize="15sp" textColor="#FF333333" layout_weight="1" />
                            <Switch id="ocrSw" checked="false" />
                        </horizontal>
                    </vertical>

                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="16 0" h="52" gravity="center_vertical">
                        <horizontal gravity="center_vertical">
                            <text text="🔇  每次进去任务自动调低音量" textSize="15sp" textColor="#FF333333" layout_weight="1" />
                            <Switch id="volumeSw" checked="false" />
                        </horizontal>
                    </vertical>

                    <!-- 执行完毕强行退出（可折叠，多选） -->
                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="0" gravity="center_vertical">
                        <horizontal id="killAppSectionHeader" gravity="center_vertical" padding="16 0" h="52">
                            <text text="🚪  执行完毕强行退出" textSize="16sp" textColor="#FF333333" layout_weight="1" />
                            <text id="killAppSummary" text="未选择" textSize="12sp" textColor="#FF999999" margin="0 4 0 0" />
                            <text id="killAppSectionArrow" text="▶" textSize="13sp" textColor="#FF999999" margin="4 0 0 0" />
                        </horizontal>
                        <vertical id="killAppSectionBody" visibility="gone" margin="0 0 8 8" padding="8" bg="#FFF5F5F5">
                            <horizontal gravity="center_vertical" h="44" bg="#FFFFFFFF" margin="0 4" padding="8 0">
                                <checkbox id="killTbChk" />
                                <text text="淘宝" textSize="14sp" textColor="#FF333333" layout_weight="1" />
                                <text text="com.taobao.taobao" textSize="11sp" textColor="#FF999999" />
                            </horizontal>
                            <horizontal gravity="center_vertical" h="44" bg="#FFFFFFFF" margin="0 4" padding="8 0">
                                <checkbox id="killAliChk" />
                                <text text="支付宝" textSize="14sp" textColor="#FF333333" layout_weight="1" />
                                <text text="com.eg.android.AlipayGphone" textSize="11sp" textColor="#FF999999" />
                            </horizontal>
                            <horizontal gravity="center_vertical" h="44" bg="#FFFFFFFF" margin="0 4" padding="8 0">
                                <checkbox id="killAutojsChk" />
                                <text text="Auto.js Pro" textSize="14sp" textColor="#FF333333" layout_weight="1" />
                                <text text="org.autojs.autojspro" textSize="11sp" textColor="#FF999999" />
                            </horizontal>
                            <text text="⚠ 勾选 Auto.js Pro 会在执行完毕后结束脚本运行环境" textSize="11sp" textColor="#FFE53935" margin="4 4 0 0" />
                        </vertical>
                    </vertical>

                    <!-- 缓存管理 -->
                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="8 0 16 0">
                        <text text="🗑  清除任务缓存" textSize="15sp" textColor="#FF333333" margin="8 12 0 4" />
                        <text text="清除后对应任务会重新执行" textSize="11sp" textColor="#FF999999" margin="8 0 0 8" />
                        <scroll h="180" bg="#FFF5F5F5" margin="8 8 8 0">
                            <vertical id="cacheList" />
                        </scroll>
                        <horizontal margin="8 8 8 0">
                            <button id="selectAllCacheBtn" text="全选" textSize="13sp"
                                bg="#FFE0E0E0" textColor="#FF666666" w="56" h="40" />
                            <button id="clearSelectedCacheBtn" text="清除选中项" textSize="13sp"
                                bg="#FFE53935" textColor="#FFFFFFFF" w="0" layout_weight="1" h="40" margin="8 0 0 0" />
                        </horizontal>
                    </vertical>

                    <frame w="*" h="16" />

                </vertical>
            </scroll>

            <!-- ============================================================ -->
            <!-- Tab 4: 测试 -->
            <!-- ============================================================ -->
            <scroll id="pageTest" visibility="gone" bg="#FFEEEEEE">
                <vertical padding="8 8 8 0">

                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="16 0" h="52" gravity="center_vertical">
                        <horizontal gravity="center_vertical">
                            <text text="📸  保存调试截图" textSize="15sp" textColor="#FF333333" layout_weight="1" />
                            <Switch id="debugSw" checked="false" />
                        </horizontal>
                    </vertical>

                    <!-- OCR 识别测试（可折叠） -->
                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="0" gravity="center_vertical">
                        <horizontal id="ocrTestSectionHeader" gravity="center_vertical" padding="16 0" h="52">
                            <text text="🔍  OCR 识别测试" textSize="16sp" textColor="#FF333333" layout_weight="1" />
                            <text id="ocrTestSectionArrow" text="▶" textSize="13sp" textColor="#FF999999" margin="4 0 0 0" />
                        </horizontal>
                        <vertical id="ocrTestSectionBody" visibility="gone" margin="0 0 8 8" padding="8" bg="#FFF5F5F5">

                            <text text="设置区域比例（0~1），点击执行识别" textSize="12sp" textColor="#FF999999" margin="0 0 8 0" />

                            <!-- 区域参数输入 -->
                            <horizontal gravity="center_vertical" margin="0 4 0 0">
                                <text text="左边界:" textSize="13sp" textColor="#FF666666" w="70" />
                                <input id="ocrLeft" text="0.05" textSize="13sp" w="80" inputType="numberDecimal" textColor="#FF333333" bg="#FFEEEEEE" gravity="center" padding="4" />
                                <text text="  上边界:" textSize="13sp" textColor="#FF666666" w="70" />
                                <input id="ocrTop" text="0.50" textSize="13sp" w="80" inputType="numberDecimal" textColor="#FF333333" bg="#FFEEEEEE" gravity="center" padding="4" />
                            </horizontal>
                            <horizontal gravity="center_vertical" margin="0 4 0 0">
                                <text text="宽度:" textSize="13sp" textColor="#FF666666" w="70" />
                                <input id="ocrWidth" text="0.90" textSize="13sp" w="80" inputType="numberDecimal" textColor="#FF333333" bg="#FFEEEEEE" gravity="center" padding="4" />
                                <text text="  高度:" textSize="13sp" textColor="#FF666666" w="70" />
                                <input id="ocrHeight" text="0.45" textSize="13sp" w="80" inputType="numberDecimal" textColor="#FF333333" bg="#FFEEEEEE" gravity="center" padding="4" />
                            </horizontal>

                            <!-- 识别方法选择 -->
                            <horizontal gravity="center_vertical" margin="0 8 0 0">
                                <text text="识别方法:" textSize="13sp" textColor="#FF666666" w="70" />
                                <radiogroup id="ocrMethodGroup" orientation="horizontal">
                                    <radio id="ocrPaddle" text="PaddleOCR" textSize="13sp" textColor="#FF333333" checked="true" />
                                    <radio id="ocrMlkit" text="MLKit OCR" textSize="13sp" textColor="#FF333333" margin="16 0 0 0" />
                                </radiogroup>
                            </horizontal>

                            <!-- 执行按钮 -->
                            <button id="ocrTestBtn" text="🔍  执行 OCR 识别" textSize="14sp" textColor="#FFFFFFFF"
                                bg="#FF2196F3" w="*" h="40" margin="0 8 0 0" gravity="center" clickable="true" />
                        </vertical>
                    </vertical>

                    <!-- 消消乐测试（可折叠） -->
                    <vertical w="*" bg="#FFFFFFFF" margin="8 5" padding="0" gravity="center_vertical">
                        <horizontal id="testXxlSectionHeader" gravity="center_vertical" padding="16 0" h="52">
                            <text text="🎮  消消乐测试" textSize="16sp" textColor="#FF333333" layout_weight="1" />
                            <text id="testXxlSectionArrow" text="▶" textSize="13sp" textColor="#FF999999" margin="4 0 0 0" />
                        </horizontal>
                        <vertical id="testXxlSectionBody" visibility="gone" margin="0 0 8 8" padding="8" bg="#FFF5F5F5">

                            <text text="设置棋盘区域，点击执行测试（参数独立于任务设置）" textSize="11sp" textColor="#FF999999" margin="0 0 8 0" />
                            <horizontal margin="0 2 0 0">
                                <vertical layout_weight="1">
                                    <text text="Left" textSize="11sp" textColor="#FF666666" />
                                    <input id="testXxlLeft" text="" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                </vertical>
                                <vertical layout_weight="1" margin="4 0">
                                    <text text="Top" textSize="11sp" textColor="#FF666666" />
                                    <input id="testXxlTop" text="" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                </vertical>
                                <vertical layout_weight="1">
                                    <text text="Right" textSize="11sp" textColor="#FF666666" />
                                    <input id="testXxlRight" text="" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                </vertical>
                                <vertical layout_weight="1" margin="4 0">
                                    <text text="Bottom" textSize="11sp" textColor="#FF666666" />
                                    <input id="testXxlBottom" text="" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                </vertical>
                            </horizontal>
                            <horizontal margin="0 4 0 0">
                                <vertical layout_weight="1">
                                    <text text="行数" textSize="11sp" textColor="#FF666666" />
                                    <input id="testXxlRows" text="8" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                </vertical>
                                <vertical layout_weight="1" margin="4 0">
                                    <text text="列数" textSize="11sp" textColor="#FF666666" />
                                    <input id="testXxlCols" text="8" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                </vertical>
                                <vertical layout_weight="1" margin="4 0">
                                    <text text="最大步数" textSize="11sp" textColor="#FF666666" />
                                    <input id="testXxlMaxMoves" text="5" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                </vertical>
                            </horizontal>
                            <horizontal margin="0 4 0 0">
                                <vertical layout_weight="1">
                                    <text text="交换间隔(毫秒)" textSize="11sp" textColor="#FF666666" />
                                    <input id="testXxlSwapInterval" text="2500" textSize="12sp" inputType="number" bg="#FFEEEEEE" padding="4" />
                                </vertical>
                                <frame layout_weight="1" />
                                <frame layout_weight="1" />
                                <frame layout_weight="1" margin="4 0" />
                            </horizontal>
                            <button id="testXxlBtn" text="🎮  开始测试消消乐" textSize="14sp" textColor="#FFFFFFFF"
                                bg="#FFFF9800" w="*" h="40" margin="0 8 0 0" gravity="center" clickable="true" />
                        </vertical>
                    </vertical>

                    <button id="testBtn" text="🔧  开始测试" textSize="15sp" textColor="#FF888888"
                        bg="#FFE8E8E8" w="*" h="48" margin="8 16 8 4" gravity="center" clickable="true" />

                    <frame w="*" h="16" />

                </vertical>
            </scroll>

        </frame>

        <!-- 底部按钮 -->
        <vertical id="bottomBar" bg="#FFFFFFFF" padding="12 8 12 8">
            <text id="startBtn" text="开始执行" textSize="18sp" textColor="#FFFFFFFF"
                bg="#FF4CAF50" w="*" h="52" gravity="center" clickable="true" />
            <text text="按音量 - 停止运行" textSize="12sp" textColor="#FFE53935" gravity="center" margin="0 4 0 0" />
        </vertical>
    </vertical>
);

// ============================================================
// Tab 切换
// ============================================================

var _tabs = [
    { id: "tabTask",  page: "pageTask" },
    { id: "tabSys",   page: "pageSys"  },
    { id: "tabTest",  page: "pageTest" },
];

function switchTab(activeId) {
    for (var i = 0; i < _tabs.length; i++) {
        var tab = _tabs[i];
        var isActive = tab.id === activeId;
        ui[tab.page].setVisibility(isActive ? android.view.View.VISIBLE : android.view.View.GONE);
        ui[tab.id].setTextColor(android.graphics.Color.parseColor(isActive ? "#FF4CAF50" : "#FF888888"));
        ui[tab.id].setBackgroundColor(android.graphics.Color.parseColor(isActive ? "#FFFFFFFF" : "#FFEEEEEE"));
    }
    // 测试 Tab 隐藏底部操作栏
    ui.bottomBar.setVisibility(activeId === "tabTest" ? android.view.View.GONE : android.view.View.VISIBLE);
}

for (var i = 0; i < _tabs.length; i++) {
    (function (tab) {
        ui[tab.id].on("click", function () { switchTab(tab.id); });
    })(_tabs[i]);
}

// ============================================================
// UI 状态持久缓存
// ============================================================
var _uiStorage = storages.create('tb_ui_config');

function restoreUiState() {
    try {
        var task = _uiStorage.get('task');
        if (task !== undefined) ui.taskSw.setChecked(task === "true");

        var water = _uiStorage.get('water');
        if (water !== undefined) ui.waterSw.setChecked(water === "true");

        var intimacy = _uiStorage.get('intimacy');
        if (intimacy !== undefined) ui.intimacySw.setChecked(intimacy === "true");

        var sun = _uiStorage.get('sun');
        if (sun !== undefined) ui.sunSw.setChecked(sun === "true");

        var xiaoxiaole = _uiStorage.get('xiaoxiaole');
        if (xiaoxiaole !== undefined) ui.xiaoxiaoleSw.setChecked(xiaoxiaole === "true");

        var help = _uiStorage.get('help');
        if (help !== undefined) ui.helpSw.setChecked(help === "true");

        var debug = _uiStorage.get('debugSaveScreenshot');
        if (debug !== undefined) ui.debugSw.setChecked(debug === "true");

        var volume = _uiStorage.get('volume');
        if (volume !== undefined) ui.volumeSw.setChecked(volume === "true");

        var killAppArr = _uiStorage.get('killApp');
        if (killAppArr) {
            try {
                var _ka = JSON.parse(killAppArr);
                if (Array.isArray(_ka)) {
                    ui.killTbChk.setChecked(_ka.indexOf("com.taobao.taobao") >= 0);
                    ui.killAliChk.setChecked(_ka.indexOf("com.eg.android.AlipayGphone") >= 0);
                    ui.killAutojsChk.setChecked(_ka.indexOf("org.autojs.autojspro") >= 0);
                    updateKillAppSummary();
                }
            } catch (e) {}
        }

        var ocr = _uiStorage.get('ocrPure');
        if (ocr !== undefined) ui.ocrSw.setChecked(ocr === "true");

        var waterMode = _uiStorage.get('waterMode');
        if (waterMode === "auto") {
            ui.waterAutoRadio.setChecked(true);
            ui.waterFixedRadio.setChecked(false);
            ui.waterTargetRadio.setChecked(false);
        } else if (waterMode === "count") {
            ui.waterAutoRadio.setChecked(false);
            ui.waterFixedRadio.setChecked(true);
            ui.waterTargetRadio.setChecked(false);
        } else if (waterMode === "target") {
            ui.waterAutoRadio.setChecked(false);
            ui.waterFixedRadio.setChecked(false);
            ui.waterTargetRadio.setChecked(true);
        } else if (waterMode === "fertilizer") {
            ui.waterAutoRadio.setChecked(false);
            ui.waterFixedRadio.setChecked(false);
            ui.waterTargetRadio.setChecked(false);
            ui.waterFertilizerRadio.setChecked(true);
        }

        var waterNum = _uiStorage.get('waterNum');
        if (waterNum !== undefined) ui.waterNumInput.setText(waterNum + "");

        var xxlLeft = _uiStorage.get('xxlLeft');
        if (xxlLeft !== undefined) ui.xxlLeft.setText(xxlLeft + "");
        var xxlTop = _uiStorage.get('xxlTop');
        if (xxlTop !== undefined) ui.xxlTop.setText(xxlTop + "");
        var xxlRight = _uiStorage.get('xxlRight');
        if (xxlRight !== undefined) ui.xxlRight.setText(xxlRight + "");
        var xxlBottom = _uiStorage.get('xxlBottom');
        if (xxlBottom !== undefined) ui.xxlBottom.setText(xxlBottom + "");
        var xxlRows = _uiStorage.get('xxlRows');
        if (xxlRows !== undefined) ui.xxlRows.setText(xxlRows + "");
        var xxlCols = _uiStorage.get('xxlCols');
        if (xxlCols !== undefined) ui.xxlCols.setText(xxlCols + "");
        var xxlMaxMoves = _uiStorage.get('xxlMaxMoves');
        var swapInterval = _uiStorage.get('swapInterval');
        if (xxlMaxMoves !== undefined) ui.xxlMaxMoves.setText(xxlMaxMoves + "");
        if (swapInterval !== undefined) ui.xxlSwapInterval.setText(swapInterval + "");

        // test xxl（独立于任务设置）
        var testXxlVal = _uiStorage.get('testXxlLeft');
        if (testXxlVal !== undefined) ui.testXxlLeft.setText(testXxlVal + "");
        testXxlVal = _uiStorage.get('testXxlTop');
        if (testXxlVal !== undefined) ui.testXxlTop.setText(testXxlVal + "");
        testXxlVal = _uiStorage.get('testXxlRight');
        if (testXxlVal !== undefined) ui.testXxlRight.setText(testXxlVal + "");
        testXxlVal = _uiStorage.get('testXxlBottom');
        if (testXxlVal !== undefined) ui.testXxlBottom.setText(testXxlVal + "");
        testXxlVal = _uiStorage.get('testXxlRows');
        if (testXxlVal !== undefined) ui.testXxlRows.setText(testXxlVal + "");
        testXxlVal = _uiStorage.get('testXxlCols');
        if (testXxlVal !== undefined) ui.testXxlCols.setText(testXxlVal + "");
        testXxlVal = _uiStorage.get('testXxlMaxMoves');
        if (testXxlVal !== undefined) ui.testXxlMaxMoves.setText(testXxlVal + "");
        testXxlVal = _uiStorage.get('testXxlSwapInterval');
        if (testXxlVal !== undefined) ui.testXxlSwapInterval.setText(testXxlVal + "");
    } catch (e) {
        console.log("恢复 UI 状态失败: " + e.message);
    }
}

function saveUiState() {
    _uiStorage.put('task', ui.taskSw.isChecked() ? "true" : "false");
    _uiStorage.put('water', ui.waterSw.isChecked() ? "true" : "false");
    _uiStorage.put('intimacy', ui.intimacySw.isChecked() ? "true" : "false");
    _uiStorage.put('sun', ui.sunSw.isChecked() ? "true" : "false");
    _uiStorage.put('xiaoxiaole', ui.xiaoxiaoleSw.isChecked() ? "true" : "false");
    _uiStorage.put('help', ui.helpSw.isChecked() ? "true" : "false");
    _uiStorage.put('debugSaveScreenshot', ui.debugSw.isChecked() ? "true" : "false");
    _uiStorage.put('volume', ui.volumeSw.isChecked() ? "true" : "false");
    _uiStorage.put('killApp', JSON.stringify(getSelectedKillApps()));
    _uiStorage.put('ocrPure', ui.ocrSw.isChecked() ? "true" : "false");
    _uiStorage.put('waterMode', ui.waterAutoRadio.isChecked() ? "auto" : ui.waterTargetRadio.isChecked() ? "target" : ui.waterFertilizerRadio.isChecked() ? "fertilizer" : "count");
    _uiStorage.put('waterNum', ui.waterNumInput.getText() + "");

    _uiStorage.put('xxlLeft', ui.xxlLeft.getText() + "");
    _uiStorage.put('xxlTop', ui.xxlTop.getText() + "");
    _uiStorage.put('xxlRight', ui.xxlRight.getText() + "");
    _uiStorage.put('xxlBottom', ui.xxlBottom.getText() + "");
    _uiStorage.put('xxlRows', ui.xxlRows.getText() + "");
    _uiStorage.put('xxlCols', ui.xxlCols.getText() + "");
    _uiStorage.put('xxlMaxMoves', ui.xxlMaxMoves.getText() + "");
    _uiStorage.put('swapInterval', ui.xxlSwapInterval.getText() + "");

    // test xxl（独立于任务设置）
    _uiStorage.put('testXxlLeft', ui.testXxlLeft.getText() + "");
    _uiStorage.put('testXxlTop', ui.testXxlTop.getText() + "");
    _uiStorage.put('testXxlRight', ui.testXxlRight.getText() + "");
    _uiStorage.put('testXxlBottom', ui.testXxlBottom.getText() + "");
    _uiStorage.put('testXxlRows', ui.testXxlRows.getText() + "");
    _uiStorage.put('testXxlCols', ui.testXxlCols.getText() + "");
    _uiStorage.put('testXxlMaxMoves', ui.testXxlMaxMoves.getText() + "");
    _uiStorage.put('testXxlSwapInterval', ui.testXxlSwapInterval.getText() + "");
}

// ============================================================
// 助力好友配置（内嵌列表）
// ============================================================

var _helpStorage = storages.create('tb_help_friend');

function getHelpedToday() {
    var data = _helpStorage.get('helpedNames', {});
    var d = new Date();
    var today = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    if (data && data.date === today && data.names) return data.names;
    return [];
}

function updateHelpCountLabel() {
    var names = _helpStorage.get('friendNames', []);
    var helped = getHelpedToday();
    // ui.helpCountText.setText("已选" + names.length + "人/" + helped.length + "人已助力");
}

function refreshHelpList() {
    var list = ui.dlgHelpList;
    while (list.getChildCount() > 0) list.removeViewAt(0);
    var currentNames = _helpStorage.get('friendNames', []);
    // 全量覆盖：移除 selectedFriends 中已不存在的名称（清除缓存脏数据）
    var selected = _helpStorage.get('selectedFriends', []);
    var cleanSelected = [];
    for (var s = 0; s < selected.length; s++) {
        if (currentNames.indexOf(selected[s]) >= 0) {
            cleanSelected.push(selected[s]);
        }
    }
    if (cleanSelected.length !== selected.length) {
        _helpStorage.put('selectedFriends', cleanSelected);
        selected = cleanSelected;
    }
    var helped = getHelpedToday();

    for (var i = 0; i < currentNames.length; i++) {
        var name = currentNames[i];
        var isHelped = helped.indexOf(name) >= 0;
        var isSelected = selected.indexOf(name) >= 0;

        var row = new android.widget.LinearLayout(context);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);
        row.setPadding(dip2px(4), dip2px(4), dip2px(4), dip2px(4));

        var chk = new android.widget.CheckBox(context);
        chk.setChecked(isSelected);
        chk.setEnabled(!isHelped);
        row.addView(chk);

        var tv = new android.widget.TextView(context);
        tv.setText(name);
        tv.setTextSize(15);
        tv.setTextColor(android.graphics.Color.parseColor("#FF333333"));
        tv.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        tv.setPadding(dip2px(4), 0, 0, 0);
        row.addView(tv);

        if (isHelped) {
            var badge = new android.widget.TextView(context);
            badge.setText("已助力");
            badge.setTextSize(12);
            badge.setTextColor(android.graphics.Color.parseColor("#FF999999"));
            row.addView(badge);
        }

        var delBtn = new android.widget.Button(context);
        delBtn.setText("✕");
        delBtn.setTextSize(14);
        delBtn.setTextColor(android.graphics.Color.parseColor("#FFE53935"));
        delBtn.setBackgroundColor(android.graphics.Color.TRANSPARENT);
        delBtn.setLayoutParams(new android.widget.LinearLayout.LayoutParams(dip2px(36), dip2px(36)));
        (function (n) {
            delBtn.setOnClickListener(function () {
                var arr = _helpStorage.get('friendNames', []);
                var idx = arr.indexOf(n);
                if (idx >= 0) {
                    arr.splice(idx, 1);
                    _helpStorage.put('friendNames', arr);
                    // 同步从 selectedFriends 中移除
                    var sel = _helpStorage.get('selectedFriends', []);
                    var selIdx = sel.indexOf(n);
                    if (selIdx >= 0) {
                        sel.splice(selIdx, 1);
                        _helpStorage.put('selectedFriends', sel);
                    }
                    refreshHelpList();
                }
            });
        })(name);
        row.addView(delBtn);

        // checkbox 选中变化保存
        (function (n, cb) {
            cb.setOnCheckedChangeListener(function (btn, isChecked) {
                var sel = _helpStorage.get('selectedFriends', []);
                var idx = sel.indexOf(n);
                if (isChecked && idx < 0) sel.push(n);
                else if (!isChecked && idx >= 0) sel.splice(idx, 1);
                _helpStorage.put('selectedFriends', sel);
                updateHelpCountLabel();
            });
        })(name, chk);

        list.addView(row);
    }
    updateHelpCountLabel();
}

// 绑定添加/清除事件
ui.dlgHelpAddBtn.on("click", function () {
    var text = ui.dlgHelpInput.getText().toString().trim();
    if (!text) return;
    var arr = _helpStorage.get('friendNames', []);
    if (arr.indexOf(text) >= 0) {
        toast("该好友已在列表中");
        return;
    }
    arr.push(text);
    _helpStorage.put('friendNames', arr);
    // 自动勾选新添加的好友
    var sel = _helpStorage.get('selectedFriends', []);
    if (sel.indexOf(text) < 0) {
        sel.push(text);
        _helpStorage.put('selectedFriends', sel);
    }
    ui.dlgHelpInput.setText("");
    refreshHelpList();
});

ui.dlgHelpClearBtn.on("click", function () {
    _helpStorage.put('helpedNames', {date: '', names: []});
    refreshHelpList();
    toast("已助力记录已清除");
});

// 初始化列表
refreshHelpList();

// 解决嵌套滚动：内层 ScrollView 阻止外层 ScrollView 拦截触摸
(function fixHelpScroll() {
    try {
        var listParent = ui.dlgHelpList.getParent();
        if (listParent) {
            listParent.setOnTouchListener(function (v, event) {
                v.getParent().requestDisallowInterceptTouchEvent(true);
                return false;
            });
        }
    } catch(e) {}
})();

updateHelpCountLabel();

restoreUiState();

ui.taskSw.on("check", function () { saveUiState(); });
ui.waterSw.on("check", function () { saveUiState(); });
ui.intimacySw.on("check", function () { saveUiState(); });
ui.sunSw.on("check", function () { saveUiState(); });
ui.xiaoxiaoleSw.on("check", function () { saveUiState(); });
ui.helpSw.on("check", function () { saveUiState(); });
ui.debugSw.on("check", function () { saveUiState(); });
ui.volumeSw.on("check", function () { saveUiState(); });
ui.killTbChk.on("check", function () { saveUiState(); updateKillAppSummary(); });
ui.killAliChk.on("check", function () { saveUiState(); updateKillAppSummary(); });
ui.killAutojsChk.on("check", function () { saveUiState(); updateKillAppSummary(); });
ui.ocrSw.on("check", function () { saveUiState(); });

ui.waterAutoRadio.on("click", function () {
    ui.waterFixedRadio.setChecked(false);
    ui.waterTargetRadio.setChecked(false);
});

ui.waterFixedRadio.on("click", function () {
    ui.waterAutoRadio.setChecked(false);
    ui.waterTargetRadio.setChecked(false);
});

ui.waterTargetRadio.on("click", function () {
    ui.waterAutoRadio.setChecked(false);
    ui.waterFixedRadio.setChecked(false);
    ui.waterFertilizerRadio.setChecked(false);
});

ui.waterFertilizerRadio.on("click", function () {
    ui.waterAutoRadio.setChecked(false);
    ui.waterFixedRadio.setChecked(false);
    ui.waterTargetRadio.setChecked(false);
});

// ============================================================
// 消消乐输入校验
// ============================================================
(function () {
    var _timers = {};
    var _fields = ['xxlLeft', 'xxlTop', 'xxlRight', 'xxlBottom', 'xxlRows', 'xxlCols', 'xxlMaxMoves', 'xxlSwapInterval'];

    function _getVal(id) {
        var txt = ("" + ui[id].getText()).trim();
        if (txt === "") return -1;
        var n = parseInt(txt);
        return isNaN(n) ? -1 : n;
    }

    function _validateXxl() {
        var left = _getVal('xxlLeft');
        var top = _getVal('xxlTop');
        var right = _getVal('xxlRight');
        var bottom = _getVal('xxlBottom');
        var rows = _getVal('xxlRows');
        var cols = _getVal('xxlCols');
        var maxMoves = _getVal('xxlMaxMoves');

        var errors = [];
        if (left < 0) errors.push("请填写 Left");
        if (top < 0) errors.push("请填写 Top");
        if (right < 0) errors.push("请填写 Right");
        if (bottom < 0) errors.push("请填写 Bottom");
        if (left >= 0 && right >= 0 && left >= right) {
            errors.push("Left(" + left + ") 必须小于 Right(" + right + ")");
        }
        if (top >= 0 && bottom >= 0 && top >= bottom) {
            errors.push("Top(" + top + ") 必须小于 Bottom(" + bottom + ")");
        }
        if (rows >= 0 && rows < 3) errors.push("行数不能小于 3");
        if (cols >= 0 && cols < 3) errors.push("列数不能小于 3");
        if (maxMoves >= 0 && maxMoves < 1) errors.push("最大步数不能小于 1");

        if (errors.length > 0) {
            return false;
        }
        return true;
    }

    for (var i = 0; i < _fields.length; i++) {
        (function (fid) {
            ui[fid].on("text_change", function () {
                if (_timers[fid]) clearTimeout(_timers[fid]);
                _timers[fid] = setTimeout(function () {
                    _uiStorage.put(fid, ui[fid].getText() + "");
                    _validateXxl();
                }, 500);
            });
        })(_fields[i]);
    }

    // testXxl 输入框自动保存（独立于任务设置）
    var _testXxlFields = ['testXxlLeft', 'testXxlTop', 'testXxlRight', 'testXxlBottom',
                          'testXxlRows', 'testXxlCols', 'testXxlMaxMoves', 'testXxlSwapInterval'];
    for (var j = 0; j < _testXxlFields.length; j++) {
        (function (fid) {
            ui[fid].on("text_change", function () {
                _uiStorage.put(fid, ui[fid].getText() + "");
            });
        })(_testXxlFields[j]);
    }
})();

// ============================================================
// 工具：从 UI 输入框构建 xxl board 对象
// ============================================================

function buildXxlBoard() {
    var _g = function (id) {
        var txt = ("" + id.getText()).trim();
        if (txt === "") return 0;
        var n = parseInt(txt);
        return isNaN(n) ? 0 : n;
    };
    var xxlLeft = _g(ui.xxlLeft);
    var xxlTop = _g(ui.xxlTop);
    var xxlRight = _g(ui.xxlRight);
    var xxlBottom = _g(ui.xxlBottom);
    if (xxlLeft <= 0 || xxlTop <= 0 || xxlRight <= 0 || xxlBottom <= 0) return null;
    if (xxlLeft >= xxlRight || xxlTop >= xxlBottom) return null;
    return {
        boardLeft: xxlLeft, boardTop: xxlTop,
        boardRight: xxlRight, boardBottom: xxlBottom,
        rows: _g(ui.xxlRows) || 8, cols: _g(ui.xxlCols) || 8,
        maxMoves: _g(ui.xxlMaxMoves) || 5
    };
}

// ============================================================
// 统一参数传递：将当前 UI 状态写入 tb_run_config
// ============================================================

function writeRunConfig(taskFlag) {
    var waterMode = ui.waterAutoRadio.isChecked() ? "auto" : ui.waterTargetRadio.isChecked() ? "target" : ui.waterFertilizerRadio.isChecked() ? "fertilizer" : "count";
    var waterNum = parseInt(ui.waterNumInput.getText()) || 10;
    var xxlBoard = buildXxlBoard();
    var helpNames = _helpStorage.get('selectedFriends', []);

    var cfg = storages.create('tb_run_config');
    cfg.put('task', taskFlag);
    cfg.put('water', ui.waterSw.isChecked() ? "true" : "false");
    cfg.put('intimacy', ui.intimacySw.isChecked() ? "true" : "false");
    cfg.put('sun', ui.sunSw.isChecked() ? "true" : "false");
    cfg.put('waterMode', waterMode);
    cfg.put('waterNum', waterNum + "");
    cfg.put('debugSaveScreenshot', ui.debugSw.isChecked() ? "true" : "false");
    cfg.put('volume', ui.volumeSw.isChecked() ? "true" : "false");
    cfg.put('killApp', JSON.stringify(getSelectedKillApps()));
    cfg.put('ocrPure', ui.ocrSw.isChecked() ? "true" : "false");
    cfg.put('help', ui.helpSw.isChecked() ? "true" : "false");
    cfg.put('helpNames', JSON.stringify(helpNames));
    cfg.put('xiaoxiaole', ui.xiaoxiaoleSw.isChecked() ? "true" : "false");
    cfg.put('xiaoxiaoleBoard', xxlBoard ? JSON.stringify(xxlBoard) : "");
}

// ============================================================
// 开始执行
// ============================================================

ui.startBtn.click(function () {
    saveUiState();

    if (ui.xiaoxiaoleSw.isChecked()) {
        if (!buildXxlBoard()) {
            toast("消消乐配置有误，请先填写完整的棋盘位置");
            return;
        }
    }

    var taskFlag = ui.taskSw.isChecked() ? "true" : "false";
    writeRunConfig(taskFlag);

    ui.finish();
    threads.start(function () {
        engines.execScriptFile("./start.js");
    });
});

// ============================================================
// 浇水折叠展开
// ============================================================
var _waterCollapsed = true;
function toggleWaterSection() {
    _waterCollapsed = !_waterCollapsed;
    ui.waterSectionBody.setVisibility(_waterCollapsed ? android.view.View.GONE : android.view.View.VISIBLE);
    ui.waterSectionArrow.setText(_waterCollapsed ? "▶" : "▼");
}
ui.waterSectionHeader.on("click", function () { toggleWaterSection(); });

// ============================================================
// 执行任务折叠展开
// ============================================================
var _taskCollapsed = false;
function toggleTaskSection() {
    _taskCollapsed = !_taskCollapsed;
    ui.taskSectionBody.setVisibility(_taskCollapsed ? android.view.View.GONE : android.view.View.VISIBLE);
    ui.taskSectionArrow.setText(_taskCollapsed ? "▶" : "▼");
}
ui.taskSectionHeader.on("click", function () { toggleTaskSection(); });

// ============================================================
// 消消乐折叠展开
// ============================================================
var _xxlCollapsed = true;
function toggleXxlSection() {
    _xxlCollapsed = !_xxlCollapsed;
    ui.xxlSectionBody.setVisibility(_xxlCollapsed ? android.view.View.GONE : android.view.View.VISIBLE);
    ui.xxlSectionArrow.setText(_xxlCollapsed ? "▶" : "▼");
}
ui.xxlSectionHeader.on("click", function () { toggleXxlSection(); });

// ============================================================
// 测试 Tab 折叠展开
// ============================================================
var _ocrTestCollapsed = true;
function toggleOcrTestSection() {
    _ocrTestCollapsed = !_ocrTestCollapsed;
    ui.ocrTestSectionBody.setVisibility(_ocrTestCollapsed ? android.view.View.GONE : android.view.View.VISIBLE);
    ui.ocrTestSectionArrow.setText(_ocrTestCollapsed ? "▶" : "▼");
}
ui.ocrTestSectionHeader.on("click", function () { toggleOcrTestSection(); });

var _testXxlCollapsed = true;
function toggleTestXxlSection() {
    _testXxlCollapsed = !_testXxlCollapsed;
    ui.testXxlSectionBody.setVisibility(_testXxlCollapsed ? android.view.View.GONE : android.view.View.VISIBLE);
    ui.testXxlSectionArrow.setText(_testXxlCollapsed ? "▶" : "▼");
}
ui.testXxlSectionHeader.on("click", function () { toggleTestXxlSection(); });

var _testDdzCollapsed = true;
function toggleTestDdzSection() {
    _testDdzCollapsed = !_testDdzCollapsed;
    ui.testDdzSectionBody.setVisibility(_testDdzCollapsed ? android.view.View.GONE : android.view.View.VISIBLE);
    ui.testDdzSectionArrow.setText(_testDdzCollapsed ? "▶" : "▼");
}
ui.testDdzSectionHeader.on("click", function () { toggleTestDdzSection(); });

// ============================================================
// 执行完毕强退 App（多选 + 折叠展开）
// ============================================================
function getSelectedKillApps() {
    var arr = [];
    if (ui.killTbChk.isChecked()) arr.push("com.taobao.taobao");
    if (ui.killAliChk.isChecked()) arr.push("com.eg.android.AlipayGphone");
    if (ui.killAutojsChk.isChecked()) arr.push("org.autojs.autojspro");
    return arr;
}

function updateKillAppSummary() {
    var arr = getSelectedKillApps();
    ui.killAppSummary.setText(arr.length === 0 ? "未选择" : "已选 " + arr.length + " 个");
}

var _killAppCollapsed = true;
function toggleKillAppSection() {
    _killAppCollapsed = !_killAppCollapsed;
    ui.killAppSectionBody.setVisibility(_killAppCollapsed ? android.view.View.GONE : android.view.View.VISIBLE);
    ui.killAppSectionArrow.setText(_killAppCollapsed ? "▶" : "▼");
}
ui.killAppSectionHeader.on("click", function () { toggleKillAppSection(); });

// ============================================================
// OCR 识别测试按钮
// ============================================================

ui.ocrTestBtn.click(function () {
    // 读取输入
    var leftRatio = parseFloat(ui.ocrLeft.getText()) || 0;
    var topRatio = parseFloat(ui.ocrTop.getText()) || 0;
    var widthRatio = parseFloat(ui.ocrWidth.getText()) || 0;
    var heightRatio = parseFloat(ui.ocrHeight.getText()) || 0;
    var method = ui.ocrPaddle.isChecked() ? 'METHOD_PADDLE_OCR' : 'METHOD_MLKIT_OCR';

    // 保存通用配置（含 debugSaveScreenshot 等）
    saveUiState();
    writeRunConfig("ocrTest");

    // 额外写入 OCR 测试专用参数
    var cfg = storages.create('tb_run_config');
    cfg.put('ocrLeft', leftRatio + '');
    cfg.put('ocrTop', topRatio + '');
    cfg.put('ocrWidth', widthRatio + '');
    cfg.put('ocrHeight', heightRatio + '');
    cfg.put('ocrMethod', method);

    ui.finish();
    threads.start(function () {
        engines.execScriptFile("./start.js");
    });
});

// ============================================================
// 消消乐测试按钮
// ============================================================

/**
 * 从 testXxl 前缀的 UI 输入框构建 board 对象
 */
function buildTestXxlBoard() {
    var _g = function (id) {
        var txt = ("" + id.getText()).trim();
        if (txt === "") return 0;
        var n = parseInt(txt);
        return isNaN(n) ? 0 : n;
    };
    var left = _g(ui.testXxlLeft);
    var top = _g(ui.testXxlTop);
    var right = _g(ui.testXxlRight);
    var bottom = _g(ui.testXxlBottom);
    if (left <= 0 || top <= 0 || right <= 0 || bottom <= 0) return null;
    if (left >= right || top >= bottom) return null;
    return {
        boardLeft: left, boardTop: top,
        boardRight: right, boardBottom: bottom,
        rows: _g(ui.testXxlRows) || 8, cols: _g(ui.testXxlCols) || 8,
        maxMoves: _g(ui.testXxlMaxMoves) || 5,
        swapInterval: _g(ui.testXxlSwapInterval) || 2500
    };
}

ui.testXxlBtn.click(function () {
    var board = buildTestXxlBoard();
    if (!board) {
        toast("消消乐测试参数有误，请完整填写棋盘位置");
        return;
    }

    saveUiState();
    writeRunConfig("testXxl");

    var cfg = storages.create('tb_run_config');
    cfg.put('testXxlBoard', JSON.stringify(board));

    ui.finish();
    threads.start(function () {
        engines.execScriptFile("./start.js");
    });
});

// ============================================================

ui.testBtn.click(function () {
    saveUiState();

    if (ui.xiaoxiaoleSw.isChecked()) {
        if (!buildXxlBoard()) {
            toast("消消乐配置有误，请先填写完整的棋盘位置");
            return;
        }
    }

    writeRunConfig("test");

    ui.finish();
    threads.start(function () {
        engines.execScriptFile("./start.js");
    });
});

// ============================================================
// 缓存管理（系统 Tab）
// ============================================================

var _cacheStorage = storages.create('tb_task_cache');

/** 从缓存中读取所有今日已完成的任务 */
function loadDoneTasks() {
    var raw = _cacheStorage.get('tasks', '{}');
    var tasks = {};
    try { tasks = JSON.parse(raw); } catch (e) {}
    var today = new Date();
    var todayStr = today.getFullYear() + '-' +
        ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
        ('0' + today.getDate()).slice(-2);
    var names = [];
    for (var key in tasks) {
        if (tasks[key] === todayStr) names.push(key);
    }
    return names;
}

/** 刷新缓存列表 UI */
function refreshCacheList() {
    var names = loadDoneTasks();
    var list = ui.cacheList;
    while (list.getChildCount() > 0) list.removeViewAt(0);

    if (names.length === 0) {
        var empty = new android.widget.TextView(context);
        empty.setText("暂无缓存记录");
        empty.setTextSize(14);
        empty.setTextColor(android.graphics.Color.parseColor("#FF999999"));
        empty.setGravity(android.view.Gravity.CENTER);
        empty.setPadding(0, dip2px(24), 0, dip2px(24));
        list.addView(empty);
        return;
    }

    for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var row = new android.widget.LinearLayout(context);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);
        row.setPadding(dip2px(4), dip2px(2), dip2px(4), dip2px(2));

        var chk = new android.widget.CheckBox(context);
        chk.setChecked(false);
        row.addView(chk);

        var tv = new android.widget.TextView(context);
        tv.setText(name);
        tv.setTextSize(14);
        tv.setTextColor(android.graphics.Color.parseColor("#FF333333"));
        tv.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        tv.setPadding(dip2px(4), 0, 0, 0);
        row.addView(tv);

        var badge = new android.widget.TextView(context);
        badge.setText("已完成");
        badge.setTextSize(12);
        badge.setTextColor(android.graphics.Color.parseColor("#FF4CAF50"));
        row.addView(badge);

        list.addView(row);
    }
}

// 全选 / 全不选切换
ui.selectAllCacheBtn.on("click", function () {
    var list = ui.cacheList;
    var count = list.getChildCount();
    // 判断当前是否全选：找第一个 CheckBox 看状态
    var firstChk = null;
    for (var i = 0; i < count; i++) {
        var row = list.getChildAt(i);
        var chk = row.getChildAt(0);
        if (chk && (chk instanceof android.widget.CheckBox)) {
            firstChk = chk;
            break;
        }
    }
    var allChecked = firstChk ? firstChk.isChecked() : false;
    var newState = !allChecked;
    for (var i = 0; i < count; i++) {
        var row = list.getChildAt(i);
        var chk = row.getChildAt(0);
        if (chk && (chk instanceof android.widget.CheckBox)) {
            chk.setChecked(newState);
        }
    }
    ui.selectAllCacheBtn.setText(newState ? "全不选" : "全选");
});

// 清除选中项
ui.clearSelectedCacheBtn.on("click", function () {
    var list = ui.cacheList;
    var count = list.getChildCount();
    var cleared = 0;
    for (var i = 0; i < count; i++) {
        var row = list.getChildAt(i);
        var chk = row.getChildAt(0);
        if (!chk || !(chk instanceof android.widget.CheckBox)) continue;
        if (chk.isChecked()) {
            var tv = row.getChildAt(1);
            var name = tv.getText().toString();
            var raw = _cacheStorage.get('tasks', '{}');
            var tasks = {};
            try { tasks = JSON.parse(raw); } catch (e) {}
            delete tasks[name];
            _cacheStorage.put('tasks', JSON.stringify(tasks));
            cleared++;
        }
    }
    toast("已清除 " + cleared + " 项缓存");
    ui.selectAllCacheBtn.setText("全选");
    refreshCacheList();
});

// Tab 切换到"系统"时刷新缓存列表
var _origSwitchTab = switchTab;
switchTab = function (activeId) {
    _origSwitchTab(activeId);
    if (activeId === "tabSys") {
        refreshCacheList();
    }
};

// 初始刷新
refreshCacheList();

// ============================================================
// 使用说明弹窗
// ============================================================
ui.helpBtn.on("click", function () {
    dialogs.build({
        title: "📖 使用说明",
        positive: "知道了",
        positiveColor: "#FF4CAF50",
        customView: ui.inflate(
            <scroll>
                <vertical padding="8" w="*">
                    <text text="📋 任务设置" textSize="16sp" textColor="#FF333333" margin="0 8 0 4" />
                    <text text="勾选要执行的任务，点击「开始执行」启动。" textSize="13sp" textColor="#FF666666" margin="0 0 0 8" />
                    <text text="· 消消乐：需先开启执行任务后再展开设置" textSize="13sp" textColor="#FF666666" margin="0 2 0 2" />
                    <text text="· 浇水施肥：自动/固定次数/目标次数三选一" textSize="13sp" textColor="#FF666666" margin="0 2 0 2" />
                    <text text="· 助力好友：输入好友名称添加，勾选=本次助力" textSize="13sp" textColor="#FF666666" margin="0 2 0 8" />
                    <text text="· 消消乐棋盘配置：截图后取左上右下坐标" textSize="13sp" textColor="#FF666666" margin="0 2 0 2" />

                    <text text="⚙ 系统" textSize="16sp" textColor="#FF333333" margin="0 16 0 4" />
                    <text text="· 使用纯OCR：开启后所有文字识别走PaddleOCR（更准但更慢）" textSize="13sp" textColor="#FF666666" margin="0 2 0 2" />
                    <text text="· 关闭纯OCR：走UI控件树识别（更快，部分文字可能抓不到）" textSize="13sp" textColor="#FF666666" margin="0 2 0 2" />
                    <text text="· 自动调低音量：每次进任务前把媒体音量调到最小" textSize="13sp" textColor="#FF666666" margin="0 2 0 2" />
                    <text text="· 执行完毕强行退出：展开后可多选要强杀的 App（淘宝/支付宝/Auto.js Pro），默认不选" textSize="13sp" textColor="#FF666666" margin="0 2 0 2" />
                    <text text="· 清除任务缓存：清除后对应任务会重新执行" textSize="13sp" textColor="#FF666666" margin="0 2 0 8" />

                    <text text="🧪 测试" textSize="16sp" textColor="#FF333333" margin="0 16 0 4" />
                    <text text="· OCR识别测试：配置区域和方法，验证识别效果" textSize="13sp" textColor="#FF666666" margin="0 2 0 2" />
                    <text text="· 消消乐测试：独立参数，不影响任务配置" textSize="13sp" textColor="#FF666666" margin="0 2 0 2" />

                    <text text="🛑 停止" textSize="16sp" textColor="#FF333333" margin="0 16 0 4" />
                    <text text="按音量 - 键停止脚本运行" textSize="13sp" textColor="#FF666666" margin="0 2 0 8" />
                </vertical>
            </scroll>
        )
    }).show();
});

// ============================================================
// 返回键保存所有状态（兜底）
// ============================================================
ui.emitter.on("back_pressed", function () {
    saveUiState();
    ui.finish();
});