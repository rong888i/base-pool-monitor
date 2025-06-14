'use client';

import React, { useState, useEffect } from 'react';

const TechnicalInfo = ({ lpInfo, outOfRangeCount, poolAddress, poolUniqueId }) => {
    const [monitorStatus, setMonitorStatus] = useState({
        token: false,
        price: false,
        nftOutOfRange: false,
    });

    useEffect(() => {
        const updateMonitorStatus = () => {
            const poolIdentifier = poolUniqueId || poolAddress;
            const allSettings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
            const settings = allSettings.pools?.[poolIdentifier] || {};

            setMonitorStatus({
                token: settings.enableTokenMonitor || false,
                price: settings.enablePriceMonitor || false,
                nftOutOfRange: settings.enableNftOutOfRangeMonitor || false,
            });
        };

        updateMonitorStatus();

        // 监听监控设置更新事件
        const handleMonitorSettingsUpdate = (event) => {
            const updatedPoolId = event.detail.poolAddress;
            const currentPoolId = poolUniqueId || poolAddress;
            if (updatedPoolId === currentPoolId) {
                updateMonitorStatus();
            }
        };

        window.addEventListener('monitorSettingsUpdated', handleMonitorSettingsUpdate);

        return () => {
            window.removeEventListener('monitorSettingsUpdated', handleMonitorSettingsUpdate);
        };
    }, [poolAddress, poolUniqueId]);

    const MonitorIndicator = ({ text, color, enabled }) => {
        if (!enabled) return null;
        const colorClasses = {
            blue: 'border-blue-400 text-blue-600 bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:bg-blue-900/50',
            green: 'border-green-400 text-green-600 bg-green-100 dark:border-green-600 dark:text-green-300 dark:bg-green-900/50',
            purple: 'border-purple-400 text-purple-600 bg-purple-100 dark:border-purple-600 dark:text-purple-300 dark:bg-purple-900/50',
        };
        return (
            <span className={`px-1.5 py-0.5 border rounded-md text-xs font-medium ${colorClasses[color]}`}>
                {text}
            </span>
        );
    };

    const hasActiveMonitors = monitorStatus.token || monitorStatus.price || monitorStatus.nftOutOfRange;

    return (
        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400">
                <span>Tick: <span className="font-medium text-neutral-700 dark:text-neutral-300">{lpInfo.tick}</span></span>

                {/* {outOfRangeCount > 0 && <span className="font-medium text-yellow-600 dark:text-yellow-400">已连续 {outOfRangeCount} 次超出范围</span>} */}
                {hasActiveMonitors && (
                    <div className="justify-center space-x-2">

                        <MonitorIndicator text="T" color="blue" enabled={monitorStatus.token} />
                        <MonitorIndicator text="P" color="green" enabled={monitorStatus.price} />
                        <MonitorIndicator text="N" color="purple" enabled={monitorStatus.nftOutOfRange} />
                    </div>
                )}
                <span>更新: <span className="font-medium text-neutral-700 dark:text-neutral-300">{lpInfo.lastUpdated}</span></span>
            </div>

        </div>
    );
};

// <span className="text-xs text-neutral-500 dark:text-neutral-400">监控:</span>
export default TechnicalInfo; 