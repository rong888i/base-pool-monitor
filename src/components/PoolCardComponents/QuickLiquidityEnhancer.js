'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/providers/WalletProvider';
import {
    checkTokenAllowance,
    approveToken,
    parseTokenAmount,
    getTokenBalance,
    formatTokenAmount,
    increaseLiquidity
} from '@/utils/web3Utils';
import {
    getLiquidityForAmount0, getLiquidityForAmount1, getAmountsForLiquidity
} from '../../utils/lpUtils';
import useIsMobile from '../../hooks/useIsMobile';
import { getDefaultSlippage } from '../../utils/settingsUtils';

// 代币输入框组件
const TokenInput = ({ symbol, value, onChange, balance, isLoading, placeholder }) => (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 space-y-2.5 transition-colors duration-300">
        <div className="flex justify-between items-baseline">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                {symbol}
            </label>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Balance: {isLoading ? (
                    <span className="animate-pulse">...</span>
                ) : (
                    <span
                        className="font-mono cursor-pointer hover:text-primary-500 transition-colors"
                        onClick={() => onChange({ target: { value: balance } })}
                    >
                        {parseFloat(balance).toFixed(4)}
                    </span>
                )}
            </div>
        </div>
        <div className="relative flex items-center">
            <input
                type="number"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full pl-3 pr-32 py-2.5 bg-white dark:bg-neutral-900/50 rounded-lg text-lg font-mono font-medium border-2 border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-0 outline-none transition-all duration-300"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onChange({ target: { value: (parseFloat(balance) / 2).toString() } })}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 rounded-md px-2.5 py-1.5 transition-colors"
                >
                    50%
                </button>
                <button
                    type="button"
                    onClick={() => onChange({ target: { value: balance } })}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 rounded-md px-2.5 py-1.5 transition-colors"
                >
                    MAX
                </button>
            </div>
        </div>
    </div>
);

const QuickLiquidityEnhancer = ({
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

    const [amount0, setAmount0] = useState('');
    const [amount1, setAmount1] = useState('');
    const [slippage, setSlippage] = useState(getDefaultSlippage());
    const [isCheckingApproval, setIsCheckingApproval] = useState(false);
    const [token0NeedsApproval, setToken0NeedsApproval] = useState(false);
    const [token1NeedsApproval, setToken1NeedsApproval] = useState(false);
    const [isApproving, setIsApproving] = useState({});
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [transactionHash, setTransactionHash] = useState('');
    const [lastEdited, setLastEdited] = useState(null);
    const [balances, setBalances] = useState({ token0: '0', token1: '0' });
    const [isLoadingBalances, setIsLoadingBalances] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const isMobile = useIsMobile();
    const amountUpdateTimer = useRef(null);

    // 检查余额是否不足
    const isToken0Insufficient = amount0 && parseFloat(amount0) > parseFloat(balances.token0 || '0');
    const isToken1Insufficient = amount1 && parseFloat(amount1) > parseFloat(balances.token1 || '0');

    // 检查是否为单边添加（只添加一种代币或其中一个为0）
    const isAmount0Zero = !amount0 || parseFloat(amount0) === 0;
    const isAmount1Zero = !amount1 || parseFloat(amount1) === 0;
    const isSingleSideAdd = isAmount0Zero || isAmount1Zero;

    // 只检查实际需要的代币的余额
    const hasInsufficientBalance = (!isAmount0Zero && isToken0Insufficient) || (!isAmount1Zero && isToken1Insufficient);

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
            setAmount0('');
            setAmount1('');
            setError('');
            setResult(null);
        }
    }, [isVisible]);

    // 自动计算另一个代币的数量
    useEffect(() => {
        if (amountUpdateTimer.current) {
            clearTimeout(amountUpdateTimer.current);
        }

        amountUpdateTimer.current = setTimeout(() => {
            if (!poolInfo || !nftInfo || !lastEdited) {
                console.log('自动计算跳过：缺少必要信息', { poolInfo: !!poolInfo, nftInfo: !!nftInfo, lastEdited });
                return;
            }

            const { tick, sqrtPriceX96, token0, token1 } = poolInfo;
            const { tickLower, tickUpper } = nftInfo;
            const input0 = parseFloat(amount0) || 0;
            const input1 = parseFloat(amount1) || 0;

            console.log('自动计算参数:', {
                lastEdited,
                amount0,
                amount1,
                input0,
                input1,
                currentTick: tick,
                tickLower,
                tickUpper,
                isInRange: tick >= tickLower && tick < tickUpper
            });

            // 检查当前价格是否在NFT范围内
            const currentTick = tick;
            const isInRange = currentTick >= tickLower && currentTick < tickUpper;

            if (lastEdited === 'amount0' && amount0 && input0 > 0) {
                console.log('正在计算token1数量，基于token0:', amount0);

                try {
                    const liquidity = getLiquidityForAmount0(poolInfo, tickLower, tickUpper, amount0);
                    console.log('计算得到流动性:', liquidity.toString());

                    if (liquidity > 0n) {
                        const { formatted } = getAmountsForLiquidity(liquidity.toString(), sqrtPriceX96, tick, tickLower, tickUpper, token0.decimals, token1.decimals);
                        console.log('计算得到的代币数量:', formatted);

                        const calculatedAmount1 = parseFloat(formatted.token1);
                        console.log('设置token1数量:', formatted.token1);
                        setAmount1(formatted.token1);
                    } else {
                        console.log('流动性为0，设置token1为0');
                        setAmount1('0');
                    }
                } catch (error) {
                    console.error('计算token1数量失败:', error);
                    setAmount1('0');
                }
            } else if (lastEdited === 'amount0' && (!amount0 || input0 === 0)) {
                console.log('清空token0，清空token1');
                setAmount1('');
            } else if (lastEdited === 'amount1' && amount1 && input1 > 0) {
                console.log('正在计算token0数量，基于token1:', amount1);

                try {
                    const liquidity = getLiquidityForAmount1(poolInfo, tickLower, tickUpper, amount1);
                    console.log('计算得到流动性:', liquidity.toString());

                    if (liquidity > 0n) {
                        const { formatted } = getAmountsForLiquidity(liquidity.toString(), sqrtPriceX96, tick, tickLower, tickUpper, token0.decimals, token1.decimals);
                        console.log('计算得到的代币数量:', formatted);

                        const calculatedAmount0 = parseFloat(formatted.token0);
                        console.log('设置token0数量:', formatted.token0);
                        setAmount0(formatted.token0);
                    } else {
                        console.log('流动性为0，设置token0为0');
                        setAmount0('0');
                    }
                } catch (error) {
                    console.error('计算token0数量失败:', error);
                    setAmount0('0');
                }
            } else if (lastEdited === 'amount1' && (!amount1 || input1 === 0)) {
                console.log('清空token1，清空token0');
                setAmount0('');
            }
        }, 500);

        return () => {
            if (amountUpdateTimer.current) {
                clearTimeout(amountUpdateTimer.current);
            }
        };
    }, [amount0, amount1, lastEdited, poolInfo, nftInfo]);

    // 检查授权状态
    const checkApprovalStatus = useCallback(async () => {
        if (!provider || !account || !signer || !amount0 || !amount1) return;

        try {
            setIsCheckingApproval(true);

            // 根据协议类型使用正确的Position Manager地址
            let positionManagerAddress;
            if (poolInfo.protocol.name.toLowerCase().includes('pancake')) {
                positionManagerAddress = '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364';
            } else if (poolInfo.protocol.name.toLowerCase().includes('uniswap')) {
                positionManagerAddress = '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613';
            } else {
                positionManagerAddress = '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613';
            }

            const [allowance0, allowance1] = await Promise.all([
                checkTokenAllowance(poolInfo.token0?.address, account, positionManagerAddress, provider),
                checkTokenAllowance(poolInfo.token1?.address, account, positionManagerAddress, provider)
            ]);

            const amount0Wei = parseTokenAmount(amount0, poolInfo.token0?.decimals || 18);
            const amount1Wei = parseTokenAmount(amount1, poolInfo.token1?.decimals || 18);

            setToken0NeedsApproval(BigInt(allowance0.toString()) < BigInt(amount0Wei));
            setToken1NeedsApproval(BigInt(allowance1.toString()) < BigInt(amount1Wei));
        } catch (error) {
            console.error('检查授权状态失败:', error);
            setError('检查授权状态失败，请重试');
        } finally {
            setIsCheckingApproval(false);
        }
    }, [provider, account, signer, poolInfo, amount0, amount1]);

    // 授权代币
    const handleApprove = async (tokenAddress, tokenSymbol) => {
        if (!signer) {
            setError('请先连接钱包');
            return;
        }

        try {
            setIsApproving(prev => ({ ...prev, [tokenAddress]: true }));

            let positionManagerAddress;
            if (poolInfo.protocol.name.toLowerCase().includes('pancake')) {
                positionManagerAddress = '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364';
            } else if (poolInfo.protocol.name.toLowerCase().includes('uniswap')) {
                positionManagerAddress = '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613';
            } else {
                positionManagerAddress = '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613';
            }

            const maxAmount = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
            const tx = await approveToken(tokenAddress, positionManagerAddress, maxAmount, signer);

            setTransactionHash(tx.hash);
            await tx.wait();

            await checkApprovalStatus();

            console.log(`${tokenSymbol} 授权成功`);
        } catch (error) {
            console.error(`${tokenSymbol} 授权失败:`, error);
            setError(`${tokenSymbol} 授权失败: ${error.message}`);
        } finally {
            setIsApproving(prev => ({ ...prev, [tokenAddress]: false }));
        }
    };

    // 增加流动性到现有NFT
    const handleIncreaseLiquidity = async () => {
        if (!connected) {
            connect();
            return;
        }

        if (!signer || !provider) {
            setError('钱包连接异常，请重新连接');
            return;
        }

        if (!amount0 || !amount1) {
            setError('请输入代币数量');
            return;
        }

        if (!nftInfo || !nftInfo.nftId) {
            setError('NFT信息无效');
            return;
        }

        try {
            setIsAdding(true);
            setError('');

            // 先检查授权状态
            await checkApprovalStatus();

            if (token0NeedsApproval || token1NeedsApproval) {
                setError('请先完成代币授权');
                setIsAdding(false);
                return;
            }

            // 将代币数量转换为Wei
            const amount0Desired = parseTokenAmount(amount0, poolInfo.token0?.decimals || 18);
            const amount1Desired = parseTokenAmount(amount1, poolInfo.token1?.decimals || 18);

            // 确保滑点值有效（允许最高99.99%，100%表示无滑点保护）
            const slippageNum = typeof slippage === 'string' ? parseFloat(slippage) : slippage;
            const effectiveSlippage = (!isNaN(slippageNum) && slippageNum > 0 && slippageNum <= 100) ? slippageNum : 1;
            console.log('滑点设置:', { inputSlippage: slippage, slippageNum, effectiveSlippage });
            
            // 计算最小数量（考虑滑点）
            let amount0Min, amount1Min;
            if (effectiveSlippage >= 100) {
                amount0Min = 0n;
                amount1Min = 0n;
                console.log('滑点设置为100%，接受任何数量的输出');
            } else {
                amount0Min = (BigInt(amount0Desired) * (10000n - BigInt(Math.floor(effectiveSlippage * 100)))) / 10000n;
                amount1Min = (BigInt(amount1Desired) * (10000n - BigInt(Math.floor(effectiveSlippage * 100)))) / 10000n;
            }
            
            console.log('最小数量计算:', {
                amount0Desired: amount0Desired.toString(),
                amount1Desired: amount1Desired.toString(),
                effectiveSlippage,
                amount0Min: amount0Min.toString(),
                amount1Min: amount1Min.toString()
            });

            // 设置交易截止时间（15分钟后）
            const deadline = Math.floor(Date.now() / 1000) + 900;

            // 构建增加流动性参数
            const increaseLiquidityParams = {
                tokenId: BigInt(nftInfo.nftId),
                amount0Desired: BigInt(amount0Desired),
                amount1Desired: BigInt(amount1Desired),
                amount0Min: amount0Min,
                amount1Min: amount1Min,
                deadline: BigInt(deadline)
            };

            console.log('增加流动性参数:', increaseLiquidityParams);

            // 调用increaseLiquidity
            const tx = await increaseLiquidity(
                increaseLiquidityParams,
                signer,
                chainId,
                poolInfo.protocol?.name || 'uniswap'
            );

            setTransactionHash(tx.hash);

            // 等待交易确认
            await tx.wait();
            console.log('增加流动性交易确认:', tx.hash);

            setResult({
                success: true,
                message: '成功增加流动性到现有NFT！',
                txHash: tx.hash,
            });

        } catch (error) {
            console.error('增加流动性失败:', error);
            let errorMessage = '增加流动性失败';

            if (error.code === 4001) {
                errorMessage = '用户取消交易';
            } else if (error.code === -32603) {
                errorMessage = '交易失败，请检查网络连接';
            } else if (error.message?.includes('insufficient')) {
                errorMessage = '余额不足或授权不足';
            } else if (error.message?.includes('slippage')) {
                errorMessage = '滑点过低，请调整滑点设置';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setIsAdding(false);
        }
    };

    // 获取钱包余额
    const fetchBalances = useCallback(async () => {
        if (!provider || !account || !poolInfo) return;

        try {
            setIsLoadingBalances(true);
            const [balance0, balance1] = await Promise.all([
                getTokenBalance(poolInfo.token0?.address, account, provider),
                getTokenBalance(poolInfo.token1?.address, account, provider)
            ]);

            setBalances({
                token0: formatTokenAmount(balance0, poolInfo.token0?.decimals || 18),
                token1: formatTokenAmount(balance1, poolInfo.token1?.decimals || 18)
            });
        } catch (error) {
            console.error('获取余额失败:', error);
            setBalances({ token0: '0', token1: '0' });
        } finally {
            setIsLoadingBalances(false);
        }
    }, [provider, account, poolInfo]);

    // 当钱包连接或池子信息变化时获取余额
    useEffect(() => {
        if (isVisible && connected && provider && account && poolInfo) {
            fetchBalances();
        }
    }, [isVisible, connected, provider, account, poolInfo, fetchBalances]);

    // 定时刷新余额
    useEffect(() => {
        if (!isVisible || !connected || !provider || !account || !poolInfo) return;

        // 立即获取一次余额
        fetchBalances();

        // 设置定时器，每15秒刷新一次余额
        const balanceInterval = setInterval(() => {
            fetchBalances();
        }, 15000);

        return () => clearInterval(balanceInterval);
    }, [isVisible, connected, provider, account, poolInfo, fetchBalances]);

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
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                快速增加流动性
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
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-green-500">🎯</span>
                                        <span className="font-medium text-green-700 dark:text-green-300">
                                            增加 #{nftInfo?.nftId} • {poolInfo.token0?.symbol}/{poolInfo.token1?.symbol}
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
                                        {/* 代币数量输入 */}
                                        <div className="space-y-4">
                                            <TokenInput
                                                symbol={poolInfo.token0?.symbol}
                                                value={amount0}
                                                onChange={(e) => { setAmount0(e.target.value); setLastEdited('amount0'); }}
                                                balance={balances.token0}
                                                isLoading={isLoadingBalances}
                                                placeholder={`输入 ${poolInfo.token0?.symbol} 数量`}
                                            />
                                            <TokenInput
                                                symbol={poolInfo.token1?.symbol}
                                                value={amount1}
                                                onChange={(e) => { setAmount1(e.target.value); setLastEdited('amount1'); }}
                                                balance={balances.token1}
                                                isLoading={isLoadingBalances}
                                                placeholder={`输入 ${poolInfo.token1?.symbol} 数量`}
                                            />
                                        </div>

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

                                        {/* 检查授权状态 */}
                                        {isCheckingApproval && (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 rounded-lg">
                                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm font-medium">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                                    <span>正在检查代币授权状态...</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 授权部分 */}
                                        {(token0NeedsApproval || token1NeedsApproval) && (
                                            <div className="space-y-3">
                                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">代币授权</h4>

                                                {token0NeedsApproval && (
                                                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                                                        <div>
                                                            <p className="text-orange-700 dark:text-orange-300 font-medium">
                                                                授权 {poolInfo.token0?.symbol}
                                                            </p>
                                                            <p className="text-orange-600 dark:text-orange-400 text-sm">
                                                                允许合约使用您的 {poolInfo.token0?.symbol} 代币
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleApprove(poolInfo.token0?.address, poolInfo.token0?.symbol)}
                                                            disabled={isApproving[poolInfo.token0?.address]}
                                                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                                                        >
                                                            {isApproving[poolInfo.token0?.address] ? '授权中...' : '授权'}
                                                        </button>
                                                    </div>
                                                )}

                                                {token1NeedsApproval && (
                                                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                                                        <div>
                                                            <p className="text-orange-700 dark:text-orange-300 font-medium">
                                                                授权 {poolInfo.token1?.symbol}
                                                            </p>
                                                            <p className="text-orange-600 dark:text-orange-400 text-sm">
                                                                允许合约使用您的 {poolInfo.token1?.symbol} 代币
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleApprove(poolInfo.token1?.address, poolInfo.token1?.symbol)}
                                                            disabled={isApproving[poolInfo.token1?.address]}
                                                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                                                        >
                                                            {isApproving[poolInfo.token1?.address] ? '授权中...' : '授权'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 增加流动性按钮 */}
                                        <button
                                            onClick={handleIncreaseLiquidity}
                                            disabled={isAdding || (isAmount0Zero && isAmount1Zero) || hasInsufficientBalance}
                                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 
                                                disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl 
                                                transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl
                                                flex items-center justify-center gap-2"
                                        >
                                            {isAdding ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    增加中...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                    </svg>
                                                    {isAmount0Zero && isAmount1Zero
                                                        ? '请输入代币数量'
                                                        : hasInsufficientBalance
                                                            ? `${(!isAmount0Zero && isToken0Insufficient) ? poolInfo.token0?.symbol : poolInfo.token1?.symbol} 余额不足`
                                                            : isSingleSideAdd
                                                                ? `单边增加流动性到NFT`
                                                                : '增加流动性到NFT'
                                                    }
                                                </>
                                            )}
                                        </button>

                                        {/* 余额不足提示 */}
                                        {hasInsufficientBalance && (
                                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                    </svg>
                                                    <p className="text-yellow-700 dark:text-yellow-300 text-sm font-medium">
                                                        {(!isAmount0Zero && isToken0Insufficient) && (!isAmount1Zero && isToken1Insufficient)
                                                            ? `${poolInfo.token0?.symbol} 和 ${poolInfo.token1?.symbol} 余额均不足`
                                                            : (!isAmount0Zero && isToken0Insufficient)
                                                                ? `${poolInfo.token0?.symbol} 余额不足 (需要: ${amount0}, 余额: ${parseFloat(balances.token0 || '0').toFixed(4)})`
                                                                : (!isAmount1Zero && isToken1Insufficient)
                                                                    ? `${poolInfo.token1?.symbol} 余额不足 (需要: ${amount1}, 余额: ${parseFloat(balances.token1 || '0').toFixed(4)})`
                                                                    : '余额不足'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        )}

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
                                        {/* <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700/50">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                                                        操作提示
                                                    </div>
                                                    <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                                                        <div>• 增加流动性将添加到现有NFT仓位</div>
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

export default QuickLiquidityEnhancer;