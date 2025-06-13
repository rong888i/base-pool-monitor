'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/providers/WalletProvider';
import {
    checkTokenAllowance,
    approveToken,
    addLiquidity,
    parseTokenAmount,
    getNetworkName,
    getTokenBalance,
    formatTokenAmount
} from '@/utils/web3Utils';
import {
    getLiquidityForAmounts, getTickSpacing, calculatePriceFromTick, calculateTickFromPrice,
    getLiquidityForAmount0, getLiquidityForAmount1, getAmountsForLiquidity
} from '../../utils/lpUtils';
import useIsMobile from '../../hooks/useIsMobile';

// 价格输入框组件
const PriceInput = ({ value, onChange, onAdjust, label }) => (
    <div className="flex-1 min-w-0">
        <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">{label}</label>
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={() => onAdjust(-1)}
                className="w-6 h-6 flex-shrink-0 rounded bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 
                    flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition-colors text-sm"
            >
                −
            </button>
            <input
                type="number"
                value={value}
                onChange={onChange}
                className="flex-1 min-w-0 px-2 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                    bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-center text-sm
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="0.0"
            />
            <button
                type="button"
                onClick={() => onAdjust(1)}
                className="w-6 h-6 flex-shrink-0 rounded bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 
                    flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition-colors text-sm"
            >
                +
            </button>
        </div>
    </div>
);

// 代币输入框组件
const TokenInput = ({ symbol, value, onChange, balance, isLoading, placeholder }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                {symbol} 数量
            </label>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                余额: {isLoading ? (
                    <span className="animate-pulse">加载中...</span>
                ) : (
                    <span
                        className="hover:text-blue-500 cursor-pointer transition-colors"
                        onClick={() => onChange({ target: { value: balance } })}
                    >
                        {parseFloat(balance).toFixed(4)} {symbol}
                    </span>
                )}
            </div>
        </div>
        <div className="relative">
            <input
                type="number"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full px-3 py-3 pr-20 border border-neutral-300 dark:border-neutral-600 rounded-lg
                    bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onChange({ target: { value: (parseFloat(balance) / 2).toString() } })}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors px-1"
                >
                    50%
                </button>
                <button
                    type="button"
                    onClick={() => onChange({ target: { value: balance } })}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors px-1"
                >
                    MAX
                </button>
            </div>
        </div>
    </div>
);

// 滑点设置组件
const SlippageSelector = ({ slippage, setSlippage, slippageOptions }) => {
    const [customSlippage, setCustomSlippage] = useState('');
    const [isCustomMode, setIsCustomMode] = useState(false);

    useEffect(() => {
        // 当 slippage 不是自定义值时，更新 custom input
        const isPreset = slippageOptions.some(opt => opt.value === slippage);
        if (isPreset) {
            setIsCustomMode(false);
            setCustomSlippage('');
        } else {
            setIsCustomMode(true);
            setCustomSlippage(slippage.toString());
        }
    }, [slippage, slippageOptions]);

    const handleSlippageSelect = (value) => {
        if (value === 'custom') {
            setIsCustomMode(true);
        } else {
            setIsCustomMode(false);
            setSlippage(value);
            setCustomSlippage('');
        }
    };

    const handleCustomSlippageChange = (e) => {
        const value = e.target.value;
        setCustomSlippage(value);
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
            setSlippage(numValue);
        } else if (value === '') {
            // 如果输入框被清空，可以设置为一个默认值，例如0.5
            setSlippage(0.5);
        }
    };

    return (
        <div className="space-y-3">
            {/* 滑点设置 */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">滑点容限</label>
                <div className="relative flex-1">
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="50"
                        value={slippage}
                        onChange={(e) => setSlippage(parseFloat(e.target.value) || 1)}
                        placeholder="1"
                        className="w-full px-3 py-2 pr-8 border border-neutral-300 dark:border-neutral-600 rounded-lg
                                            bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm
                                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400 pointer-events-none">
                        %
                    </span>
                </div>
            </div>
        </div>
    );
};

const LiquidityAdder = ({
    poolInfo,
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
    const [priceLower, setPriceLower] = useState('');
    const [priceUpper, setPriceUpper] = useState('');
    const [tickLower, setTickLower] = useState(null);
    const [tickUpper, setTickUpper] = useState(null);
    const [isReversed, setIsReversed] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDirectionChanging, setIsDirectionChanging] = useState(false);
    const [slippage, setSlippage] = useState(1); // 默认1%滑点
    const [isCheckingApproval, setIsCheckingApproval] = useState(false);
    const [token0NeedsApproval, setToken0NeedsApproval] = useState(false);
    const [token1NeedsApproval, setToken1NeedsApproval] = useState(false);
    const [isApproving, setIsApproving] = useState({});
    const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [transactionHash, setTransactionHash] = useState('');
    const [lastEdited, setLastEdited] = useState(null);
    const [balances, setBalances] = useState({ token0: '0', token1: '0' });
    const [isLoadingBalances, setIsLoadingBalances] = useState(false);
    const [liquidityRatio, setLiquidityRatio] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const isMobile = useIsMobile();
    const priceUpdateTimer = useRef(null);
    const amountUpdateTimer = useRef(null);

    // 滑点预设选项
    const slippageOptions = [
        { label: '0.1%', value: 0.1 },
        { label: '0.5%', value: 0.5 },
        { label: '1%', value: 1.0 },
        { label: '自定义', value: 'custom' }
    ];

    // 价格显示辅助函数
    const getDisplayPrice = (price) => {
        if (!price) return '';
        return isReversed ? (1 / price).toPrecision(6) : price.toPrecision(6);
    };

    const parseDisplayPrice = (displayPrice) => {
        const price = parseFloat(displayPrice);
        if (isNaN(price) || price === 0) return 0;
        return isReversed ? 1 / price : price;
    };

    // 处理关闭动画
    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300); // 等待退出动画完成
    }, [onClose]);

    // 初始化价格范围
    useEffect(() => {
        if (poolInfo && isVisible && !isInitialized) {
            const currentPrice = poolInfo.price.token1PerToken0;
            const range = currentPrice * 0.003; // 默认±0.3%
            const lowerPrice = currentPrice - range;
            const upperPrice = currentPrice + range;

            const { token0, token1, fee } = poolInfo;
            const tickSpacing = getTickSpacing(fee);
            const lowerTick = calculateTickFromPrice(lowerPrice, token0.decimals, token1.decimals);
            const upperTick = calculateTickFromPrice(upperPrice, token0.decimals, token1.decimals);

            setTickLower(Math.round(lowerTick / tickSpacing) * tickSpacing);
            setTickUpper(Math.round(upperTick / tickSpacing) * tickSpacing);
            setIsInitialized(true);
        }
    }, [poolInfo, isVisible, isInitialized]);

    // 重置状态当弹窗关闭时
    useEffect(() => {
        if (!isVisible) {
            setIsInitialized(false);
            setPriceLower('');
            setPriceUpper('');
            setAmount0('');
            setAmount1('');
            setError('');
            setResult(null);
        }
    }, [isVisible]);

    // 处理方向切换
    const handleDirectionToggle = useCallback(() => {
        setIsDirectionChanging(true);
        setIsReversed(!isReversed);

        // 短暂延迟后重置方向切换状态，让价格同步完成
        setTimeout(() => {
            setIsDirectionChanging(false);
        }, 100);
    }, [isReversed]);

    // 同步价格显示（避免循环更新和闪烁）
    useEffect(() => {
        if (poolInfo && tickLower !== null && tickUpper !== null && !isDirectionChanging) {
            const { token0, token1 } = poolInfo;
            const baseLowerPrice = calculatePriceFromTick(tickLower, token0.decimals, token1.decimals);
            const baseUpperPrice = calculatePriceFromTick(tickUpper, token0.decimals, token1.decimals);

            // 根据isReversed状态计算显示价格，注意上下限的对应关系
            let newLowerDisplay, newUpperDisplay;
            if (isReversed) {
                // 反转时，上限价格变成下限显示，下限价格变成上限显示
                newLowerDisplay = getDisplayPrice(baseUpperPrice);
                newUpperDisplay = getDisplayPrice(baseLowerPrice);
            } else {
                newLowerDisplay = getDisplayPrice(baseLowerPrice);
                newUpperDisplay = getDisplayPrice(baseUpperPrice);
            }

            // 只在价格真正发生变化时才更新，避免循环
            setPriceLower(newLowerDisplay);
            setPriceUpper(newUpperDisplay);
        }
    }, [tickLower, tickUpper, isReversed, poolInfo, isDirectionChanging]);

    // 自动计算另一个代币的数量 - 优化防抖
    useEffect(() => {
        if (amountUpdateTimer.current) {
            clearTimeout(amountUpdateTimer.current);
        }

        amountUpdateTimer.current = setTimeout(() => {
            if (!poolInfo || tickLower === null || tickUpper === null || !lastEdited || tickLower >= tickUpper) {
                return;
            }

            const { tick, sqrtPriceX96, token0, token1 } = poolInfo;
            const input0 = parseFloat(amount0);
            const input1 = parseFloat(amount1);

            if (lastEdited === 'amount0' && input0 >= 0) {
                if (amount0 === '') {
                    setAmount1('');
                    return;
                }
                const liquidity = getLiquidityForAmount0(poolInfo, tickLower, tickUpper, amount0);
                const { formatted } = getAmountsForLiquidity(liquidity.toString(), sqrtPriceX96, tick, tickLower, tickUpper, token0.decimals, token1.decimals);
                if (Math.abs(parseFloat(formatted.token1) - (input1 || 0)) / (input1 || 1) > 1e-6) {
                    setAmount1(formatted.token1);
                }
            } else if (lastEdited === 'amount1' && input1 >= 0) {
                if (amount1 === '') {
                    setAmount0('');
                    return;
                }
                const liquidity = getLiquidityForAmount1(poolInfo, tickLower, tickUpper, amount1);
                const { formatted } = getAmountsForLiquidity(liquidity.toString(), sqrtPriceX96, tick, tickLower, tickUpper, token0.decimals, token1.decimals);
                if (Math.abs(parseFloat(formatted.token0) - (input0 || 0)) / (input0 || 1) > 1e-6) {
                    setAmount0(formatted.token0);
                }
            }
        }, 500);

        return () => {
            if (amountUpdateTimer.current) {
                clearTimeout(amountUpdateTimer.current);
            }
        };
    }, [amount0, amount1, lastEdited, poolInfo, tickLower, tickUpper]);

    // 价格输入框处理（防抖并避免循环）
    useEffect(() => {
        if (priceUpdateTimer.current) {
            clearTimeout(priceUpdateTimer.current);
        }

        priceUpdateTimer.current = setTimeout(() => {
            if (!poolInfo || !priceLower || !priceUpper || isDirectionChanging) return; // 方向切换时暂停更新
            const { token0, token1, fee } = poolInfo;
            const tickSpacing = getTickSpacing(fee);

            let shouldUpdate = false;
            let newLowerTick = tickLower;
            let newUpperTick = tickUpper;

            // 解析显示价格
            const lowerPrice = parseDisplayPrice(priceLower);
            const upperPrice = parseDisplayPrice(priceUpper);

            if (lowerPrice > 0 && upperPrice > 0) {
                // 计算tick值
                const lowerTick = calculateTickFromPrice(lowerPrice, token0.decimals, token1.decimals);
                const upperTick = calculateTickFromPrice(upperPrice, token0.decimals, token1.decimals);

                // 对齐到tick spacing
                const alignedLowerTick = Math.round(lowerTick / tickSpacing) * tickSpacing;
                const alignedUpperTick = Math.round(upperTick / tickSpacing) * tickSpacing;

                // 确保价格范围正确（下限 < 上限）
                if (alignedLowerTick < alignedUpperTick) {
                    if (alignedLowerTick !== tickLower) {
                        newLowerTick = alignedLowerTick;
                        shouldUpdate = true;
                    }
                    if (alignedUpperTick !== tickUpper) {
                        newUpperTick = alignedUpperTick;
                        shouldUpdate = true;
                    }
                }
            }

            // 只在需要时批量更新
            if (shouldUpdate) {
                setTickLower(newLowerTick);
                setTickUpper(newUpperTick);
            }
        }, 300);

        return () => {
            if (priceUpdateTimer.current) {
                clearTimeout(priceUpdateTimer.current);
            }
        };
    }, [priceLower, priceUpper, poolInfo, isDirectionChanging]); // 添加isDirectionChanging依赖

    // 检查授权状态
    const checkApprovalStatus = useCallback(async () => {
        if (!provider || !account || !signer || !amount0 || !amount1) return;

        try {
            setIsCheckingApproval(true);

            // 根据协议类型使用正确的Position Manager地址
            let positionManagerAddress;
            if (poolInfo.protocol.name.toLowerCase().includes('pancake')) {
                positionManagerAddress = '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364'; // PancakeSwap V3 Position Manager on BSC
            } else if (poolInfo.protocol.name.toLowerCase().includes('uniswap')) {
                positionManagerAddress = '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613'; // Uniswap V3 Position Manager on BSC
            } else {
                // 默认使用Uniswap地址作为备用
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

            // 根据协议类型使用正确的Position Manager地址
            let positionManagerAddress;
            if (poolInfo.protocol.name.toLowerCase().includes('pancake')) {
                positionManagerAddress = '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364'; // PancakeSwap V3 Position Manager on BSC
            } else if (poolInfo.protocol.name.toLowerCase().includes('uniswap')) {
                positionManagerAddress = '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613'; // Uniswap V3 Position Manager on BSC
            } else {
                // 默认使用Uniswap地址作为备用
                positionManagerAddress = '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613';
            }

            const maxAmount = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
            const tx = await approveToken(tokenAddress, positionManagerAddress, maxAmount, signer);

            setTransactionHash(tx.hash);
            await tx.wait();

            // 重新检查授权状态
            await checkApprovalStatus();

            console.log(`${tokenSymbol} 授权成功`);
        } catch (error) {
            console.error(`${tokenSymbol} 授权失败:`, error);
            setError(`${tokenSymbol} 授权失败: ${error.message}`);
        } finally {
            setIsApproving(prev => ({ ...prev, [tokenAddress]: false }));
        }
    };

    // 添加流动性
    const handleAddLiquidity = async () => {
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

        if (tickLower === null || tickUpper === null || tickLower >= tickUpper) {
            setError('请设置有效的价格区间');
            return;
        }

        try {
            setIsAddingLiquidity(true);
            setError('');

            // 先检查授权状态
            await checkApprovalStatus();

            // 如果需要授权，停止执行
            if (token0NeedsApproval || token1NeedsApproval) {
                setError('请先完成代币授权');
                setIsAddingLiquidity(false);
                return;
            }

            const amount0Wei = parseTokenAmount(amount0, poolInfo.token0?.decimals || 18);
            const amount1Wei = parseTokenAmount(amount1, poolInfo.token1?.decimals || 18);

            const params = {
                token0: poolInfo.token0?.address,
                token1: poolInfo.token1?.address,
                fee: poolInfo.fee,
                tickLower,
                tickUpper,
                amount0Desired: amount0Wei,
                amount1Desired: amount1Wei,
                recipient: account
            };

            const tx = await addLiquidity(params, signer, chainId, slippage, poolInfo.protocol?.name || '');
            setTransactionHash(tx.hash);

            const receipt = await tx.wait();

            // 解析事件来获取NFT token ID
            const transferEvent = receipt.logs.find(log =>
                log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                log.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000'
            );

            const tokenId = transferEvent ? parseInt(transferEvent.topics[3], 16) : null;

            setResult({
                success: true,
                message: '流动性添加成功！',
                txHash: tx.hash,
                tokenId
            });

        } catch (error) {
            console.error('添加流动性失败:', error);
            setError(`添加流动性失败: ${error.message}`);
            // setResult({
            //     success: false,
            //     message: error.message
            // });
        } finally {
            setIsAddingLiquidity(false);
        }
    };

    // 当组件打开时自动检查授权状态（只在打开时检查一次）
    useEffect(() => {
        if (isVisible && connected && provider && account) {
            // 重置授权状态
            setToken0NeedsApproval(false);
            setToken1NeedsApproval(false);
            setIsCheckingApproval(false);
        }
    }, [isVisible, connected, provider, account]);

    // 价格调整函数
    const adjustPrice = (boxType, direction) => {
        const tickToAdjustName = (boxType === 'min' && !isReversed) || (boxType === 'max' && isReversed)
            ? 'lower'
            : 'upper';

        const effectiveDirection = isReversed ? -direction : direction;
        adjustPriceByTick(tickToAdjustName, effectiveDirection);
    };

    const adjustPriceByTick = (type, direction) => {
        if (!poolInfo) return;
        const { fee } = poolInfo;
        const tickSpacing = getTickSpacing(fee);
        const tickToAdjust = type === 'lower' ? tickLower : tickUpper;
        const setter = type === 'lower' ? setTickLower : setTickUpper;

        if (tickToAdjust !== null) {
            const newTick = tickToAdjust + (direction * tickSpacing);
            setter(newTick);
        }
    };

    // 设置价格区间预设
    const handleSetPriceRange = (percentage) => {
        if (!poolInfo) return;

        const currentPrice = poolInfo.price.token1PerToken0;
        const range = currentPrice * percentage / 100;
        const newLowerPrice = currentPrice - range;
        const newUpperPrice = currentPrice + range;

        const { token0, token1, fee } = poolInfo;
        const tickSpacing = getTickSpacing(fee);

        const lowerTick = calculateTickFromPrice(newLowerPrice, token0.decimals, token1.decimals);
        const upperTick = calculateTickFromPrice(newUpperPrice, token0.decimals, token1.decimals);

        setTickLower(Math.round(lowerTick / tickSpacing) * tickSpacing);
        setTickUpper(Math.round(upperTick / tickSpacing) * tickSpacing);
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

    // 计算流动性占比
    useEffect(() => {
        if (!poolInfo || tickLower === null || tickUpper === null) {
            setLiquidityRatio(null);
            return;
        }

        const input0 = parseFloat(amount0) || 0;
        const input1 = parseFloat(amount1) || 0;

        if ((input0 <= 0 && input1 <= 0) || tickLower >= tickUpper) {
            setLiquidityRatio(null);
            return;
        }

        try {
            const userLiquidity = getLiquidityForAmounts(poolInfo, tickLower, tickUpper, input0.toString(), input1.toString());
            const poolLiquidity = BigInt(poolInfo.liquidity);

            if (poolLiquidity === 0n && userLiquidity > 0n) {
                setLiquidityRatio(100);
                return;
            }

            if (poolLiquidity > 0n) {
                const totalLiquidity = poolLiquidity + userLiquidity;
                if (totalLiquidity === 0n) {
                    setLiquidityRatio(0);
                    return;
                }
                const ratio = (Number(userLiquidity * 10000n / totalLiquidity) / 100);
                setLiquidityRatio(ratio);
            } else {
                setLiquidityRatio(null);
            }
        } catch (error) {
            console.error("计算流动性占比失败:", error);
            setLiquidityRatio(null);
        }
    }, [amount0, amount1, tickLower, tickUpper, poolInfo]);

    // 钱包连接状态显示（优化版）
    const renderWalletStatus = () => {
        if (isInitializing) {
            return (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 border border-blue-200/50 dark:border-blue-700/50">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            </div>
                        </div>
                        <div>
                            <p className="font-semibold text-blue-700 dark:text-blue-300">连接钱包中</p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">正在初始化连接...</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (!connected) {
            return (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 border border-amber-200/50 dark:border-amber-700/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-amber-700 dark:text-amber-300">未连接钱包</p>
                                <p className="text-sm text-amber-600 dark:text-amber-400">请先连接钱包以继续</p>
                            </div>
                        </div>
                        <button
                            onClick={connect}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 
                                text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                        >
                            连接钱包
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 border border-green-200/50 dark:border-green-700/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                        <p className="font-semibold text-green-700 dark:text-green-300">钱包已连接</p>
                        <p className="text-sm text-green-600 dark:text-green-400">准备添加流动性</p>
                    </div>
                </div>
            </div>
        );
    };

    // 授权部分UI
    const renderApprovalSection = () => {
        if (!connected || (!token0NeedsApproval && !token1NeedsApproval)) {
            return null;
        }

        return (
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
        );
    };

    if (!isVisible) return null;

    const priceSymbol = isReversed
        ? `${poolInfo.token0.symbol} / ${poolInfo.token1.symbol}`
        : `${poolInfo.token1.symbol} / ${poolInfo.token0.symbol}`;

    // 动画配置 - 改进关闭动画
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
                    style={isMobile ? {} : { top: `${position.top}px`, left: `${position.left}px` }}
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
                            ${isMobile ? 'w-full max-w-sm mx-4 max-h-[90vh]' : 'w-96'}
                        `}
                        style={!isMobile && position.maxHeight ? { maxHeight: `${position.maxHeight}px` } : {}}
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <style jsx>{`
                            .custom-scrollbar::-webkit-scrollbar {
                                width: 6px;
                                height: 6px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-track {
                                background: transparent;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb {
                                background: #d1d5db; /* gray-400 */
                                border-radius: 3px;
                            }
                            .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                                background: #4b5563; /* gray-600 */
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                background: #9ca3af; /* gray-500 */
                            }
                            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                background: #6b7280; /* gray-700 */
                            }
                        `}</style>

                        {/* 固定标题栏 */}
                        <motion.div
                            className="flex justify-between items-center p-5 pb-4 flex-shrink-0"
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
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

                        {/* 可滚动内容区域 */}
                        <motion.div
                            className="flex-1 overflow-y-auto px-5 pb-5 custom-scrollbar"
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="space-y-4">
                                {/* 协议提示 */}
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span>{poolInfo.protocol.icon}</span>
                                        <span className="font-medium text-blue-700 dark:text-blue-300">
                                            {poolInfo.protocol.name} • {poolInfo.token0?.symbol}/{poolInfo.token1?.symbol}
                                        </span>
                                    </div>
                                </div>

                                {/* 钱包连接检查 */}
                                {!connected && renderWalletStatus()}

                                {connected && (
                                    <>
                                        {/* 代币数量输入（带余额显示） */}
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

                                        {/* 价格范围输入 */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">价格范围</label>
                                                <button onClick={handleDirectionToggle} className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1">
                                                    {priceSymbol}
                                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <PriceInput
                                                    value={priceLower}
                                                    onChange={(e) => setPriceLower(e.target.value)}
                                                    onAdjust={(dir) => adjustPrice('min', dir)}
                                                    label="下限"
                                                />
                                                <PriceInput
                                                    value={priceUpper}
                                                    onChange={(e) => setPriceUpper(e.target.value)}
                                                    onAdjust={(dir) => adjustPrice('max', dir)}
                                                    label="上限"
                                                />
                                            </div>
                                        </div>

                                        {/* 价格范围预设 */}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-4 gap-2">
                                                <button
                                                    onClick={() => handleSetPriceRange(0.05)}
                                                    className="px-3 py-2 text-xs font-medium rounded-lg bg-neutral-50 dark:bg-neutral-800 
                                            border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300
                                            hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                                >
                                                    ±0.05%
                                                </button>
                                                <button
                                                    onClick={() => handleSetPriceRange(0.3)}
                                                    className="px-3 py-2 text-xs font-medium rounded-lg bg-neutral-50 dark:bg-neutral-800 
                                            border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300
                                            hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                                >
                                                    ±0.3%
                                                </button>
                                                <button
                                                    onClick={() => handleSetPriceRange(1)}
                                                    className="px-3 py-2 text-xs font-medium rounded-lg bg-neutral-50 dark:bg-neutral-800 
                                            border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300
                                            hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                                >
                                                    ±1%
                                                </button>
                                                <button
                                                    onClick={() => handleSetPriceRange(5)}
                                                    className="px-3 py-2 text-xs font-medium rounded-lg bg-neutral-50 dark:bg-neutral-800 
                                            border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300
                                            hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                                >
                                                    ±5%
                                                </button>
                                            </div>
                                        </div>

                                        {/* 滑点设置 - 使用新的侧边栏风格组件 */}
                                        <SlippageSelector
                                            slippage={slippage}
                                            setSlippage={setSlippage}
                                            slippageOptions={slippageOptions}
                                        />

                                        {/* 流动性占比显示 */}
                                        {liquidityRatio !== null && (
                                            <div className="p-3 bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
                                                <div className="text-center">
                                                    <div className="text-xs text-primary-600 dark:text-primary-400 mb-1">预计流动性占比</div>
                                                    <div className="text-lg font-bold text-primary-700 dark:text-primary-300">
                                                        {liquidityRatio.toFixed(4)}%
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 授权部分（仅在检测到需要授权时显示） */}
                                        {isCheckingApproval && (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 rounded-lg">
                                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm font-medium">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                                    <span>正在检查代币授权状态...</span>
                                                </div>
                                            </div>
                                        )}

                                        {(token0NeedsApproval || token1NeedsApproval) && renderApprovalSection()}

                                        {/* 添加流动性按钮 */}
                                        <button
                                            onClick={handleAddLiquidity}
                                            disabled={isAddingLiquidity || !amount0 || !amount1 || tickLower === null || tickUpper === null || tickLower >= tickUpper}
                                            className="w-full btn-primary !py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            {isAddingLiquidity ? '添加中...' :
                                                !amount0 || !amount1 ? '请输入代币数量' :
                                                    tickLower === null || tickUpper === null || tickLower >= tickUpper ? '请设置有效价格区间' :
                                                        '添加流动性'}
                                        </button>

                                        {/* 错误显示 */}
                                        {error && (
                                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                                                <p className="text-red-700 dark:text-red-300 text-sm break-words overflow-hidden">
                                                    {error.length > 100 ? `${error.substring(0, 100)}...` : error}
                                                </p>
                                                {error.length > 100 && (
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(error)}
                                                        className="mt-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
                                                    >
                                                        复制完整错误信息
                                                    </button>
                                                )}
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
                                                {result.tokenId && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        NFT Token ID: {result.tokenId}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* 风险提示 */}
                                        <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg">
                                            <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                                                <div className="font-medium">风险提示：</div>
                                                <div>• 添加流动性存在无常损失风险</div>
                                                <div>• 当前滑点设置: {slippage}%</div>
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

export default LiquidityAdder; 