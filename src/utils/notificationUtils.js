// 存储最后一次通知时间
// const lastNotificationTime = new Map();  // <<< REMOVED

// --- Web Audio API Sound Generation ---
let audioContext;
let oscillator;
let gainNode;
let alarmInterval; // 用于存储3级警报的循环ID

const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
};

// 停止当前正在播放的声音
const stopNotificationSound = () => {
    // 停止循环警报
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
    // 停止单次音效
    if (oscillator) {
        try {
            oscillator.stop();
        } catch (e) {
            // 如果已经停止，则忽略错误
        }
        oscillator.disconnect();
        gainNode.disconnect();
        oscillator = null;
        gainNode = null;
    }
};

// 播放通知音效
const playNotificationSound = (level) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // 如果正在播放，先停止
    stopNotificationSound();

    // 恢复AudioContext
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    oscillator = ctx.createOscillator();
    gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime); // 设置音量

    switch (level) {
        case 1: // 普通: 短促的"滴"声
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.2);
            break;
        case 2: // 单次响铃: "滴-答"
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
            oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.4);
            break;
        case 3: // 持续响铃: 改为柔和的重复提示音
            stopNotificationSound(); // 确保清理掉之前的循环

            // 启动循环警报
            alarmInterval = setInterval(() => {
                const ctx = getAudioContext();
                if (!ctx || ctx.state === 'closed') {
                    stopNotificationSound();
                    return;
                }
                if (ctx.state === 'suspended') {
                    ctx.resume();
                }

                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g);
                g.connect(ctx.destination);

                o.type = 'sine'; // 使用更柔和的正弦波
                o.frequency.setValueAtTime(800, ctx.currentTime); // 降低频率
                g.gain.setValueAtTime(0, ctx.currentTime);

                // 短暂的淡入淡出，避免产生刺耳的"咔哒"声
                g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
                g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

                o.start();
                o.stop(ctx.currentTime + 0.4);
            }, 800); // 每 800毫秒 重复一次

            // 10秒后自动停止
            setTimeout(() => {
                stopNotificationSound();
            }, 10000); // 10秒

            break;
        default:
            stopNotificationSound(); // 无效等级则停止声音
            break;
    }
};

// 显示桌面通知
const showDesktopNotification = (title, content, level, uniqueId) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.log('This browser does not support desktop notification');
        return;
    }

    const doNotify = () => {
        // 使用 uniqueId 和时间戳确保每个通知都是唯一的，从而实现堆叠
        const notificationTag = `${uniqueId}-${Date.now()}`;
        new Notification(title, { body: content, tag: notificationTag });
        playNotificationSound(level);
    };

    if (Notification.permission === 'granted') {
        doNotify();
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                doNotify();
            }
        });
    }
};

// 发送Bark通知
export const sendBarkNotification = async (title, content, notificationConfig) => {
    const {
        barkKey,
        notificationLevel,
        enableBarkNotification,
        uniqueId,
        enableDesktopNotification
    } = notificationConfig;

    let notificationSent = false;

    // 1. 处理桌面通知
    if (enableDesktopNotification) {
        showDesktopNotification(title, content, notificationLevel, uniqueId);
        notificationSent = true; // 认为桌面通知已发出
    }

    // 2. 处理Bark推送通知
    if (enableBarkNotification && barkKey) {
        try {
            let url = `https://api.day.app/${barkKey}/${encodeURIComponent(title)}\n/${encodeURIComponent(content)}`;
            switch (parseInt(notificationLevel, 10)) {
                case 2: url += '?sound=minuet'; break;
                case 3: url += '?call=1'; break;
                default: break;
            }
            const response = await fetch(url);
            const data = await response.json();
            if (data.code === 200) {
                console.log(`✅ Bark notification sent successfully for ${uniqueId}.`);
                notificationSent = true;
            } else {
                console.error(`❌ Bark notification failed for ${uniqueId}:`, data.message);
            }
        } catch (error) {
            console.error('Failed to send Bark notification:', error);
        }
    }

    return notificationSent;
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
        notificationInterval: settings.notificationInterval || 1, // 读取间隔设置，默认为1分钟
        enableBarkNotification: settings.enableBarkNotification !== false, // 默认为true
        enableDesktopNotification: settings.enableDesktopNotification || false,
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