import { createPublicClient, http, encodeFunctionData, decodeAbiParameters } from 'viem';
import { bsc } from 'viem/chains';

// 获取RPC URL
const getRpcUrl = () => {
  const settings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
  return settings.rpcUrl || 'https://rpc.ankr.com/bsc/a2b51312ef9d86e0e1241bf58e5faac15e59c394ff4fe64318a61126e5d9fc79';
};

// BSC主网配置
const getClient = () => {
  return createPublicClient({
    chain: bsc,
    transport: http(getRpcUrl())
  });
};

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
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint128', name: 'amount0Max', type: 'uint128' },
          { internalType: 'uint128', name: 'amount1Max', type: 'uint128' }
        ],
        internalType: 'struct INonfungiblePositionManager.CollectParams',
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'collect',
    outputs: [
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' }
    ],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' }
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
];

const FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "tokenA", "type": "address" },
      { "internalType": "address", "name": "tokenB", "type": "address" },
      { "internalType": "uint24", "name": "fee", "type": "uint24" }
    ],
    "name": "getPool",
    "outputs": [{ "internalType": "address", "name": "pool", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
]

// BSC上的Position Manager地址
const POSITION_MANAGER_ADDRESSES = {
  PANCAKESWAP_V3: '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364',
  UNISWAP_V3: '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613', // Uniswap V3在BSC上的Position Manager (官方部署)
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
      name: 'PanCake V3',
      icon: '🥞',
      color: 'bg-yellow-100 text-yellow-800',
      borderColor: 'border-yellow-300'
    };
  } else if (upperFactory === PROTOCOL_FACTORIES.UNISWAP_V3.toUpperCase()) {
    return {
      name: 'Uni V3',
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
 * 获取费率对应的tickSpacing
 * @param {number} fee - 费率 (e.g., 500 for 0.05%)
 * @returns {number} tickSpacing
 */
export function getTickSpacing(fee) {
  switch (fee) {
    case 100: return 1; // 0.01%
    case 500: return 10; // 0.05%
    case 2500: return 50; // 0.25% (PancakeSwap)
    case 3000: return 60; // 0.3%
    case 10000: return 200; // 1%
    default: return 60; // 默认
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
 * 批量获取LP池的详细信息
 * @param {string[]} poolAddresses - LP池地址数组
 * @returns {Promise<Object[]>} 包含价格、tick等信息的对象数组
 */
async function getBatchLPInfo(poolAddresses) {
  try {
    console.log(`🔍 正在批量获取LP池信息: ${poolAddresses.length}个池子`);

    // 1. 准备所有池子的基本信息请求
    const batchRequests = poolAddresses.flatMap(poolAddress => {
      const factoryData = {
        jsonrpc: '2.0',
        id: `${poolAddress}-factory`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'factory'
          })
        }, 'latest']
      };

      const slot0Data = {
        jsonrpc: '2.0',
        id: `${poolAddress}-slot0`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'slot0'
          })
        }, 'latest']
      };

      const token0Data = {
        jsonrpc: '2.0',
        id: `${poolAddress}-token0`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'token0'
          })
        }, 'latest']
      };

      const token1Data = {
        jsonrpc: '2.0',
        id: `${poolAddress}-token1`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'token1'
          })
        }, 'latest']
      };

      const feeData = {
        jsonrpc: '2.0',
        id: `${poolAddress}-fee`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'fee'
          })
        }, 'latest']
      };

      const liquidityData = {
        jsonrpc: '2.0',
        id: `${poolAddress}-liquidity`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'liquidity'
          })
        }, 'latest']
      };

      return [factoryData, slot0Data, token0Data, token1Data, feeData, liquidityData];
    });

    // 2. 执行批量RPC调用
    const response = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchRequests)
    });

    const basicInfoResults = await response.json();
    if (!Array.isArray(basicInfoResults)) {
      throw new Error('Invalid RPC response');
    }

    // 3. 处理结果并准备代币信息请求
    const tokenRequests = [];
    const poolInfos = [];

    for (let i = 0; i < poolAddresses.length; i++) {
      const baseIndex = i * 6;
      const [
        factoryResult,
        slot0Result,
        token0Result,
        token1Result,
        feeResult,
        liquidityResult
      ] = basicInfoResults.slice(baseIndex, baseIndex + 6);

      if (factoryResult.error || slot0Result.error || token0Result.error ||
        token1Result.error || feeResult.error || liquidityResult.error) {
        throw new Error(`RPC call failed: ${JSON.stringify(basicInfoResults.slice(baseIndex, baseIndex + 6))}`);
      }

      const factoryAddress = decodeAbiParameters([{ type: 'address' }], factoryResult.result)[0];
      const token0Address = decodeAbiParameters([{ type: 'address' }], token0Result.result)[0];
      const token1Address = decodeAbiParameters([{ type: 'address' }], token1Result.result)[0];
      const fee = Number(decodeAbiParameters([{ type: 'uint24' }], feeResult.result)[0]);
      const liquidity = BigInt(decodeAbiParameters([{ type: 'uint128' }], liquidityResult.result)[0]);

      // 解析slot0数据
      const slot0Decoded = decodeAbiParameters([
        { type: 'uint160' },
        { type: 'int24' },
        { type: 'uint16' },
        { type: 'uint16' },
        { type: 'uint16' },
        { type: 'uint8' },
        { type: 'bool' }
      ], slot0Result.result);

      const sqrtPriceX96 = slot0Decoded[0];
      const tick = Number(slot0Decoded[1]);

      // 准备代币信息请求
      tokenRequests.push(
        {
          jsonrpc: '2.0',
          id: `${token0Address}-symbol`,
          method: 'eth_call',
          params: [{
            to: token0Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'symbol'
            })
          }, 'latest']
        },
        {
          jsonrpc: '2.0',
          id: `${token0Address}-decimals`,
          method: 'eth_call',
          params: [{
            to: token0Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'decimals'
            })
          }, 'latest']
        },
        {
          jsonrpc: '2.0',
          id: `${token1Address}-symbol`,
          method: 'eth_call',
          params: [{
            to: token1Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'symbol'
            })
          }, 'latest']
        },
        {
          jsonrpc: '2.0',
          id: `${token1Address}-decimals`,
          method: 'eth_call',
          params: [{
            to: token1Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'decimals'
            })
          }, 'latest']
        },
        {
          jsonrpc: '2.0',
          id: `${token0Address}-balance`,
          method: 'eth_call',
          params: [{
            to: token0Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [poolAddresses[i]]
            })
          }, 'latest']
        },
        {
          jsonrpc: '2.0',
          id: `${token1Address}-balance`,
          method: 'eth_call',
          params: [{
            to: token1Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [poolAddresses[i]]
            })
          }, 'latest']
        }
      );

      poolInfos.push({
        poolAddress: poolAddresses[i],
        factoryAddress,
        slot0Data: [sqrtPriceX96, tick],
        token0Address,
        token1Address,
        fee,
        liquidity
      });
    }

    // 4. 执行代币信息的批量RPC调用
    const tokenResponse = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenRequests)
    });

    const tokenResults = await tokenResponse.json();
    if (!Array.isArray(tokenResults)) {
      throw new Error('Invalid RPC response for token info');
    }

    // 5. 处理所有结果
    const finalResults = [];
    for (let i = 0; i < poolAddresses.length; i++) {
      const poolInfo = poolInfos[i];
      const tokenBaseIndex = i * 6;
      const [
        token0SymbolResult,
        token0DecimalsResult,
        token1SymbolResult,
        token1DecimalsResult,
        token0BalanceResult,
        token1BalanceResult
      ] = tokenResults.slice(tokenBaseIndex, tokenBaseIndex + 6);

      if (token0SymbolResult.error || token0DecimalsResult.error || token1SymbolResult.error ||
        token1DecimalsResult.error || token0BalanceResult.error || token1BalanceResult.error) {
        throw new Error(`Token RPC call failed: ${JSON.stringify(tokenResults.slice(tokenBaseIndex, tokenBaseIndex + 6))}`);
      }

      // 使用 viem 解码结果
      const token0Symbol = decodeAbiParameters([{ type: 'string' }], token0SymbolResult.result)[0];
      const token1Symbol = decodeAbiParameters([{ type: 'string' }], token1SymbolResult.result)[0];
      const token0Decimals = Number(decodeAbiParameters([{ type: 'uint8' }], token0DecimalsResult.result)[0]);
      const token1Decimals = Number(decodeAbiParameters([{ type: 'uint8' }], token1DecimalsResult.result)[0]);
      const token0Balance = BigInt(decodeAbiParameters([{ type: 'uint256' }], token0BalanceResult.result)[0]);
      const token1Balance = BigInt(decodeAbiParameters([{ type: 'uint256' }], token1BalanceResult.result)[0]);

      const [sqrtPriceX96, tick] = poolInfo.slot0Data;
      const price = calculatePriceFromSqrtPriceX96(sqrtPriceX96, token0Decimals, token1Decimals);
      const reversePrice = 1 / price;

      finalResults.push({
        poolAddress: poolInfo.poolAddress,
        protocol: identifyProtocol(poolInfo.factoryAddress),
        factoryAddress: poolInfo.factoryAddress,
        token0: {
          address: poolInfo.token0Address,
          symbol: token0Symbol,
          decimals: token0Decimals,
          balance: formatBalance(token0Balance, token0Decimals),
          rawBalance: token0Balance.toString()
        },
        token1: {
          address: poolInfo.token1Address,
          symbol: token1Symbol,
          decimals: token1Decimals,
          balance: formatBalance(token1Balance, token1Decimals),
          rawBalance: token1Balance.toString()
        },
        fee: Number(poolInfo.fee),
        feePercentage: Number(poolInfo.fee) / 10000,
        tick: Number(tick),
        liquidity: poolInfo.liquidity.toString(),
        sqrtPriceX96: sqrtPriceX96.toString(),
        price: {
          token1PerToken0: price,
          token0PerToken1: reversePrice,
          // formatted: `${price.toFixed(6)} ${token1Symbol}`,
          // formattedReverse: `${reversePrice.toFixed(6)} ${token0Symbol}`
          formatted: `1 ${token0Symbol} = ${price.toFixed(6)} ${token1Symbol}`,
          formattedReverse: `1 ${token1Symbol} = ${reversePrice.toFixed(6)} ${token0Symbol}`
        },
        lastUpdated: new Date().toLocaleTimeString()
      });
    }

    return finalResults;

  } catch (error) {
    console.error('❌ 批量获取LP信息时出错:', error.message);
    throw error;
  }
}

/**
 * 获取单个LP池的详细信息
 * @param {string} poolAddress - LP池地址
 * @returns {Promise<Object>} 包含价格、tick等信息的对象
 */
async function getLPInfo(poolAddress) {
  const results = await getBatchLPInfo([poolAddress]);
  return results[0];
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
export function calculatePriceFromTick(tick, decimals0, decimals1) {
  const price = Math.pow(1.0001, tick);
  return price * Math.pow(10, decimals0 - decimals1);
}

/**
 * 从价格计算tick (近似值)
 * @param {number} price - 价格 (token1/token0)
 * @param {number} decimals0 - token0的小数位数
 * @param {number} decimals1 - token1的小数位数
 * @returns {number} tick
 */
export function calculateTickFromPrice(price, decimals0, decimals1) {
  const adjustedPrice = price / Math.pow(10, decimals0 - decimals1);
  const tick = Math.log(adjustedPrice) / Math.log(1.0001);
  return Math.round(tick);
}

/**
 * 从tick计算sqrtPriceX96 (近似值)
 * @param {number} tick - tick值
 * @returns {bigint} sqrtPriceX96
 */
function tickToSqrtPriceX96(tick) {
  const sqrtPrice = Math.pow(1.0001, tick / 2);
  const Q96 = 2n ** 96n;
  // Using parseFloat on BigInt.toString() is safe for JS number limits
  return BigInt(Math.floor(sqrtPrice * parseFloat(Q96.toString())));
}

/**
 * 根据流动性计算代币数量
 * @param {string} liquidity - 流动性
 * @param {string} sqrtPriceX96_current - 当前的sqrtPriceX96
 * @param {number} tickCurrent - 当前的tick
 * @param {number} tickLower - 区间下限tick
 * @param {number} tickUpper - 区间上限tick
 * @param {number} decimals0 - token0的小数位数
 * @param {number} decimals1 - token1的小数位数
 * @returns {object} 包含两种代币数量的对象
 */
function getAmountsForLiquidity(liquidity, sqrtPriceX96_current, tickCurrent, tickLower, tickUpper, decimals0, decimals1) {
  const L = BigInt(liquidity);
  if (L === 0n) {
    return {
      raw: { token0: '0', token1: '0' },
      formatted: { token0: '0.000000', token1: '0.000000' }
    };
  }

  const sp_current = BigInt(sqrtPriceX96_current);
  const sa = tickToSqrtPriceX96(tickLower);
  const sb = tickToSqrtPriceX96(tickUpper);
  const Q96 = 2n ** 96n;

  let amount0 = 0n;
  let amount1 = 0n;

  if (tickCurrent < tickLower) {
    if (sa > 0 && sb > 0) {
      amount0 = (L * (sb - sa) * Q96) / (sb * sa);
    }
  } else if (tickCurrent >= tickUpper) {
    amount1 = (L * (sb - sa)) / Q96;
  } else {
    if (sp_current > 0 && sb > 0) {
      amount0 = (L * (sb - sp_current) * Q96) / (sb * sp_current);
    }
    amount1 = (L * (sp_current - sa)) / Q96;
  }

  const amount0Formatted = Number(amount0) / (10 ** decimals0);
  const amount1Formatted = Number(amount1) / (10 ** decimals1);

  return {
    raw: {
      token0: amount0.toString(),
      token1: amount1.toString(),
    },
    formatted: {
      token0: amount0Formatted.toFixed(6),
      token1: amount1Formatted.toFixed(6),
    }
  };
}

/**
 * 根据代币数量计算流动性
 * @param {object} poolInfo - 池子信息
 * @param {number} tickLower - 区间下限tick
 * @param {number} tickUpper - 区间上限tick
 * @param {string} amount0 - token0的数量
 * @param {string} amount1 - token1的数量
 * @returns {bigint} liquidity
 */
export function getLiquidityForAmounts(poolInfo, tickLower, tickUpper, amount0, amount1) {
  const { sqrtPriceX96, tick: tickCurrent, token0: { decimals: decimals0 }, token1: { decimals: decimals1 } } = poolInfo;

  const sp_current = BigInt(sqrtPriceX96);
  const sa = tickToSqrtPriceX96(tickLower);
  const sb = tickToSqrtPriceX96(tickUpper);

  const Q96 = 2n ** 96n;

  const amount0BN = BigInt(Math.floor(Number(amount0) * (10 ** decimals0)));
  const amount1BN = BigInt(Math.floor(Number(amount1) * (10 ** decimals1)));

  let liquidity = 0n;

  if (tickCurrent < tickLower) {
    // L = amount0 * (sa * sb / Q96) / (sb - sa)
    if (sb > sa) {
      liquidity = (amount0BN * sa * sb / Q96) / (sb - sa);
    }
  } else if (tickCurrent >= tickUpper) {
    // L = amount1 * Q96 / (sb - sa)
    if (sb > sa) {
      liquidity = (amount1BN * Q96) / (sb - sa);
    }
  } else {
    // L_from_amount0 = amount0 * (sp * sb / Q96) / (sb - sp)
    // L_from_amount1 = amount1 * Q96 / (sp - sa)
    let liquidity0 = 0n;
    if (sb > sp_current) {
      liquidity0 = (amount0BN * sp_current * sb / Q96) / (sb - sp_current);
    }

    let liquidity1 = 0n;
    if (sp_current > sa) {
      liquidity1 = (amount1BN * Q96) / (sp_current - sa);
    }

    liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  }

  return liquidity;
}

export function getLiquidityForAmount0(poolInfo, tickLower, tickUpper, amount0) {
  const { sqrtPriceX96, tick: tickCurrent, token0: { decimals: decimals0 } } = poolInfo;
  const sp_current = BigInt(sqrtPriceX96);
  const sa = tickToSqrtPriceX96(tickLower);
  const sb = tickToSqrtPriceX96(tickUpper);
  const Q96 = 2n ** 96n;
  const amount0BN = BigInt(Math.floor(Number(amount0) * (10 ** decimals0)));

  let liquidity = 0n;
  if (tickCurrent < tickLower) {
    if (sb > sa) {
      liquidity = (amount0BN * sa * sb / Q96) / (sb - sa);
    }
  } else if (tickCurrent >= tickUpper) {
    liquidity = 0n;
  } else {
    if (sb > sp_current) {
      liquidity = (amount0BN * sp_current * sb / Q96) / (sb - sp_current);
    }
  }
  return liquidity;
}

export function getLiquidityForAmount1(poolInfo, tickLower, tickUpper, amount1) {
  const { sqrtPriceX96, tick: tickCurrent, token1: { decimals: decimals1 } } = poolInfo;
  const sp_current = BigInt(sqrtPriceX96);
  const sa = tickToSqrtPriceX96(tickLower);
  const sb = tickToSqrtPriceX96(tickUpper);
  const Q96 = 2n ** 96n;
  const amount1BN = BigInt(Math.floor(Number(amount1) * (10 ** decimals1)));

  let liquidity = 0n;
  if (tickCurrent < tickLower) {
    liquidity = 0n;
  } else if (tickCurrent >= tickUpper) {
    if (sb > sa) {
      liquidity = (amount1BN * Q96) / (sb - sa);
    }
  } else {
    if (sp_current > sa) {
      liquidity = (amount1BN * Q96) / (sp_current - sa);
    }
  }
  return liquidity;
}

/**
 * Executes RPC requests in batches to avoid overwhelming the provider.
 * @param {Array<object>} requests - Array of JSON-RPC request objects.
 * @param {number} batchSize - The number of requests per batch.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of all results.
 */
async function executeBatchRpc(requests, batchSize = 50) {
  if (requests.length === 0) {
    return [];
  }
  const allResults = [];
  const rpcUrl = getRpcUrl();
  console.log(`📦 执行批量RPC调用，总请求数: ${requests.length}, 每批大小: ${batchSize}`);

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    console.log(`  - 发送批次 ${Math.floor(i / batchSize) + 1} / ${Math.ceil(requests.length / batchSize)}`);

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        throw new Error(`RPC请求失败，状态码: ${response.status}`);
      }

      const results = await response.json();

      if (!Array.isArray(results)) {
        if (results.error) {
          throw new Error(`RPC错误: ${results.error.message || JSON.stringify(results.error)}`);
        }
        throw new Error('无效的RPC批量响应: 返回的不是一个数组。');
      }
      allResults.push(...results);

      // Add a small delay between batches to be nice to the RPC node
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`  - 批次 ${Math.floor(i / batchSize) + 1} 执行失败:`, error);
      throw error;
    }
  }
  return allResults;
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

    // 准备批量调用
    const calls = [
      // 获取NFT位置基本信息
      {
        jsonrpc: '2.0',
        id: 0,
        method: 'eth_call',
        params: [{
          to: positionManagerAddress,
          data: encodeFunctionData({
            abi: POSITION_MANAGER_ABI,
            functionName: 'positions',
            args: [BigInt(nftId)]
          })
        }, 'latest']
      },
      // 使用collect函数的staticcall获取真实手续费
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: positionManagerAddress,
          data: encodeFunctionData({
            abi: POSITION_MANAGER_ABI,
            functionName: 'collect',
            args: [{
              tokenId: BigInt(nftId),
              recipient: '0x0000000000000000000000000000000000000000', // 使用零地址进行staticcall
              amount0Max: BigInt('340282366920938463463374607431768211455'), // uint128 max
              amount1Max: BigInt('340282366920938463463374607431768211455')  // uint128 max
            }]
          })
        }, 'latest']
      },
      // 获取NFT所有者
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [{
          to: positionManagerAddress,
          data: encodeFunctionData({
            abi: POSITION_MANAGER_ABI,
            functionName: 'ownerOf',
            args: [BigInt(nftId)]
          })
        }, 'latest']
      }
    ];

    // 执行批量RPC调用
    const response = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calls)
    });

    const results = await response.json();
    if (!Array.isArray(results) || results.length !== 3) {
      throw new Error('Invalid RPC response');
    }

    const [positionResult, collectResult, ownerResult] = results;

    if (positionResult.error) {
      throw new Error(`Position call failed: ${positionResult.error.message}`);
    }

    if (collectResult.error) {
      throw new Error(`Collect call failed: ${collectResult.error.message}`);
    }

    if (ownerResult.error) {
      throw new Error(`Owner call failed: ${ownerResult.error.message}`);
    }

    // 解码position数据
    const positionData = decodeAbiParameters([
      { type: 'uint96' },   // nonce
      { type: 'address' },  // operator
      { type: 'address' },  // token0
      { type: 'address' },  // token1
      { type: 'uint24' },   // fee
      { type: 'int24' },    // tickLower
      { type: 'int24' },    // tickUpper
      { type: 'uint128' },  // liquidity
      { type: 'uint256' },  // feeGrowthInside0LastX128
      { type: 'uint256' },  // feeGrowthInside1LastX128
      { type: 'uint128' },  // tokensOwed0
      { type: 'uint128' }   // tokensOwed1
    ], positionResult.result);

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

    console.log('positionData', positionData);

    // 解码collect数据（真实的手续费金额）
    const collectData = decodeAbiParameters([
      { type: 'uint256' }, // amount0
      { type: 'uint256' }  // amount1
    ], collectResult.result);

    const [collectableAmount0, collectableAmount1] = collectData;

    // 解码owner数据
    const ownerData = decodeAbiParameters([
      { type: 'address' } // owner
    ], ownerResult.result);

    const [owner] = ownerData;

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

    // 计算仓位包含的代币数量
    const positionLiquidity = getAmountsForLiquidity(
      liquidity.toString(),
      lpInfo.sqrtPriceX96,
      lpInfo.tick,
      Number(tickLower),
      Number(tickUpper),
      lpInfo.token0.decimals,
      lpInfo.token1.decimals
    );

    // 格式化手续费金额
    const formatFee = (amount, decimals, symbol) => {
      const feeAmount = Number(amount) / Math.pow(10, decimals);
      if (feeAmount >= 1000000) {
        return `${(feeAmount / 1000000).toFixed(4)}M ${symbol}`;
      } else if (feeAmount >= 1000) {
        return `${(feeAmount / 1000).toFixed(4)}K ${symbol}`;
      } else if (feeAmount >= 1) {
        return `${feeAmount.toFixed(6)} ${symbol}`;
      } else if (feeAmount >= 0.000001) {
        return `${feeAmount.toFixed(8)} ${symbol}`;
      } else {
        return `${feeAmount.toExponential(2)} ${symbol}`;
      }
    };

    return {
      nftId,
      isValid: true,
      isValidPool: true,
      hasLiquidity,
      isInRange,
      owner: owner.toLowerCase(), // 添加NFT所有者信息
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
      positionLiquidity,
      fees: {
        // 真实可领取的手续费（通过collect staticcall获取）
        collectable: {
          token0: collectableAmount0.toString(),
          token1: collectableAmount1.toString(),
          token0Formatted: formatFee(collectableAmount0, lpInfo.token0.decimals, lpInfo.token0.symbol),
          token1Formatted: formatFee(collectableAmount1, lpInfo.token1.decimals, lpInfo.token1.symbol)
        },
        // 从positions函数获取的tokensOwed（仅供参考）
        tokensOwed: {
          token0: tokensOwed0.toString(),
          token1: tokensOwed1.toString()
        }
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

/**
 * 通过钱包地址查找其拥有的所有V3 LP NFT
 * @param {string} ownerAddress - 钱包地址
 * @returns {Promise<Object[]>} 包含NFT和池子信息的数组
 */
export async function findNftPositionsByOwner(ownerAddress) {
  console.log(`🔍 正在为地址 ${ownerAddress} 查找 LP NFT...`);
  const rpcUrl = getRpcUrl();
  let allFoundPositions = [];
  let idCounter = 0; // 用于批量请求的唯一ID

  try {
    // 1. 获取所有 Position Manager 合约中该地址的 NFT 余额
    const balanceRequests = Object.entries(POSITION_MANAGER_ADDRESSES).map(([protocol, address]) => ({
      jsonrpc: '2.0',
      id: `${protocol}-balance`,
      method: 'eth_call',
      params: [{
        to: address,
        data: encodeFunctionData({
          abi: POSITION_MANAGER_ABI,
          functionName: 'balanceOf',
          args: [ownerAddress]
        })
      }, 'latest']
    }));

    const balanceResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(balanceRequests)
    });
    const balanceResults = await balanceResponse.json();

    // 2. 获取所有 NFT 的 tokenId
    const tokenIdRequests = [];
    const positionManagerInfo = {};

    for (const result of balanceResults) {
      if (result.error || result.result === '0x') continue;

      const balance = Number(decodeAbiParameters([{ type: 'uint256' }], result.result)[0]);
      if (balance === 0) continue;

      const protocol = result.id.split('-')[0];
      const managerAddress = POSITION_MANAGER_ADDRESSES[protocol];
      positionManagerInfo[protocol] = { managerAddress, tokenIds: [] };

      const NFT_LIMIT = 50; // 只获取最新的50个NFT
      const startIndex = Math.max(0, balance - NFT_LIMIT);

      console.log(`在 ${protocol} 中发现 ${balance} 个NFT，将从索引 ${startIndex} 开始获取最新的 ${balance - startIndex} 个。`);

      for (let i = startIndex; i < balance; i++) {
        tokenIdRequests.push({
          jsonrpc: '2.0',
          id: `${protocol}-token-index-${i}`,
          method: 'eth_call',
          params: [{
            to: managerAddress,
            data: encodeFunctionData({
              abi: POSITION_MANAGER_ABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [ownerAddress, i]
            })
          }, 'latest']
        });
      }
    }

    if (tokenIdRequests.length === 0) {
      console.log('✅ 在所有已知的 Position Manager 中未找到任何 LP NFT。');
      return [];
    }

    const tokenIdResults = await executeBatchRpc(tokenIdRequests);

    // 3. 获取每个 NFT 的仓位详情
    const positionDetailsRequests = [];
    for (const result of tokenIdResults) {
      if (result.error || result.result === '0x') continue;

      const tokenId = decodeAbiParameters([{ type: 'uint256' }], result.result)[0];
      const [protocol] = result.id.split('-');
      const managerAddress = positionManagerInfo[protocol].managerAddress;
      positionManagerInfo[protocol].tokenIds.push(tokenId);

      positionDetailsRequests.push({
        jsonrpc: '2.0',
        id: `${protocol}-position-${tokenId}`,
        method: 'eth_call',
        params: [{
          to: managerAddress,
          data: encodeFunctionData({
            abi: POSITION_MANAGER_ABI,
            functionName: 'positions',
            args: [tokenId]
          })
        }, 'latest']
      });
    }

    const positionDetailsResults = await executeBatchRpc(positionDetailsRequests);

    // 4. 获取池子地址和代币符号
    const poolAddressRequests = [];
    const tokenSymbolRequests = [];
    const positionsData = {};
    const uniqueTokens = new Set();
    const nftToPositionKey = {};

    for (const result of positionDetailsResults) {
      if (result.error || result.result === '0x') continue;

      const [protocol, , tokenId] = result.id.split('-');
      const position = decodeAbiParameters([
        { type: 'uint96' }, { type: 'address' }, { type: 'address' }, { type: 'address' },
        { type: 'uint24' }, { type: 'int24' }, { type: 'int24' }, { type: 'uint128' }
      ], result.result);

      const [token0, token1, fee, liquidity] = [position[2], position[3], position[4], position[7]];
      if (liquidity === 0n) continue; // 忽略没有流动性的仓位

      const factoryAddress = PROTOCOL_FACTORIES[protocol];
      const positionKey = `${protocol}-${token0}-${token1}-${fee}`;
      nftToPositionKey[tokenId] = positionKey;

      if (!positionsData[positionKey]) {
        positionsData[positionKey] = { protocol, factoryAddress, token0, token1, fee };
        poolAddressRequests.push({
          jsonrpc: '2.0',
          id: `pool-${positionKey}`,
          method: 'eth_call',
          params: [{ to: factoryAddress, data: encodeFunctionData({ abi: FACTORY_ABI, functionName: 'getPool', args: [token0, token1, fee] }) }, 'latest']
        });
      }

      if (!uniqueTokens.has(token0)) {
        uniqueTokens.add(token0);
        tokenSymbolRequests.push({
          jsonrpc: '2.0', id: `symbol-${token0}`, method: 'eth_call',
          params: [{ to: token0, data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'symbol' }) }, 'latest']
        });
      }
      if (!uniqueTokens.has(token1)) {
        uniqueTokens.add(token1);
        tokenSymbolRequests.push({
          jsonrpc: '2.0', id: `symbol-${token1}`, method: 'eth_call',
          params: [{ to: token1, data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'symbol' }) }, 'latest']
        });
      }
    }

    if (poolAddressRequests.length === 0) {
      console.log('✅ 未找到有流动性的 LP 仓位。');
      return [];
    }

    const [poolAddressResults, tokenSymbolResults] = await Promise.all([
      executeBatchRpc(poolAddressRequests),
      executeBatchRpc(tokenSymbolRequests)
    ]);

    const tokenSymbols = tokenSymbolResults.reduce((acc, r) => {
      if (!r.error && r.result !== '0x') {
        const address = r.id.split('-')[1];
        acc[address] = decodeAbiParameters([{ type: 'string' }], r.result)[0];
      }
      return acc;
    }, {});

    const poolAddressMapping = {};
    for (const result of poolAddressResults) {
      if (result.error || result.result === '0x') continue;
      const poolAddress = decodeAbiParameters([{ type: 'address' }], result.result)[0];
      if (poolAddress !== '0x0000000000000000000000000000000000000000') {
        const positionKey = result.id.substring(5);
        poolAddressMapping[positionKey] = poolAddress;
      }
    }

    allFoundPositions = Object.entries(nftToPositionKey).map(([tokenId, positionKey]) => {
      const poolAddress = poolAddressMapping[positionKey];
      if (!poolAddress) return null;

      const data = positionsData[positionKey];
      return {
        poolAddress: poolAddress,
        protocol: identifyProtocol(data.factoryAddress),
        token0: { address: data.token0, symbol: tokenSymbols[data.token0] || '?' },
        token1: { address: data.token1, symbol: tokenSymbols[data.token1] || '?' },
        fee: data.fee,
        nftIds: [tokenId.toString()] // 每个仓位只包含自己的NFT ID
      };
    }).filter(p => p !== null);

    console.log(`✅ 成功找到 ${allFoundPositions.length} 个有效的 LP 仓位。`, allFoundPositions);
    return allFoundPositions;
  } catch (error) {
    console.error('❌ 查找 LP NFT 时出错:', error);
    throw error;
  }
}

export { getLPInfo, getBatchLPInfo, calculatePriceFromSqrtPriceX96, getNFTPositionInfo, getAmountsForLiquidity }; 