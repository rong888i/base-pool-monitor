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
    const priceUpdateTimer = useRef(null);
    const amountUpdateTimer = useRef(null);

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
        if (poolInfo && tickLower !== null && tickUpper !== null && !isDirectionChanging) {
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
    }, [tickLower, tickUpper, isReversed, poolInfo, isDirectionChanging]);

    useEffect(() => {
        if (amountUpdateTimer.current) clearTimeout(amountUpdateTimer.current);
        amountUpdateTimer.current = setTimeout(() => {
            if (!poolInfo || tickLower === null || tickUpper === null || !lastEdited || tickLower >= tickUpper) return;
            const { tick, sqrtPriceX96, token0, token1 } = poolInfo;
            const input0 = parseFloat(amount0);
            const input1 = parseFloat(amount1);

            const getNewAmounts = (liquidity) => {
                return getAmountsForLiquidity(liquidity.toString(), sqrtPriceX96, tick, tickLower, tickUpper, token0.decimals, token1.decimals);
            };

            if (lastEdited === 'amount0') {
                if (amount0 === '' || input0 < 0) {
                    if (amount1 !== '') setAmount1('');
                    return;
                }
                const liquidity = getLiquidityForAmount0(poolInfo, tickLower, tickUpper, amount0);
                const { formatted } = getNewAmounts(liquidity);
                if (Math.abs(parseFloat(formatted.token1) - (input1 || 0)) > 1e-9) {
                    setAmount1(formatted.token1);
                } else if (input1 === null || isNaN(input1)) {
                    setAmount1(formatted.token1);
                }
            } else if (lastEdited === 'amount1') {
                if (amount1 === '' || input1 < 0) {
                    if (amount0 !== '') setAmount0('');
                    return;
                }
                const liquidity = getLiquidityForAmount1(poolInfo, tickLower, tickUpper, amount1);
                const { formatted } = getNewAmounts(liquidity);
                if (Math.abs(parseFloat(formatted.token0) - (input0 || 0)) > 1e-9) {
                    setAmount0(formatted.token0);
                } else if (input0 === null || isNaN(input0)) {
                    setAmount0(formatted.token0);
                }
            }
        }, 300);
        return () => clearTimeout(amountUpdateTimer.current);
    }, [amount0, amount1, lastEdited, poolInfo, tickLower, tickUpper]);

    useEffect(() => {
        if (priceUpdateTimer.current) clearTimeout(priceUpdateTimer.current);
        priceUpdateTimer.current = setTimeout(() => {
            if (!poolInfo || !priceLower || !priceUpper || isDirectionChanging) return;
            const { token0, token1, fee } = poolInfo;
            const tickSpacing = getTickSpacing(fee);
            let shouldUpdate = false;
            let newLowerTick = tickLower;
            let newUpperTick = tickUpper;
            const lowerPrice = parseDisplayPrice(priceLower);
            const upperPrice = parseDisplayPrice(priceUpper);
            if (lowerPrice > 0 && upperPrice > 0) {
                const lowerTick = calculateTickFromPrice(lowerPrice, token0.decimals, token1.decimals);
                const upperTick = calculateTickFromPrice(upperPrice, token0.decimals, token1.decimals);
                const alignedLowerTick = Math.round(lowerTick / tickSpacing) * tickSpacing;
                const alignedUpperTick = Math.round(upperTick / tickSpacing) * tickSpacing;
                if (alignedLowerTick < alignedUpperTick) {
                    if (alignedLowerTick !== tickLower) { newLowerTick = alignedLowerTick; shouldUpdate = true; }
                    if (alignedUpperTick !== tickUpper) { newUpperTick = alignedUpperTick; shouldUpdate = true; }
                }
            }
            if (shouldUpdate) {
                setTickLower(newLowerTick);
                setTickUpper(newUpperTick);
            }
        }, 300);
        return () => clearTimeout(priceUpdateTimer.current);
    }, [priceLower, priceUpper, poolInfo, isDirectionChanging]);

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

    const adjustPrice = (boxType, direction) => {
        const tickToAdjustName = (boxType === 'min' && !isReversed) || (boxType === 'max' && isReversed) ? 'lower' : 'upper';
        const effectiveDirection = isReversed ? -direction : direction;
        adjustPriceByTick(tickToAdjustName, effectiveDirection);
    };

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

        // Helpers
        getDisplayPrice
    };
}; 