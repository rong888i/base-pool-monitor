'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotificationSettings } from '../../utils/notificationUtils';

const Section = ({ title, icon, children }) => (
    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-4">
        <div className="flex items-center space-x-2">
            {icon}
            <h4 className="font-semibold text-neutral-700 dark:text-neutral-200">{title}</h4>
        </div>
        <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-700/50">
            {children}
        </div>
    </div>
);

const MonitorSettings = ({ poolInfo, poolAddress, poolUniqueId, position, isVisible, onClose, popoverRef, currentSettings, onSettingsUpdate }) => {
    const [settings, setSettings] = useState({
        // Token数量监控
        enableTokenMonitor: false,
        tokenType: 'token0', // 'token0' 或 'token1'
        tokenDirection: 'below', // 'below' 或 'above'
        tokenThreshold: 0,

        // 价格监控
        enablePriceMonitor: false,
        priceDirection: 'below', // 'below' 或 'above'
        priceThreshold: 0,
        priceType: 'token0PerToken1', // 'token0PerToken1' 或 'token1PerToken0'

        // 通知间隔
        notificationInterval: 5, // 分钟

        // NFT超出区间监控
        enableNftOutOfRangeMonitor: false,
        outOfRangeThreshold: 3, // 连续多少次超出区间后提醒

        // 最后通知时间记录
        lastLiquidityNotification: null,
        lastPriceNotification: null,

        ...currentSettings
    });

    const [isClosing, setIsClosing] = useState(false);
    const [globalNotificationInterval, setGlobalNotificationInterval] = useState(1);

    useEffect(() => {
        // 加载全局设置，以获取默认通知间隔
        const globalSettings = getNotificationSettings();
        setGlobalNotificationInterval(globalSettings.notificationInterval);

        // 加载当前池子的独立设置
        const poolIdentifier = poolUniqueId || poolAddress;
        if (poolIdentifier) {
            const allSettings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
            const currentPoolSettings = allSettings.pools?.[poolIdentifier] || {};
            setSettings(prev => ({
                ...prev,
                ...currentPoolSettings
            }));
        }
    }, [poolAddress, poolUniqueId]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300); // 延迟关闭以播放动画
    };

    const handleSave = () => {
        // 保存设置到本地存储，确保不覆盖全局设置
        const poolIdentifier = poolUniqueId || poolAddress;
        const allSettings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');

        // 确保有pools对象来存储池子特定的设置
        if (!allSettings.pools) {
            allSettings.pools = {};
        }

        // 只保存池子特定的监控设置
        allSettings.pools[poolIdentifier] = settings;

        localStorage.setItem('poolMonitorSettings', JSON.stringify(allSettings));

        // 派发一个全局事件，通知其他组件设置已更新
        const event = new CustomEvent('monitorSettingsUpdated', {
            detail: { poolAddress: poolIdentifier }
        });
        window.dispatchEvent(event);

        // 回调通知父组件
        onSettingsUpdate?.(poolIdentifier, settings);

        handleClose();
    };

    const handleReset = () => {
        const defaultSettings = {
            enableTokenMonitor: false,
            tokenType: 'token0',
            tokenDirection: 'below',
            tokenThreshold: 0,
            enablePriceMonitor: false,
            priceDirection: 'below',
            priceThreshold: 0,
            priceType: 'token0PerToken1',
            notificationInterval: 5,
            enableNftOutOfRangeMonitor: false,
            outOfRangeThreshold: 3,
            lastTokenNotification: null,
            lastPriceNotification: null,
        };
        setSettings(defaultSettings);
    };

    const handleTestMonitor = async () => {
        console.log('🧪 测试监控功能...');

        // 导入监控检查函数
        const { executeMonitorChecks } = await import('../../utils/monitorUtils');

        // 构造测试用的池子数据
        const testPool = {
            address: poolAddress,
            uniqueId: poolUniqueId,
            lpInfo: poolInfo,
            nftInfo: null // 可以根据需要添加
        };

        // 执行监控检查（测试模式）
        await executeMonitorChecks(testPool, 0, true);

        alert('监控测试完成，请查看浏览器控制台（F12）的详细日志信息');
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
        exit: { opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && !isClosing && (
                <motion.div
                    ref={popoverRef}
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={backdropVariants}
                    onClick={handleClose}
                >
                    <motion.div className="absolute inset-0 bg-black/30" />
                    <motion.div
                        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-96 max-h-[80vh] flex flex-col"
                        variants={modalVariants}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            top: position.top,
                            left: position.left,
                        }}
                    >
                        {/* 头部 */}
                        <div className="p-4 flex-shrink-0 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                                        监控参数设置
                                    </h3>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                        {poolInfo.token0.symbol} / {poolInfo.token1.symbol}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors rounded-full p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* 内容 */}
                        <div className="p-5 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                            {/* Token数量监控 */}
                            <Section
                                title="Token数量监控"
                                icon={<svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}
                            >
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">启用监控</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.enableTokenMonitor}
                                            onChange={(e) => setSettings(prev => ({ ...prev, enableTokenMonitor: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {settings.enableTokenMonitor && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">监控Token</label>
                                            <select
                                                value={settings.tokenType}
                                                onChange={(e) => setSettings(prev => ({ ...prev, tokenType: e.target.value }))}
                                                className="input-field"
                                            >
                                                <option value="token0">{poolInfo.token0.symbol}</option>
                                                <option value="token1">{poolInfo.token1.symbol}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">报警条件</label>
                                            <div className="flex items-center space-x-2">
                                                <select
                                                    value={settings.tokenDirection}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, tokenDirection: e.target.value }))}
                                                    className="input-field w-28"
                                                >
                                                    <option value="below">低于</option>
                                                    <option value="above">高于</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={settings.tokenThreshold}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, tokenThreshold: parseFloat(e.target.value) || 0 }))}
                                                    className="input-field"
                                                    placeholder="数量阈值"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 !mt-2">
                                            当前{settings.tokenType === 'token0' ? poolInfo.token0.symbol : poolInfo.token1.symbol}数量: {
                                                settings.tokenType === 'token0'
                                                    ? (Number(poolInfo.token0.rawBalance) / Math.pow(10, poolInfo.token0.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })
                                                    : (Number(poolInfo.token1.rawBalance) / Math.pow(10, poolInfo.token1.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })
                                            }
                                        </p>
                                    </div>
                                )}
                            </Section>

                            {/* 价格监控 */}
                            <Section
                                title="价格监控"
                                icon={<svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
                            >
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">启用监控</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.enablePriceMonitor}
                                            onChange={(e) => setSettings(prev => ({ ...prev, enablePriceMonitor: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                {settings.enablePriceMonitor && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">价格类型</label>
                                            <select
                                                value={settings.priceType}
                                                onChange={(e) => setSettings(prev => ({ ...prev, priceType: e.target.value }))}
                                                className="input-field"
                                            >
                                                <option value="token0PerToken1">{poolInfo.token0.symbol} / {poolInfo.token1.symbol}</option>
                                                <option value="token1PerToken0">{poolInfo.token1.symbol} / {poolInfo.token0.symbol}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">报警条件</label>
                                            <div className="flex items-center space-x-2">
                                                <select
                                                    value={settings.priceDirection}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, priceDirection: e.target.value }))}
                                                    className="input-field w-28"
                                                >
                                                    <option value="below">低于</option>
                                                    <option value="above">高于</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={settings.priceThreshold}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, priceThreshold: parseFloat(e.target.value) || 0 }))}
                                                    className="input-field"
                                                    placeholder="价格阈值"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 !mt-2">
                                            当前价格: {
                                                settings.priceType === 'token0PerToken1'
                                                    ? `1 ${poolInfo.token1.symbol} = ${(1 / poolInfo.price.token1PerToken0).toLocaleString(undefined, { maximumSignificantDigits: 6 })} ${poolInfo.token0.symbol}`
                                                    : `1 ${poolInfo.token0.symbol} = ${(poolInfo.price.token1PerToken0).toLocaleString(undefined, { maximumSignificantDigits: 6 })} ${poolInfo.token1.symbol}`
                                            }
                                        </p>
                                    </div>
                                )}
                            </Section>

                            {/* 通知与高级设置 */}
                            <Section
                                title="通知与高级设置"
                                icon={<svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
                            >
                                {/* NFT超出范围监控 */}
                                <div className="space-y-3">
                                    <h5 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">NFT 仓位监控</h5>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">启用超出范围监控</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.enableNftOutOfRangeMonitor}
                                                onChange={(e) => setSettings(prev => ({ ...prev, enableNftOutOfRangeMonitor: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>
                                    {settings.enableNftOutOfRangeMonitor && (
                                        <div>
                                            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">提醒阈值 (连续超出)</label>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="1"
                                                    value={settings.outOfRangeThreshold}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, outOfRangeThreshold: parseInt(e.target.value, 10) || 1 }))}
                                                    className="input-field w-20 text-center"
                                                />
                                                <span className="text-sm text-neutral-600 dark:text-neutral-400">次后发送通知</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700/50 space-y-3">
                                    <h5 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">全局通知设置</h5>
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">通用通知间隔</label>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="number"
                                                min="1"
                                                className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-neutral-700 dark:border-neutral-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={settings.notificationInterval}
                                                onChange={(e) => setSettings({ ...settings, notificationInterval: e.target.value })}
                                                placeholder={`默认 (全局: ${globalNotificationInterval} 分钟)`}
                                            />
                                        </div>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                                            同一类型的报警（如价格、流动性）在设定时间内将只通知一次，以避免打扰。
                                        </p>
                                    </div>
                                </div>
                            </Section>
                        </div>

                        {/* 底部 */}
                        <div className="border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                            <div className="flex justify-between items-center p-4">
                                <div className="flex items-center gap-2">
                                    <button onClick={handleTestMonitor} className="btn-secondary">
                                        测试
                                    </button>
                                    <button onClick={handleReset} className="btn-tertiary">
                                        重置
                                    </button>
                                </div>
                                <button
                                    onClick={handleSave}
                                    className="btn-primary"
                                >
                                    保存设置
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MonitorSettings; 