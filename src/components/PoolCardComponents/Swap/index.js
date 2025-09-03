'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useIsMobile from '../../../hooks/useIsMobile';
import { TokenInput, SlippageSelector } from '../LiquidityAdder/components';
import WalletStatus from '../LiquidityAdder/ui/WalletStatus';
import ApprovalSection from '../LiquidityAdder/ui/ApprovalSection';
import { useSwap } from './useSwap';

const Swap = ({ poolInfo, position, isVisible, onClose, popoverRef }) => {
    const isMobile = useIsMobile();
    const {
        fromAmount, setFromAmount,
        toAmount,
        fromToken, toToken,
        slippage, setSlippage,
        connected, connect, isInitializing,
        balances, isLoadingBalances,
        isCheckingApproval, tokenInNeedsApproval, isApproving, handleApprove,
        isSwapping, error, result,
        handleSwap, handleTokenSwitch,
        handleClose, isClosing
    } = useSwap(poolInfo, isVisible, onClose);

    // 所有 hooks 必须在任何条件返回之前调用
    const isFromInsufficient = useMemo(() => {
        if (!balances) return false;
        const fromBal = fromToken.address === poolInfo.token0.address ? balances.token0 : balances.token1;
        return !!fromAmount && !!fromBal && parseFloat(fromAmount) > parseFloat(fromBal || '0');
    }, [fromAmount, balances, fromToken, poolInfo]);

    if (!isVisible) return null;

    const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0.2 } } };
    const modalVariants = {
        hidden: { opacity: 0, scale: 0.8, y: 50, rotateX: -15 },
        visible: { opacity: 1, scale: 1, y: 0, rotateX: 0, transition: { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 } },
        exit: { opacity: 0, scale: 0.85, y: -30, rotateX: 10, transition: { type: 'spring', stiffness: 400, damping: 25, mass: 0.5, duration: 0.3 } }
    };
    const contentVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.3, ease: 'easeOut' } }, exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } } };

    return (
        <AnimatePresence mode="wait">
            {(isVisible && !isClosing) && (
            <motion.div
                key="swap-modal"
                className="fixed inset-0 z-50"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={backdropVariants}
                style={{ background: 'rgba(0,0,0,0.08)' }}
                onClick={handleClose}
            >
                <motion.div
                    className="absolute w-96 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200/80 dark:border-neutral-700/50 overflow-hidden"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={modalVariants}
                    style={{ top: position.top, left: position.left, maxHeight: position.maxHeight || (isMobile ? '80vh' : '85vh') }}
                    onClick={(e) => e.stopPropagation()}
                    ref={popoverRef}
                >
                    <motion.div className="p-5 pb-4" variants={contentVariants}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h11M9 3l-5 4 5 4M20 17H9m6 4 5-4-5-4" />
                                </svg>
                                快捷兑换
                            </h3>
                            <button className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={handleClose}>
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {(!connected || isInitializing) && (
                            <WalletStatus connected={connected} connect={connect} isInitializing={isInitializing} subtitle="准备兑换" />
                        )}

                        <div className="space-y-3 mt-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">From</span>
                                <button className="text-xs text-primary-600 dark:text-primary-400 hover:underline" onClick={handleTokenSwitch}>切换</button>
                            </div>
                            <TokenInput
                                symbol={fromToken.symbol}
                                value={fromAmount}
                                onChange={(e) => setFromAmount(e.target.value)}
                                onBlur={() => { }}
                                balance={fromToken.address === poolInfo.token0.address ? balances.token0 : balances.token1}
                                isLoading={isLoadingBalances}
                                placeholder="输入数量"
                            />

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">To</span>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 space-y-2.5 transition-colors duration-300">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                        {toToken.symbol}
                                    </label>
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                        Balance: {isLoadingBalances ? (
                                            <span className="animate-pulse">...</span>
                                        ) : (
                                            <span className="font-mono">
                                                {parseFloat(toToken.address === poolInfo.token0.address ? balances.token0 : balances.token1).toFixed(4)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="relative flex items-center">
                                    <input
                                        type="number"
                                        placeholder="预估数量"
                                        value={toAmount}
                                        readOnly
                                        className="w-full pl-3 pr-3 py-2.5 bg-white/50 dark:bg-neutral-900/30 rounded-lg text-lg font-mono font-medium border-2 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 cursor-not-allowed transition-all duration-300"
                                    />
                                </div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                                    兑换费率: {poolInfo.feePercentage}%
                                </div>
                            </div>

                            <SlippageSelector slippage={slippage} setSlippage={setSlippage} />

                            <ApprovalSection
                                connected={connected}
                                token0NeedsApproval={tokenInNeedsApproval && fromToken.address === poolInfo.token0.address}
                                token1NeedsApproval={tokenInNeedsApproval && fromToken.address === poolInfo.token1.address}
                                poolInfo={poolInfo}
                                handleApprove={() => handleApprove(fromToken.address, fromToken.symbol)}
                                isApproving={isApproving}
                            />

                            {error && (
                                <div className="p-2 text-xs rounded bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-700">{error}</div>
                            )}

                            <button
                                onClick={handleSwap}
                                disabled={!connected || isSwapping || isCheckingApproval || isFromInsufficient}
                                className="w-full py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold mt-1"
                            >
                                {!connected ? '连接钱包' : isSwapping ? '兑换中...' : isFromInsufficient ? '余额不足' : tokenInNeedsApproval ? '请先授权' : '兑换'}
                            </button>

                            {result && (
                                <div className="p-2 text-xs rounded bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-700 mt-1">
                                    {result.message}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Swap; 