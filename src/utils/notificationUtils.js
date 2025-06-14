// 存储最后一次通知时间
const lastNotificationTime = new Map();

// 发送Bark通知
export const sendBarkNotification = async (title, content, notificationConfig) => {
    const { barkKey, notificationLevel, enableBarkNotification, uniqueId } = notificationConfig;

    if (!barkKey || !enableBarkNotification) {
        console.log('Bark通知未启用或缺少Key');
        return false;
    }

    // 使用uniqueId进行冷却检查，确保同一类型通知有间隔
    const now = Date.now();
    const lastTime = lastNotificationTime.get(uniqueId) || 0;
    // 注意：这里的300000ms (5分钟) 是一个硬编码的最终防线，
    // 主要的间隔控制应由 monitorUtils 中的 shouldSendNotification 实现
    if (now - lastTime < 300000) {
        console.log(`Notification cooldown for ${uniqueId}. Last sent: ${new Date(lastTime).toLocaleTimeString()}`);
        return false;
    }

    try {
        let url = `https://api.day.app/${barkKey}/${encodeURIComponent(title)}\n/${encodeURIComponent(content)}`;

        // 根据通知等级添加不同的参数
        switch (parseInt(notificationLevel, 10)) {
            case 2: // 单次响铃
                url += '?sound=minuet';
                break;
            case 3: // 持续响铃
                url += '?call=1';
                break;
            default: // 1级 - 普通通知
                break;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 200) {
            console.log(`✅ Bark notification sent successfully for ${uniqueId}.`);
            // 更新最后通知时间
            lastNotificationTime.set(uniqueId, now);
            return true;
        }
        console.error(`❌ Bark notification failed for ${uniqueId}:`, data.message);
        return false;
    } catch (error) {
        console.error('Failed to send Bark notification:', error);
        return false;
    }
};

// 检查NFT是否在区间内
export const isNFTInRange = (nftInfo, minPrice, maxPrice) => {
    if (!nftInfo || !nftInfo.currentPrice) return true;
    const price = parseFloat(nftInfo.currentPrice);
    return price >= minPrice && price <= maxPrice;
};

// 获取通知设置（全局设置）
export const getNotificationSettings = () => {
    const settings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
    return {
        barkKey: settings.barkKey || '',
        notificationThreshold: settings.notificationThreshold || 3,
        notificationLevel: settings.notificationLevel || 1,
        enableBarkNotification: settings.enableBarkNotification !== false, // 默认为true，保持向后兼容
    };
};

// 发送测试Bark通知
export const sendTestBarkNotification = async (barkKey, notificationLevel) => {
    if (!barkKey) return { success: false, message: 'Bark Key 不能为空' };

    try {
        const title = "测试通知";
        const content = "这是一条来自 Pool Monitor 的测试消息。";
        let url = `https://api.day.app/${barkKey}/${encodeURIComponent(title)}/${encodeURIComponent(content)}`;

        // 根据通知等级添加不同的参数
        switch (parseInt(notificationLevel, 10)) {
            case 2:
                url += '?sound=minuet';
                break;
            case 3:
                url += '?call=1';
                break;
            default:
                break;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 200) {
            return { success: true, message: '测试消息发送成功！' };
        } else {
            return { success: false, message: `发送失败: ${data.message || '未知错误'}` };
        }
    } catch (error) {
        console.error('Failed to send test Bark notification:', error);
        return { success: false, message: `发送失败: ${error.message}` };
    }
}; 