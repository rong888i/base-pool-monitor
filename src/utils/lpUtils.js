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

// Uniswap V3 NonfungiblePositionManager ABI（用于获取NFT位置信息）
const POSITION_MANAGER_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'positions',
    outputs: [
      { internalType: 'uint96', name: 'nonce', type: 'uint96' },
      { internalType: 'address', name: 'operator', type: 'address' },
      { internalType: 'address', name: 'token0', type: 'address' },
      { internalType: 'address', name: 'token1', type: 'address' },
      { internalType: 'uint24', name: 'fee', type: 'uint24' },
      { internalType: 'int24', name: 'tickLower', type: 'int24' },
      { internalType: 'int24', name: 'tickUpper', type: 'int24' },
      { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
      { internalType: 'uint256', name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { internalType: 'uint256', name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { internalType: 'uint128', name: 'tokensOwed0', type: 'uint128' },
      { internalType: 'uint128', name: 'tokensOwed1', type: 'uint128' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

// BSC上的Position Manager地址
const POSITION_MANAGER_ADDRESSES = {
  PANCAKESWAP_V3: '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364',
  UNISWAP_V3: '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613', // Uniswap V3在BSC上的Position Manager
};

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

/**
 * 根据协议获取Position Manager地址
 * @param {string} factoryAddress - Factory合约地址
 * @returns {string} Position Manager地址
 */
function getPositionManagerAddress(factoryAddress) {
  const upperFactory = factoryAddress.toUpperCase();
  
  if (upperFactory === PROTOCOL_FACTORIES.PANCAKESWAP_V3.toUpperCase()) {
    return POSITION_MANAGER_ADDRESSES.PANCAKESWAP_V3;
  } else if (upperFactory === PROTOCOL_FACTORIES.UNISWAP_V3.toUpperCase()) {
    return POSITION_MANAGER_ADDRESSES.UNISWAP_V3;
  } else {
    // 默认使用PancakeSwap V3的Position Manager
    return POSITION_MANAGER_ADDRESSES.PANCAKESWAP_V3;
  }
}

/**
 * 从tick计算价格
 * @param {number} tick - tick值
 * @param {number} decimals0 - token0的小数位数
 * @param {number} decimals1 - token1的小数位数
 * @returns {number} 价格
 */
function calculatePriceFromTick(tick, decimals0, decimals1) {
  const price = Math.pow(1.0001, tick);
  return price * Math.pow(10, decimals0 - decimals1);
}

/**
 * 获取NFT位置信息
 * @param {string} nftId - NFT ID
 * @param {string} poolAddress - 池子地址
 * @param {Object} lpInfo - 池子信息
 * @returns {Object} NFT位置信息
 */
async function getNFTPositionInfo(nftId, poolAddress, lpInfo) {
  try {
    console.log(`🔍 正在获取NFT位置信息: ${nftId}`);

    // 获取Position Manager地址
    const positionManagerAddress = getPositionManagerAddress(lpInfo.factoryAddress);

    // 获取NFT位置信息
    const positionData = await client.readContract({
      address: positionManagerAddress,
      abi: POSITION_MANAGER_ABI,
      functionName: 'positions',
      args: [BigInt(nftId)]
    });

    const [
      nonce,
      operator,
      token0,
      token1,
      fee,
      tickLower,
      tickUpper,
      liquidity,
      feeGrowthInside0LastX128,
      feeGrowthInside1LastX128,
      tokensOwed0,
      tokensOwed1
    ] = positionData;

    // 验证NFT是否属于当前池子
    const isValidPool = token0.toLowerCase() === lpInfo.token0.address.toLowerCase() &&
                       token1.toLowerCase() === lpInfo.token1.address.toLowerCase() &&
                       Number(fee) === lpInfo.fee;

    if (!isValidPool) {
      throw new Error('NFT不属于当前池子');
    }

    // 计算价格范围
    const priceLower = calculatePriceFromTick(Number(tickLower), lpInfo.token0.decimals, lpInfo.token1.decimals);
    const priceUpper = calculatePriceFromTick(Number(tickUpper), lpInfo.token0.decimals, lpInfo.token1.decimals);

    // 检查当前价格是否在范围内
    const currentPrice = lpInfo.price.token1PerToken0;
    const isInRange = currentPrice >= priceLower && currentPrice <= priceUpper;

    // 计算流动性状态
    const hasLiquidity = Number(liquidity) > 0;

    return {
      nftId,
      isValid: true,
      isValidPool: true,
      hasLiquidity,
      isInRange,
      liquidity: liquidity.toString(),
      tickLower: Number(tickLower),
      tickUpper: Number(tickUpper),
      priceRange: {
        lower: priceLower,
        upper: priceUpper,
        lowerFormatted: `1 ${lpInfo.token0.symbol} = ${priceLower.toFixed(6)} ${lpInfo.token1.symbol}`,
        upperFormatted: `1 ${lpInfo.token0.symbol} = ${priceUpper.toFixed(6)} ${lpInfo.token1.symbol}`
      },
      currentPrice: currentPrice,
      tokensOwed: {
        token0: tokensOwed0.toString(),
        token1: tokensOwed1.toString()
      },
      status: isInRange ? (hasLiquidity ? '✅ 活跃' : '⚠️ 无流动性') : '❌ 超出范围'
    };

  } catch (error) {
    console.error('❌ 获取NFT位置信息时出错:', error.message);
    return {
      nftId,
      isValid: false,
      error: error.message,
      status: '❌ 错误'
    };
  }
}

export { getLPInfo, calculatePriceFromSqrtPriceX96, getNFTPositionInfo }; 