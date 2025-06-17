'use client';

import { useState } from 'react';
import { ethers, getAddress, Contract } from 'ethers';

const TokenInput = ({ value, onChange, commonTokens, label, id }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{label}</label>
        <input
            type="text"
            name={id}
            id={id}
            className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-neutral-300 dark:border-neutral-700 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-md"
            placeholder="0x..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
        <div className="mt-2 flex items-center flex-wrap gap-2">
            {Object.entries(commonTokens).map(([name, address]) => (
                <button
                    key={name}
                    type="button"
                    onClick={() => onChange(address)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${value.toLowerCase() === address.toLowerCase() ? 'bg-primary-600 text-white' : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700'}`}
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
    const [fee, setFee] = useState(3000); // Default to 0.3%
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
            setError('请输入代币地址');
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
                setError('池子未创建');
                setPoolAddress('');
            } else {
                setPoolAddress(fetchedPoolAddress);
            }
        } catch (e) {
            setError('无效地址或RPC错误');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div className="space-y-4">
                <TokenInput
                    label="Token 0"
                    id="token0"
                    value={token0}
                    onChange={setToken0}
                    commonTokens={commonTokens}
                />
                <TokenInput
                    label="Token 1"
                    id="token1"
                    value={token1}
                    onChange={setToken1}
                    commonTokens={commonTokens}
                />

                <div>
                    <label htmlFor="fee" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Fee Tier</label>
                    <select
                        id="fee"
                        name="fee"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-neutral-300 dark:border-neutral-700 bg-neutral-200/50 dark:bg-neutral-800/50 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                        value={fee}
                        onChange={(e) => setFee(Number(e.target.value))}
                    >
                        <option value={100}>0.01%</option>
                        <option value={500}>0.05%</option>
                        <option value={3000}>0.30%</option>
                        <option value={10000}>1.00%</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">DEX</label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                        <label className={`flex items-center justify-center p-3 rounded-md cursor-pointer text-sm font-medium transition-colors ${dex === 'uniswap' ? 'bg-primary-600 text-white shadow-md' : 'bg-neutral-200/80 dark:bg-neutral-800/80 hover:bg-neutral-300/80 dark:hover:bg-neutral-700/80'}`}>
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
                        <label className={`flex items-center justify-center p-3 rounded-md cursor-pointer text-sm font-medium transition-colors ${dex === 'pancakeswap' ? 'bg-primary-600 text-white shadow-md' : 'bg-neutral-200/80 dark:bg-neutral-800/80 hover:bg-neutral-300/80 dark:hover:bg-neutral-700/80'}`}>
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
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
                {isLoading ? '查询中...' : '查询池地址'}
            </button>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {poolAddress && (
                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">池地址:</p>
                    <p className="text-sm text-primary-600 dark:text-primary-400 break-all mt-1">{poolAddress}</p>
                    <button
                        onClick={() => onAddPool({ address: poolAddress })}
                        className="mt-3 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                        添加到列表
                    </button>
                </div>
            )}
        </div>
    );
};

export default PoolCalculatorSection; 