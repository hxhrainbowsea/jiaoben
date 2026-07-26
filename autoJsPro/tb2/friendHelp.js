// ============================================================
// friendHelp.js - 助力好友功能
// 依赖: config.js, utils.js, gesture.js, recognize.js, cache.js, navigation.js
//
// 从 start.js 拆分出的助力好友相关函数：
//   navigateToMessageTab, findFriendChat, clickHelpCard,
//   clickImmediateHelp, backToMessageList, helpFriends
// ============================================================

module.exports = function (runtime, scope) {
    scope = scope || global;

    /**
     * 导航到淘宝消息页面
     *
     * 打开淘宝 → 点击底部"消息"标签
     *
     * @returns {boolean} 是否成功到达消息页面
     */
    scope.navigateToMessageTab = function () {
        log("导航到淘宝消息页面...");
        app.launch("com.taobao.taobao");
        randomSleep(3000, null, 2000);

        // 先检测是否已在消息页面（底部 tab）
        var found = ocrFindClick("消息");
        if (found) {
            log("已在消息页面或已点击消息标签");
            randomSleep(1000, null, 700);
            return true;
        }

        // 不在消息页：先按返回回到淘宝首页
        log("不在消息页面，尝试回到首页...");
        for (var i = 0; i < 5; i++) {
            simulateSwipeBack();
            randomSleep(1200, null, 900);
            // 检查底部是否有"消息"（首页才有的底部 tab）
            found = ocrFindClick("消息");
            if (found) {
                log("已回到首页并点击消息标签");
                randomSleep(1000, null, 700);
                return true;
            }
        }
        log("未找到消息标签");
        return false;
    };

    /**
     * 在消息列表中查找好友并进入聊天
     *
     * @param {string} name - 好友名称
     * @returns {boolean} 是否找到并进入聊天
     */
    scope.findFriendChat = function (name) {
        log("查找好友聊天: " + name);

        var region = [Math.floor(device.width * 0.15), Math.floor(device.height * 0.15), Math.floor(device.width * 0.55), Math.floor(device.height * 0.65)];
        // 先直接查找
        var found = findTextAndClick(name, METHOD_PADDLE_OCR, {region: region});
        if (found) {
            log("找到好友: " + name + "，点击进入聊天");
            randomSleep(1000, null, 800);
            return true;
        }

        return false;
    };

    /**
     * 在聊天框中查找助力卡片并点击
     *
     * 检测顺序：
     * 1. 【淘宝】https:// 链接
     * 2. "拜托帮我助力一下" 文本
     *
     * @returns {boolean} 是否找到并点击了卡片
     */
    scope.clickHelpCard = function () {
        log("查找助力卡片...");
        randomSleep(800, null, 700);
        if (ocrFindClick("你也可以领")) {
            log("找到并点击「你可可以领」");
            randomSleep(1500, null, 1100);
            return true;
        }
        if (ocrFindClick("拜托帮我助力一下", {dy: -70})) {
            log("找到并点击淘宝链接");
            randomSleep(1500, null, 1100);
            return true;
        }
        return false;
    };

    /**
     * 等待并点击"立即助力"按钮
     *
     * @returns {boolean} 是否成功点击
     */
    scope.clickImmediateHelp = function () {
        log("等待并查找「立即助力」按钮...");
        randomSleep(1000, null, 800);

        if (ocrFindClick("立即助力")) {
            log("找到并点击「立即助力」");
            randomSleep(1500, null, 1100);
            return true;
        }

        log("未找到「立即助力」按钮");
        return true;
    };

    /**
     * 从活动页返回到消息列表
     *
     * 多次返回直到检测到"消息"文字
     *
     * @returns {boolean} 是否成功回到消息页面
     */
    scope.backToMessageList = function () {
        log("返回消息列表...");

        var maxBack = 6;
        for (var i = 0; i < maxBack; i++) {
            simulateSwipeBack();
            randomSleep(1500, null, 1100);

            // 检测是否回到了消息页面
            var found = ocrFindClick("消息");
            if (found) {
                log("已回到消息页面");
                return true;
            }
        }

        // 最终尝试：重启淘宝到首页，再进消息
        log("未回到消息页面，尝试重启淘宝并进消息...");
        if (!reopenTBToHome()) {
            return false;
        }
        randomSleep(500, null, 300);
        var found = ocrFindClick("消息");
        if (found) {
            randomSleep(1500, null, 1100);
            return true;
        }

        return false;
    };

    /**
     * 助力好友（主流程）
     *
     * 遍历好友列表：
     * 1. 过滤已助力过的
     * 2. 打开消息 tab → 找好友 → 进聊天 → 点卡片 → 点立即助力 → 回消息页
     * 3. 成功后缓存已助力名称
     */
    scope.helpFriends = function () {
        log("=== 开始助力好友 ===");

        if (!_helpNames || _helpNames.length === 0) {
            log("没有需要助力的好友");
            return;
        }

        // 读取已助力缓存（按日期，一天有效）
        var helpStorage = storages.create('tb_help_friend');
        var helpedData = helpStorage.get('helpedNames', {});
        var d = new Date();
        var todayStr = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        var helpedNames = [];
        if (helpedData && helpedData.date === todayStr && helpedData.names) {
            helpedNames = helpedData.names;
        }

        // 过滤已助力过的
        var toHelp = [];
        for (var i = 0; i < _helpNames.length; i++) {
            if (helpedNames.indexOf(_helpNames[i]) >= 0) {
                log("【" + _helpNames[i] + "】已助力过，跳过");
            } else {
                toHelp.push(_helpNames[i]);
            }
        }

        if (toHelp.length === 0) {
            log("所有好友都已助力过");
            return;
        }

        log("本次需助力 " + toHelp.length + " 人");
        reopenTBToHome();
        console.hide();
        // 导航到消息页面
        var onMsgPage = navigateToMessageTab();
        if (!onMsgPage) {
            log("无法进入消息页面，跳过助力好友");
            return;
        }

        // 逐个助力
        for (var i = 0; i < toHelp.length; i++) {
            var name = toHelp[i];
            log("===== 处理好友【" + name + "】（" + (i + 1) + "/" + toHelp.length + "）=====");

            // 查找好友并进入聊天
            var found = findFriendChat(name);
            if (!found) {
                log("未找到好友【" + name + "】的聊天记录，跳过");
                continue;
            }

            // 查找助力卡片并点击
            var cardClicked = clickHelpCard();
            if (!cardClicked) {
                log("【" + name + "】未找到助力卡片，跳过");
                backToMessageList();
                continue;
            }

            // 等待活动页加载 + 点击立即助力
            var helped = clickImmediateHelp();
            if (helped) {
                log("✅ 【" + name + "】助力成功！");

                // 写入缓存（日期格式，一天有效）
                if (helpedNames.indexOf(name) < 0) {
                    helpedNames.push(name);
                    helpStorage.put('helpedNames', {date: todayStr, names: helpedNames});
                }
            } else {
                log("❌ 【" + name + "】未找到立即助力按钮");
            }

            // 返回消息列表，准备处理下一个好友
            backToMessageList();
            randomSleep(1000, null, 700);
        }

        console.show();
        log("=== 助力好友完成 ===");
    };
};