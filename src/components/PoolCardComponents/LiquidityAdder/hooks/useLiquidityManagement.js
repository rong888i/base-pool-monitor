'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/providers/WalletProvider';
import {
    checkTokenAllowance,
    approveToken,
    addLiquidity,
    parseTokenAmount,
    getTokenBalance,
    formatTokenAmount
} from '@/utils/web3Utils';
import {
    getLiquidityForAmounts,
    getTickSpacing,
    calculatePriceFromTick,
    calculateTickFromPrice,
    getLiquidityForAmount0,
    getLiquidityForAmount1,
    getAmountsForLiquidity
} from '../../../../utils/lpUtils';
import { getDefaultSlippage } from '../../../../utils/settingsUtils';

export const useLiquidityManagement = (poolInfo, isVisible, onClose) => {
    const { provider, signer, account, connected, connect, chainId, isInitializing } = useWallet();
    const [amount0, setAmount0] = useState('');
    const [amount1, setAmount1] = useState('');
    const [priceLower, setPriceLower] = useState('');
    const [priceUpper, setPriceUpper] = useState('');
    const [tickLower, setTickLower] = useState(null);
    const [tickUpper, setTickUpper] = useState(null);
    const [isReversed, setIsReversed] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDirectionChanging, setIsDirectionChanging] = useState(false);
    const [slippage, setSlippage] = useState(getDefaultSlippage());
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
    const [isUserInputting, setIsUserInputting] = useState(false);
    const [isAmountInputting, setIsAmountInputting] = useState(false);
    const amountUpdateTimer = useRef(null);
    const inputTimer = useRef(null);

    const getDisplayPrice = (price) => {
        if (!price) return '';
        return isReversed ? (1 / price).toPrecision(6) : price.toPrecision(6);
    };

    const parseDisplayPrice = (displayPrice) => {
        const price = parseFloat(displayPrice);
        if (isNaN(price) || price === 0) return 0;
        return isReversed ? 1 / price : price;
    };

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    }, [onClose]);

    useEffect(() => {
        if (poolInfo && isVisible && !isInitialized) {
            const currentPrice = poolInfo.price.token1PerToken0;
            const range = currentPrice * 0.003;
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

    const handleDirectionToggle = useCallback(() => {
        setIsDirectionChanging(true);
        setIsReversed(!isReversed);
        setTimeout(() => {
            setIsDirectionChanging(false);
        }, 100);
    }, [isReversed]);

    useEffect(() => {
        if (poolInfo && tickLower !== null && tickUpper !== null && !isDirectionChanging && !isUserInputting) {
            const { token0, token1 } = poolInfo;
            const baseLowerPrice = calculatePriceFromTick(tickLower, token0.decimals, token1.decimals);
            const baseUpperPrice = calculatePriceFromTick(tickUpper, token0.decimals, token1.decimals);
            let newLowerDisplay, newUpperDisplay;
            if (isReversed) {
                newLowerDisplay = getDisplayPrice(baseUpperPrice);
                newUpperDisplay = getDisplayPrice(baseLowerPrice);
            } else {
                newLowerDisplay = getDisplayPrice(baseLowerPrice);
                newUpperDisplay = getDisplayPrice(baseUpperPrice);
            }

            setPriceLower(newLowerDisplay);
            setPriceUpper(newUpperDisplay);
        }
    }, [tickLower, tickUpper, isReversed, poolInfo, isDirectionChanging, isUserInputting]);

    useEffect(() => {
        if (isAmountInputting) return;

        const canCalculate = poolInfo && tickLower !== null && tickUpper !== null && tickLower < tickUpper;

        // Calculate the other token amount
        if (canCalculate && lastEdited) {
            const { tick, sqrtPriceX96, token0, token1 } = poolInfo;
            const input0 = parseFloat(amount0);
            const input1 = parseFloat(amount1);
            const getNewAmounts = (l) => getAmountsForLiquidity(l.toString(), sqrtPriceX96, tick, tickLower, tickUpper, token0.decimals, token1.decimals);

            if (lastEdited === 'amount0') {
                if (!amount0 || input0 <= 0) {
                    setAmount1('');
                } else {
                    const liquidity = getLiquidityForAmount0(poolInfo, tickLower, tickUpper, amount0);
                    const { formatted } = getNewAmounts(liquidity);
                    if (Math.abs(parseFloat(formatted.token1) - (input1 || 0)) > 1e-9 || !amount1) {
                        setAmount1(formatted.token1);
                    }
                }
            } else if (lastEdited === 'amount1') {
                if (!amount1 || input1 <= 0) {
                    setAmount0('');
                } else {
                    const liquidity = getLiquidityForAmount1(poolInfo, tickLower, tickUpper, amount1);
                    const { formatted } = getNewAmounts(liquidity);
                    if (Math.abs(parseFloat(formatted.token0) - (input0 || 0)) > 1e-9 || !amount0) {
                        setAmount0(formatted.token0);
                    }
                }
            }
        }

        // Calculate liquidity ratio
        const input0ForRatio = parseFloat(amount0) || 0;
        const input1ForRatio = parseFloat(amount1) || 0;
        if (canCalculate && (input0ForRatio > 0 || input1ForRatio > 0)) {
            try {
                const userLiquidity = getLiquidityForAmounts(poolInfo, tickLower, tickUpper, amount0, amount1);
                const poolLiquidity = BigInt(poolInfo.liquidity);
                if (poolLiquidity > 0n) {
                    const totalLiquidity = poolLiquidity + userLiquidity;
                    const ratio = totalLiquidity > 0n ? (Number(userLiquidity * 10000n / totalLiquidity) / 100) : 0;
                    setLiquidityRatio(ratio);
                } else if (userLiquidity > 0n) {
                    setLiquidityRatio(100);
                } else {
                    setLiquidityRatio(null);
                }
            } catch (error) {
                console.error("计算流动性占比失败:", error);
                setLiquidityRatio(null);
            }
        } else {
            setLiquidityRatio(null);
        }
    }, [isAmountInputting, amount0, amount1, lastEdited, poolInfo, tickLower, tickUpper]);

    const handleAmountChange = useCallback((value, tokenType) => {
        setIsAmountInputting(true);
        if (amountUpdateTimer.current) clearTimeout(amountUpdateTimer.current);

        const setter = tokenType === 'amount0' ? setAmount0 : setAmount1;
        const editType = tokenType === 'amount0' ? 'amount0' : 'amount1';

        setter(value);
        setLastEdited(editType);

        amountUpdateTimer.current = setTimeout(() => {
            setIsAmountInputting(false);
        }, 800); // Debounce time
    }, []);

    const handleAmountBlur = useCallback(() => {
        if (amountUpdateTimer.current) clearTimeout(amountUpdateTimer.current);
        setIsAmountInputting(false);
    }, []);

    const checkApprovalStatus = useCallback(async () => {
        if (!provider || !account || !signer || !amount0 || !amount1) return;
        try {
            setIsCheckingApproval(true);
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

    const handleApprove = async (tokenAddress, tokenSymbol) => {
        if (!signer) { setError('请先连接钱包'); return; }
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

    const handleAddLiquidity = async () => {
        if (!connected) { connect(); return; }
        if (!signer || !provider) { setError('钱包连接异常，请重新连接'); return; }
        if (!amount0 || !amount1) { setError('请输入代币数量'); return; }
        if (tickLower === null || tickUpper === null || tickLower >= tickUpper) { setError('请设置有效的价格区间'); return; }
        try {
            setIsAddingLiquidity(true);
            setError('');
            await checkApprovalStatus();
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
            const transferEvent = receipt.logs.find(log =>
                log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                log.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000'
            );
            const tokenId = transferEvent ? parseInt(transferEvent.topics[3], 16) : null;
            setResult({ success: true, message: '流动性添加成功！', txHash: tx.hash, tokenId });
        } catch (error) {
            console.error('添加流动性失败:', error);
            setError(`添加流动性失败: ${error.message}`);
        } finally {
            setIsAddingLiquidity(false);
        }
    };

    useEffect(() => {
        if (isVisible && connected && provider && account) {
            setToken0NeedsApproval(false);
            setToken1NeedsApproval(false);
            setIsCheckingApproval(false);
        }
    }, [isVisible, connected, provider, account]);

    const adjustPrice = (boxType, direction) => {
        if (!poolInfo) return;
        const { fee, token0, token1 } = poolInfo;
        const tickSpacing = getTickSpacing(fee);

        const isMinBox = boxType === 'min';
        // 根据UI上的框和价格方向，确定要修改哪个内部tick
        const tickToChange = (isMinBox !== isReversed) ? tickLower : tickUpper;

        if (tickToChange === null) return;

        // isReversed时，UI上的+对应tick的-
        const tickDirection = isReversed ? -direction : direction;

        const newTick = tickToChange + (tickDirection * tickSpacing);

        const newInternalPrice = calculatePriceFromTick(newTick, token0.decimals, token1.decimals);
        const newDisplayPrice = getDisplayPrice(newInternalPrice);

        let newPriceLower = priceLower;
        let newPriceUpper = priceUpper;
        let newTickLower = tickLower;
        let newTickUpper = tickUpper;

        if (isMinBox) {
            newPriceLower = newDisplayPrice;
            if (isReversed) newTickUpper = newTick;
            else newTickLower = newTick;
        } else {
            newPriceUpper = newDisplayPrice;
            if (isReversed) newTickLower = newTick;
            else newTickUpper = newTick;
        }

        // 强制保证顺序
        if (parseFloat(newPriceLower) > parseFloat(newPriceUpper)) {
            [newPriceLower, newPriceUpper] = [newPriceUpper, newPriceLower];
            [newTickLower, newTickUpper] = [newTickUpper, newTickLower];
        }

        setPriceLower(newPriceLower);
        setPriceUpper(newPriceUpper);
        setTickLower(newTickLower);
        setTickUpper(newTickUpper);
    };

    const handleSetPriceRange = (percentage) => {
        if (!poolInfo) return;
        const currentPrice = poolInfo.price.token1PerToken0;
        const range = currentPrice * (percentage / 100);

        const newLowerInternalPrice = currentPrice - range;
        const newUpperInternalPrice = currentPrice + range;

        const { token0, token1, fee } = poolInfo;
        const tickSpacing = getTickSpacing(fee);

        const newTickLower = Math.round(calculateTickFromPrice(newLowerInternalPrice, token0.decimals, token1.decimals) / tickSpacing) * tickSpacing;
        const newTickUpper = Math.round(calculateTickFromPrice(newUpperInternalPrice, token0.decimals, token1.decimals) / tickSpacing) * tickSpacing;

        setTickLower(newTickLower);
        setTickUpper(newTickUpper);

        const alignedLowerInternal = calculatePriceFromTick(newTickLower, token0.decimals, token1.decimals);
        const alignedUpperInternal = calculatePriceFromTick(newTickUpper, token0.decimals, token1.decimals);

        // UI显示时，不需要考虑isReversed，因为这是基于当前价格的全新设定
        setPriceLower(getDisplayPrice(alignedLowerInternal));
        setPriceUpper(getDisplayPrice(alignedUpperInternal));
    };

    // 价格失焦事件处理，立即触发价格调整
    const handlePriceBlur = useCallback((type) => {
        if (inputTimer.current) {
            clearTimeout(inputTimer.current);
        }
        setIsUserInputting(false);

        if (!poolInfo) return;

        const { token0, token1, fee } = poolInfo;
        const tickSpacing = getTickSpacing(fee);

        // 确定当前操作的是哪个价格和tick
        const isLowerBox = type === 'lower';
        const priceStr = isLowerBox ? priceLower : priceUpper;

        if (priceStr === '' || isNaN(parseFloat(priceStr))) return;

        // 1. 将输入的显示价格转换为内部价格
        const internalPrice = parseDisplayPrice(priceStr);
        if (internalPrice <= 0) return;

        // 2. 计算对齐的tick和新的显示价格
        const rawTick = calculateTickFromPrice(internalPrice, token0.decimals, token1.decimals);
        const alignedTick = Math.round(rawTick / tickSpacing) * tickSpacing;
        const newInternalPrice = calculatePriceFromTick(alignedTick, token0.decimals, token1.decimals);
        const newDisplayPrice = getDisplayPrice(newInternalPrice);

        // 准备新的状态值
        let newPriceLower = isLowerBox ? newDisplayPrice : priceLower;
        let newPriceUpper = isLowerBox ? priceUpper : newDisplayPrice;
        let newTickLower = tickLower;
        let newTickUpper = tickUpper;

        // 更新对应的tick值，注意方向反转
        if (isLowerBox) {
            if (isReversed) newTickUpper = alignedTick;
            else newTickLower = alignedTick;
        } else { // isUpperBox
            if (isReversed) newTickLower = alignedTick;
            else newTickUpper = alignedTick;
        }

        // 3. 检查并强制保证价格和tick的顺序正确
        if (parseFloat(newPriceLower) > parseFloat(newPriceUpper)) {
            [newPriceLower, newPriceUpper] = [newPriceUpper, newPriceLower]; // 交换价格
            [newTickLower, newTickUpper] = [newTickUpper, newTickLower]; // 交换ticks
        }

        // 4. 一次性原子更新所有状态
        setPriceLower(newPriceLower);
        setPriceUpper(newPriceUpper);
        setTickLower(newTickLower);
        setTickUpper(newTickUpper);

    }, [isReversed, poolInfo, priceLower, priceUpper, getDisplayPrice, parseDisplayPrice, tickLower, tickUpper]);

    // 处理价格输入变化
    const handlePriceChange = useCallback((value, type) => {
        setIsUserInputting(true);

        if (type === 'lower') {
            setPriceLower(value);
        } else {
            setPriceUpper(value);
        }

        if (inputTimer.current) {
            clearTimeout(inputTimer.current);
        }

        inputTimer.current = setTimeout(() => {
            handlePriceBlur(type);
        }, 800);
    }, [handlePriceBlur]);

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

    useEffect(() => {
        if (isVisible && connected && provider && account && poolInfo) {
            fetchBalances();
        }
    }, [isVisible, connected, provider, account, poolInfo, fetchBalances]);

    return {
        // State
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
        transactionHash,
        lastEdited, setLastEdited,
        balances,
        isLoadingBalances,
        liquidityRatio,

        // Wallet
        provider,
        signer,
        account,
        connected,
        connect,
        isInitializing,

        // Handlers
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

        // Helpers
        getDisplayPrice
    };
}; 