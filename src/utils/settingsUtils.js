// 获取默认滑点设置
export const getDefaultSlippage = () => {
    if (typeof window === 'undefined') return 1.0;
    
    try {
        const settings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
        return settings.defaultSlippage || 1.0;
    } catch (error) {
        console.error('Failed to get default slippage from settings:', error);
        return 1.0;
    }
};

// 获取所有设置
export const getAllSettings = () => {
    if (typeof window === 'undefined') return {};
    
    try {
        return JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
    } catch (error) {
        console.error('Failed to get settings:', error);
        return {};
    }
};

// 保存设置
export const saveSettings = (settings) => {
    if (typeof window === 'undefined') return;
    
    try {
        localStorage.setItem('poolMonitorSettings', JSON.stringify(settings));
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}; 