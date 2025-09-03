'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const PoolCardHeader = ({
    pool,
    attributes,
    listeners,
    getStatusIcon,
    onRemove,
    onClone,
    onArchive,
    openCalculator,
    calculatorIconRef,
    openLiquidityAdder,
    liquidityAdderIconRef,
    openSwap,
    swapIconRef,
    openMonitorSettings,
    monitorSettingsIconRef,
}) => {
    const [isCopied, setIsCopied] = useState(false);
    const [copiedSymbol, setCopiedSymbol] = useState(null);
    const [showMoreActions, setShowMoreActions] = useState(false);
    const moreActionsRef = useRef(null);
    
    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (moreActionsRef.current && !moreActionsRef.current.contains(event.target)) {
                setShowMoreActions(false);
            }
        };
        
        if (showMoreActions) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showMoreActions]);

    const handleCopy = () => {
        navigator.clipboard.writeText(pool.address);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 1500);
    };

    const handleSymbolCopy = (address, symbol) => {
        navigator.clipboard.writeText(address);
        setCopiedSymbol(symbol);
        setTimeout(() => {
            setCopiedSymbol(null);
        }, 1500);
    };

    return (
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/20">
            {pool.lpInfo ? (
                // 已加载信息后的头部
                <div>
                    <div className="flex items-start gap-2 mb-1.5">
                        {/* 拖拽手柄 */}
                        <div {...attributes} {...listeners} className="cursor-grab text-neutral-400 hover:text-neutral-600 active:cursor-grabbing p-1 pt-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3ZM5.5 4.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0ZM14.5 4.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0ZM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3ZM5.5 10a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0ZM14.5 10a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0ZM10 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3ZM5.5 15.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0ZM14.5 15.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0Z" clipRule="evenodd" />
                            </svg>
                        </div>

                        {/* 主要内容 - 顶行 */}
                        <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 min-w-0">
                                    <h3 className="font-semibold text-base text-neutral-800 dark:text-neutral-100 truncate flex items-center">
                                        <span className="mr-1.5">{getStatusIcon()}</span>
                                        <span
                                            className="cursor-pointer hover:text-primary-500 transition-colors"
                                            onClick={() => handleSymbolCopy(pool.lpInfo.token0.address, 'token0')}
                                            data-tooltip-id="my-tooltip"
                                            data-tooltip-content={copiedSymbol === 'token0' ? '已复制地址!' : `复制 ${pool.lpInfo.token0.symbol} 地址`}
                                        >
                                            {pool.lpInfo.token0.symbol}
                                        </span>
                                        <span className="mx-1"> / </span>
                                        <span
                                            className="cursor-pointer hover:text-primary-500 transition-colors"
                                            onClick={() => handleSymbolCopy(pool.lpInfo.token1.address, 'token1')}
                                            data-tooltip-id="my-tooltip"
                                            data-tooltip-content={copiedSymbol === 'token1' ? '已复制地址!' : `复制 ${pool.lpInfo.token1.symbol} 地址`}
                                        >
                                            {pool.lpInfo.token1.symbol}
                                        </span>
                                    </h3>
                                    <div className="px-1.5 py-0.5 border border-neutral-300 dark:border-neutral-600 rounded-md text-xs text-neutral-500 dark:text-neutral-400 font-medium flex-shrink-0">
                                        {pool.lpInfo.feePercentage}%
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${pool.lpInfo.protocol.color} ${pool.lpInfo.protocol.borderColor} border flex-shrink-0`}>
                                    <span className="mr-1">{pool.lpInfo.protocol.icon}</span>
                                    <span className="hidden sm:inline">{pool.lpInfo.protocol.name}</span>
                                    <span className="sm:hidden">{pool.lpInfo.protocol.name.split(' ')[0]}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 底行: 地址, 操作按钮 */}
                    <div className="flex justify-between items-center pl-2 flex-wrap sm:flex-nowrap gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <a
                                href={`https://bscscan.com/address/${pool.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors flex items-center gap-1.5"
                                data-tooltip-id="my-tooltip"
                                data-tooltip-content="在区块链浏览器查看"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6.75a.75.75 0 01.75-.75h3.75a.75.75 0 01.75.75v3.75a.75.75 0 01-.75.75H13.5a.75.75 0 01-.75-.75z" />
                                </svg>
                                {formatAddress(pool.address)}
                            </a>
                            <button
                                onClick={handleCopy}
                                className="text-neutral-400 hover:text-primary-500 transition-all p-0.5 flex-shrink-0"
                                data-tooltip-id="my-tooltip"
                                data-tooltip-content={isCopied ? "已复制!" : "复制地址"}
                            >
                                {isCopied ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center gap-0.5 relative">
                            {/* 主要操作按钮 - 始终显示 */}
                            <button
                                ref={liquidityAdderIconRef}
                                onClick={openLiquidityAdder}
                                className="text-neutral-400 hover:text-primary-500 transition-colors p-1 sm:p-1.5 rounded-full hover:bg-primary-50 dark:hover:bg-primary-500/10"
                                data-tooltip-id="my-tooltip"
                                data-tooltip-content="一键添加流动性"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </button>
                            <button
                                ref={swapIconRef}
                                onClick={openSwap}
                                className="text-neutral-400 hover:text-green-600 transition-colors p-1 sm:p-1.5 rounded-full hover:bg-green-50 dark:hover:bg-green-500/10"
                                data-tooltip-id="my-tooltip"
                                data-tooltip-content="快捷兑换"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h11M9 3l-5 4 5 4M20 17H9m6 4 5-4-5-4" />
                                </svg>
                            </button>
                            
                            {/* 桌面端: 显示所有按钮 */}
                            <div className="hidden sm:flex items-center gap-0.5">
                                <button
                                    ref={calculatorIconRef}
                                    onClick={openCalculator}
                                    className="text-neutral-400 hover:text-primary-500 transition-colors p-1.5 rounded-full hover:bg-primary-50 dark:hover:bg-primary-500/10"
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content="流动性占比计算器"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m3 1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h3m3-4a2 2 0 012 2v2H9V6a2 2 0 012-2zm-3 8h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
                                    </svg>
                                </button>
                                <button
                                    ref={monitorSettingsIconRef}
                                    onClick={openMonitorSettings}
                                    className="text-neutral-400 hover:text-orange-500 transition-colors p-1.5 rounded-full hover:bg-orange-50 dark:hover:bg-orange-500/10"
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content="监控参数设置"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </button>
                                <button
                                    onClick={onClone}
                                    className="text-neutral-400 hover:text-blue-500 transition-colors p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-500/10"
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content="克隆此池子"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={onArchive}
                                    className="text-neutral-400 hover:text-amber-500 transition-colors p-1.5 rounded-full hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content="归档此池子"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                </button>
                                <button
                                    onClick={onRemove}
                                    className="text-neutral-400 hover:text-error-500 transition-colors p-1.5 rounded-full hover:bg-error-50 dark:hover:bg-error-500/10"
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content="删除此池子"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                            
                            {/* 移动端: 更多操作菜单 */}
                            <div className="sm:hidden relative" ref={moreActionsRef}>
                                <button
                                    onClick={() => setShowMoreActions(!showMoreActions)}
                                    className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content="更多操作"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                </button>
                                
                                {/* 下拉菜单 */}
                                <AnimatePresence>
                                    {showMoreActions && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="absolute right-0 top-8 z-10 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 min-w-[140px] origin-top-right"
                                        >
                                        <button
                                            onClick={() => { openCalculator(); setShowMoreActions(false); }}
                                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m3 1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h3m3-4a2 2 0 012 2v2H9V6a2 2 0 012-2zm-3 8h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
                                            </svg>
                                            计算器
                                        </button>
                                        <button
                                            onClick={() => { openMonitorSettings(); setShowMoreActions(false); }}
                                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                            监控设置
                                        </button>
                                        <button
                                            onClick={() => { onClone(); setShowMoreActions(false); }}
                                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            克隆
                                        </button>
                                        <button
                                            onClick={() => { onArchive(); setShowMoreActions(false); }}
                                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                            </svg>
                                            归档
                                        </button>
                                        <div className="border-t border-neutral-200 dark:border-neutral-700 my-1"></div>
                                        <button
                                            onClick={() => { onRemove(); setShowMoreActions(false); }}
                                            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            删除
                                        </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // 加载中或错误状态的头部
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2" {...attributes} {...listeners}>
                        <span className="text-sm">{getStatusIcon()}</span>
                        <div className="flex items-center gap-1.5">
                            <a
                                href={`https://bscscan.com/address/${pool.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline transition-colors"
                                data-tooltip-id="my-tooltip"
                                data-tooltip-content="在区块链浏览器查看"
                            >
                                {formatAddress(pool.address)}
                            </a>
                            <button
                                onClick={handleCopy}
                                className="text-neutral-400 hover:text-primary-500 transition-all p-0.5"
                                data-tooltip-id="my-tooltip"
                                data-tooltip-content={isCopied ? "已复制!" : "复制地址"}
                            >
                                {isCopied ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onRemove}
                        className="text-neutral-400 hover:text-error-500 transition-colors p-1 rounded-full hover:bg-error-50"
                        data-tooltip-id="my-tooltip"
                        data-tooltip-content="删除此池子"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default PoolCardHeader; 