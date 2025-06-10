'use client';

import { useState, useEffect, useRef } from 'react';
import { getNFTPositionInfo } from '../utils/lpUtils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PoolCard = ({ id, pool, onRemove, outOfRangeCount, onNftInfoUpdate }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [nftId, setNftId] = useState('');
    const [nftInfo, setNftInfo] = useState(null);
    const [isLoadingNft, setIsLoadingNft] = useState(false);
    const [nftError, setNftError] = useState(null);
    const [showReversedPrice, setShowReversedPrice] = useState(false);
    const [showNftPanel, setShowNftPanel] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [calcInput0, setCalcInput0] = useState('');
    const [calcInput1, setCalcInput1] = useState('');
    const [calculatedRatio, setCalculatedRatio] = useState(null);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);

    const calculatorIconRef = useRef(null);
    const popoverRef = useRef(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
    };

    // 获取NFT信息
    const fetchNftInfo = async () => {
        if (!nftId.trim() || !pool.lpInfo) return;

        setIsLoadingNft(true);
        setNftError(null);

        try {
            const info = await getNFTPositionInfo(nftId.trim(), pool.address, pool.lpInfo);

            // 检查返回的信息是否有效
            if (info.isValid) {
                setNftInfo(info);
                setShowNftPanel(true); // 显示面板
                setNftError(null); // 清除错误
                // 通知父组件 NFT 信息已更新
                if (onNftInfoUpdate) {
                    onNftInfoUpdate({
                        address: pool.address,
                        nftInfo: info
                    });
                }
            } else {
                // NFT信息无效，设置错误状态
                setNftError(info.error || 'NFT信息无效');
                setNftInfo(null);
                setShowNftPanel(false);
            }
        } catch (error) {
            setNftError(error.message);
            setNftInfo(null);
            setShowNftPanel(false);
        } finally {
            setIsLoadingNft(false);
        }
    };

    // 计算价格在范围条中的位置百分比
    const calculatePricePosition = (current, lower, upper) => {
        if (current <= lower) return 5; // 最左边，留一点边距
        if (current >= upper) return 95; // 最右边，留一点边距

        // 在范围内时，计算相对位置 (20% 到 80% 之间)
        const ratio = (current - lower) / (upper - lower);
        return 20 + (ratio * 60); // 20% 到 80% 的范围
    };

    // 当池子信息更新时，如果有NFT ID，自动刷新NFT信息
    useEffect(() => {
        if (pool.lpInfo && nftId.trim() && !pool.isLoading && !pool.error && !isLoadingNft) {
            // 添加一个小延迟，避免与池子信息加载冲突
            const timer = setTimeout(() => {
                fetchNftInfo();
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [pool.lpInfo?.lastUpdated, nftId]); // 只在池子信息真正更新时触发

    // 监听计算器输入变化
    useEffect(() => {
        if (!showCalculator || !pool.lpInfo) {
            setCalculatedRatio(null);
            return;
        };

        const input0 = parseFloat(calcInput0) || 0;
        const input1 = parseFloat(calcInput1) || 0;

        if (input0 <= 0 && input1 <= 0) {
            setCalculatedRatio(null);
            return;
        }

        // 使用 rawBalance 和 decimals 提高精度
        const poolAmount0 = Number(pool.lpInfo.token0.rawBalance) / (10 ** pool.lpInfo.token0.decimals);
        const poolAmount1 = Number(pool.lpInfo.token1.rawBalance) / (10 ** pool.lpInfo.token1.decimals);
        const priceT1inT0 = pool.lpInfo.price.token0PerToken1;

        if (isNaN(poolAmount0) || isNaN(poolAmount1) || isNaN(priceT1inT0)) return;

        const poolValueInToken0 = poolAmount0 + (poolAmount1 * priceT1inT0);
        const inputValueInToken0 = input0 + (input1 * priceT1inT0);

        if (poolValueInToken0 === 0 && inputValueInToken0 > 0) {
            setCalculatedRatio(100);
            return;
        }

        if (poolValueInToken0 > 0) {
            const ratio = (inputValueInToken0 / (poolValueInToken0 + inputValueInToken0)) * 100;
            setCalculatedRatio(ratio);
        } else {
            setCalculatedRatio(null);
        }
    }, [calcInput0, calcInput1, showCalculator, pool.lpInfo]);

    // 监听外部点击和滚动，关闭计算器
    useEffect(() => {
        if (!showCalculator) return;

        function handleClickOutside(event) {
            if (popoverRef.current && !popoverRef.current.contains(event.target) &&
                calculatorIconRef.current && !calculatorIconRef.current.contains(event.target)) {
                closeCalculator();
            }
        }

        function handleScroll() {
            closeCalculator();
        }

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [showCalculator]);

    // Effect to trigger enter animation
    useEffect(() => {
        if (showCalculator) {
            const timer = setTimeout(() => {
                setIsPopoverVisible(true);
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [showCalculator]);

    // 监听NFT ID变化，如果被清空则隐藏面板
    useEffect(() => {
        if (!nftId.trim()) {
            setShowNftPanel(false);
            // 如果输入框被清空，也清除NFT信息和错误信息
            setTimeout(() => {
                setNftInfo(null);
                setNftError(null);
            }, 500); // 与动画持续时间一致
        }
    }, [nftId]);

    const clearNftInfo = () => {
        setShowNftPanel(false); // 先触发关闭动画
        // 延迟清除数据，让动画有时间播放
        setTimeout(() => {
            setNftId('');
            setNftInfo(null);
            setNftError(null);
        }, 500); // 与动画持续时间一致
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const getStatusColor = () => {
        if (pool.error) return 'border-error-500 bg-error-50';
        if (pool.isLoading || isRefreshing) return 'border-primary-500 bg-primary-50';
        return 'border-success-500 bg-success-50';
    };

    const getStatusIcon = () => {
        if (pool.error) return '❌';
        if (pool.isLoading || isRefreshing) return '🔄';
        return '✅';
    };

    const openCalculator = () => {
        if (calculatorIconRef.current) {
            const rect = calculatorIconRef.current.getBoundingClientRect();
            const popoverWidth = 320; // 假设popover宽度为320px
            let left = rect.right + 12;
            // 如果右侧空间不足，则显示在左侧
            if (left + popoverWidth > window.innerWidth) {
                left = rect.left - popoverWidth - 12;
            }

            setPopoverPosition({
                top: rect.top,
                left: left,
            });
            setShowCalculator(true); // 1. Mount the component
        }
    }

    const closeCalculator = () => {
        setIsPopoverVisible(false); // 1. Trigger exit animation
        setTimeout(() => {
            setShowCalculator(false); // 2. Unmount after animation
            setCalcInput0('');
            setCalcInput1('');
            setCalculatedRatio(null);
        }, 200); // 动画时长
    }

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                className={`card border ${getStatusColor()} transition-all duration-200 self-start`}
            >
                {/* 新设计的头部 */}
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/20">
                    {pool.lpInfo ? (
                        // 已加载信息后的头部 - 新设计
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
                                        title="在区块链浏览器查看"
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
                                            title="流动性占比计算器"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m3 1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h3m3-4a2 2 0 012 2v2H9V6a2 2 0 012-2zm-3 8h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
                                            </svg>
                                        </button>
                                        <a
                                            href={pool.lpInfo.protocol.name.toLowerCase().includes('pancake')
                                                ? `https://pancakeswap.finance/add/${pool.lpInfo.token0.address}/${pool.lpInfo.token1.address}/${pool.lpInfo.fee}?chain=bsc`
                                                : `https://app.uniswap.org/add/${pool.lpInfo.token0.address}/${pool.lpInfo.token1.address}/${pool.lpInfo.fee}`
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-neutral-400 hover:text-primary-500 transition-colors p-1.5 rounded-full hover:bg-primary-50 dark:hover:bg-primary-500/10"
                                            title={`一键添加流动性 (费率: ${pool.lpInfo.feePercentage}%)`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                        </a>
                                        <button
                                            onClick={onRemove}
                                            className="text-neutral-400 hover:text-error-500 transition-colors p-1.5 rounded-full hover:bg-error-50 dark:hover:bg-error-500/10"
                                            title="删除此池子"
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
                                    title="在区块链浏览器查看"
                                >
                                    {formatAddress(pool.address)}
                                </a>
                            </div>
                            <button
                                onClick={onRemove}
                                className="text-neutral-400 hover:text-error-500 transition-colors p-1 rounded-full hover:bg-error-50"
                                title="删除此池子"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {pool.error && (
                    <div className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded text-xs m-2">
                        <strong>错误:</strong> {pool.error}
                    </div>
                )}

                {pool.isLoading && !pool.lpInfo && (
                    <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                        <span className="ml-2 text-primary-600 text-xs">加载中...</span>
                    </div>
                )}

                {pool.lpInfo && (
                    <div className="p-3 space-y-3">
                        {/* 代币信息 - 包含余额 */}
                        <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg">
                            <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">💧 池子流动性</div>
                            {/* 代币余额 */}
                            <div className="flex items-center justify-around bg-white/60 dark:bg-black/10 p-2 rounded-lg text-sm font-mono mb-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-semibold text-primary-700 dark:text-primary-400">{pool.lpInfo.token0.symbol}</span>
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{pool.lpInfo.token0.balance}</span>
                                </div>
                                <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-600"></div>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-semibold text-success-700 dark:text-success-400">{pool.lpInfo.token1.symbol}</span>
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{pool.lpInfo.token1.balance}</span>
                                </div>
                            </div>
                            {/* 池子倾斜度可视化 */}
                            <div className="mt-2">
                                {(() => {
                                    const token0Amount = Number(pool.lpInfo.token0.rawBalance) / Math.pow(10, pool.lpInfo.token0.decimals);
                                    const token1Amount = Number(pool.lpInfo.token1.rawBalance) / Math.pow(10, pool.lpInfo.token1.decimals);
                                    // token0 价值 = token0Amount * 1（假设token0是USDC）
                                    // token1 价值 = token1Amount * 价格（token1对token0的价格）
                                    const token0Value = token0Amount;
                                    const token1Value = token1Amount * pool.lpInfo.price.token0PerToken1;
                                    const totalValue = token0Value + token1Value;
                                    const percent0 = totalValue === 0 ? 50 : (token0Value / totalValue) * 100;
                                    const percent1 = 100 - percent0;
                                    if (totalValue === 0) {
                                        return (
                                            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden"></div>
                                        );
                                    }
                                    return (
                                        <>
                                            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden flex">
                                                <div
                                                    className="h-full bg-primary-500 transition-all duration-300"
                                                    style={{ width: `${percent0}%`, minWidth: percent0 > 0 ? '4px' : '0' }}
                                                ></div>
                                                <div
                                                    className="h-full bg-success-500 transition-all duration-300"
                                                    style={{ width: `${percent1}%`, minWidth: percent1 > 0 ? '4px' : '0' }}
                                                ></div>
                                            </div>
                                            {/* <div className="flex justify-between text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                        <span>{pool.lpInfo.token0.symbol}</span>
                        <span>{pool.lpInfo.token1.symbol}</span>
                      </div> */}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* 价格信息 - 紧凑显示 */}
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg">
                            <div className="text-xs text-neutral-700 dark:text-neutral-300 font-medium mb-2">💰 价格</div>
                            <div className="flex items-center justify-around bg-white dark:bg-neutral-900 p-2 rounded-lg text-xs font-mono">
                                <div className="text-center">
                                    {pool.lpInfo.price.formatted}
                                </div>
                                <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700"></div>
                                <div className="text-center">
                                    {pool.lpInfo.price.formattedReverse}
                                </div>
                            </div>
                        </div>

                        {/* NFT位置查询 */}
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">🎯 V3 NFT 查询</div>
                                {nftId.trim() && (
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {isLoadingNft ? '🔄 刷新中' : '🔄 自动刷新'}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 mb-2 relative">
                                <input
                                    type="text"
                                    placeholder="输入NFT ID"
                                    value={nftId}
                                    onChange={(e) => setNftId(e.target.value)}
                                    className="input-primary flex-1 text-xs pr-8"
                                />
                                {nftId && (
                                    <button
                                        onClick={clearNftInfo}
                                        className="absolute right-[calc(4rem+1rem)] top-1/2 -translate-y-1/2 text-neutral-400 hover:text-error-500 transition-colors p-1 rounded-full"
                                        title="清除"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    onClick={fetchNftInfo}
                                    disabled={!nftId.trim() || isLoadingNft}
                                    className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed w-16"
                                >
                                    {isLoadingNft ? '...' : '查询'}
                                </button>
                            </div>

                            {/* NFT错误信息 - 移到面板外面，确保始终可见 */}
                            {nftError && (
                                <div className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded text-xs mb-2">
                                    <strong>错误:</strong> {nftError}
                                </div>
                            )}

                            {/* NFT信息面板 - 带动画效果 */}
                            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showNftPanel && nftInfo && nftInfo.isValid
                                ? 'max-h-screen opacity-100 transform translate-y-0'
                                : 'max-h-0 opacity-0 transform -translate-y-2'
                                }`}>
                                {nftInfo && nftInfo.isValid && (
                                    <div className="mt-3 space-y-3">
                                        {/* 价格方向选择 */}
                                        <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center">
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">价格显示方向:</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setShowReversedPrice(false)}
                                                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${!showReversedPrice
                                                            ? 'bg-primary-500 text-white'
                                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                            }`}
                                                    >
                                                        {pool.lpInfo.token0.symbol}/{pool.lpInfo.token1.symbol}
                                                    </button>
                                                    <button
                                                        onClick={() => setShowReversedPrice(true)}
                                                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${showReversedPrice
                                                            ? 'bg-primary-500 text-white'
                                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                            }`}
                                                    >
                                                        {pool.lpInfo.token1.symbol}/{pool.lpInfo.token0.symbol}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>


                                        {/* 仓位详情 */}
                                        <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">仓位详情</div>

                                                <div className="flex items-center gap-2">
                                                    <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${nftInfo.isInRange
                                                        ? 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/30 dark:text-success-300 dark:border-success-700/50'
                                                        : 'bg-error-50 text-error-700 border-error-200 dark:bg-error-900/30 dark:text-error-300 dark:border-error-700/50'
                                                        }`}>
                                                        {nftInfo.isInRange ? '范围内' : '范围外'}
                                                    </div>

                                                    {(() => {
                                                        if (!nftInfo?.liquidity || !pool.lpInfo?.liquidity || BigInt(pool.lpInfo.liquidity) === 0n) {
                                                            return null;
                                                        }
                                                        const totalLiquidity = BigInt(pool.lpInfo.liquidity);
                                                        const nftLiquidity = BigInt(nftInfo.liquidity);

                                                        const basisPoints = (nftLiquidity * 10000n) / totalLiquidity;
                                                        const percentage = Number(basisPoints) / 100;

                                                        let displayPercentage;
                                                        if (percentage < 0.01 && percentage > 0) {
                                                            displayPercentage = '< 0.01%';
                                                        } else {
                                                            displayPercentage = `${percentage.toFixed(2)}%`;
                                                        }

                                                        // 根据占比大小选择不同的颜色样式
                                                        let colorClass = 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'; // 默认: 虾米
                                                        if (percentage >= 10) { // 巨鲸
                                                            colorClass = 'bg-error-50 text-error-700 border-error-200 dark:bg-error-500/10 dark:text-error-400 dark:border-error-500/30';
                                                        } else if (percentage >= 1) { // 海豚
                                                            colorClass = 'bg-warning-50 text-warning-700 border-warning-500/30 dark:bg-warning-700/20 dark:text-warning-500 dark:border-warning-700/30';
                                                        } else if (percentage >= 0.1) { // 鱼
                                                            colorClass = 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-500/10 dark:text-primary-400 dark:border-primary-500/30';
                                                        }

                                                        return (
                                                            <div
                                                                className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full border ${colorClass}`}
                                                                title={`仓位占比\nNFT 流动性: ${nftLiquidity.toString()}\n池子总流动性: ${totalLiquidity.toString()}`}
                                                            >
                                                                {displayPercentage}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            {(() => {
                                                if (!nftInfo.positionLiquidity || !nftInfo.hasLiquidity) {
                                                    return (
                                                        <div className="text-center text-xs text-neutral-500 dark:text-neutral-400 py-2">
                                                            仓位中没有流动性
                                                        </div>
                                                    );
                                                }

                                                const token0Amount = Number(nftInfo.positionLiquidity.raw.token0) / (10 ** pool.lpInfo.token0.decimals);
                                                const token1Amount = Number(nftInfo.positionLiquidity.raw.token1) / (10 ** pool.lpInfo.token1.decimals);

                                                const token0Value = token0Amount;
                                                const token1Value = token1Amount * pool.lpInfo.price.token0PerToken1;
                                                const totalValue = token0Value + token1Value;

                                                const percent0 = totalValue === 0 ? 50 : (token0Value / totalValue) * 100;
                                                const percent1 = 100 - percent0;

                                                return (
                                                    <>
                                                        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden flex">
                                                            <div
                                                                className="h-full bg-primary-500 transition-all duration-300"
                                                                style={{ width: `${percent0}%`, minWidth: percent0 > 0 ? '4px' : '0' }}
                                                            ></div>
                                                            <div
                                                                className="h-full bg-success-500 transition-all duration-300"
                                                                style={{ width: `${percent1}%`, minWidth: percent1 > 0 ? '4px' : '0' }}
                                                            ></div>
                                                        </div>
                                                        <div className="mt-2 space-y-1.5">
                                                            <div className="flex justify-between items-baseline bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg text-xs font-mono">
                                                                <span className="text-primary-700 dark:text-primary-400 font-semibold">{pool.lpInfo.token0.symbol}</span>
                                                                <div className="text-right">
                                                                    <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{nftInfo.positionLiquidity.formatted.token0}</span>
                                                                    <span className="ml-2 text-success-600 dark:text-success-400" title="未领取手续费">
                                                                        {(() => {
                                                                            const fee = nftInfo.fees?.collectable?.token0;
                                                                            const decimals = pool.lpInfo.token0.decimals;
                                                                            if (!fee || fee === '0') return '(+0.00)';
                                                                            const amount = Number(fee) / (10 ** decimals);
                                                                            const formattedAmount = amount < 0.000001 ? amount.toExponential(2) : amount.toFixed(6);
                                                                            return `(+${formattedAmount})`;
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-baseline bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg text-xs font-mono">
                                                                <span className="text-success-700 dark:text-success-400 font-semibold">{pool.lpInfo.token1.symbol}</span>
                                                                <div className="text-right">
                                                                    <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{nftInfo.positionLiquidity.formatted.token1}</span>
                                                                    <span className="ml-2 text-success-600 dark:text-success-400" title="未领取手续费">
                                                                        {(() => {
                                                                            const fee = nftInfo.fees?.collectable?.token1;
                                                                            const decimals = pool.lpInfo.token1.decimals;
                                                                            if (!fee || fee === '0') return '(+0.00)';
                                                                            const amount = Number(fee) / (10 ** decimals);
                                                                            const formattedAmount = amount < 0.000001 ? amount.toExponential(2) : amount.toFixed(6);
                                                                            return `(+${formattedAmount})`;
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* 价格范围可视化 */}
                                        <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                            <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                                价格范围可视化 ({showReversedPrice ? `${pool.lpInfo.token1.symbol}/${pool.lpInfo.token0.symbol}` : `${pool.lpInfo.token0.symbol}/${pool.lpInfo.token1.symbol}`}):
                                            </div>

                                            {/* 标签（横排，带颜色，紧贴可视化条上方） */}
                                            <div className="flex justify-between text-xs font-medium px-1 mb-1">
                                                <span className="w-1/3 text-center font-bold text-success-500">下限</span>
                                                <span className="w-1/3 text-center font-bold text-neutral-500">中心</span>
                                                <span className="w-1/3 text-center font-bold text-error-500">上限</span>
                                            </div>

                                            {/* 价格范围条 */}
                                            <div className="relative mb-3">
                                                <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full relative overflow-hidden">
                                                    {/* 范围内区域 */}
                                                    <div
                                                        className="absolute h-full bg-success-200 dark:bg-success-900/30 rounded-full"
                                                        style={{
                                                            left: '20%',
                                                            width: '60%'
                                                        }}
                                                    ></div>

                                                    {/* 中心线 */}
                                                    <div className="absolute top-0 left-[50%] w-0.5 h-full bg-neutral-400 dark:bg-neutral-600 opacity-50"></div>

                                                    {/* 当前价格指示器 */}
                                                    <div
                                                        className={`absolute top-0 w-1 h-full ${nftInfo.isInRange ? 'bg-success-500' : 'bg-error-500'} shadow-lg z-10`}
                                                        style={{
                                                            left: `${calculatePricePosition(
                                                                showReversedPrice ? (1 / nftInfo.currentPrice) : nftInfo.currentPrice,
                                                                showReversedPrice ? (1 / nftInfo.priceRange.upper) : nftInfo.priceRange.lower,
                                                                showReversedPrice ? (1 / nftInfo.priceRange.lower) : nftInfo.priceRange.upper
                                                            )}%`,
                                                            transform: 'translateX(-50%)'
                                                        }}
                                                    ></div>

                                                    {/* 下限标记 */}
                                                    <div className="absolute top-0 left-[20%] w-0.5 h-full bg-success-500"></div>

                                                    {/* 上限标记 */}
                                                    <div className="absolute top-0 left-[80%] w-0.5 h-full bg-error-500"></div>
                                                </div>

                                                {/* 数值（横排，带颜色，紧贴可视化条下方） */}
                                                <div className="flex justify-between text-xs font-mono px-1 mt-1">
                                                    <span className="w-1/3 text-center font-mono font-bold text-xs !text-success-500">
                                                        {showReversedPrice
                                                            ? (1 / nftInfo.priceRange.upper).toFixed(6)
                                                            : nftInfo.priceRange.lower.toFixed(6)
                                                        }
                                                    </span>
                                                    <span className="w-1/3 text-center font-mono font-bold text-xs text-neutral-500">
                                                        {showReversedPrice
                                                            ? (1 / ((nftInfo.priceRange.upper + nftInfo.priceRange.lower) / 2)).toFixed(6)
                                                            : ((nftInfo.priceRange.upper + nftInfo.priceRange.lower) / 2).toFixed(6)
                                                        }
                                                    </span>
                                                    <span className="w-1/3 text-center font-mono font-bold text-xs text-error-500">
                                                        {showReversedPrice
                                                            ? (1 / nftInfo.priceRange.lower).toFixed(6)
                                                            : nftInfo.priceRange.upper.toFixed(6)
                                                        }
                                                    </span>
                                                </div>

                                                {/* 当前价格位置标签 */}
                                                <div className="text-center mt-3">
                                                    <span className={`text-xs font-medium ${nftInfo.isInRange ? 'text-success-500' : 'text-error-500'}`}>
                                                        {nftInfo.isInRange
                                                            ? `✅ 当前价格 ${showReversedPrice ? (1 / nftInfo.currentPrice).toFixed(6) : nftInfo.currentPrice.toFixed(6)} 在范围内`
                                                            : `❌ 当前价格 ${showReversedPrice ? (1 / nftInfo.currentPrice).toFixed(6) : nftInfo.currentPrice.toFixed(6)} 超出范围`
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 状态说明 */}
                                            <div className={`mt-3 p-3 rounded-lg text-xs text-center font-medium ${nftInfo.isInRange
                                                ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300'
                                                : 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300'
                                                }`}>
                                                {nftInfo.isInRange
                                                    ? <>
                                                        🎯 价格在范围内，正在赚取手续费
                                                    </>
                                                    : nftInfo.currentPrice < nftInfo.priceRange.lower
                                                        ? `⬇️ 价格低于下限 ${(((nftInfo.priceRange.lower - nftInfo.currentPrice) / nftInfo.currentPrice) * 100).toFixed(1)}%`
                                                        : `⬆️ 价格高于上限 ${(((nftInfo.currentPrice - nftInfo.priceRange.upper) / nftInfo.priceRange.upper) * 100).toFixed(1)}%`
                                                }
                                            </div>

                                            {/* 价格范围宽度信息 */}
                                            <div className="mt-3 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 text-center">
                                                <span>范围宽度: ±{(((nftInfo.priceRange.upper - nftInfo.priceRange.lower) / ((nftInfo.priceRange.upper + nftInfo.priceRange.lower) / 2)) * 100).toFixed(1)}%</span>
                                            </div>
                                        </div>

                                        {/* 流动性和收益信息 */}
                                        {/* <div className="flex justify-between text-xs bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg">
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-600 dark:text-neutral-400">💧 流动性:</span>
                        <span className={`font-medium ${nftInfo.hasLiquidity ? 'text-success-500' : 'text-error-500'}`}>
                          {nftInfo.hasLiquidity ? '有' : '无'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-600 dark:text-neutral-400">📊 状态:</span>
                        <span className={`font-medium ${nftInfo.isInRange ? 'text-success-500' : 'text-error-500'}`}>
                          {nftInfo.isInRange ? '活跃' : '非活跃'}
                        </span>
                      </div>
                    </div> */}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* 技术指标 - 所有信息一行显示 */}
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg">
                            <div className="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400">
                                <span>Tick: <span className="font-medium text-neutral-700 dark:text-neutral-300">{pool.lpInfo.tick}</span></span>
                                {outOfRangeCount > 0 ? <span className="text-center"><span className="font-medium text-neutral-700 dark:text-neutral-300">已连续 {outOfRangeCount} 次超出区间</span></span> : ''}
                                <span className="text-center">更新: <span className="font-medium text-neutral-700 dark:text-neutral-300">{pool.lpInfo.lastUpdated}</span></span>
                            </div>
                        </div>

                        {/* 超出区间警告 */}
                        {/* {outOfRangeCount > 0 && (
              <div className="mt-2 text-sm text-red-500">
                已连续 {outOfRangeCount} 次超出区间
              </div>
            )} */}
                    </div>
                )}
            </div>
            {/* 占比计算器 Popover */}
            {showCalculator && pool.lpInfo && (
                <div
                    ref={popoverRef}
                    style={{ top: `${popoverPosition.top}px`, left: `${popoverPosition.left}px` }}
                    className={`fixed bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl p-5 w-80 z-50 transition-all duration-200 ease-in-out
                     ${isPopoverVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                >
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m3 1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h3m3-4a2 2 0 012 2v2H9V6a2 2 0 012-2zm-3 8h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
                            </svg>
                            <span>流动性占比计算器</span>
                        </h3>
                        <button onClick={closeCalculator} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {/* Token 0 Input */}
                        <div className="relative">
                            <input
                                type="number"
                                placeholder={`输入 ${pool.lpInfo.token0.symbol} 数量`}
                                value={calcInput0}
                                onChange={(e) => setCalcInput0(e.target.value)}
                                className="input-primary w-full text-sm pr-16"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                                {pool.lpInfo.token0.symbol}
                            </span>
                        </div>
                        {/* Token 1 Input */}
                        <div className="relative">
                            <input
                                type="number"
                                placeholder={`输入 ${pool.lpInfo.token1.symbol} 数量`}
                                value={calcInput1}
                                onChange={(e) => setCalcInput1(e.target.value)}
                                className="input-primary w-full text-sm pr-16"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                                {pool.lpInfo.token1.symbol}
                            </span>
                        </div>
                        {/* Result Display */}
                        <div className="h-20 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg flex items-center justify-center text-center p-3">
                            {calculatedRatio !== null ? (
                                <div>
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">预计流动性占比</div>
                                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                        {calculatedRatio.toFixed(4)}%
                                    </div>
                                </div>
                            ) : (
                                <span className="text-neutral-500 dark:text-neutral-400 text-xs">请输入数量以计算</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export const SortablePoolCard = (props) => {
    return <PoolCard {...props} />;
};

export default PoolCard; 