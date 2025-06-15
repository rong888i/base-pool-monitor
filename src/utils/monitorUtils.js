import { sendBarkNotification, getNotificationSettings } from './notificationUtils';

// 防重复调用的时间记录
const lastExecutionTime = new Map();

// 检查是否应该发送通知（基于时间间隔）
const shouldSendNotification = (lastNotificationTime, intervalMinutes) => {
    if (!lastNotificationTime) return true;
    const now = Date.now();
    const intervalMs = intervalMinutes * 60 * 1000;
    return now - lastNotificationTime >= intervalMs;
};

// 检查是否应该执行监控（防重复调用）
const shouldExecuteMonitor = (poolAddress) => {
    const now = Date.now();
    const lastTime = lastExecutionTime.get(poolAddress) || 0;
    const timeDiff = now - lastTime;

    // 如果距离上次执行不到5秒，则跳过（防重复）
    if (timeDiff < 5000) {
        console.log(`⏸️ 监控检查防重复：距离上次执行仅${timeDiff}ms，跳过此次检查`);
        return false;
    }

    lastExecutionTime.set(poolAddress, now);
    return true;
};

// 检查Token数量监控
export const checkTokenMonitor = async (pool, combinedSettings, isTest = false, onNotificationSent) => {
    console.log('🔍 检查Token数量监控:', {
        poolAddress: pool.address.slice(0, 6) + '...' + pool.address.slice(-4),
        enableTokenMonitor: combinedSettings.enableTokenMonitor,
        hasLpInfo: !!pool.lpInfo
    });

    if (!combinedSettings.enableTokenMonitor || !pool.lpInfo) {
        console.log('❌ Token监控未启用或缺少LP信息');
        return { triggered: false };
    }

    // 获取token数量
    const token0Amount = Number(pool.lpInfo.token0.rawBalance) / Math.pow(10, pool.lpInfo.token0.decimals);
    const token1Amount = Number(pool.lpInfo.token1.rawBalance) / Math.pow(10, pool.lpInfo.token1.decimals);

    const currentAmount = combinedSettings.tokenType === 'token0' ? token0Amount : token1Amount;
    const tokenSymbol = combinedSettings.tokenType === 'token0' ? pool.lpInfo.token0.symbol : pool.lpInfo.token1.symbol;
    const threshold = combinedSettings.tokenThreshold;
    const direction = combinedSettings.tokenDirection;

    console.log('📊 Token监控详情:', {
        tokenSymbol,
        currentAmount: currentAmount.toFixed(6),
        direction,
        threshold,
        willTrigger: (direction === 'below' && currentAmount < threshold) || (direction === 'above' && currentAmount > threshold)
    });

    let triggered = false;
    if (direction === 'below' && currentAmount < threshold) {
        triggered = true;
    } else if (direction === 'above' && currentAmount > threshold) {
        triggered = true;
    }

    if (!triggered) {
        console.log('✅ Token监控条件未满足');
        return { triggered: false };
    }

    console.log('🚨 Token监控条件已触发!');

    // 检查通知间隔（测试模式跳过）
    const canSendNotification = isTest || shouldSendNotification(combinedSettings.lastTokenNotification, combinedSettings.notificationInterval);
    console.log('⏰ 通知间隔检查:', {
        lastNotification: combinedSettings.lastTokenNotification,
        intervalMinutes: combinedSettings.notificationInterval,
        canSend: canSendNotification,
        isTest
    });

    if (!canSendNotification) {
        console.log('⏸️ 通知间隔限制，暂不发送');
        return { triggered: true, notificationSent: false };
    }

    // 发送通知
    const { barkKey, enableBarkNotification, enableDesktopNotification } = combinedSettings;
    console.log('🔔 准备发送通知 (Token):', {
        hasBarkKey: !!barkKey,
        enableBarkNotification,
        enableDesktopNotification
    });

    if (enableDesktopNotification || (barkKey && enableBarkNotification)) {
        const title = isTest ? '🧪测试 - Token数量监控提醒' : 'Token数量监控提醒';
        const content = `池子 ${pool.lpInfo.token0.symbol}/${pool.lpInfo.token1.symbol} (${pool.address.slice(0, 6)}...${pool.address.slice(-4)}) ${tokenSymbol}数量 ${currentAmount.toLocaleString()} ${direction === 'below' ? '低于' : '高于'} 阈值 ${threshold.toLocaleString()}`;

        console.log('📤 正在发送通知:', { title, content, isTest });
        const result = await sendBarkNotification(title, content, {
            ...combinedSettings,
            uniqueId: `${pool.uniqueId || pool.address}-token`
        });
        console.log('📬 通知发送结果:', result);

        // 如果发送成功，则触发回调
        if (result && onNotificationSent) {
            onNotificationSent(pool.uniqueId, 'token');
        }

        // 更新最后通知时间（测试模式不更新）
        if (!isTest && result) {
            const poolIdentifier = pool.uniqueId || pool.address;
            const allSettings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
            if (allSettings.pools?.[poolIdentifier]) {
                allSettings.pools[poolIdentifier].lastTokenNotification = Date.now();
                localStorage.setItem('poolMonitorSettings', JSON.stringify(allSettings));
            }
        }

        return { triggered: true, notificationSent: result };
    } else {
        console.log('❌ 通知配置不完整，无法发送通知');
    }

    return { triggered: true, notificationSent: false };
};

// 检查价格监控
export const checkPriceMonitor = async (pool, combinedSettings, isTest = false, onNotificationSent) => {
    console.log('🔍 检查价格监控:', {
        enablePriceMonitor: combinedSettings.enablePriceMonitor,
        hasPrice: !!pool.lpInfo?.price
    });

    if (!combinedSettings.enablePriceMonitor || !pool.lpInfo?.price) {
        console.log('❌ 价格监控未启用或缺少价格信息');
        return { triggered: false };
    }

    const currentPrice = combinedSettings.priceType === 'token0PerToken1'
        ? pool.lpInfo.price.token0PerToken1
        : pool.lpInfo.price.token1PerToken0;

    if (typeof currentPrice !== 'number') {
        console.log('❌ 无法获取当前价格');
        return { triggered: false };
    }

    const threshold = combinedSettings.priceThreshold;
    const direction = combinedSettings.priceDirection;

    console.log('📊 价格监控详情:', {
        priceType: combinedSettings.priceType,
        currentPrice: currentPrice.toFixed(6),
        direction,
        threshold,
        willTrigger: (direction === 'below' && currentPrice < threshold) || (direction === 'above' && currentPrice > threshold)
    });

    let triggered = false;
    if (direction === 'below' && currentPrice < threshold) {
        triggered = true;
    } else if (direction === 'above' && currentPrice > threshold) {
        triggered = true;
    }

    if (!triggered) {
        console.log('✅ 价格监控条件未满足');
        return { triggered: false };
    }

    console.log('🚨 价格监控条件已触发!');

    // 检查通知间隔（测试模式跳过）
    if (!isTest && !shouldSendNotification(combinedSettings.lastPriceNotification, combinedSettings.notificationInterval)) {
        console.log('⏸️ 价格监控通知间隔限制，暂不发送');
        return { triggered: true, notificationSent: false };
    }

    // 发送通知
    const { barkKey, enableBarkNotification, enableDesktopNotification } = combinedSettings;
    console.log('🔔 准备发送通知 (Price):', {
        hasBarkKey: !!barkKey,
        enableBarkNotification,
        enableDesktopNotification
    });
    if (enableDesktopNotification || (barkKey && enableBarkNotification)) {
        const title = isTest ? '🧪测试 - 价格监控提醒' : '价格监控提醒';
        const priceTypeName = combinedSettings.priceType === 'token0PerToken1'
            ? `${pool.lpInfo.token0.symbol} / ${pool.lpInfo.token1.symbol}`
            : `${pool.lpInfo.token1.symbol} / ${pool.lpInfo.token0.symbol}`;
        const content = `池子 ${pool.lpInfo.token0.symbol}/${pool.lpInfo.token1.symbol} (${pool.address.slice(0, 6)}...${pool.address.slice(-4)}) ${priceTypeName} 价格 ${currentPrice.toFixed(6)} ${direction === 'below' ? '低于' : '高于'} 阈值 ${threshold}`;

        console.log('📤 正在发送价格监控通知:', { title, content, isTest });
        const result = await sendBarkNotification(title, content, {
            ...combinedSettings,
            uniqueId: `${pool.uniqueId || pool.address}-price`
        });

        // 如果发送成功，则触发回调
        if (result && onNotificationSent) {
            onNotificationSent(pool.uniqueId, 'price');
        }

        // 更新最后通知时间（测试模式不更新）
        if (!isTest && result) {
            const poolIdentifier = pool.uniqueId || pool.address;
            const allSettings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
            if (allSettings.pools?.[poolIdentifier]) {
                allSettings.pools[poolIdentifier].lastPriceNotification = Date.now();
                localStorage.setItem('poolMonitorSettings', JSON.stringify(allSettings));
            }
        }

        return { triggered: true, notificationSent: result };
    }

    return { triggered: true, notificationSent: false };
};

// 检查NFT超出区间监控（修改现有逻辑使其使用单独的设置）
export const checkNftOutOfRangeMonitor = async (pool, combinedSettings, currentOutOfRangeCount, onNotificationSent) => {
    if (!combinedSettings.enableNftOutOfRangeMonitor || !pool.nftInfo) {
        return { triggered: false };
    }

    const threshold = combinedSettings.outOfRangeThreshold || 3;

    if (currentOutOfRangeCount >= threshold) {
        // 对于NFT超出范围，我们使用一个特殊的冷却ID，因为它是由外部循环驱动的
        const canSend = shouldSendNotification(combinedSettings.lastNftNotification, combinedSettings.notificationInterval);
        if (!canSend) {
            console.log('⏸️ NFT超出范围通知间隔限制，暂不发送');
            return { triggered: true, notificationSent: false };
        }

        const { barkKey, enableBarkNotification, enableDesktopNotification } = combinedSettings;
        if (enableDesktopNotification || (barkKey && enableBarkNotification)) {
            const title = '池子价格超出区间提醒';
            const content = `池子 ${pool.lpInfo.token0.symbol}/${pool.lpInfo.token1.symbol} (${pool.address.slice(0, 6)}...${pool.address.slice(-4)}) 已连续 ${currentOutOfRangeCount} 次超出价格范围。`;
            const result = await sendBarkNotification(title, content, {
                ...combinedSettings,
                uniqueId: `${pool.uniqueId || pool.address}-nft`
            });

            // 如果发送成功，则触发回调
            if (result && onNotificationSent) {
                onNotificationSent(pool.uniqueId, 'nftOutOfRange');
            }

            if (result) {
                const poolIdentifier = pool.uniqueId || pool.address;
                const allSettings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
                if (allSettings.pools?.[poolIdentifier]) {
                    allSettings.pools[poolIdentifier].lastNftNotification = Date.now();
                    localStorage.setItem('poolMonitorSettings', JSON.stringify(allSettings));
                }
            }

            return { triggered: true, notificationSent: result };
        }
    }

    return { triggered: false };
};

// 执行所有监控检查
export const executeMonitorChecks = async (pool, outOfRangeCount, isTest = false, onNotificationSent) => {
    console.log('🔄 执行监控检查:', {
        poolAddress: pool.address.slice(0, 6) + '...' + pool.address.slice(-4),
        poolUniqueId: pool.uniqueId,
        outOfRangeCount,
        isTest
    });

    // 防重复调用检查（测试模式跳过）
    const poolIdentifier = pool.uniqueId || pool.address;
    if (!isTest && !shouldExecuteMonitor(poolIdentifier)) {
        return;
    }

    const allSettings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
    const globalSettings = getNotificationSettings();
    const poolSettings = allSettings.pools?.[poolIdentifier] || {};

    // 修正合并逻辑：只有当池子独立设置了间隔时才覆盖全局设置
    const combinedSettings = { ...globalSettings, ...poolSettings };
    if (poolSettings.notificationInterval === undefined || poolSettings.notificationInterval === null || poolSettings.notificationInterval === '') {
        combinedSettings.notificationInterval = globalSettings.notificationInterval;
    }

    console.log('⚙️ 池子合并后监控设置:', combinedSettings);

    if (!poolSettings && !isTest) {
        console.log('🤷‍♀️ 池子无独立设置，跳过检查');
        return;
    }

    // 如果是测试模式，确保所有监控都启用以进行测试
    if (isTest) {
        combinedSettings.enableTokenMonitor = true;
        combinedSettings.enablePriceMonitor = true;
        combinedSettings.enableNftOutOfRangeMonitor = true;
        console.log('🧪 测试模式：已强制启用所有监控');
    }

    await checkTokenMonitor(pool, combinedSettings, isTest, onNotificationSent);
    await checkPriceMonitor(pool, combinedSettings, isTest, onNotificationSent);
    await checkNftOutOfRangeMonitor(pool, combinedSettings, outOfRangeCount, onNotificationSent);
}; 