'use client';

import { useState } from 'react';
import { IoStatsChart, IoClose, IoRefresh, IoPlay, IoStop, IoTrendingUp, IoTime } from 'react-icons/io5';
import { usePoolMonitorAPI } from '../../hooks/usePoolMonitorAPI';
import RightSidebarPoolList from './RightSidebarPoolList';

const RightSidebar = ({ settings = {}, isOpen, onToggle, onAddPool }) => {
    const [openSection, setOpenSection] = useState('monitor');
    const [sortBy, setSortBy] = useState('fees'); // 'fees' 或 'volume'

    // 使用API监控hook
    const {
        pools,
        isLoading,
        error,
        selectedTimeWindow,
        lastUpdate,
        connectionStatus,
        isActive,
        stats,
        timeWindowOptions,
        currentTimeWindowLabel,
        startMonitoring,
        stopMonitoring,
        refreshData,
        changeTimeWindow,
    } = usePoolMonitorAPI();

    // 处理侧边栏切换
    const handleToggle = () => {
        if (onToggle) {
            onToggle(!isOpen);
        }
    };

    // 处理连接/断开
    const handleConnectionToggle = () => {
        if (isActive) {
            stopMonitoring();
        } else {
            startMonitoring();
        }
    };

    // 处理排序方式切换
    const handleSortChange = (newSortBy) => {
        setSortBy(newSortBy);
    };

    // 根据排序方式对池子数据进行排序
    const getSortedPools = () => {
        if (!pools || pools.length === 0) return [];

        const sortedPools = [...pools];

        if (sortBy === 'volume') {
            // 按交易量降序排序
            sortedPools.sort((a, b) => {
                const volumeA = parseFloat(a.totalVolume) || 0;
                const volumeB = parseFloat(b.totalVolume) || 0;
                return volumeB - volumeA;
            });
        } else {
            // 按费用收入降序排序（默认）
            sortedPools.sort((a, b) => {
                const feesA = parseFloat(a.totalFees) || 0;
                const feesB = parseFloat(b.totalFees) || 0;
                return feesB - feesA;
            });
        }

        // 重新分配排名
        sortedPools.forEach((pool, index) => {
            pool.rank = index + 1;
        });

        return sortedPools;
    };

    // 格式化最后更新时间
    const formatLastUpdate = () => {
        if (!lastUpdate) return '从未更新';
        const now = new Date();
        const diff = now - lastUpdate;
        const seconds = Math.floor(diff / 1000);

        if (seconds < 60) return `${seconds}秒前`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}分钟前`;
        const hours = Math.floor(minutes / 60);
        return `${hours}小时前`;
    };

    // 格式化数字
    const formatNumber = (num, decimals = 2) => {
        if (num === null || num === undefined || isNaN(num)) return '--';
        if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
        return num.toFixed(decimals);
    };

    // 格式化USD金额
    const formatUSD = (amount) => {
        if (amount === null || amount === undefined || isNaN(amount)) return '--';
        return `$${formatNumber(amount)}`;
    };

    return (
        <div className={`hidden lg:block ${isOpen ? 'w-96' : 'w-0'} transition-[width] duration-300 ease-in-out relative overflow-hidden`}>
            {/* 收起/展开按钮 */}
            <button
                onClick={handleToggle}
                className={`fixed top-1/2 -translate-y-1/2 z-50 rounded-full p-1.5
                bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm
                border border-neutral-200/50 dark:border-neutral-700
                shadow-md hover:shadow-lg
                hover:bg-white/90 dark:hover:bg-neutral-800
                transition-all duration-300
                ${isOpen ? 'right-[20rem]' : 'right-2'}`}
                aria-label={isOpen ? "收起右侧栏" : "展开右侧栏"}
            >
                <svg
                    className={`w-6 h-6 text-neutral-600 dark:text-neutral-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* 主容器 */}
            <div className={`h-full bg-neutral-50 dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                {/* 简洁头部 */}
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <IoStatsChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                                    池子监控
                                </h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                    实时数据概览
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggle}
                            className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                            title="收起"
                        >
                            <IoClose className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                        </button>
                    </div>

                    {/* 状态控制栏 */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-neutral-400'}`}></div>
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                {isActive ? '监控中' : '已停止'}
                            </span>
                            {lastUpdate && (
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                    • {formatLastUpdate()}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={refreshData}
                                disabled={isLoading}
                                className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                                title="刷新数据"
                            >
                                <IoRefresh className={`w-4 h-4 text-neutral-600 dark:text-neutral-400 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={handleConnectionToggle}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                            >
                                {isActive ? '停止' : '开始'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 内容区域 */}
                <div className="h-[calc(100%-7rem)] overflow-y-auto custom-scrollbar">

                    {/* 时间窗口选择器 */}
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                <IoTime className="w-4 h-4" />
                                时间范围
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => changeTimeWindow(300)}
                                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${selectedTimeWindow === 300
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                                    }`}
                            >
                                5m
                            </button>
                            <button
                                onClick={() => changeTimeWindow(900)}
                                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${selectedTimeWindow === 900
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                                    }`}
                            >
                                15m
                            </button>
                            <button
                                onClick={() => changeTimeWindow(3600)}
                                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${selectedTimeWindow === 3600
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                                    }`}
                            >
                                1h
                            </button>
                            <button
                                onClick={() => changeTimeWindow(86400)}
                                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${selectedTimeWindow === 86400
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                                    }`}
                            >
                                24h
                            </button>
                        </div>
                    </div>

                    {/* 排序筛选器 */}
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                <IoTrendingUp className="w-4 h-4" />
                                排序方式
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleSortChange('fees')}
                                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${sortBy === 'fees'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                                    }`}
                            >
                                手续费收入
                            </button>
                            <button
                                onClick={() => handleSortChange('volume')}
                                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${sortBy === 'volume'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                                    }`}
                            >
                                交易量
                            </button>
                        </div>
                    </div>

                    {/* 池子列表 */}
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                <IoTrendingUp className="w-4 h-4" />
                                {sortBy === 'fees' ? '费用排行' : '交易量排行'}
                            </h3>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">
                                {(() => {
                                    switch (selectedTimeWindow) {
                                        case 300: return '5分钟';
                                        case 900: return '15分钟';
                                        case 3600: return '1小时';
                                        case 86400: return '24小时';
                                        default: return '未知';
                                    }
                                })()}
                            </span>
                        </div>

                        {/* 错误显示 */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <div className="text-sm text-red-600 dark:text-red-400">
                                    {error}
                                </div>
                            </div>
                        )}

                        {/* 池子列表 */}
                        <RightSidebarPoolList
                            pools={getSortedPools()}
                            isLoading={isLoading}
                            selectedTimeWindow={selectedTimeWindow}
                            currentTimeWindowLabel={currentTimeWindowLabel}
                            sortBy={sortBy}
                            onAddPool={onAddPool}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RightSidebar; 