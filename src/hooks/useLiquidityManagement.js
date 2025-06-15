import { useState, useEffect, useCallback, useRef } from 'react'
import { nearestUsableTick, TickMath, priceToClosestTick, tickToPrice } from '@uniswap/v3-sdk'
import { Token } from '@uniswap/sdk-core'

export const useLiquidityManagement = (token0, token1, fee, poolData) => {
    const [tickLower, setTickLower] = useState(-887220)
    const [tickUpper, setTickUpper] = useState(887220)
    const [priceLower, setPriceLower] = useState('')
    const [priceUpper, setPriceUpper] = useState('')

    // 输入状态管理 - 改进版本
    const [isInputting, setIsInputting] = useState({
        lower: false,
        upper: false
    })
    const inputTimerRef = useRef({
        lower: null,
        upper: null
    })

    // 临时输入值存储
    const [tempInputs, setTempInputs] = useState({
        lower: '',
        upper: ''
    })

    const tickSpacing = fee === 500 ? 10 : fee === 3000 ? 60 : 200
    const isReversed = poolData?.token0?.address?.toLowerCase() !== token0?.address?.toLowerCase()

    // 获取有效的tick值
    const getValidTick = useCallback((tick) => {
        return nearestUsableTick(tick, tickSpacing)
    }, [tickSpacing])

    // 价格转换函数
    const adjustPrice = useCallback((inputPrice, isLower) => {
        if (!inputPrice || isNaN(inputPrice)) return ''

        try {
            const price = parseFloat(inputPrice)
            if (price <= 0) return ''

            let tick = priceToClosestTick(price)
            tick = getValidTick(tick)

            const adjustedPrice = tickToPrice(tick)
            return adjustedPrice.toFixed(6)
        } catch (error) {
            console.error('Price adjustment error:', error)
            return inputPrice
        }
    }, [getValidTick])

    // 处理价格输入变化 - 只更新临时状态
    const handlePriceChange = useCallback((value, isLower) => {
        const field = isLower ? 'lower' : 'upper'

        // 更新临时输入值
        setTempInputs(prev => ({
            ...prev,
            [field]: value
        }))

        // 设置输入状态
        setIsInputting(prev => ({
            ...prev,
            [field]: true
        }))

        // 清除之前的定时器
        if (inputTimerRef.current[field]) {
            clearTimeout(inputTimerRef.current[field])
        }

        // 设置新的定时器 - 延长到1秒
        inputTimerRef.current[field] = setTimeout(() => {
            setIsInputting(prev => ({
                ...prev,
                [field]: false
            }))

            // 处理实际的价格更新
            handlePriceBlur(value, isLower)
        }, 1000)

    }, [])

    // 处理价格失焦或延迟更新
    const handlePriceBlur = useCallback((value, isLower) => {
        if (!value || isNaN(value)) return

        try {
            let price = parseFloat(value)
            if (price <= 0) return

            // 计算对应的tick
            let tick = priceToClosestTick(price)
            tick = getValidTick(tick)

            // 获取调整后的价格
            const adjustedPrice = tickToPrice(tick).toFixed(6)

            if (isLower) {
                // 更新下限价格和tick
                setPriceLower(adjustedPrice)
                if (isReversed) {
                    setTickUpper(tick)
                } else {
                    setTickLower(tick)
                }
            } else {
                // 更新上限价格和tick
                setPriceUpper(adjustedPrice)
                if (isReversed) {
                    setTickLower(tick)
                } else {
                    setTickUpper(tick)
                }
            }

            // 清除临时输入
            setTempInputs(prev => ({
                ...prev,
                [isLower ? 'lower' : 'upper']: ''
            }))

        } catch (error) {
            console.error('Price blur error:', error)
        }
    }, [getValidTick, isReversed])

    // 获取显示价格 - 优先显示临时输入值
    const getDisplayPrice = useCallback((isLower) => {
        const field = isLower ? 'lower' : 'upper'

        // 如果正在输入，显示临时输入值
        if (isInputting[field] && tempInputs[field] !== '') {
            return tempInputs[field]
        }

        // 否则显示正式的价格值
        return isLower ? priceLower : priceUpper
    }, [isInputting, tempInputs, priceLower, priceUpper])

    // 设置价格范围
    const handleSetPriceRange = useCallback((lowerPrice, upperPrice) => {
        try {
            let lowerTick = getValidTick(priceToClosestTick(parseFloat(lowerPrice)))
            let upperTick = getValidTick(priceToClosestTick(parseFloat(upperPrice)))

            // 确保tick顺序正确
            if (lowerTick >= upperTick) {
                [lowerTick, upperTick] = [upperTick, lowerTick]
            }

            const adjustedLowerPrice = tickToPrice(lowerTick).toFixed(6)
            const adjustedUpperPrice = tickToPrice(upperTick).toFixed(6)

            setPriceLower(adjustedLowerPrice)
            setPriceUpper(adjustedUpperPrice)

            if (isReversed) {
                setTickLower(upperTick)
                setTickUpper(lowerTick)
            } else {
                setTickLower(lowerTick)
                setTickUpper(upperTick)
            }
        } catch (error) {
            console.error('Set price range error:', error)
        }
    }, [getValidTick, isReversed])

    // 初始化价格显示
    useEffect(() => {
        if (poolData?.price && (!priceLower || !priceUpper)) {
            const currentPrice = parseFloat(poolData.price)
            const lowerPrice = (currentPrice * 0.8).toFixed(6)
            const upperPrice = (currentPrice * 1.2).toFixed(6)

            setPriceLower(lowerPrice)
            setPriceUpper(upperPrice)
        }
    }, [poolData?.price, priceLower, priceUpper])

    // 清理定时器
    useEffect(() => {
        return () => {
            Object.values(inputTimerRef.current).forEach(timer => {
                if (timer) clearTimeout(timer)
            })
        }
    }, [])

    return {
        tickLower,
        tickUpper,
        priceLower: getDisplayPrice(true),
        priceUpper: getDisplayPrice(false),
        handlePriceChange,
        handlePriceBlur,
        handleSetPriceRange,
        adjustPrice,
        isInputting: isInputting.lower || isInputting.upper
    }
} 