import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { formatVolume, formatAddress } from '../utils/volumeMonitorUtils';
import { logger } from '../utils/logger';

const PoolList = ({ pools, selectedTimeWindow, onTimeWindowChange, stats, isCompact = false }) => {
    const [copiedStates, setCopiedStates] = useState({});

    // 复制地址到剪贴板
    const copyToClipboard = async (text, poolAddress, type) => {
        try {
            await navigator.clipboard.writeText(text);
            // 为特定池子的特定类型设置复制状态
            setCopiedStates(prev => ({
                ...prev,
                [`${poolAddress}_${type}`]: true
            }));
            // 2秒后清除该复制状态
            setTimeout(() => {
                setCopiedStates(prev => ({
                    ...prev,
                    [`${poolAddress}_${type}`]: false
                }));
            }, 2000);
        } catch (err) {
            logger.error('复制失败:', err);
        }
    };

    if (!pools || pools.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-lg font-medium mb-2">暂无数据</div>
                <div className="text-sm">连接后开始监控交易量</div>
            </div>
        );
    }

    const formatUSDVolume = (volume) => {
        if (volume === 0) return '$0';

        const num = parseFloat(volume);
        if (num >= 1e9) {
            return `$${(num / 1e9).toFixed(2)}B`;
        } else if (num >= 1e6) {
            return `$${(num / 1e6).toFixed(2)}M`;
        } else if (num >= 1e3) {
            return `$${(num / 1e3).toFixed(2)}K`;
        } else {
            return `$${num.toFixed(2)}`;
        }
    };

    const getProtocolColor = (protocol) => {
        switch (protocol) {
            case 'PancakeSwap V3':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
            case 'Uniswap V3':
                return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300 border-pink-200 dark:border-pink-700';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-700';
        }
    };

    const getFeeColor = (fee) => {
        switch (fee) {
            case '0.01%':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-700';
            case '0.05%':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-700';
            case '0.3%':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-700';
            case '1%':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-700';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-700';
        }
    };

    const getCommonTokenColor = (commonTokenType) => {
        switch (commonTokenType) {
            case 'WBNB':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-700';
            case 'USDT':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-700';
            case 'USDC':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-700';
            case 'BUSD':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-700';
        }
    };

    return (
        <div className="space-y-1.5">
            {pools.map((pool, index) => (
                <motion.div
                    key={pool.address}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2 hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
                >
                    {/* 排名和基本信息 */}
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-500 text-white' :
                                index === 1 ? 'bg-gray-400 text-white' :
                                    index === 2 ? 'bg-orange-500 text-white' :
                                        'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}>
                                {index + 1}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {pool.displayName || formatAddress(pool.address)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    更新: {new Date(pool.lastUpdate).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-base font-bold text-gray-800 dark:text-gray-200">
                                {formatUSDVolume(selectedTimeWindow === '5m' ? pool.volume5m : pool.volume15m)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {selectedTimeWindow === '5m' ? pool.swapCount5m : pool.swapCount15m} 笔
                            </div>
                        </div>
                    </div>

                    {/* 协议、费用和常用代币信息 */}
                    <div className="flex items-center space-x-1.5 flex-wrap gap-1 mb-1.5">
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getProtocolColor(pool.protocol)}`}>
                            {pool.protocol}
                        </span>
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getFeeColor(pool.fee)}`}>
                            {pool.fee}
                        </span>
                        {pool.commonTokenType && (
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getCommonTokenColor(pool.commonTokenType)}`}>
                                {pool.commonTokenType}
                            </span>
                        )}
                    </div>

                    {/* 代币地址信息 */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        {/* 池子地址 */}
                        <div className="flex items-center justify-between">
                            <span className="font-medium">池:</span>
                            <div className="flex items-center space-x-1">
                                <span className="font-mono cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    onClick={() => window.open(`https://bscscan.com/address/${pool.address}`, '_blank')}
                                    title="点击查看区块链信息">
                                    {formatAddress(pool.address)}
                                </span>
                                <button
                                    onClick={() => copyToClipboard(pool.address, pool.address, 'poolAddress')}
                                    className={`p-0.5 rounded transition-colors ${copiedStates[`${pool.address}_poolAddress`]
                                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    title={copiedStates[`${pool.address}_poolAddress`] ? '已复制!' : '复制地址'}
                                >
                                    {copiedStates[`${pool.address}_poolAddress`] ? (
                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Token0和Token1地址 */}
                        {pool.token0Info && pool.token1Info && (
                            <div className="space-y-1">
                                {/* Token0 */}
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{pool.token0Info.symbol}:</span>
                                    <div className="flex items-center space-x-1">
                                        <span className="font-mono cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                            onClick={() => window.open(`https://bscscan.com/address/${pool.token0}`, '_blank')}
                                            title="点击查看区块链信息">
                                            {formatAddress(pool.token0)}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(pool.token0, pool.address, 'token0Address')}
                                            className={`p-0.5 rounded transition-colors ${copiedStates[`${pool.address}_token0Address`]
                                                ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                            title={copiedStates[`${pool.address}_token0Address`] ? '已复制!' : '复制地址'}
                                        >
                                            {copiedStates[`${pool.address}_token0Address`] ? (
                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Token1 */}
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{pool.token1Info.symbol}:</span>
                                    <div className="flex items-center space-x-1">
                                        <span className="font-mono cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                            onClick={() => window.open(`https://bscscan.com/address/${pool.token1}`, '_blank')}
                                            title="点击查看区块链信息">
                                            {formatAddress(pool.token1)}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(pool.token1, pool.address, 'token1Address')}
                                            className={`p-0.5 rounded transition-colors ${copiedStates[`${pool.address}_token1Address`]
                                                ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                            title={copiedStates[`${pool.address}_token1Address`] ? '已复制!' : '复制地址'}
                                        >
                                            {copiedStates[`${pool.address}_token1Address`] ? (
                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default PoolList; 