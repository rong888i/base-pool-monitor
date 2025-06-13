'use client';

import React from 'react';

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
    openCalculator,
    calculatorIconRef,
    openLiquidityAdder,
    liquidityAdderIconRef,
}) => {
    return (
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/20">
            {pool.lpInfo ? (
                // 已加载信息后的头部
                <div className="flex items-start gap-2">
                    {/* 拖拽手柄 */}
                    <div {...attributes} {...listeners} className="cursor-grab text-neutral-400 hover:text-neutral-600 active:cursor-grabbing p-1 pt-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3ZM5.5 4.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0ZM14.5 4.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0ZM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3ZM5.5 10a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0ZM14.5 10a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0ZM10 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3ZM5.5 15.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0ZM14.5 15.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0Z" clipRule="evenodd" />
                        </svg>
                    </div>

                    {/* 主要内容 */}
                    <div className="flex-grow min-w-0">
                        {/* 顶行: 交易对, 费率, 协议 */}
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                                <h3 className="font-semibold text-base text-neutral-800 dark:text-neutral-100 truncate">
                                    <span className="mr-1.5">{getStatusIcon()}</span>
                                    {pool.lpInfo.token0.symbol} / {pool.lpInfo.token1.symbol}
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

                        {/* 底行: 地址, 操作按钮 */}
                        <div className="flex justify-between items-center">
                            <a
                                href={`https://bscscan.com/address/${pool.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors flex items-center gap-1.5"
                                data-tooltip-id="my-tooltip"
                                data-tooltip-content="在区块链浏览器查看"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6.75a.75.75 0 01.75-.75h3.75a.75.75 0 01.75.75v3.75a.75.75 0 01-.75.75H13.5a.75.75 0 01-.75-.75z" />
                                </svg>
                                {formatAddress(pool.address)}
                            </a>
                            <div className="flex items-center gap-1">
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
                                    ref={liquidityAdderIconRef}
                                    onClick={openLiquidityAdder}
                                    className="text-neutral-400 hover:text-primary-500 transition-colors p-1.5 rounded-full hover:bg-primary-50 dark:hover:bg-primary-500/10"
                                    data-tooltip-id="my-tooltip"
                                    data-tooltip-content="一键添加流动性"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
                        </div>
                    </div>
                </div>
            ) : (
                // 加载中或错误状态的头部
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2" {...attributes} {...listeners}>
                        <span className="text-sm">{getStatusIcon()}</span>
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