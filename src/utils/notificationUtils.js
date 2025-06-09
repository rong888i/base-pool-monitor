// 存储最后一次通知时间
const lastNotificationTime = new Map();

// 发送Bark通知
export const sendBarkNotification = async (title, content, nftId) => {
    const { barkKey, notificationLevel } = getNotificationSettings();
    if (!barkKey) return false;

    // 检查冷却时间
    const now = Date.now();
    const lastTime = lastNotificationTime.get(nftId) || 0;
    if (now - lastTime < 300000) { // 300秒 = 300000毫秒
        console.log('Notification cooldown for NFT:', nftId);
        return false;
    }

    try {
        let url = `https://api.day.app/${barkKey}/${encodeURIComponent(title + "\n" + content)}`;

        // 根据通知等级添加不同的参数
        switch (notificationLevel) {
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
            // 更新最后通知时间
            lastNotificationTime.set(nftId, now);
            return true;
        }
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

// 获取通知设置
export const getNotificationSettings = () => {
    const settings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
    return {
        barkKey: settings.barkKey || '',
        notificationThreshold: settings.notificationThreshold || 3,
        notificationLevel: settings.notificationLevel || 1,
    };
}; 