'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/providers/WalletProvider';
import { checkTokenAllowance, approveToken, getTokenBalance, parseTokenAmount, formatTokenAmount, swapExactInputSingle, getSwapRouterAddress } from '@/utils/web3Utils';
// 移除全局滑点依赖
import { calculatePriceFromTick } from '@/utils/lpUtils';

export const useSwap = (poolInfo, isVisible, onClose) => {
    const { provider, signer, account, connected, connect, chainId, isInitializing } = useWallet();
    const [fromAmount, setFromAmount] = useState('');
    const [fromToken, setFromToken] = useState(poolInfo?.token0 || {});
    const [toToken, setToToken] = useState(poolInfo?.token1 || {});
    const [slippage, setSlippage] = useState(1);
    const [balances, setBalances] = useState({ token0: '0', token1: '0' });
    const [isLoadingBalances, setIsLoadingBalances] = useState(false);
    const [isCheckingApproval, setIsCheckingApproval] = useState(false);
    const [tokenInNeedsApproval, setTokenInNeedsApproval] = useState(false);
    const [isApproving, setIsApproving] = useState({});
    const [isSwapping, setIsSwapping] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [toAmount, setToAmount] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    // 计算输出（近似：按池子当前 mid price & 手续费扣除）
    useEffect(() => {
        if (!fromAmount || !poolInfo) { setToAmount(''); return; }
        const { token0, token1, fee, tick } = poolInfo;
        if (tick === undefined || tick === null) { setToAmount(''); return; }
        const price0per1 = calculatePriceFromTick(tick, token0.decimals || 18, token1.decimals || 18); // token1/token0
        const isFromToken0 = fromToken.address === token0.address;
        const midPrice = isFromToken0 ? price0per1 : (price0per1 === 0 ? 0 : 1 / price0per1);
        const feeRatio = Math.max(0, 1 - (Number(fee) || 0) / 1_000_000); // fee 为 10000/500/3000/100 等，换算成比例
        const amountNum = parseFloat(fromAmount);
        if (isNaN(amountNum) || !isFinite(amountNum)) { setToAmount(''); return; }
        const out = amountNum * midPrice * feeRatio;
        setToAmount(out.toString());
    }, [fromAmount, fromToken, toToken, poolInfo]);

    const loadBalances = useCallback(async () => {
        if (!connected || !account || !provider || !poolInfo) return;
        try {
            setIsLoadingBalances(true);
            const [b0, b1] = await Promise.all([
                getTokenBalance(poolInfo.token0.address, account, provider),
                getTokenBalance(poolInfo.token1.address, account, provider)
            ]);
            const decimals0 = poolInfo.token0.decimals || 18;
            const decimals1 = poolInfo.token1.decimals || 18;
            setBalances({
                token0: formatTokenAmount(b0, decimals0),
                token1: formatTokenAmount(b1, decimals1)
            });
        } catch (e) {
            console.error('读取余额失败', e);
        } finally {
            setIsLoadingBalances(false);
        }
    }, [connected, account, provider, poolInfo]);

    useEffect(() => { if (isVisible) loadBalances(); }, [isVisible, loadBalances]);
    useEffect(() => { if (connected) loadBalances(); }, [connected, account, chainId, loadBalances]);

    const getRouterSpender = useCallback(() => {
        try {
            return getSwapRouterAddress(poolInfo?.protocol?.name || '', chainId);
        } catch {
            return undefined;
        }
    }, [poolInfo, chainId]);

    const checkApprovalStatus = useCallback(async () => {
        if (!connected || !account || !provider) return;
        try {
            setIsCheckingApproval(true);
            const spender = getRouterSpender();
            if (!spender) { setTokenInNeedsApproval(true); return; }
            const allowance = await checkTokenAllowance(fromToken.address, account, spender, provider);
            setTokenInNeedsApproval(allowance === 0n);
        } catch (e) {
            console.error('检查授权失败', e);
        } finally {
            setIsCheckingApproval(false);
        }
    }, [connected, account, provider, fromToken, getRouterSpender]);

    useEffect(() => { if (isVisible) checkApprovalStatus(); }, [isVisible, checkApprovalStatus]);

    const handleApprove = async (tokenAddress, symbol) => {
        if (!connected) { connect(); return; }
        if (!signer) { setError('钱包连接异常，请重试'); return; }
        try {
            setIsApproving(prev => ({ ...prev, [tokenAddress]: true }));
            setError('');
            // 授权给 Router，额度给最大值
            const maxUint = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
            const spender = getRouterSpender();
            if (!spender) { setError('未配置 SwapRouter 地址，请在 web3Utils 中配置'); return; }
            const tx = await approveToken(tokenAddress, spender, maxUint, signer);
            await tx.wait();
            await checkApprovalStatus();
        } catch (e) {
            console.error('授权失败', e);
            setError(`授权 ${symbol} 失败`);
        } finally {
            setIsApproving(prev => ({ ...prev, [tokenAddress]: false }));
        }
    };

    const handleSwap = async () => {
        if (!connected) { connect(); return; }
        if (!signer || !provider) { setError('钱包连接异常，请重新连接'); return; }
        if (!fromAmount || parseFloat(fromAmount) <= 0) { setError('请输入兑换数量'); return; }
        try {
            setIsSwapping(true);
            setError('');
            await checkApprovalStatus();
            if (tokenInNeedsApproval) { setError('请先完成代币授权'); setIsSwapping(false); return; }
            const amountInWei = parseTokenAmount(fromAmount, fromToken.decimals || 18);
            // 计算预期输出量（基于当前价格）
            const expectedOut = toAmount ? parseTokenAmount(toAmount, toToken.decimals || 18) : amountInWei;
            // 根据滑点计算最小输出量，默认滑点设置为1%
            const effSlip = typeof slippage === 'number' && slippage > 0 && slippage <= 50 ? slippage : 1.0;
            const minOut = (BigInt(expectedOut) * BigInt(Math.floor((100 - effSlip) * 100))) / BigInt(10000);
            const tx = await swapExactInputSingle({
                tokenIn: fromToken.address,
                tokenOut: toToken.address,
                fee: poolInfo.fee,
                amountIn: amountInWei,
                amountOutMin: minOut,
                recipient: account,
                chainId,
                protocolName: poolInfo.protocol?.name || '',
                signer
            });
            const receipt = await tx.wait();
            setResult({ success: true, message: '兑换成功！', txHash: tx.hash });
            loadBalances();
        } catch (e) {
            console.error('兑换失败', e);
            setError('兑换失败，请重试');
        } finally {
            setIsSwapping(false);
        }
    };

    const handleTokenSwitch = () => {
        setFromToken(prev => (prev.address === poolInfo.token0.address ? poolInfo.token1 : poolInfo.token0));
        setToToken(prev => (prev.address === poolInfo.token0.address ? poolInfo.token1 : poolInfo.token0));
        setFromAmount('');
        setToAmount('');
        setTimeout(loadBalances, 0);
    };

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    }, [onClose]);

    return {
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
    };
}; 