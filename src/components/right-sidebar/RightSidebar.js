'use client';

import { useState, useEffect } from 'react';
import { IoStatsChart, IoClose, IoRefresh, IoPlay, IoStop, IoTrendingUp, IoTime } from 'react-icons/io5';
import { usePoolMonitorAPI } from '../../hooks/usePoolMonitorAPI';
import RightSidebarPoolList from './RightSidebarPoolList';
import PoolFilter from './PoolFilter';

const RightSidebar = ({ settings = {}, isOpen, onToggle, onAddPool, isLeftSidebarOpen = false }) => {
    const [openSection, setOpenSection] = useState('monitor');
    const [sortBy, setSortBy] = useState('fees'); // 'fees' 或 'volume'
    const [excludedPools, setExcludedPools] = useState(new Set()); // 被排除的池子地址集合
    const [filters, setFilters] = useState({
        minFees: '',
        maxFees: '',
        minVolume: '',
        maxVolume: '',
        minPoolValue: '',
        maxPoolValue: '',
        feeRates: [],
        protocols: [],
        tokens: [],
        hideZeroVolume: false,
        hideZeroFees: false
    });

    // 使用API监控hook
    const {
        pools,
        isLoading,
        error,
        lastUpdate,
        connectionStatus,
        isActive,
        stats,
        timeWindowOptions,
        currentTimeWindowLabel,
        selectedTimeWindow,
        startMonitoring,
        stopMonitoring,
        refreshData,
        changeTimeWindow,
    } = usePoolMonitorAPI();

    // 从本地存储加载排除的池子和筛选器设置
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // 加载排除的池子
            const savedExcludedPools = localStorage.getItem('rightSidebarExcludedPools');
            if (savedExcludedPools) {
                try {
                    const excludedArray = JSON.parse(savedExcludedPools);
                    setExcludedPools(new Set(excludedArray));
                } catch (error) {
                    console.error('加载排除池子数据失败:', error);
                }
            }
            
            // 加载筛选器设置
            const savedFilters = localStorage.getItem('rightSidebarFilters');
            if (savedFilters) {
                try {
                    const parsedFilters = JSON.parse(savedFilters);
                    setFilters(parsedFilters);
                } catch (error) {
                    console.error('加载筛选器设置失败:', error);
                }
            }
        }
    }, []);

    // 保存排除的池子到本地存储
    const saveExcludedPoolsToStorage = (excludedPoolsSet) => {
        if (typeof window !== 'undefined') {
            try {
                const excludedArray = Array.from(excludedPoolsSet);
                localStorage.setItem('rightSidebarExcludedPools', JSON.stringify(excludedArray));
            } catch (error) {
                console.error('保存排除池子数据失败:', error);
            }
        }
    };

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

    // 排除池子
    const handleExcludePool = (poolAddress) => {
        setExcludedPools(prev => {
            const newSet = new Set(prev);
            newSet.add(poolAddress);
            saveExcludedPoolsToStorage(newSet);
            return newSet;
        });
    };

    // 恢复池子
    const handleRestorePool = (poolAddress) => {
        setExcludedPools(prev => {
            const newSet = new Set(prev);
            newSet.delete(poolAddress);
            saveExcludedPoolsToStorage(newSet);
            return newSet;
        });
    };

    // 清空所有排除的池子
    const handleClearAllExcluded = () => {
        setExcludedPools(new Set());
        saveExcludedPoolsToStorage(new Set());
    };
    
    // 处理筛选器变化
    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        // 保存到本地存储
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('rightSidebarFilters', JSON.stringify(newFilters));
            } catch (error) {
                console.error('保存筛选器设置失败:', error);
            }
        }
    };
    
    // 应用筛选器
    const applyFilters = (poolList) => {
        if (!poolList || poolList.length === 0) return [];
        
        return poolList.filter(pool => {
            // 费用范围筛选
            if (filters.minFees && pool.totalFees < parseFloat(filters.minFees)) return false;
            if (filters.maxFees && pool.totalFees > parseFloat(filters.maxFees)) return false;
            
            // 交易量范围筛选
            if (filters.minVolume && pool.totalVolume < parseFloat(filters.minVolume)) return false;
            if (filters.maxVolume && pool.totalVolume > parseFloat(filters.maxVolume)) return false;
            
            // 池子价值范围筛选
            if (filters.minPoolValue && pool.currentPoolValue < parseFloat(filters.minPoolValue)) return false;
            if (filters.maxPoolValue && pool.currentPoolValue > parseFloat(filters.maxPoolValue)) return false;
            
            // 费率筛选
            if (filters.feeRates.length > 0 && !filters.feeRates.includes(pool.fee)) return false;
            
            // 协议筛选
            if (filters.protocols.length > 0 && !filters.protocols.includes(pool.factory)) return false;
            
            // 隐藏零交易量
            if (filters.hideZeroVolume && (!pool.totalVolume || pool.totalVolume === 0)) return false;
            
            // 隐藏零费用
            if (filters.hideZeroFees && (!pool.totalFees || pool.totalFees === 0)) return false;
            
            return true;
        });
    };

    // 根据排序方式对池子数据进行排序（排除被排除的池子并应用筛选器）
    const getSortedPools = () => {
        if (!pools || pools.length === 0) return [];

        // 过滤掉被排除的池子
        let filteredPools = pools.filter(pool => !excludedPools.has(pool.address));
        
        // 应用筛选器
        filteredPools = applyFilters(filteredPools);

        if (filteredPools.length === 0) return [];

        const sortedPools = [...filteredPools];

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


    return (
        <div className={`${isOpen ? 'w-full lg:w-96' : 'w-0'} transition-[width] duration-300 ease-in-out relative overflow-hidden`}>
            {/* 收起/展开按钮 */}
            <button
                onClick={handleToggle}
                className={`fixed top-1/2 -translate-y-1/2 z-10 rounded-full p-1.5
                bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm
                border border-neutral-200/50 dark:border-neutral-700
                shadow-md hover:shadow-lg
                hover:bg-white/90 dark:hover:bg-neutral-800
                transition-all duration-300
                ${isOpen ? 'right-[calc(100%-3.25rem)] lg:right-[23rem]' : 'right-2'}
                ${isLeftSidebarOpen ? 'lg:block hidden' : ''}`}
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
                                data-tooltip-id="my-tooltip"
                                data-tooltip-content="刷新数据"
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
                <div className="h-[calc(100%-7rem)] overflow-y-auto overflow-x-hidden custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>

                    {/* 筛选器组件 - 包含时间范围和排除池子功能 */}
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                        <PoolFilter
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            poolStats={stats}
                            excludedPools={excludedPools}
                            onExcludePool={handleExcludePool}
                            onRestorePool={handleRestorePool}
                            onClearAllExcluded={handleClearAllExcluded}
                            pools={pools}
                            selectedTimeWindow={selectedTimeWindow}
                            onTimeWindowChange={changeTimeWindow}
                        />
                    </div>

                    {/* 池子列表 */}
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3 pr-1">
                            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                <IoTrendingUp className="w-4 h-4" />
                                {sortBy === 'fees' ? '费用排行' : '交易量排行'}
                            </h3>
                            {/* 排序按钮 */}
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleSortChange('fees')}
                                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                        sortBy === 'fees'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                                        }`}
                                >
                                    费用
                                </button>
                                <button
                                    onClick={() => handleSortChange('volume')}
                                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                        sortBy === 'volume'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                                        }`}
                                >
                                    交易量
                                </button>
                            </div>
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
                        <div className="space-y-3">
                            <RightSidebarPoolList
                                pools={getSortedPools()}
                                isLoading={isLoading}
                                selectedTimeWindow={selectedTimeWindow}
                                currentTimeWindowLabel={currentTimeWindowLabel}
                                sortBy={sortBy}
                                onAddPool={onAddPool}
                                excludedPools={excludedPools}
                                onExcludePool={handleExcludePool}
                                onRestorePool={handleRestorePool}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RightSidebar; 