import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

// BSC主网配置
const client = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed1.binance.org/')
});

// 协议识别 - BSC上的已知Factory地址
const PROTOCOL_FACTORIES = {
  PANCAKESWAP_V3: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
  UNISWAP_V3: '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7', // Uniswap V3 在BSC上的Factory
  // 可以添加更多协议
};

// Uniswap V3 Pool ABI（简化版，只包含需要的函数）
const POOL_ABI = [
  {
    inputs: [],
    name: 'factory',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
      { internalType: 'int24', name: 'tick', type: 'int24' },
      { internalType: 'uint16', name: 'observationIndex', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinality', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinalityNext', type: 'uint16' },
      { internalType: 'uint8', name: 'feeProtocol', type: 'uint8' },
      { internalType: 'bool', name: 'unlocked', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'fee',
    outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// ERC20 ABI（获取代币信息）
const ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * 识别协议类型
 * @param {string} factoryAddress - Factory合约地址
 * @returns {Object} 协议信息
 */
function identifyProtocol(factoryAddress) {
  const upperFactory = factoryAddress.toUpperCase();
  
  if (upperFactory === PROTOCOL_FACTORIES.PANCAKESWAP_V3.toUpperCase()) {
    return {
      name: 'PancakeSwap V3',
      icon: '🥞',
      color: 'bg-yellow-100 text-yellow-800',
      borderColor: 'border-yellow-300'
    };
  } else if (upperFactory === PROTOCOL_FACTORIES.UNISWAP_V3.toUpperCase()) {
    return {
      name: 'Uniswap V3',
      icon: '🦄',
      color: 'bg-pink-100 text-pink-800',
      borderColor: 'border-pink-300'
    };
  } else {
    return {
      name: 'Unknown DEX',
      icon: '❓',
      color: 'bg-gray-100 text-gray-800',
      borderColor: 'border-gray-300'
    };
  }
}

/**
 * 格式化大数字显示
 * @param {bigint} balance - 余额
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的余额
 */
function formatBalance(balance, decimals) {
  const balanceNumber = Number(balance) / Math.pow(10, decimals);
  
  if (balanceNumber >= 1000000) {
    return `${(balanceNumber / 1000000).toFixed(2)}M`;
  } else if (balanceNumber >= 1000) {
    return `${(balanceNumber / 1000).toFixed(2)}K`;
  } else if (balanceNumber >= 1) {
    return balanceNumber.toFixed(2);
  } else if (balanceNumber >= 0.01) {
    return balanceNumber.toFixed(4);
  } else {
    return balanceNumber.toExponential(2);
  }
}

/**
 * 计算价格从sqrtPriceX96
 * @param {bigint} sqrtPriceX96 - sqrt价格 * 2^96
 * @param {number} decimals0 - token0的小数位数
 * @param {number} decimals1 - token1的小数位数
 * @returns {number} 价格 (token1/token0)
 */
function calculatePriceFromSqrtPriceX96(sqrtPriceX96, decimals0, decimals1) {
  // price = (sqrtPriceX96 / 2^96)^2 * 10^(decimals0 - decimals1)
  const Q96 = 2n ** 96n;
  const price = Number(sqrtPriceX96 * sqrtPriceX96) / Number(Q96 * Q96);
  return price * Math.pow(10, decimals0 - decimals1);
}

/**
 * 获取LP池的详细信息
 * @param {string} poolAddress - LP池地址
 * @returns {Object} 包含价格、tick等信息的对象
 */
async function getLPInfo(poolAddress) {
  try {
    console.log(`🔍 正在获取LP池信息: ${poolAddress}`);

    // 1. 获取池子的基本信息（包括factory地址）
    const [factoryAddress, slot0Data, token0Address, token1Address, fee, liquidity] = await Promise.all([
      client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'factory'
      }),
      client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'slot0'
      }),
      client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'token0'
      }),
      client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'token1'
      }),
      client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'fee'
      }),
      client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'liquidity'
      })
    ]);

    // 2. 识别协议
    const protocol = identifyProtocol(factoryAddress);

    // 3. 获取代币信息和余额
    const [token0Info, token1Info, token0Balance, token1Balance] = await Promise.all([
      Promise.all([
        client.readContract({
          address: token0Address,
          abi: ERC20_ABI,
          functionName: 'symbol'
        }),
        client.readContract({
          address: token0Address,
          abi: ERC20_ABI,
          functionName: 'decimals'
        })
      ]),
      Promise.all([
        client.readContract({
          address: token1Address,
          abi: ERC20_ABI,
          functionName: 'symbol'
        }),
        client.readContract({
          address: token1Address,
          abi: ERC20_ABI,
          functionName: 'decimals'
        })
      ]),
      client.readContract({
        address: token0Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [poolAddress]
      }),
      client.readContract({
        address: token1Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [poolAddress]
      })
    ]);

    const [token0Symbol, token0Decimals] = token0Info;
    const [token1Symbol, token1Decimals] = token1Info;

    // 4. 解析slot0数据
    const [sqrtPriceX96, tick] = slot0Data;

    // 5. 计算价格
    const price = calculatePriceFromSqrtPriceX96(sqrtPriceX96, token0Decimals, token1Decimals);
    const reversePrice = 1 / price;

    // 6. 格式化结果
    const result = {
      poolAddress,
      protocol, // 添加协议信息
      factoryAddress,
      token0: {
        address: token0Address,
        symbol: token0Symbol,
        decimals: token0Decimals,
        balance: formatBalance(token0Balance, token0Decimals),
        rawBalance: token0Balance.toString()
      },
      token1: {
        address: token1Address,
        symbol: token1Symbol,
        decimals: token1Decimals,
        balance: formatBalance(token1Balance, token1Decimals),
        rawBalance: token1Balance.toString()
      },
      fee: Number(fee),
      feePercentage: Number(fee) / 10000, // 费率百分比
      tick: Number(tick),
      liquidity: liquidity.toString(),
      sqrtPriceX96: sqrtPriceX96.toString(),
      price: {
        token1PerToken0: price,
        token0PerToken1: reversePrice,
        formatted: `1 ${token0Symbol} = ${price.toFixed(6)} ${token1Symbol}`,
        formattedReverse: `1 ${token1Symbol} = ${reversePrice.toFixed(6)} ${token0Symbol}`
      },
      lastUpdated: new Date().toLocaleTimeString()
    };

    return result;

  } catch (error) {
    console.error('❌ 获取LP信息时出错:', error.message);
    throw error;
  }
}

export { getLPInfo, calculatePriceFromSqrtPriceX96 }; 