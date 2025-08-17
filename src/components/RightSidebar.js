'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoStatsChart, IoClose, IoExpand, IoContract, IoRefresh } from 'react-icons/io5';
import { useVolumeMonitor } from '../hooks/useVolumeMonitor';
import PoolList from './PoolList';
import { logger } from '../utils/logger';

const RightSidebar = ({ settings = {} }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [openSection, setOpenSection] = useState('monitor'); // 'monitor' or 'stats'
    const [excludeLowFeePools, setExcludeLowFeePools] = useState(true); // 新增：是否排除0.01%池子

    // 使用交易量监控hook，传递设置参数
    const {
        pools,
        isConnected,
        connectionStatus,
        selectedTimeWindow,
        stats,
        connectWebSocket,
        disconnectWebSocket,
        refreshData,
        changeTimeWindow
    } = useVolumeMonitor(settings);

    // 处理侧边栏切换
    const handleToggle = () => {
        setIsCollapsed(!isCollapsed);
    };

    // 处理连接/断开
    const handleConnectionToggle = () => {
        if (isConnected) {
            disconnectWebSocket();
        } else {
            connectWebSocket();
        }
    };

    // 过滤池子，排除0.01%的池子
    // 注意：现在在数据源头(useVolumeMonitor)已经过滤了0.01%池子
    // 这里的过滤主要用于UI显示和用户控制
    const filteredPools = pools.filter(pool => {
        if (!excludeLowFeePools) return true; // 如果关闭过滤，显示所有池子

        // 排除fee为'0.01%'的池子（注意：fee字段是格式化后的字符串）
        if (pool.fee === '0.01%') {
            return false;
        }
        return true;
    });

    // 调试信息：显示池子数量和过滤状态
    logger.debug('池子监控调试信息:', {
        totalPools: pools.length,
        filteredPools: filteredPools.length,
        excludeLowFeePools,
        poolsWithFees: pools.map(p => ({
            address: p.address,
            fee: p.fee,
            volume5m: p.volume5m,
            volume15m: p.volume15m,
            displayName: p.displayName
        })),
        filteredPoolsWithFees: filteredPools.map(p => ({
            address: p.address,
            fee: p.fee,
            volume5m: p.volume5m,
            volume15m: p.volume15m,
            displayName: p.displayName
        }))
    });

    return (
        <div className={`fixed right-0 top-0 h-full z-40 transition-[width] duration-300 ease-in-out ${isCollapsed ? 'w-0' : 'w-96'}`}>
            {/* 收起/展开按钮 */}
            <button
                onClick={handleToggle}
                className={`fixed top-1/2 -translate-y-1/2 z-50 rounded-full p-1.5
                bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm
                border border-neutral-200/50 dark:border-neutral-700
                shadow-md hover:shadow-lg
                hover:bg-white/90 dark:hover:bg-neutral-800
                transition-all duration-300
                ${isCollapsed
                        ? 'right-2'
                        : 'sm:right-[23rem] right-[calc(100%-3.25rem)]'
                    }`}
                aria-label={isCollapsed ? "展开右侧栏" : "收起右侧栏"}
            >
                <svg
                    className={`w-6 h-6 text-neutral-600 dark:text-neutral-300 transition-transform duration-300 ${!isCollapsed ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* 内容区域 */}
            <div className={`h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {/* 头部 */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-lg">
                            <IoStatsChart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">BSC LP 监控</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">实时交易量数据</p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggle}
                        className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        title="收起"
                    >
                        <IoClose className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    </button>
                </div>

                {/* 内容区域 - 修复滚动问题，使用正确的布局方式 */}
                <div className="h-[calc(100%-5rem)] overflow-y-auto custom-scrollbar">
                    {/* 连接状态和操作 */}
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                    {connectionStatus}
                                </span>
                            </div>
                            <button
                                onClick={handleConnectionToggle}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isConnected
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                            >
                                {isConnected ? '断开连接' : '连接 WSS'}
                            </button>
                        </div>

                        {/* 快速统计 */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-2">
                                <div className="text-xs text-blue-600 dark:text-blue-400 mb-0.5">监控池子</div>
                                <div className="text-base font-bold text-blue-800 dark:text-blue-200">{stats?.commonTokenPools || 0}</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 p-2">
                                <div className="text-xs text-green-600 dark:text-green-400 mb-0.5">总交易量</div>
                                <div className="text-base font-bold text-green-800 dark:text-green-200">
                                    {stats?.totalVolume ? `$${(stats.totalVolume / 1000).toFixed(1)}K` : '--'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 可折叠区域 */}
                    <div className="border-b border-neutral-200 dark:border-neutral-800">
                        <button
                            onClick={() => setOpenSection(openSection === 'monitor' ? null : 'monitor')}
                            className="w-full p-4 text-left transition-colors duration-200 group hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                                        <IoStatsChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">池子监控</h3>
                                </div>
                                <svg
                                    className={`w-5 h-5 text-neutral-400 dark:text-neutral-500 transform transition-transform duration-300 ${openSection === 'monitor' ? 'rotate-180' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </button>
                        <div
                            className={`grid overflow-hidden transition-all duration-500 ease-in-out ${openSection === 'monitor' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                        >
                            <div className="overflow-hidden">
                                <div className="p-4">
                                    {/* 时间窗口选择器和过滤选项 */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">交易量排名</h4>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => changeTimeWindow('5m')}
                                                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${selectedTimeWindow === '5m'
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                                                    }`}
                                            >
                                                5分钟
                                            </button>
                                            <button
                                                onClick={() => changeTimeWindow('15m')}
                                                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${selectedTimeWindow === '15m'
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                                                    }`}
                                            >
                                                15分钟
                                            </button>
                                        </div>
                                    </div>

                                    {/* 池子列表 - 使用过滤后的池子数据 */}
                                    <div className="space-y-3">
                                        <PoolList
                                            pools={filteredPools}
                                            selectedTimeWindow={selectedTimeWindow}
                                            onTimeWindowChange={changeTimeWindow}
                                            stats={stats}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 底部留白，确保内容不会贴边 */}
                    <div className="h-4"></div>
                </div>
            </div>
        </div>
    );
};

export default RightSidebar;