'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/providers/WalletProvider';
import {
    checkTokenAllowance,
    approveToken,
    parseTokenAmount,
    getNetworkName,
    getTokenBalance,
    formatTokenAmount,
    decreaseLiquidity,
    collectFromPosition
} from '@/utils/web3Utils';
import useIsMobile from '../../hooks/useIsMobile';

const QuickLiquidityRemover = ({
    poolInfo,
    nftInfo,
    position,
    isVisible,
    onClose,
    popoverRef
}) => {
    const {
        provider,
        signer,
        account,
        connected,
        connect,
        chainId,
        isInitializing
    } = useWallet();

    const [removePercentage, setRemovePercentage] = useState(100);
    const [slippage, setSlippage] = useState(1);
    const [isRemoving, setIsRemoving] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [transactionHash, setTransactionHash] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const isMobile = useIsMobile();

    // 处理关闭动画
    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    }, [onClose]);

    // 重置状态当弹窗关闭时
    useEffect(() => {
        if (!isVisible) {
            setRemovePercentage(100);
            setError('');
            setResult(null);
        }
    }, [isVisible]);

    // 移除流动性
    const handleRemoveLiquidity = async () => {
        if (!connected) {
            connect();
            return;
        }

        if (!signer || !provider) {
            setError('钱包连接异常，请重新连接');
            return;
        }

        if (!nftInfo || !nftInfo.nftId) {
            setError('NFT信息无效');
            return;
        }

        try {
            setIsRemoving(true);
            setError('');

            // 计算要移除的流动性数量
            const currentLiquidity = BigInt(nftInfo.liquidity);
            const liquidityToRemove = (currentLiquidity * BigInt(removePercentage)) / 100n;

            // 计算最小输出量（考虑滑点）
            const expectedAmount0 = BigInt(nftInfo.positionLiquidity.raw.token0);
            const expectedAmount1 = BigInt(nftInfo.positionLiquidity.raw.token1);

            const amount0Min = (expectedAmount0 * BigInt(removePercentage) * (10000n - BigInt(slippage * 100))) / (100n * 10000n);
            const amount1Min = (expectedAmount1 * BigInt(removePercentage) * (10000n - BigInt(slippage * 100))) / (100n * 10000n);

            // 设置交易截止时间（15分钟后）
            const deadline = Math.floor(Date.now() / 1000) + 900;

            // 构建移除流动性参数
            const decreaseLiquidityParams = {
                tokenId: BigInt(nftInfo.nftId),
                liquidity: liquidityToRemove,
                amount0Min: amount0Min,
                amount1Min: amount1Min,
                deadline: BigInt(deadline)
            };

            console.log('移除流动性参数:', decreaseLiquidityParams);

            // 调用decreaseLiquidity
            const decreaseTx = await decreaseLiquidity(
                decreaseLiquidityParams,
                signer,
                chainId,
                poolInfo.protocol?.name || 'uniswap'
            );

            setTransactionHash(decreaseTx.hash);

            // 等待交易确认
            const decreaseReceipt = await decreaseTx.wait();
            console.log('移除流动性交易确认:', decreaseReceipt);

            // 如果需要收集代币和费用
            if (removePercentage === 100) {
                // 100%移除时，也收集所有费用
                const collectParams = {
                    tokenId: BigInt(nftInfo.nftId),
                    recipient: account,
                    amount0Max: BigInt('340282366920938463463374607431768211455'), // uint128 max
                    amount1Max: BigInt('340282366920938463463374607431768211455')  // uint128 max
                };

                console.log('收集参数:', collectParams);

                const collectTx = await collectFromPosition(
                    collectParams,
                    signer,
                    chainId,
                    poolInfo.protocol?.name || 'uniswap'
                );

                await collectTx.wait();
                console.log('收集交易确认:', collectTx.hash);
            }

            setResult({
                success: true,
                message: `成功移除 ${removePercentage}% 的流动性！`,
                txHash: decreaseTx.hash,
            });

        } catch (error) {
            console.error('移除流动性失败:', error);
            let errorMessage = '移除流动性失败';

            if (error.code === 4001) {
                errorMessage = '用户取消交易';
            } else if (error.code === -32603) {
                errorMessage = '交易失败，请检查网络连接';
            } else if (error.message?.includes('insufficient')) {
                errorMessage = '余额不足';
            } else if (error.message?.includes('slippage')) {
                errorMessage = '滑点过大，请调整滑点设置';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setIsRemoving(false);
        }
    };

    if (!isVisible) return null;

    // 动画配置
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };

    const modalVariants = {
        hidden: {
            opacity: 0,
            scale: 0.8,
            y: 50,
            rotateX: -15
        },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            rotateX: 0,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8
            }
        },
        exit: {
            opacity: 0,
            scale: 0.85,
            y: -30,
            rotateX: 10,
            transition: {
                type: "spring",
                stiffness: 400,
                damping: 25,
                mass: 0.5,
                duration: 0.3
            }
        }
    };

    const contentVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                delay: 0.1,
                duration: 0.3,
                ease: "easeOut"
            }
        },
        exit: {
            opacity: 0,
            y: -10,
            transition: {
                duration: 0.2,
                ease: "easeIn"
            }
        }
    };

    return (
        <AnimatePresence mode="wait">
            {(isVisible && !isClosing) && (
                <motion.div
                    ref={popoverRef}
                    style={isMobile ? {} : {
                        top: `${Math.max(60, Math.min(position.top - 60, window.innerHeight - 650))}px`,
                        left: `${position.left}px`
                    }}
                    className={`fixed z-50 ${isMobile ? 'inset-0 flex items-center justify-center' : ''}`}
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                >
                    {/* 移动端背景遮罩 */}
                    {isMobile && (
                        <motion.div
                            className="absolute inset-0 bg-black/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={handleClose}
                        />
                    )}

                    <motion.div
                        className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 
                            rounded-2xl shadow-2xl flex flex-col relative z-10
                            ${isMobile ? 'w-full max-w-md mx-4 max-h-[92vh]' : 'w-[360px] min-h-[520px] max-h-[580px]'}
                        `}
                        style={!isMobile && position.maxHeight ? { maxHeight: `${Math.min(position.maxHeight, 580)}px` } : {}}
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {/* 固定标题栏 */}
                        <motion.div
                            className="flex justify-between items-center p-5 pb-4 flex-shrink-0"
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                </svg>
                                快速移除流动性
                            </h3>
                            <button
                                onClick={handleClose}
                                className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </motion.div>

                        {/* 可滚动内容区域 */}
                        <motion.div
                            className="flex-1 overflow-y-auto px-5 pb-5 custom-scrollbar"
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="space-y-4">
                                {/* NFT信息提示 */}
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-red-500">🎯</span>
                                        <span className="font-medium text-red-700 dark:text-red-300">
                                            移除 NFT #{nftInfo?.nftId} • {poolInfo.token0?.symbol}/{poolInfo.token1?.symbol}
                                        </span>
                                    </div>
                                </div>

                                {!connected ? (
                                    <div className="text-center p-4">
                                        <button
                                            onClick={connect}
                                            className="btn-primary"
                                        >
                                            连接钱包
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* 移除比例选择 */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                移除比例
                                            </label>

                                            {/* 比例选择按钮 */}
                                            <div className="grid grid-cols-4 gap-2">
                                                {[25, 50, 75, 100].map((percentage) => (
                                                    <button
                                                        key={percentage}
                                                        onClick={() => setRemovePercentage(percentage)}
                                                        className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 
                                                            ${removePercentage === percentage
                                                                ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg border-0'
                                                                : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-700/50'
                                                            } hover:scale-[1.02] active:scale-[0.98]`}
                                                    >
                                                        {percentage}%
                                                    </button>
                                                ))}
                                            </div>

                                            {/* 当前选择显示 */}
                                            <div className="text-center">
                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                                                    <span className="text-sm text-red-600 dark:text-red-400">将移除</span>
                                                    <span className="text-lg font-bold text-red-700 dark:text-red-300">{removePercentage}%</span>
                                                    <span className="text-sm text-red-600 dark:text-red-400">的流动性</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 滑点设置 */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[4rem]">
                                                    滑点容限
                                                </label>
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        max="50"
                                                        value={slippage}
                                                        onChange={(e) => setSlippage(parseFloat(e.target.value) || 1)}
                                                        placeholder="1"
                                                        className="w-full px-4 py-3 pr-12 border border-neutral-300 dark:border-neutral-600 rounded-xl
                                                            bg-gradient-to-r from-neutral-50 to-gray-50 dark:from-neutral-800/50 dark:to-gray-800/50 
                                                            text-neutral-900 dark:text-white text-sm font-medium
                                                            focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white dark:focus:bg-neutral-800
                                                            outline-none transition-all duration-200"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                        <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 预览信息 */}
                                        {nftInfo && nftInfo.positionLiquidity && removePercentage > 0 && (
                                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                                                <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                                                    预计获得 ({removePercentage}% 流动性)
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-red-600 dark:text-red-400">
                                                            {poolInfo.token0?.symbol}:
                                                        </span>
                                                        <span className="font-medium text-red-900 dark:text-red-100">
                                                            {(parseFloat(nftInfo.positionLiquidity.formatted.token0) * removePercentage / 100).toFixed(6)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-red-600 dark:text-red-400">
                                                            {poolInfo.token1?.symbol}:
                                                        </span>
                                                        <span className="font-medium text-red-900 dark:text-red-100">
                                                            {(parseFloat(nftInfo.positionLiquidity.formatted.token1) * removePercentage / 100).toFixed(6)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 移除按钮 */}
                                        <button
                                            onClick={handleRemoveLiquidity}
                                            disabled={isRemoving || removePercentage <= 0}
                                            className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 
                                                disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl 
                                                transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl
                                                flex items-center justify-center gap-2"
                                        >
                                            {isRemoving ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    移除中...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                                    </svg>
                                                    移除 {removePercentage}% 流动性
                                                </>
                                            )}
                                        </button>

                                        {/* 错误显示 */}
                                        {error && (
                                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                                                <p className="text-red-700 dark:text-red-300 text-sm">
                                                    {error}
                                                </p>
                                            </div>
                                        )}

                                        {/* 结果显示 */}
                                        {result && (
                                            <div className={`p-3 rounded-lg border ${result.success
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                                                }`}>
                                                <p className={`font-medium ${result.success
                                                    ? 'text-green-700 dark:text-green-300'
                                                    : 'text-red-700 dark:text-red-300'
                                                    }`}>
                                                    {result.message}
                                                </p>
                                                {result.txHash && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        交易哈希: {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* 风险提示 */}
                                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-700/50">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">
                                                        操作风险提示
                                                    </div>
                                                    <div className="text-xs text-orange-700 dark:text-orange-400 space-y-1">
                                                        <div>• 移除流动性将减少您的LP仓位</div>
                                                        <div>• 当前滑点设置: <span className="font-mono font-semibold">{slippage}%</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default QuickLiquidityRemover; 