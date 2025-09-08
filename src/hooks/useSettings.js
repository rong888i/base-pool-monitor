import { useState, useEffect } from 'react';

export function useSettings() {
    const [settings, setSettings] = useState({
        autoRefresh: true,
        refreshInterval: 3,
        defaultSlippage: 1.0,
        rpcUrl: 'https://base-mainnet.blastapi.io/fe9c30fc-3bc5-4064-91e2-6ab5887f8f4d',

    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedSettings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
                setSettings(prev => ({ ...prev, ...savedSettings }));
            } catch (e) {
                console.error('Failed to parse settings from localStorage', e);
            }
        }
    }, []);

    const handleSettingsUpdate = (newSettings) => {
        if (typeof window !== 'undefined') {
            // 保留函数式更新，以防 newSettings 是基于旧状态计算的
            setSettings(currentSettings => {
                const updatedSettings = { ...currentSettings, ...newSettings };
                localStorage.setItem('poolMonitorSettings', JSON.stringify(updatedSettings));
                console.info('Settings updated:', updatedSettings);
                return updatedSettings;
            });
        }
    };

    return {
        settings,
        isSettingsOpen,
        setIsSettingsOpen,
        onSettingsUpdate: handleSettingsUpdate, // 重命名为 onSettingsUpdate 以匹配 Settings 组件的 prop
    };
} 