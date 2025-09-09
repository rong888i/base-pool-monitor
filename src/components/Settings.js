import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { sendTestBarkNotification } from '../utils/notificationUtils';

const ThemeSwitcher = () => {
    const { theme, setTheme } = useTheme();

    const themes = [
        { name: '浅色', value: 'light' },
        { name: '深色', value: 'dark' },
        { name: '自动', value: 'system' },
    ];

    return (
        <div className="flex items-center space-x-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 p-1">
            {themes.map((t) => (
                <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`flex-1 text-center text-sm font-medium py-1.5 rounded-md transition-all duration-200 ${theme === t.value
                        ? 'bg-white dark:bg-neutral-800 shadow-sm text-blue-600 dark:text-blue-400'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-600/50'
                        }`}
                >
                    {t.name}
                </button>
            ))}
        </div>
    );
};

export default function Settings({ isOpen, onClose, onSettingsUpdate }) {
    const [settings, setSettings] = useState({
        barkKey: '',
        notificationThreshold: 3,
        autoRefresh: true,
        refreshInterval: 3,
        enableBarkNotification: true,
        notificationLevel: 1, // 1: 普通通知, 2: 单次响铃, 3: 持续响铃
        notificationInterval: 1, // 新增：通用通知间隔，单位分钟
        enableDesktopNotification: false, // 修改：是否启用桌面通知
        rpcUrl: 'https://base-mainnet.blastapi.io/fe9c30fc-3bc5-4064-91e2-6ab5887f8f4d', // 添加默认RPC URL
        defaultSlippage: 1.0, // 默认滑点设置

    });

    // 添加动画状态
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // 先设置可见，但保持初始动画状态
            setIsVisible(true);
            // 使用 setTimeout 确保 DOM 已更新
            setTimeout(() => {
                setIsAnimating(true);
            }, 50);
        } else {
            // 先执行关闭动画
            setIsAnimating(false);
            // 动画结束后再隐藏
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        const savedSettings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
        setSettings(prev => ({
            ...prev,
            ...savedSettings
        }));
    }, []);

    const handleSave = () => {
        localStorage.setItem('poolMonitorSettings', JSON.stringify(settings));
        onSettingsUpdate(settings);
        onClose();
    };

    const handleDesktopNotificationToggle = (e) => {
        const isEnabled = e.target.checked;

        // 更新状态
        setSettings(prev => ({ ...prev, enableDesktopNotification: isEnabled }));

        // 如果是开启，则检查并请求权限
        if (isEnabled && typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission !== 'granted') {
                Notification.requestPermission().then(permission => {
                    // 如果用户拒绝，则弹窗提示并把开关关掉
                    if (permission === 'denied') {
                        alert('您已阻止通知权限，如需使用请在浏览器设置中手动开启。');
                        setSettings(prev => ({ ...prev, enableDesktopNotification: false }));
                    }
                });
            }
        }
    };

    // 处理点击背景关闭
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleTestNotification = async () => {
        setIsTesting(true);
        const result = await sendTestBarkNotification(settings.barkKey, settings.notificationLevel);
        alert(result.message);
        setIsTesting(false);
    };

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] transition-all duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
                }`}
            onClick={handleBackdropClick}
        >
            <div
                className={`bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md shadow-2xl transform transition-all duration-300 ease-out ${isAnimating
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-8 scale-95'
                    }`}
            >
                {/* 标题栏 - 固定在顶部 */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                    <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">设置</h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 内容区域 - 可滚动 */}
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-8">
                        {/* 外观设置 */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">外观</h3>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-4 space-y-2">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                        主题模式
                                    </label>
                                    <ThemeSwitcher />
                                </div>
                            </div>
                        </div>
                        {/* RPC设置 */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">RPC设置</h3>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                        RPC URL
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.rpcUrl}
                                        onChange={(e) => setSettings(prev => ({ ...prev, rpcUrl: e.target.value }))}
                                        placeholder="输入RPC URL"
                                        className="w-full px-3 py-2 bg-white dark:bg-neutral-600 border border-neutral-200 dark:border-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                                    />
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        设置BASE网络的RPC节点地址，可以前往
                                        {' '}
                                        <a href="https://www.ankr.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline">
                                            Ankr
                                        </a>
                                        {' '}或{' '}
                                        <a href="https://www.quicknode.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline">
                                            QuickNode
                                        </a>
                                        {' '}申请免费BASE节点
                                    </p>
                                </div>


                            </div>
                        </div>

                        {/* 自动刷新设置 */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">自动刷新</h3>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-4 space-y-4">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            启用自动刷新
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.autoRefresh}
                                                onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-neutral-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        开启后会自动刷新池子信息
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                        刷新间隔（秒）
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={settings.refreshInterval}
                                        onChange={(e) => setSettings(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-neutral-600 border border-neutral-200 dark:border-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                                    />
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        设置自动刷新的时间间隔，最小 1 秒
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 交易设置 */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">交易设置</h3>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                        默认滑点 (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={settings.defaultSlippage}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                // 允许用户清空输入框
                                                if (value === '') {
                                                    setSettings(prev => ({ ...prev, defaultSlippage: '' }));
                                                    return;
                                                }
                                                // 确保是数字且在合理范围内
                                                const numValue = parseFloat(value);
                                                if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                                                    setSettings(prev => ({ ...prev, defaultSlippage: value }));
                                                }
                                            }}
                                            onBlur={(e) => {
                                                let value = parseFloat(e.target.value);
                                                if (isNaN(value) || value < 0) {
                                                    value = 1;
                                                } else if (value >= 100) {
                                                    value = 99;
                                                }
                                                // 格式化为一位小数
                                                setSettings(prev => ({ ...prev, defaultSlippage: value.toFixed(1) }));
                                            }}
                                            placeholder="例如 0.5"
                                            className="w-full px-3 py-2 bg-white dark:bg-neutral-600 border border-neutral-200 dark:border-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        设置一键添加流动性、快速移除流动性、快速增加流动性的默认滑点容限1-99。
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 通知设置 */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">通知设置</h3>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-4 space-y-4">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            启用 Bark 通知
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.enableBarkNotification}
                                                onChange={(e) => setSettings(prev => ({ ...prev, enableBarkNotification: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-neutral-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        开启后才会发送池子超区间提醒通知
                                    </p>
                                </div>

                                <div className="mt-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            桌面通知和音乐
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.enableDesktopNotification}
                                                onChange={handleDesktopNotificationToggle}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-neutral-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        在电脑端直接显示通知并播放声音提醒。
                                    </p>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Bark Key
                                        </label>
                                        <button
                                            onClick={handleTestNotification}
                                            disabled={isTesting || !settings.barkKey}
                                            className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isTesting ? '发送中...' : '(发送测试)'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={settings.barkKey}
                                        onChange={(e) => setSettings(prev => ({ ...prev, barkKey: e.target.value }))}
                                        placeholder="输入 Bark Key"
                                        className="w-full px-3 py-2 bg-white dark:bg-neutral-600 border border-neutral-200 dark:border-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                                    />
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        用于发送通知，在 IOS Bark App 中获取
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                        通知等级
                                    </label>
                                    <select
                                        value={settings.notificationLevel}
                                        onChange={(e) => setSettings(prev => ({ ...prev, notificationLevel: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-neutral-600 border border-neutral-200 dark:border-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                                    >
                                        <option value={1}>1级 - 普通通知</option>
                                        <option value={2}>2级 - 单次响铃</option>
                                        <option value={3}>3级 - 持续响铃</option>
                                    </select>
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        选择通知的提醒方式
                                    </p>
                                </div>

                                {/* <div className="mt-4">
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                        通用通知间隔 (分钟)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={settings.notificationInterval}
                                        onChange={(e) => setSettings(prev => ({ ...prev, notificationInterval: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-neutral-600 border border-neutral-200 dark:border-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                                        placeholder="默认为 1"
                                    />
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        同一类型的报警在设定时间内只通知一次。
                                    </p>
                                </div> */}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 底部按钮 - 固定在底部 */}
                <div className="p-6 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            保存
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 