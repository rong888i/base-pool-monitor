'use client';

import { useState } from 'react';
import { ethers, getAddress, Contract } from 'ethers';

const TokenInput = ({ value, onChange, commonTokens, label, id, icon }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">{label}</label>
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                {icon}
            </div>
            <input
                type="text"
                name={id}
                id={id}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent rounded-lg 
                           text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 font-mono text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent focus:bg-white dark:focus:bg-neutral-900
                           transition-all duration-300"
                placeholder="0x..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
        <div className="mt-2.5 flex items-center flex-wrap gap-2">
            {Object.entries(commonTokens).map(([name, address]) => (
                <button
                    key={name}
                    type="button"
                    onClick={() => onChange(address)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200
                        ${value.toLowerCase() === address.toLowerCase()
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-neutral-200 dark:bg-neutral-700/60 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                        }`}
                >
                    {name}
                </button>
            ))}
        </div>
    </div>
);

const PoolCalculatorSection = ({ onAddPool }) => {
    const [token0, setToken0] = useState('');
    const [token1, setToken1] = useState('');
    const [fee, setFee] = useState(100); // Default to 0.3%
    const [dex, setDex] = useState('uniswap'); // 'uniswap' or 'pancakeswap'
    const [poolAddress, setPoolAddress] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const commonTokens = {
        'WBNB': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        'USDT': '0x55d398326f99059fF775485246999027B3197955',
        'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    };

    const factoryAddresses = {
        uniswap: '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7', // Uniswap V3 Factory on BSC
        pancakeswap: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865', // PancakeSwap V3 Factory on BSC
    };

    const V3_FACTORY_ABI = [
        'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
    ];

    const calculatePoolAddress = async () => {
        setIsLoading(true);
        setError('');
        setPoolAddress('');

        if (!token0 || !token1) {
            setError('请输入两个代币的地址');
            setIsLoading(false);
            return;
        }

        try {
            const tokenA = getAddress(token0);
            const tokenB = getAddress(token1);

            if (tokenA === tokenB) {
                setError('代币地址不能相同');
                setIsLoading(false);
                return;
            }

            const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
            const factoryAddress = factoryAddresses[dex];
            const factoryContract = new Contract(factoryAddress, V3_FACTORY_ABI, provider);

            const fetchedPoolAddress = await factoryContract.getPool(tokenA, tokenB, fee);

            if (fetchedPoolAddress === '0x0000000000000000000000000000000000000000') {
                setError('未找到该组合的池子');
                setPoolAddress('');
            } else {
                setPoolAddress(fetchedPoolAddress);
            }
        } catch (e) {
            setError('地址无效或RPC出错');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 space-y-5">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-800/50 rounded-lg text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="font-medium">
                    <strong className="font-semibold">提示:</strong> 输入两个代币地址和费用等级，即可计算出对应的V3池地址。
                </div>
            </div>

            <div className="space-y-4">
                <TokenInput
                    label="代币 0"
                    id="token0"
                    value={token0}
                    onChange={setToken0}
                    commonTokens={commonTokens}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-400 dark:text-neutral-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414 0l-7-7A.997.997 0 0 1 2 10V5a1 1 0 0 1 1-1h5a1 1 0 0 1 .707.293l7 7zM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" /></svg>}
                />
                <TokenInput
                    label="代币 1"
                    id="token1"
                    value={token1}
                    onChange={setToken1}
                    commonTokens={commonTokens}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-400 dark:text-neutral-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414 0l-7-7A.997.997 0 0 1 2 10V5a1 1 0 0 1 1-1h5a1 1 0 0 1 .707.293l7 7zM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" /></svg>}
                />

                <div>
                    <label htmlFor="fee" className="block text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">费用等级 (Fee Tier)</label>
                    <select
                        id="fee"
                        name="fee"
                        className="w-full pl-3 pr-10 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent rounded-lg 
                                   text-neutral-800 dark:text-neutral-100 
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent focus:bg-white dark:focus:bg-neutral-900
                                   transition-all duration-300 sm:text-sm"
                        value={fee}
                        onChange={(e) => setFee(Number(e.target.value))}
                    >
                        <option value={100}>0.01% (适用于稳定币对)</option>
                        <option value={500}>0.05% (适用于主流币对)</option>
                        <option value={3000}>0.30% (适用于大多数币对)</option>
                        <option value={10000}>1.00% (适用于小众币对)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">交易所 (DEX)</label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                        <label className={`flex items-center justify-center p-3 rounded-lg cursor-pointer text-sm font-semibold transition-all duration-200 ${dex === 'uniswap' ? 'bg-blue-600 text-white shadow-lg' : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700'}`}>
                            <input
                                type="radio"
                                name="dex"
                                value="uniswap"
                                checked={dex === 'uniswap'}
                                onChange={() => setDex('uniswap')}
                                className="sr-only"
                            />
                            <span>Uniswap V3</span>
                        </label>
                        <label className={`flex items-center justify-center p-3 rounded-lg cursor-pointer text-sm font-semibold transition-all duration-200 ${dex === 'pancakeswap' ? 'bg-blue-600 text-white shadow-lg' : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700'}`}>
                            <input
                                type="radio"
                                name="dex"
                                value="pancakeswap"
                                checked={dex === 'pancakeswap'}
                                onChange={() => setDex('pancakeswap')}
                                className="sr-only"
                            />
                            <span>PancakeSwap V3</span>
                        </label>
                    </div>
                </div>
            </div>

            <button
                onClick={calculatePoolAddress}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                                disabled:from-neutral-300 disabled:to-neutral-400 dark:disabled:from-neutral-600 dark:disabled:to-neutral-700
                                text-white font-semibold py-2.5 px-4 rounded-lg 
                                disabled:opacity-70 disabled:cursor-not-allowed 
                                hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]
                                transition-all duration-200 text-sm flex items-center justify-center gap-2 group"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>查询中...</span>
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 -ml-1 group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                        </svg>
                        <span>查询池地址</span>
                    </>
                )}
            </button>

            {error && <p className="text-red-500 text-sm text-center font-semibold animate-shake">{error}</p>}

            {poolAddress && (
                <div className="p-4 bg-green-50 dark:bg-green-900/40 rounded-lg animate-in fade-in duration-500">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">查询成功! 池地址为:</p>
                    <p className="text-sm text-green-700 dark:text-green-300 break-all mt-1.5 font-mono">{poolAddress}</p>
                    <button
                        onClick={() => onAddPool({ address: poolAddress })}
                        className="mt-3 w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                        </svg>
                        添加到列表
                    </button>
                </div>
            )}
        </div>
    );
};

export default PoolCalculatorSection; 