'use client';

import React, { useState, useEffect } from 'react';
import MonitorIndicator from './MonitorIndicator';

const TechnicalInfo = ({
    pool: { lpInfo, address, uniqueId },
    isFlashing,
    onCalculatorClick,
    onLiquidityAdderClick,
    onMonitorSettingsClick,
    calculatorIconRef,
    liquidityAdderIconRef,
    monitorSettingsIconRef
}) => {
    const [monitorStatus, setMonitorStatus] = useState({
        token: false,
        price: false,
        nftOutOfRange: false,
    });

    useEffect(() => {
        const updateMonitorStatus = () => {
            const poolIdentifier = uniqueId || address;
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
            const currentPoolId = uniqueId || address;
            if (updatedPoolId === currentPoolId) {
                updateMonitorStatus();
            }
        };

        window.addEventListener('monitorSettingsUpdated', handleMonitorSettingsUpdate);

        return () => {
            window.removeEventListener('monitorSettingsUpdated', handleMonitorSettingsUpdate);
        };
    }, [address, uniqueId]);

    const hasActiveMonitors = monitorStatus.token || monitorStatus.price || monitorStatus.nftOutOfRange;

    return (
        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400">
                <span>Tick: <span className="font-medium text-neutral-700 dark:text-neutral-300">{lpInfo.tick}</span></span>

                {/* 中间 */}
                <div className="items-center">
                    {hasActiveMonitors && (
                        <>
                            <MonitorIndicator text="T" color="blue" enabled={monitorStatus.token} isFlashing={isFlashing?.token} />
                            <MonitorIndicator text="P" color="green" enabled={monitorStatus.price} isFlashing={isFlashing?.price} />
                            <MonitorIndicator text="N" color="purple" enabled={monitorStatus.nftOutOfRange} isFlashing={isFlashing?.nftOutOfRange} />
                        </>
                    )}

                </div>

                <span>更新: <span className="font-medium text-neutral-700 dark:text-neutral-300">{lpInfo.lastUpdated}</span></span>
            </div>
        </div>
    );
};

export default TechnicalInfo; 