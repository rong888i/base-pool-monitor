'use client';

import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import PoolCardHeader from './PoolCardComponents/PoolCardHeader';
import PoolInfo from './PoolCardComponents/PoolInfo';
import NftSection from './PoolCardComponents/NftSection';
import TechnicalInfo from './PoolCardComponents/TechnicalInfo';
import LiquidityCalculator from './PoolCardComponents/LiquidityCalculator';
import LiquidityAdder from './PoolCardComponents/LiquidityAdder';

const PoolCard = ({ id, pool, onRemove, onClone, outOfRangeCount, onNftInfoUpdate, onNftIdChange: onParentNftIdChange }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [nftId, setNftId] = useState(pool.nftId || '');
    const [showCalculator, setShowCalculator] = useState(false);
    const [showLiquidityAdder, setShowLiquidityAdder] = useState(false);
    const [calculatorPopoverPosition, setCalculatorPopoverPosition] = useState({ top: 0, left: 0 });
    const [liquidityAdderPopoverPosition, setLiquidityAdderPopoverPosition] = useState({ top: 0, left: 0 });
    const [isCalculatorPopoverVisible, setIsCalculatorPopoverVisible] = useState(false);
    const [isLiquidityAdderPopoverVisible, setIsLiquidityAdderPopoverVisible] = useState(false);

    const calculatorIconRef = useRef(null);
    const liquidityAdderIconRef = useRef(null);
    const calculatorPopoverRef = useRef(null);
    const liquidityAdderPopoverRef = useRef(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
    };

    useEffect(() => {
        setNftId(pool.nftId || '');
    }, [pool.nftId]);

    const handleNftIdChange = (newId) => {
        setNftId(newId);
        if (onParentNftIdChange) {
            onParentNftIdChange(newId);
        }
    };

    // 处理流动性计算器相关
    useEffect(() => {
        if (!showCalculator) return;

        function handleClickOutside(event) {
            if (calculatorPopoverRef.current && !calculatorPopoverRef.current.contains(event.target) &&
                calculatorIconRef.current && !calculatorIconRef.current.contains(event.target)) {
                closeCalculator();
            }
        }

        function handleScroll() {
            closeCalculator();
        }

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [showCalculator]);

    useEffect(() => {
        if (showCalculator) {
            const timer = setTimeout(() => {
                setIsCalculatorPopoverVisible(true);
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [showCalculator]);

    // 处理流动性添加器相关
    useEffect(() => {
        if (!showLiquidityAdder) return;

        function handleClickOutside(event) {
            const popover = liquidityAdderPopoverRef.current;
            if (popover && !popover.contains(event.target) &&
                liquidityAdderIconRef.current && !liquidityAdderIconRef.current.contains(event.target)) {

                // 检查点击是否在滚动条上
                const isClickOnScrollbar = event.clientX >= popover.clientWidth;
                if (!isClickOnScrollbar) {
                    closeLiquidityAdder();
                }
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showLiquidityAdder]);

    useEffect(() => {
        if (showLiquidityAdder) {
            const timer = setTimeout(() => {
                setIsLiquidityAdderPopoverVisible(true);
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [showLiquidityAdder]);

    const getStatusColor = () => {
        if (pool.error) return 'border-error-500 bg-error-50';
        if (pool.isLoading || isRefreshing) return 'border-primary-500 bg-primary-50';
        return 'border-success-500 bg-success-50';
    };

    const getStatusIcon = () => {
        if (pool.error) return '❌';
        if (pool.isLoading || isRefreshing) return '🔄';
        return '✅';
    };

    const openCalculator = () => {
        if (calculatorIconRef.current) {
            const rect = calculatorIconRef.current.getBoundingClientRect();
            const popoverWidth = 320;
            let left = rect.right + 12;
            if (left + popoverWidth > window.innerWidth) {
                left = rect.left - popoverWidth - 12;
            }

            setCalculatorPopoverPosition({
                top: rect.top,
                left: left,
            });
            setShowCalculator(true);
        }
    }

    const closeCalculator = () => {
        setIsCalculatorPopoverVisible(false);
        setTimeout(() => {
            setShowCalculator(false);
        }, 200);
    }

    const openLiquidityAdder = () => {
        if (liquidityAdderIconRef.current) {
            const rect = liquidityAdderIconRef.current.getBoundingClientRect();
            const popoverWidth = 384; // w-96
            let left = rect.right + 12;
            if (left + popoverWidth > window.innerWidth - 20) { // 20px margin from edge
                left = rect.left - popoverWidth - 12;
            }

            // 计算可用高度，防止弹窗超出视窗
            const availableHeight = window.innerHeight - rect.top - 20; // 20px margin from bottom

            setLiquidityAdderPopoverPosition({
                top: rect.top,
                left: left,
                maxHeight: availableHeight
            });
            setShowLiquidityAdder(true);
        }
    }

    const closeLiquidityAdder = () => {
        setIsLiquidityAdderPopoverVisible(false);
        setTimeout(() => {
            setShowLiquidityAdder(false);
        }, 300); // 匹配CSS动画时长
    }

    return (
        <motion.div
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <div
                ref={setNodeRef}
                style={style}
                className={`card border ${getStatusColor()} transition-all duration-200 self-start`}
            >
                <PoolCardHeader
                    pool={pool}
                    attributes={attributes}
                    listeners={listeners}
                    getStatusIcon={getStatusIcon}
                    onRemove={onRemove}
                    onClone={onClone}
                    openCalculator={openCalculator}
                    calculatorIconRef={calculatorIconRef}
                    openLiquidityAdder={openLiquidityAdder}
                    liquidityAdderIconRef={liquidityAdderIconRef}
                />

                {pool.error && (
                    <div className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded text-xs m-2">
                        <strong>错误:</strong> {pool.error}
                    </div>
                )}

                {pool.isLoading && !pool.lpInfo && (
                    <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                        <span className="ml-2 text-primary-600 text-xs">加载中...</span>
                    </div>
                )}

                {pool.lpInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="p-3 space-y-3">
                            <PoolInfo pool={pool} outOfRangeCount={outOfRangeCount} />
                            <NftSection
                                pool={pool}
                                nftId={nftId}
                                onNftIdChange={handleNftIdChange}
                                onNftInfoUpdate={onNftInfoUpdate}
                            />
                            <TechnicalInfo lpInfo={pool.lpInfo} outOfRangeCount={outOfRangeCount} />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* 流动性占比计算器 */}
            {showCalculator && pool.lpInfo && (
                <LiquidityCalculator
                    poolInfo={pool.lpInfo}
                    position={calculatorPopoverPosition}
                    isVisible={isCalculatorPopoverVisible}
                    onClose={closeCalculator}
                    popoverRef={calculatorPopoverRef}
                />
            )}

            {/* 一键添加流动性 */}
            {showLiquidityAdder && pool.lpInfo && (
                <LiquidityAdder
                    poolInfo={pool.lpInfo}
                    position={liquidityAdderPopoverPosition}
                    isVisible={isLiquidityAdderPopoverVisible}
                    onClose={closeLiquidityAdder}
                    popoverRef={liquidityAdderPopoverRef}
                />
            )}
        </motion.div>
    );
};

export const SortablePoolCard = (props) => {
    return <PoolCard {...props} />;
};

export default PoolCard; 