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
    collectFromPosition,
    decreaseLiquidityAndCollect,
    checkNFTApproval,
    checkNFTTokenApproval,
    approveNFTForAll,
    approveNFTToken
} from '@/utils/web3Utils';
import useIsMobile from '../../hooks/useIsMobile';
import { getDefaultSlippage } from '../../utils/settingsUtils';

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
    const [slippage, setSlippage] = useState(getDefaultSlippage());
    const [isRemoving, setIsRemoving] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [transactionHash, setTransactionHash] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [nftNeedsApproval, setNftNeedsApproval] = useState(false);
    const [isApprovingNFT, setIsApprovingNFT] = useState(false);
    const [isCheckingApproval, setIsCheckingApproval] = useState(false);
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
            setNftNeedsApproval(false);
        }
    }, [isVisible]);

    // 获取Position Manager地址的辅助函数
    const getPositionManagerAddress = (protocolName, chainId) => {
        // 确保使用数字类型的 chainId
        const numChainId = chainId ? Number(chainId) : 8453; // 默认 BASE
        
        console.log('获取 Position Manager - chainId:', numChainId, 'protocol:', protocolName);
        
        // 只支持 BASE 网络
        if (numChainId !== 8453) {
            console.warn(`警告: 当前网络 ${numChainId} 不是 BASE (8453)，但仍使用 BASE 配置`);
        }
        
        // BASE Chain 的合约地址
        const BASE_CONTRACTS = {
            AERODROME_POSITION_MANAGER: "0x827922686190790b37229fd06084350E74485b72",
            UNISWAP_V3_POSITION_MANAGER: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
        };
        
        // 根据协议名称返回对应的 Position Manager
        if (protocolName?.toLowerCase().includes('aerodrome') || protocolName?.toLowerCase().includes('aero')) {
            console.log('使用 Aerodrome Position Manager:', BASE_CONTRACTS.AERODROME_POSITION_MANAGER);
            return BASE_CONTRACTS.AERODROME_POSITION_MANAGER;
        } else {
            console.log('使用 Uniswap V3 Position Manager:', BASE_CONTRACTS.UNISWAP_V3_POSITION_MANAGER);
            return BASE_CONTRACTS.UNISWAP_V3_POSITION_MANAGER;
        }
    };

    // 检查NFT授权状态
    const checkNFTApprovalStatus = useCallback(async () => {
        if (!connected || !provider || !account || !nftInfo?.nftId || !poolInfo.protocol?.name) {
            return;
        }

        try {
            setIsCheckingApproval(true);
            setError('');

            console.log('授权检查参数:', {
                protocol: poolInfo.protocol.name,
                chainId,
                poolAddress: poolInfo.address
            });
            
            const positionManagerAddress = getPositionManagerAddress(poolInfo.protocol.name, chainId);
            
            console.log('Position Manager 地址:', positionManagerAddress);

            // 检查用户是否已经授权Position Manager操作所有NFT
            const isApprovedForAll = await checkNFTApproval(
                positionManagerAddress, // NFT合约地址就是Position Manager
                account,               // NFT所有者
                positionManagerAddress, // 被授权的操作员
                provider
            );

            if (isApprovedForAll) {
                setNftNeedsApproval(false);
                return;
            }

            // 如果没有全局授权，检查单个NFT授权
            const isTokenApproved = await checkNFTTokenApproval(
                positionManagerAddress, // NFT合约地址
                nftInfo.nftId,         // NFT ID
                positionManagerAddress, // 被授权的地址
                provider
            );

            setNftNeedsApproval(!isTokenApproved);

        } catch (error) {
            console.error('检查NFT授权状态失败:', error);
            // 如果检查失败，为了安全起见，假设需要授权
            setNftNeedsApproval(true);
        } finally {
            setIsCheckingApproval(false);
        }
    }, [connected, provider, account, nftInfo?.nftId, poolInfo.protocol?.name, chainId]);

    // 当钱包连接状态或NFT信息变化时检查授权状态
    useEffect(() => {
        if (isVisible && connected && nftInfo?.nftId) {
            checkNFTApprovalStatus();
        }
    }, [isVisible, connected, nftInfo?.nftId, checkNFTApprovalStatus]);

    // 处理NFT授权
    const handleNFTApproval = async () => {
        if (!connected || !signer || !nftInfo?.nftId || !poolInfo.protocol?.name) {
            setError('钱包连接异常或缺少必要信息');
            return;
        }

        try {
            setIsApprovingNFT(true);
            setError('');

            const positionManagerAddress = getPositionManagerAddress(poolInfo.protocol.name, chainId);

            // 使用全局授权，这样用户不需要为每个NFT单独授权
            const tx = await approveNFTForAll(positionManagerAddress, positionManagerAddress, signer);

            console.log('NFT授权交易已发送:', tx.hash);

            // 等待交易确认
            const receipt = await tx.wait();
            console.log('NFT授权交易确认:', receipt);

            // 重新检查授权状态
            await checkNFTApprovalStatus();

        } catch (error) {
            console.error('NFT授权失败:', error);

            let errorMessage = 'NFT授权失败';
            if (error.code === 4001) {
                errorMessage = '用户取消授权';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setIsApprovingNFT(false);
        }
    };

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

        // 检查NFT授权状态
        if (nftNeedsApproval) {
            setError('请先授权NFT才能移除流动性');
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

            // 确保滑点值有效（允许最高99.99%，100%表示无滑点保护）
            const slippageNum = typeof slippage === 'string' ? parseFloat(slippage) : slippage;
            const effectiveSlippage = (!isNaN(slippageNum) && slippageNum > 0 && slippageNum <= 100) ? slippageNum : 1;
            console.log('滑点设置:', { inputSlippage: slippage, slippageNum, effectiveSlippage });
            
            // 如果滑点设置为100%，则不设置最小数量限制（接受任何数量）
            let amount0Min, amount1Min;
            if (effectiveSlippage >= 100) {
                amount0Min = 0n;
                amount1Min = 0n;
                console.log('滑点设置为100%，接受任何数量的输出');
            } else {
                amount0Min = (expectedAmount0 * BigInt(removePercentage) * (10000n - BigInt(Math.floor(effectiveSlippage * 100)))) / (100n * 10000n);
                amount1Min = (expectedAmount1 * BigInt(removePercentage) * (10000n - BigInt(Math.floor(effectiveSlippage * 100)))) / (100n * 10000n);
            }
            
            console.log('最小数量计算:', {
                expectedAmount0: expectedAmount0.toString(),
                expectedAmount1: expectedAmount1.toString(),
                removePercentage,
                effectiveSlippage,
                amount0Min: amount0Min.toString(),
                amount1Min: amount1Min.toString()
            });

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

            // 构建收集参数
            const collectParams = {
                tokenId: BigInt(nftInfo.nftId),
                recipient: account,
                amount0Max: BigInt('340282366920938463463374607431768211455'), // uint128 max
                amount1Max: BigInt('340282366920938463463374607431768211455')  // uint128 max
            };

            console.log('移除流动性参数:', decreaseLiquidityParams);
            console.log('收集参数:', collectParams);

            // 使用multicall在一个交易中完成移除流动性和收集代币
            const tx = await decreaseLiquidityAndCollect(
                decreaseLiquidityParams,
                collectParams,
                signer,
                chainId,
                poolInfo.protocol?.name || 'uniswap'
            );

            setTransactionHash(tx.hash);

            // 等待交易确认
            const receipt = await tx.wait();
            console.log('Multicall交易确认:', receipt);

            setResult({
                success: true,
                message: `成功移除 ${removePercentage}% 的流动性并收集代币！`,
                txHash: tx.hash,
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
                errorMessage = '滑点过低，请调整滑点设置';
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
                    onClick={handleClose}
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

                    {/* 桌面端背景遮罩 */}
                    {!isMobile && (
                        <motion.div
                            className="fixed inset-0 bg-black/20 -z-10"
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
                        onClick={(e) => e.stopPropagation()}
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
                                            移除 #{nftInfo?.nftId} • {poolInfo.token0?.symbol}/{poolInfo.token1?.symbol}
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

                                            {/* 当前选择显示
                                            <div className="text-center">
                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                                                    <span className="text-sm text-red-600 dark:text-red-400">将移除</span>
                                                    <span className="text-lg font-bold text-red-700 dark:text-red-300">{removePercentage}%</span>
                                                    <span className="text-sm text-red-600 dark:text-red-400">的流动性</span>
                                                </div>
                                            </div> */}
                                        </div>

                                        {/* NFT授权部分 */}
                                        {isCheckingApproval && (
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                    检查NFT授权状态...
                                                </div>
                                            </div>
                                        )}

                                        {nftNeedsApproval && !isCheckingApproval && (
                                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">
                                                            需要NFT授权
                                                        </div>
                                                        <div className="text-xs text-orange-700 dark:text-orange-400 mb-3">
                                                            您需要授权Position Manager合约操作您的NFT才能移除流动性
                                                        </div>
                                                        <button
                                                            onClick={handleNFTApproval}
                                                            disabled={isApprovingNFT}
                                                            className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            {isApprovingNFT ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                    授权中...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    授权NFT
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* {!nftNeedsApproval && !isCheckingApproval && connected && (
                                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                                                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    NFT已授权，可以移除流动性
                                                </div>
                                            </div>
                                        )} */}

                                        {/* 滑点设置 */}
                                        <div className="flex justify-between items-center bg-neutral-100/80 dark:bg-neutral-800/60 p-2.5 pr-3 rounded-lg">
                                            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300 ml-1">滑点容限</label>
                                            <div className="relative flex items-center">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="100"
                                                    value={slippage}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === '') {
                                                            setSlippage('');
                                                            return;
                                                        }
                                                        const numValue = parseFloat(value);
                                                        if (!isNaN(numValue) && numValue >= 0) {
                                                            setSlippage(numValue >= 100 ? 99 : numValue);
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = parseFloat(e.target.value);
                                                        if (isNaN(value) || value <= 0) {
                                                            setSlippage(1);
                                                        } else if (value > 100) {
                                                            setSlippage(100);
                                                        }
                                                    }}
                                                    placeholder="1.0"
                                                    className="w-20 text-right pr-6 py-1.5 font-mono text-sm font-medium bg-white dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                                                />
                                                <span className="absolute right-2.5 text-sm text-neutral-500 dark:text-neutral-400 pointer-events-none">
                                                    %
                                                </span>
                                            </div>
                                        </div>

                                        {/* 预览信息 */}
                                        {nftInfo && nftInfo.positionLiquidity && removePercentage > 0 && (
                                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                                                <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">
                                                    预计获得（移除 {removePercentage}% + 收集所有费用）
                                                </div>
                                                <div className="space-y-3">
                                                    {/* 流动性代币 */}
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">流动性代币:</div>
                                                        <div className="space-y-1 text-sm">
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

                                                    {/* 手续费 */}
                                                    {nftInfo.fees?.collectable && (
                                                        <div className="space-y-2 pt-2 border-t border-red-200 dark:border-red-700">
                                                            <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">未领取手续费:</div>
                                                            <div className="space-y-1 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span className="text-red-600 dark:text-red-400">
                                                                        {poolInfo.token0?.symbol}:
                                                                    </span>
                                                                    <span className="font-medium text-red-900 dark:text-red-100">
                                                                        {nftInfo.fees.collectable.token0Formatted}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-red-600 dark:text-red-400">
                                                                        {poolInfo.token1?.symbol}:
                                                                    </span>
                                                                    <span className="font-medium text-red-900 dark:text-red-100">
                                                                        {nftInfo.fees.collectable.token1Formatted}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 移除按钮 */}
                                        <button
                                            onClick={handleRemoveLiquidity}
                                            disabled={isRemoving || removePercentage <= 0 || nftNeedsApproval || isCheckingApproval || isApprovingNFT}
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
                                            ) : nftNeedsApproval ? (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                    请先授权NFT
                                                </>
                                            ) : isCheckingApproval ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    检查授权中...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                                    </svg>
                                                    移除 {removePercentage}% + 收集费用
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
                                        {/* <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-700/50">
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
                                                        <div>• 当前滑点设置: <span className="font-mono font-semibold">{(typeof slippage === 'number' && slippage > 0 && slippage <= 50) ? slippage : 1}%</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div> */}
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