'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useIsMobile from '../../../hooks/useIsMobile';
import { PriceInput, TokenInput, SlippageSelector } from './components';
import { useLiquidityManagement } from './hooks/useLiquidityManagement';
import WalletStatus from './ui/WalletStatus';
import ApprovalSection from './ui/ApprovalSection';

// 滑点预设选项
const slippageOptions = [
    { label: '0.1%', value: 0.1 },
    { label: '0.5%', value: 0.5 },
    { label: '1%', value: 1.0 },
    { label: '自定义', value: 'custom' }
];

const LiquidityAdder = ({
    poolInfo,
    position,
    isVisible,
    onClose,
    popoverRef
}) => {
    const isMobile = useIsMobile();
    const {
        amount0, setAmount0,
        amount1, setAmount1,
        priceLower, setPriceLower,
        priceUpper, setPriceUpper,
        tickLower,
        tickUpper,
        isReversed,
        isClosing,
        slippage, setSlippage,
        isCheckingApproval,
        token0NeedsApproval,
        token1NeedsApproval,
        isApproving,
        isAddingLiquidity,
        error,
        result,
        lastEdited, setLastEdited,
        balances,
        isLoadingBalances,
        liquidityRatio,
        connected,
        connect,
        isInitializing,
        handleClose,
        handleDirectionToggle,
        handleApprove,
        handleAddLiquidity,
        adjustPrice,
        handleSetPriceRange,
        handlePriceChange,
        handlePriceBlur,
        handleAmountChange,
        handleAmountBlur,
    } = useLiquidityManagement(poolInfo, isVisible, onClose);

    const isToken0Insufficient = useMemo(() => !balances.token0 || (amount0 && parseFloat(amount0) > parseFloat(balances.token0)), [amount0, balances.token0]);
    const isToken1Insufficient = useMemo(() => !balances.token1 || (amount1 && parseFloat(amount1) > parseFloat(balances.token1)), [amount1, balances.token1]);
    const hasInsufficientBalance = isToken0Insufficient || isToken1Insufficient;

    const priceSymbol = isReversed
        ? `${poolInfo.token0.symbol} / ${poolInfo.token1.symbol}`
        : `${poolInfo.token1.symbol} / ${poolInfo.token0.symbol}`;

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.2 } }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.8, y: 50, rotateX: -15 },
        visible: { opacity: 1, scale: 1, y: 0, rotateX: 0, transition: { type: "spring", stiffness: 300, damping: 30, mass: 0.8 } },
        exit: { opacity: 0, scale: 0.85, y: -30, rotateX: 10, transition: { type: "spring", stiffness: 400, damping: 25, mass: 0.5, duration: 0.3 } }
    };

    const contentVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.3, ease: "easeOut" } },
        exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } }
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence mode="wait">
            {(isVisible && !isClosing) && (
                <motion.div
                    ref={popoverRef}
                    style={isMobile ? {} : { top: `${position.top}px`, left: `${position.left}px` }}
                    className={`fixed z-50 ${isMobile ? 'inset-0 flex items-center justify-center' : ''}`}
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    onClick={handleClose}
                >
                    {isMobile && <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={handleClose} />}
                    {!isMobile && <motion.div className="fixed inset-0 bg-black/20 -z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={handleClose} />}

                    <motion.div
                        className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 
                            rounded-2xl shadow-2xl flex flex-col relative z-10
                            ${isMobile ? 'w-full max-w-sm mx-4 max-h-[90vh]' : 'w-96'}
                        `}
                        style={!isMobile && position.maxHeight ? { maxHeight: `${position.maxHeight}px` } : {}}
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <style jsx>{`
                            .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                            .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
                            .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; }
                            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
                            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
                        `}</style>

                        <motion.div
                            className="flex justify-between items-center p-5 pb-4 flex-shrink-0"
                            variants={contentVariants}
                        >
                            <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                一键添加流动性
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

                        <motion.div
                            className="flex-1 overflow-y-auto px-5 pb-5 custom-scrollbar"
                            variants={contentVariants}
                        >
                            <div className="space-y-4">
                                {/* <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span>{poolInfo.protocol.icon}</span>
                                        <span className="font-medium text-blue-700 dark:text-blue-300">
                                            {poolInfo.protocol.name} • {poolInfo.token0?.symbol}/{poolInfo.token1?.symbol}
                                        </span>
                                    </div>
                                </div> */}

                                {/* 当前价格显示 */}
                                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 text-center">
                                    <div className="text-sm font-mono font-medium text-neutral-700 dark:text-neutral-300">
                                        1 {isReversed ? poolInfo.token1?.symbol : poolInfo.token0?.symbol} = {
                                            isReversed
                                                ? (1 / poolInfo.price?.token1PerToken0).toFixed(6)
                                                : poolInfo.price?.token1PerToken0.toFixed(6)
                                        } {isReversed ? poolInfo.token0?.symbol : poolInfo.token1?.symbol}
                                    </div>
                                </div>

                                {!connected && <WalletStatus isInitializing={isInitializing} connected={connected} connect={connect} />}

                                {connected && (
                                    <>
                                        <div className="space-y-4">
                                            <TokenInput
                                                symbol={poolInfo.token0?.symbol}
                                                value={amount0}
                                                onChange={(e) => handleAmountChange(e.target.value, 'amount0')}
                                                onBlur={handleAmountBlur}
                                                balance={balances.token0}
                                                isLoading={isLoadingBalances}
                                                placeholder={`输入 ${poolInfo.token0?.symbol} 数量`}
                                            />
                                            <TokenInput
                                                symbol={poolInfo.token1?.symbol}
                                                value={amount1}
                                                onChange={(e) => handleAmountChange(e.target.value, 'amount1')}
                                                onBlur={handleAmountBlur}
                                                balance={balances.token1}
                                                isLoading={isLoadingBalances}
                                                placeholder={`输入 ${poolInfo.token1?.symbol} 数量`}
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">价格范围</label>
                                                <button onClick={handleDirectionToggle} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 flex items-center gap-1 transition-colors">
                                                    {priceSymbol}
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <PriceInput
                                                    label=""
                                                    value={priceLower}
                                                    onChange={(e) => handlePriceChange(e.target.value, 'lower')}
                                                    onAdjust={(dir) => adjustPrice('min', dir)}
                                                    onBlur={() => handlePriceBlur('lower')}
                                                />
                                                <PriceInput
                                                    label=" "
                                                    value={priceUpper}
                                                    onChange={(e) => handlePriceChange(e.target.value, 'upper')}
                                                    onAdjust={(dir) => adjustPrice('max', dir)}
                                                    onBlur={() => handlePriceBlur('upper')}
                                                />
                                            </div>
                                            {/* <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                输入完成后价格将自动调整到最接近的有效区间
                                            </div> */}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="grid grid-cols-4 gap-2">
                                                <button onClick={() => handleSetPriceRange(0.01)} className="btn-tertiary">±0.01</button>
                                                <button onClick={() => handleSetPriceRange(0.05)} className="btn-tertiary">±0.05</button>
                                                <button onClick={() => handleSetPriceRange(0.1)} className="btn-tertiary">±0.1</button>
                                                <button onClick={() => handleSetPriceRange(0.5)} className="btn-tertiary">±0.5</button>
                                            </div>
                                        </div>

                                        <SlippageSelector slippage={slippage} setSlippage={setSlippage} />

                                        {liquidityRatio !== null && (
                                            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center border border-neutral-200 dark:border-neutral-700">
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">预计流动性占比</div>
                                                <div className="text-2xl font-bold font-mono text-neutral-800 dark:text-neutral-100">{liquidityRatio.toFixed(4)}%</div>
                                            </div>
                                        )}

                                        {isCheckingApproval && (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 rounded-lg">
                                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm font-medium">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                                    <span>正在检查代币授权状态...</span>
                                                </div>
                                            </div>
                                        )}

                                        <ApprovalSection
                                            connected={connected}
                                            token0NeedsApproval={token0NeedsApproval}
                                            token1NeedsApproval={token1NeedsApproval}
                                            poolInfo={poolInfo}
                                            handleApprove={handleApprove}
                                            isApproving={isApproving}
                                        />

                                        <button
                                            onClick={handleAddLiquidity}
                                            disabled={isAddingLiquidity || !amount0 || !amount1 || tickLower === null || tickUpper === null || tickLower >= tickUpper || hasInsufficientBalance}
                                            className="w-full btn-primary !py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            {isAddingLiquidity
                                                ? '添加中...'
                                                : !amount0 || !amount1
                                                    ? '请输入代币数量'
                                                    : tickLower === null || tickUpper === null || tickLower >= tickUpper
                                                        ? '请设置有效价格区间'
                                                        : isToken0Insufficient
                                                            ? `${poolInfo.token0.symbol} 余额不足`
                                                            : isToken1Insufficient
                                                                ? `${poolInfo.token1.symbol} 余额不足`
                                                                : '添加流动性'}
                                        </button>

                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1.5 p-2">
                                            <h4 className="font-semibold text-neutral-600 dark:text-neutral-300">风险提示:</h4>
                                            <ul className="list-disc list-inside space-y-1">
                                                <li>添加流动性存在无常损失风险</li>
                                                <li>当前滑点设置: <span className="font-semibold text-primary-600 dark:text-primary-400">{slippage}%</span></li>
                                            </ul>
                                        </div>

                                        {error && (
                                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                                                <p className="text-red-700 dark:text-red-300 text-sm break-words overflow-hidden">
                                                    {error.length > 100 ? `${error.substring(0, 100)}...` : error}
                                                </p>
                                                {error.length > 100 && (
                                                    <button onClick={() => navigator.clipboard.writeText(error)} className="mt-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline">
                                                        复制完整错误信息
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {result && (
                                            <div className={`p-3 rounded-lg border ${result.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'}`}>
                                                <p className={`font-medium ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{result.message}</p>
                                                {result.txHash && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">交易哈希: {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}</p>}
                                                {result.tokenId && <p className="text-sm text-gray-600 dark:text-gray-400">NFT Token ID: {result.tokenId}</p>}
                                            </div>
                                        )}
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

export default LiquidityAdder; 