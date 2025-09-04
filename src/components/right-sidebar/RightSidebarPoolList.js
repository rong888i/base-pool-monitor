import React from 'react';
import { motion } from 'framer-motion';
import { FaExternalLinkAlt, FaTrophy } from 'react-icons/fa';

const RightSidebarPoolList = ({ pools, isLoading, selectedTimeWindow, currentTimeWindowLabel, sortBy = 'fees', onAddPool, excludedPools = new Set(), onExcludePool, onRestorePool }) => {
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

    // 获取排名徽章颜色
    const getRankBadgeColor = (rank) => {
        if (rank === 1) return 'bg-yellow-500 text-white';
        if (rank === 2) return 'bg-neutral-400 text-white';
        if (rank === 3) return 'bg-orange-500 text-white';
        return 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300';
    };

    // 获取工厂徽章颜色
    const getFactoryBadgeColor = (factory) => {
        switch (factory) {
            case 'PancakeswapV3':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'UniswapV3':
                return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
            default:
                return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-300';
        }
    };

    // 获取主要指标值（根据排序方式）
    const getMainMetric = (pool) => {
        if (sortBy === 'volume') {
            return {
                value: formatUSD(pool.totalVolume),
                color: 'text-blue-600 dark:text-blue-400',
                label: '交易量'
            };
        }
        return {
            value: formatUSD(pool.totalFees),
            color: 'text-green-600 dark:text-green-400',
            label: '费用收入'
        };
    };

    // 获取次要指标值（根据排序方式）
    const getSecondaryMetric = (pool) => {
        if (sortBy === 'volume') {
            return {
                value: formatUSD(pool.totalFees),
                color: 'text-green-600 dark:text-green-400',
                label: '费用收入'
            };
        }
        return {
            value: formatUSD(pool.totalVolume),
            color: 'text-blue-600 dark:text-blue-400',
            label: '交易量'
        };
    };

    if (isLoading && !pools.length) {
        return (
            <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                    <div key={index} className="animate-pulse">
                        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                                <div className="h-4 bg-neutral-300 dark:bg-neutral-600 rounded w-20"></div>
                                <div className="h-4 bg-neutral-300 dark:bg-neutral-600 rounded w-16"></div>
                            </div>
                            <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!pools.length) {
        return (
            <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
                    <FaTrophy className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    暂无池子数据
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2 pb-4">
            {pools.slice(0, 20).map((pool, index) => {
                const mainMetric = getMainMetric(pool);
                const secondaryMetric = getSecondaryMetric(pool);
                return (
                    <motion.div
                        key={pool.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer p-3 ${pool.totalFees > 50 ? 'high-fee-breathing' : ''
                            }`}
                        onClick={() => window.open(`https://basescan.org/address/${pool.address}`, '_blank')}
                    >
                        {/* 排名和基本信息 */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${getRankBadgeColor(pool.rank)}`}>
                                    {pool.rank <= 3 ? <FaTrophy className="w-2.5 h-2.5" /> : pool.rank}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                        {pool.displayName}
                                    </div>
                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                        {pool.fee}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-sm font-bold ${mainMetric.color}`}>
                                    {mainMetric.value}
                                </div>
                            </div>
                        </div>

                        {/* 次要指标和池子价值 */}
                        <div className="flex justify-between items-center mb-2 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-neutral-500 dark:text-neutral-400">{secondaryMetric.label}:</span>
                                <span className={`font-medium ${secondaryMetric.color}`}>
                                    {secondaryMetric.value}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-neutral-500 dark:text-neutral-400">池子价值:</span>
                                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                    {formatUSD(pool.currentPoolValue)}
                                </span>
                            </div>
                        </div>

                        {/* 协议和费用信息 */}
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded ${getFactoryBadgeColor(pool.factory)}`} data-tooltip-id="my-tooltip" data-tooltip-content={pool.factory}>
                                {pool.factory === 'PancakeswapV3' ? 'PanCake V3' :
                                    pool.factory === 'UniswapV3' ? 'Uni V3' :
                                        pool.factory}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                                <button
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all duration-200 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onExcludePool) {
                                            onExcludePool(pool.address);
                                        }
                                    }}
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content="排除此池子"
                                >
                                    <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <button
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all duration-200 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onAddPool) {
                                            onAddPool({
                                                address: pool.address,
                                                name: pool.displayName,
                                            });
                                        }
                                    }}
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content="添加到主页监控"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </button>
                                <button
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all duration-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`https://basescan.org/address/${pool.address}`, '_blank');
                                    }}
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content="在 BscScan 中查看"
                                >
                                    <FaExternalLinkAlt className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                );
            })}

            {/* 加载更多指示器 */}
            {isLoading && pools.length > 0 && (
                <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm text-neutral-600 dark:text-neutral-400">
                        <div className="animate-spin w-4 h-4 border-2 border-neutral-300 border-t-blue-500 rounded-full"></div>
                        刷新中...
                    </div>
                </div>
            )}

            {/* 查看更多提示 */}
            {pools.length > 20 && (
                <div className="text-center py-3">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        显示前 20 个池子
                    </div>
                </div>
            )}
        </div>
    );
};

export default RightSidebarPoolList; 