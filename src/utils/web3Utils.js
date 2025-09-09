/**
 * Web3 工具函数
 * 用于与区块链合约交互
 */

import { ethers } from 'ethers';

// ERC20 Token ABI (简化版)
const ERC20_ABI = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

// ERC721 NFT ABI (用于授权检查)
const ERC721_ABI = [
    "function isApprovedForAll(address owner, address operator) view returns (bool)",
    "function setApprovalForAll(address operator, bool approved)",
    "function getApproved(uint256 tokenId) view returns (address)",
    "function approve(address to, uint256 tokenId)",
    "function ownerOf(uint256 tokenId) view returns (address)"
];

// Aerodrome NonfungiblePositionManager ABI (部分)
const AERODROME_POSITION_MANAGER_ABI = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "address", "name": "token0", "type": "address" },
                    { "internalType": "address", "name": "token1", "type": "address" },
                    { "internalType": "int24", "name": "tickSpacing", "type": "int24" }, // Aerodrome 使用 tickSpacing 而不是 fee
                    { "internalType": "int24", "name": "tickLower", "type": "int24" },
                    { "internalType": "int24", "name": "tickUpper", "type": "int24" },
                    { "internalType": "uint256", "name": "amount0Desired", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1Desired", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
                    { "internalType": "address", "name": "recipient", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" },
                    { "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160" } // 如果池子不存在，使用此价格初始化
                ],
                "internalType": "struct INonfungiblePositionManager.MintParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "mint",
        "outputs": [
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
            { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
            { "internalType": "uint256", "name": "amount0", "type": "uint256" },
            { "internalType": "uint256", "name": "amount1", "type": "uint256" }
        ],
        "stateMutability": "payable",
        "type": "function"
    }
];

// Uniswap V3 NonfungiblePositionManager ABI (部分)
const POSITION_MANAGER_ABI = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "address", "name": "token0", "type": "address" },
                    { "internalType": "address", "name": "token1", "type": "address" },
                    { "internalType": "uint24", "name": "fee", "type": "uint24" },
                    { "internalType": "int24", "name": "tickLower", "type": "int24" },
                    { "internalType": "int24", "name": "tickUpper", "type": "int24" },
                    { "internalType": "uint256", "name": "amount0Desired", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1Desired", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
                    { "internalType": "address", "name": "recipient", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                ],
                "internalType": "struct INonfungiblePositionManager.MintParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "mint",
        "outputs": [
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
            { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
            { "internalType": "uint256", "name": "amount0", "type": "uint256" },
            { "internalType": "uint256", "name": "amount1", "type": "uint256" }
        ],
        "stateMutability": "payable",
        "type": "function"
    }
];

// 合约地址
const CONTRACTS = {
    // BSC (Binance Smart Chain)
    // 56: {
    //     PANCAKESWAP_V3_POSITION_MANAGER: "0x46A15B0b27311cedF172AB29E4f4766fbE7f4364",
    //     UNISWAP_V3_POSITION_MANAGER: "0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613", // Uniswap V3 Position Manager on BSC
    //     // v3 SwapRouter（如未配置，将在调用时抛错提示）
    //     PANCAKESWAP_V3_SWAP_ROUTER: "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
    //     UNISWAP_V3_SWAP_ROUTER: "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
    //     // 常用代币地址
    //     WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    //     USDT: "0x55d398326f99059ff775485246999027b3197955",
    //     USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    //     BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56"
    // },
    // BASE Chain
    8453: {
        AERODROME_POSITION_MANAGER: "0x827922686190790b37229fd06084350E74485b72",
        UNISWAP_V3_POSITION_MANAGER: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
        // v3 SwapRouter
        AERODROME_SWAP_ROUTER: "0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5",
        UNISWAP_V3_SWAP_ROUTER: "0x2626664c2603336E57B271c5C0b26F421741e481",
        // 常用代币地址
        WETH: "0x4200000000000000000000000000000000000006",
        USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        USDE: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    },
};

// 使用传入的provider和signer而不是从window.ethereum获取
export const checkTokenAllowance = async (tokenAddress, ownerAddress, spenderAddress, provider) => {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
        return allowance;
    } catch (error) {
        console.error('检查授权失败:', error);
        throw error;
    }
};

export const approveToken = async (tokenAddress, spenderAddress, amount, signer) => {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const tx = await tokenContract.approve(spenderAddress, amount);
        return tx;
    } catch (error) {
        console.error('授权失败:', error);
        throw error;
    }
};

// 检查NFT是否已授权给指定操作员
export const checkNFTApproval = async (nftContractAddress, ownerAddress, operatorAddress, provider) => {
    try {
        const nftContract = new ethers.Contract(nftContractAddress, ERC721_ABI, provider);
        const isApproved = await nftContract.isApprovedForAll(ownerAddress, operatorAddress);
        return isApproved;
    } catch (error) {
        console.error('检查NFT授权失败:', error);
        throw error;
    }
};

// 检查单个NFT是否已授权给指定地址
export const checkNFTTokenApproval = async (nftContractAddress, tokenId, operatorAddress, provider) => {
    try {
        const nftContract = new ethers.Contract(nftContractAddress, ERC721_ABI, provider);
        const approvedAddress = await nftContract.getApproved(tokenId);
        return approvedAddress.toLowerCase() === operatorAddress.toLowerCase();
    } catch (error) {
        console.error('检查NFT单个授权失败:', error);
        throw error;
    }
};

// 授权NFT给指定操作员（全部授权）
export const approveNFTForAll = async (nftContractAddress, operatorAddress, signer) => {
    try {
        const nftContract = new ethers.Contract(nftContractAddress, ERC721_ABI, signer);
        const tx = await nftContract.setApprovalForAll(operatorAddress, true);
        return tx;
    } catch (error) {
        console.error('NFT授权失败:', error);
        throw error;
    }
};

// 授权单个NFT给指定地址
export const approveNFTToken = async (nftContractAddress, tokenId, operatorAddress, signer) => {
    try {
        const nftContract = new ethers.Contract(nftContractAddress, ERC721_ABI, signer);
        const tx = await nftContract.approve(operatorAddress, tokenId);
        return tx;
    } catch (error) {
        console.error('NFT单个授权失败:', error);
        throw error;
    }
};

export const getTokenInfo = async (tokenAddress, provider) => {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [symbol, name, decimals] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.name(),
            tokenContract.decimals()
        ]);
        return { symbol, name, decimals };
    } catch (error) {
        console.error('获取代币信息失败:', error);
        throw error;
    }
};

export const getTokenBalance = async (tokenAddress, userAddress, provider) => {
    try {
        if (!tokenAddress || !userAddress || !provider) {
            console.error('getTokenBalance 缺少参数:', {
                tokenAddress,
                userAddress,
                provider: !!provider
            });
            return BigInt(0);
        }

        // 创建合约实例
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

        // 调用 balanceOf 函数
        const balance = await tokenContract.balanceOf(userAddress);

        // 打印成功信息
        console.log(`✅ 获取余额成功: ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)} = ${balance.toString()}`);

        return balance;
    } catch (error) {
        console.error('❌ 获取代币余额失败:', {
            message: error.message,
            tokenAddress: tokenAddress?.slice(0, 10) + '...',
            userAddress: userAddress?.slice(0, 10) + '...',
            code: error.code
        });
        return BigInt(0); // 出错时返回 0 而不是抛出异常
    }
};

export const addLiquidity = async (params, signer, chainId, slippage = 0.5, protocolName = '') => {
    try {
        const contracts = CONTRACTS[chainId];
        if (!contracts) {
            throw new Error(`不支持的网络: ${chainId}`);
        }

        // 根据协议名称选择正确的Position Manager地址和ABI
        let positionManagerAddress;
        let positionManagerABI;
        const isAerodrome = protocolName.toLowerCase().includes('aerodrome') || protocolName.toLowerCase().includes('aero');

        if (protocolName.toLowerCase().includes('pancake')) {
            positionManagerAddress = contracts.PANCAKESWAP_V3_POSITION_MANAGER;
            positionManagerABI = POSITION_MANAGER_ABI;
        } else if (isAerodrome) {
            positionManagerAddress = contracts.AERODROME_POSITION_MANAGER;
            positionManagerABI = AERODROME_POSITION_MANAGER_ABI;
        } else if (protocolName.toLowerCase().includes('uniswap') || protocolName.toLowerCase().includes('uni')) {
            positionManagerAddress = contracts.UNISWAP_V3_POSITION_MANAGER;
            positionManagerABI = POSITION_MANAGER_ABI;
        } else {
            // 如果无法识别协议，根据链ID选择默认值
            if (chainId === 56) {
                // BSC上默认使用Uniswap
                positionManagerAddress = contracts.UNISWAP_V3_POSITION_MANAGER;
                positionManagerABI = POSITION_MANAGER_ABI;
            } else if (chainId === 1) {
                positionManagerAddress = contracts.UNISWAP_V3_POSITION_MANAGER;
                positionManagerABI = POSITION_MANAGER_ABI;
            } else if (chainId === 8453) {
                // BASE上默认使用Uniswap
                positionManagerAddress = contracts.UNISWAP_V3_POSITION_MANAGER;
                positionManagerABI = POSITION_MANAGER_ABI;
            } else {
                throw new Error(`不支持的网络: ${chainId}`);
            }
        }

        const positionManager = new ethers.Contract(
            positionManagerAddress,
            positionManagerABI,
            signer
        );

        // 确保滑点值有效，限制最大50%
        const effectiveSlippage = (typeof slippage === 'number' && slippage > 0 && slippage <= 50) ? slippage : 0.5;
        // 计算滑点保护
        const slippageMultiplier = BigInt(Math.floor((100 - effectiveSlippage) * 100)); // 转换为基点
        const slippageAmount0 = (BigInt(params.amount0Desired) * slippageMultiplier) / BigInt(10000);
        const slippageAmount1 = (BigInt(params.amount1Desired) * slippageMultiplier) / BigInt(10000);

        let mintParams;

        if (isAerodrome) {
            // Aerodrome 需要特殊的参数结构
            // 对于已存在的池子，sqrtPriceX96 应该传 0
            // 只有创建新池子时才需要非零的 sqrtPriceX96
            const sqrtPriceX96Value = '0';

            // 确保 tickSpacing 是一个数字
            const tickSpacingValue = params.tickSpacing ? Number(params.tickSpacing) : 10;

            mintParams = {
                token0: params.token0,
                token1: params.token1,
                tickSpacing: tickSpacingValue, // 使用传入的实际 tickSpacing
                tickLower: params.tickLower,
                tickUpper: params.tickUpper,
                amount0Desired: params.amount0Desired,
                amount1Desired: params.amount1Desired,
                amount0Min: slippageAmount0.toString(),
                amount1Min: slippageAmount1.toString(),
                recipient: params.recipient,
                deadline: Math.floor(Date.now() / 1000) + 1200, // 20分钟后过期
                sqrtPriceX96: sqrtPriceX96Value // Aerodrome 需要这个额外参数
            };

            console.log('=== Aerodrome Mint 参数详情 ===');
            console.log('协议:', protocolName);
            console.log('Position Manager 地址:', positionManagerAddress);
            console.log('重要参数:');
            console.log('  - tickSpacing (实际值):', tickSpacingValue);
            console.log('  - tickSpacing 类型:', typeof tickSpacingValue);
            console.log('  - 原始 params.tickSpacing:', params.tickSpacing);
            console.log('  - 原始 params.fee:', params.fee);
            console.log('Mint 参数:', {
                token0: mintParams.token0,
                token1: mintParams.token1,
                tickSpacing: mintParams.tickSpacing,
                tickLower: mintParams.tickLower,
                tickUpper: mintParams.tickUpper,
                amount0Desired: mintParams.amount0Desired.toString(),
                amount1Desired: mintParams.amount1Desired.toString(),
                amount0Min: mintParams.amount0Min,
                amount1Min: mintParams.amount1Min,
                recipient: mintParams.recipient,
                deadline: mintParams.deadline,
                sqrtPriceX96: mintParams.sqrtPriceX96
            });
            console.log('=========================');
        } else {
            // Uniswap V3 / PancakeSwap 参数结构
            mintParams = {
                ...params,
                amount0Min: slippageAmount0.toString(),
                amount1Min: slippageAmount1.toString(),
                deadline: Math.floor(Date.now() / 1000) + 1200 // 20分钟后过期
            };

            console.log('=== Uniswap/PancakeSwap Mint 参数 ===');
            console.log('协议:', protocolName);
            console.log('Position Manager 地址:', positionManagerAddress);
            console.log('参数详情:', mintParams);
            console.log('=====================================');
        }

        try {
            const tx = await positionManager.mint(mintParams);
            console.log('交易发送成功:', tx.hash);
            return tx;
        } catch (error) {
            console.error('mint 调用失败:', error);
            console.error('详细错误信息:', {
                message: error.message,
                data: error.data,
                transaction: error.transaction
            });
            throw error;
        }
        return tx;
    } catch (error) {
        console.error('添加流动性失败:', error);
        throw error;
    }
};

// 格式化代币数量
export const formatTokenAmount = (amount, decimals) => {
    return ethers.formatUnits(amount, decimals);
};

// 解析代币数量
export const parseTokenAmount = (amount, decimals) => {
    try {
        const amountStr = amount.toString();

        // 处理科学计数法
        if (amountStr.includes('e') || amountStr.includes('E')) {
            const num = Number(amountStr);
            if (isNaN(num)) throw new Error('Invalid number');
            return ethers.parseUnits(num.toFixed(decimals), decimals);
        }

        // 限制小数位数，避免超过 decimals
        const parts = amountStr.split('.');
        if (parts.length > 1 && parts[1].length > decimals) {
            // 截断多余的小数位
            const truncated = parts[0] + '.' + parts[1].substring(0, decimals);
            return ethers.parseUnits(truncated, decimals);
        }

        return ethers.parseUnits(amountStr, decimals);
    } catch (error) {
        console.error('parseTokenAmount error:', error, { amount, decimals });
        // 如果还是失败，尝试使用 BigInt 直接计算
        try {
            const multiplier = BigInt(10) ** BigInt(decimals);
            const num = Number(amount);
            if (isNaN(num)) throw new Error('Invalid number');
            return BigInt(Math.floor(num * Number(multiplier)));
        } catch (fallbackError) {
            console.error('parseTokenAmount fallback also failed:', fallbackError);
            return BigInt(0);
        }
    }
};

// v3 SwapRouter ABI（Aerodrome 版本：使用 tickSpacing）
const V3_SWAP_ROUTER_ABI_AERO = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "address", "name": "tokenIn", "type": "address" },
                    { "internalType": "address", "name": "tokenOut", "type": "address" },
                    { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
                    { "internalType": "address", "name": "recipient", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
                    { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
                ],
                "internalType": "struct ISwapRouter.ExactInputSingleParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "exactInputSingle",
        "outputs": [
            { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
        ],
        "stateMutability": "payable",
        "type": "function"
    }
];

// v3 SwapRouter ABI（Uniswap 版本：使用 fee）
const V3_SWAP_ROUTER_ABI_UNI = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "address", "name": "tokenIn", "type": "address" },
                    { "internalType": "address", "name": "tokenOut", "type": "address" },
                    { "internalType": "uint24", "name": "fee", "type": "uint24" },
                    { "internalType": "address", "name": "recipient", "type": "address" },
                    { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
                    { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
                ],
                "internalType": "struct ISwapRouter.ExactInputSingleParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "exactInputSingle",
        "outputs": [
            { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
        ],
        "stateMutability": "payable",
        "type": "function"
    }
];

// v3 SwapRouter ABI（Pancake 版本：包含 deadline）
const V3_SWAP_ROUTER_ABI_PANCAKE = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "address", "name": "tokenIn", "type": "address" },
                    { "internalType": "address", "name": "tokenOut", "type": "address" },
                    { "internalType": "uint24", "name": "fee", "type": "uint24" },
                    { "internalType": "address", "name": "recipient", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
                    { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
                ],
                "internalType": "struct ISwapRouter.ExactInputSingleParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "exactInputSingle",
        "outputs": [
            { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
        ],
        "stateMutability": "payable",
        "type": "function"
    }
];

// 获取 v3 SwapRouter 地址
const getSwapRouterAddress = (protocolName = '', chainId = 8453) => {
    const contracts = CONTRACTS[chainId];
    if (!contracts) throw new Error(`不支持的网络: ${chainId}`);
    const isPancake = protocolName.toLowerCase().includes('pancake');
    const isAero = protocolName.toLowerCase().includes('aerodrome') || protocolName.toLowerCase().includes('aero');
    const isUni = protocolName.toLowerCase().includes('uniswap') || protocolName.toLowerCase().includes('uni');

    if (isPancake) {
        if (!contracts.PANCAKESWAP_V3_SWAP_ROUTER) throw new Error('当前网络未配置 PancakeSwap V3 SwapRouter 地址');
        return contracts.PANCAKESWAP_V3_SWAP_ROUTER;
    }
    if (isAero) {
        if (!contracts.AERODROME_SWAP_ROUTER) throw new Error('当前网络未配置 Aerodrome SwapRouter 地址');
        return contracts.AERODROME_SWAP_ROUTER;
    }
    if (isUni) {
        if (!contracts.UNISWAP_V3_SWAP_ROUTER) throw new Error('当前网络未配置 Uniswap V3 SwapRouter 地址');
        return contracts.UNISWAP_V3_SWAP_ROUTER;
    }
    // 默认回退到 Uniswap
    if (!contracts.UNISWAP_V3_SWAP_ROUTER) throw new Error('当前网络未配置默认 SwapRouter 地址');
    return contracts.UNISWAP_V3_SWAP_ROUTER;
};

export { getSwapRouterAddress };

// 执行 v3 单池直达兑换（Exact Input Single）
export const swapExactInputSingle = async ({
    tokenIn,
    tokenOut,
    fee,
    tickSpacing, // 为 Aerodrome 添加 tickSpacing 参数
    amountIn,
    amountOutMin,
    recipient,
    chainId,
    protocolName,
    signer
}) => {
    try {
        if (!signer) throw new Error('无效的钱包签名器');
        const routerAddress = getSwapRouterAddress(protocolName, chainId);
        const isPancake = (protocolName || '').toLowerCase().includes('pancake');
        const isAero = (protocolName || '').toLowerCase().includes('aerodrome') || (protocolName || '').toLowerCase().includes('aero');

        // 选择正确的 ABI
        let routerABI;
        if (isAero) {
            routerABI = V3_SWAP_ROUTER_ABI_AERO;
        } else if (isPancake) {
            routerABI = V3_SWAP_ROUTER_ABI_PANCAKE;
        } else {
            routerABI = V3_SWAP_ROUTER_ABI_UNI;
        }

        const router = new ethers.Contract(routerAddress, routerABI, signer);

        let params;
        if (isAero) {
            // Aerodrome 使用 tickSpacing 而不是 fee
            params = {
                tokenIn,
                tokenOut,
                tickSpacing: tickSpacing || 1, // 默认 tickSpacing
                recipient,
                deadline: Math.floor(Date.now() / 1000) + 1200,
                amountIn,
                amountOutMinimum: amountOutMin,
                sqrtPriceLimitX96: 0
            };
        } else if (isPancake) {
            params = {
                tokenIn,
                tokenOut,
                fee,
                recipient,
                deadline: Math.floor(Date.now() / 1000) + 1200,
                amountIn,
                amountOutMinimum: amountOutMin,
                sqrtPriceLimitX96: 0
            };
        } else {
            // Uniswap V3 on BASE
            params = {
                tokenIn,
                tokenOut,
                fee,
                recipient,
                amountIn,
                amountOutMinimum: amountOutMin,
                sqrtPriceLimitX96: 0
            };
        }

        // 计算是否需要携带原生币价值（如果 tokenIn 是 WETH/WBNB 则无需，只有原生 ETH/BNB 时需要。但这里仅支持 ERC20 路径）
        const tx = await router.exactInputSingle(params);
        return tx;
    } catch (error) {
        console.error('Swap 执行失败:', error);
        throw error;
    }
};

// 获取网络名称
export const getNetworkName = (chainId) => {
    switch (chainId) {
        case 1: return 'Ethereum';
        case 56: return 'BSC';
        case 137: return 'Polygon';
        case 42161: return 'Arbitrum';
        case 8453: return 'BASE';
        default: return `Chain ${chainId}`;
    }
};

/**
 * 获取Web3提供者
 */
export const getWeb3Provider = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
        return window.ethereum;
    }
    throw new Error('请安装MetaMask或其他Web3钱包');
};

/**
 * 创建合约实例（需要ethers.js或web3.js）
 * 这里提供接口，实际使用时需要安装相应的库
 */
export const createContract = (address, abi, provider) => {
    // 使用ethers.js的示例代码
    // const { ethers } = require('ethers');
    // const signer = provider.getSigner();
    // return new ethers.Contract(address, abi, signer);

    console.log('Creating contract:', { address, abi: abi.length + ' methods' });
    return null; // 占位符，实际项目中需要返回真实的合约实例
};



/**
 * 获取当前连接的账户
 */
export const getCurrentAccount = async () => {
    try {
        const provider = getWeb3Provider();
        const accounts = await provider.request({ method: 'eth_accounts' });
        return accounts[0] || null;
    } catch (error) {
        console.error('Error getting current account:', error);
        return null;
    }
};

/**
 * 连接钱包
 */
export const connectWallet = async () => {
    try {
        const provider = getWeb3Provider();
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        return accounts[0];
    } catch (error) {
        console.error('Error connecting wallet:', error);
        throw error;
    }
};

/**
 * 获取网络信息
 */
export const getNetworkInfo = async () => {
    try {
        const provider = getWeb3Provider();
        const chainId = await provider.request({ method: 'eth_chainId' });
        return {
            chainId: parseInt(chainId, 16),
            isMainnet: chainId === '0x1',
            isBSC: chainId === '0x38',
            isBASE: chainId === '0x2105'
        };
    } catch (error) {
        console.error('Error getting network info:', error);
        throw error;
    }
};

/**
 * 切换网络
 */
export const switchNetwork = async (chainId) => {
    try {
        const provider = getWeb3Provider();
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
    } catch (error) {
        console.error('Error switching network:', error);
        throw error;
    }
};

// 获取Position Manager地址（根据协议类型）
const getPositionManagerAddress = (protocolName, chainId = 8453) => {
    const contracts = CONTRACTS[chainId];
    if (!contracts) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    if (protocolName.toLowerCase().includes('pancake')) {
        return contracts.PANCAKESWAP_V3_POSITION_MANAGER;
    } else if (protocolName.toLowerCase().includes('aerodrome') || protocolName.toLowerCase().includes('aero')) {
        return contracts.AERODROME_POSITION_MANAGER;
    } else if (protocolName.toLowerCase().includes('uniswap') || protocolName.toLowerCase().includes('uni')) {
        return contracts.UNISWAP_V3_POSITION_MANAGER;
    } else {
        // 默认使用Uniswap
        return contracts.UNISWAP_V3_POSITION_MANAGER || contracts.AERODROME_POSITION_MANAGER;
    }
};

// 移除流动性
export const decreaseLiquidity = async (params, signer, chainId, protocolName) => {
    try {
        const positionManagerAddress = getPositionManagerAddress(protocolName, chainId);

        const decreaseLiquidityABI = [
            {
                "inputs": [
                    {
                        "components": [
                            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                            { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
                            { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                        ],
                        "internalType": "struct INonfungiblePositionManager.DecreaseLiquidityParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "decreaseLiquidity",
                "outputs": [
                    { "internalType": "uint256", "name": "amount0", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1", "type": "uint256" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        const contract = new ethers.Contract(positionManagerAddress, decreaseLiquidityABI, signer);

        console.log('发送移除流动性交易...', params);
        const tx = await contract.decreaseLiquidity(params);
        console.log('移除流动性交易已发送:', tx.hash);

        return tx;
    } catch (error) {
        console.error('移除流动性失败:', error);
        throw error;
    }
};

// 收集费用和代币
export const collectFromPosition = async (params, signer, chainId, protocolName) => {
    try {
        const positionManagerAddress = getPositionManagerAddress(protocolName, chainId);

        const collectABI = [
            {
                "inputs": [
                    {
                        "components": [
                            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                            { "internalType": "address", "name": "recipient", "type": "address" },
                            { "internalType": "uint128", "name": "amount0Max", "type": "uint128" },
                            { "internalType": "uint128", "name": "amount1Max", "type": "uint128" }
                        ],
                        "internalType": "struct INonfungiblePositionManager.CollectParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "collect",
                "outputs": [
                    { "internalType": "uint256", "name": "amount0", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1", "type": "uint256" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        const contract = new ethers.Contract(positionManagerAddress, collectABI, signer);

        console.log('发送收集交易...', params);
        const tx = await contract.collect(params);
        console.log('收集交易已发送:', tx.hash);

        return tx;
    } catch (error) {
        console.error('收集失败:', error);
        throw error;
    }
};

// 增加流动性到现有NFT
export const increaseLiquidity = async (params, signer, chainId, protocolName) => {
    try {
        const positionManagerAddress = getPositionManagerAddress(protocolName, chainId);

        const increaseLiquidityABI = [
            {
                "inputs": [
                    {
                        "components": [
                            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount0Desired", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount1Desired", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                        ],
                        "internalType": "struct INonfungiblePositionManager.IncreaseLiquidityParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "increaseLiquidity",
                "outputs": [
                    { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
                    { "internalType": "uint256", "name": "amount0", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1", "type": "uint256" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        const contract = new ethers.Contract(positionManagerAddress, increaseLiquidityABI, signer);

        console.log('发送增加流动性交易...', params);
        const tx = await contract.increaseLiquidity(params);
        console.log('增加流动性交易已发送:', tx.hash);

        return tx;
    } catch (error) {
        console.error('增加流动性失败:', error);
        throw error;
    }
};

// 移除流动性并收集代币（使用multicall在一个交易中完成）
export const decreaseLiquidityAndCollect = async (decreaseParams, collectParams, signer, chainId, protocolName) => {
    try {
        const positionManagerAddress = getPositionManagerAddress(protocolName, chainId);

        const multicallABI = [
            {
                "inputs": [
                    { "internalType": "bytes[]", "name": "data", "type": "bytes[]" }
                ],
                "name": "multicall",
                "outputs": [
                    { "internalType": "bytes[]", "name": "results", "type": "bytes[]" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        const decreaseLiquidityABI = [
            {
                "inputs": [
                    {
                        "components": [
                            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                            { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
                            { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                        ],
                        "internalType": "struct INonfungiblePositionManager.DecreaseLiquidityParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "decreaseLiquidity",
                "outputs": [
                    { "internalType": "uint256", "name": "amount0", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1", "type": "uint256" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        const collectABI = [
            {
                "inputs": [
                    {
                        "components": [
                            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                            { "internalType": "address", "name": "recipient", "type": "address" },
                            { "internalType": "uint128", "name": "amount0Max", "type": "uint128" },
                            { "internalType": "uint128", "name": "amount1Max", "type": "uint128" }
                        ],
                        "internalType": "struct INonfungiblePositionManager.CollectParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "collect",
                "outputs": [
                    { "internalType": "uint256", "name": "amount0", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1", "type": "uint256" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        // 创建合约实例
        const contract = new ethers.Contract(positionManagerAddress, multicallABI, signer);
        const decreaseLiquidityInterface = new ethers.Interface(decreaseLiquidityABI);
        const collectInterface = new ethers.Interface(collectABI);

        // 编码两个函数调用
        const decreaseLiquidityData = decreaseLiquidityInterface.encodeFunctionData('decreaseLiquidity', [decreaseParams]);
        const collectData = collectInterface.encodeFunctionData('collect', [collectParams]);

        console.log('发送multicall交易...', { decreaseParams, collectParams });

        // 执行multicall
        const tx = await contract.multicall([decreaseLiquidityData, collectData]);
        console.log('Multicall交易已发送:', tx.hash);

        return tx;
    } catch (error) {
        console.error('Multicall失败:', error);
        throw error;
    }
}; 