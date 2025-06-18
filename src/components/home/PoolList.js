import React from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { AnimatePresence } from 'framer-motion';
import { SortablePoolCard } from '../PoolCard';

function EmptyState() {
    return (
        <div className="w-full text-center py-24 px-4">
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">
                还没有添加任何池子
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                在上方输入框添加地址，即可开始监控
            </p>
        </div>
    );
}

export default function PoolList({
    isSidebarOpen,
    pools,
    onDragEnd,
    onRemove,
    onClone,
    outOfRangeCounts,
    onNftInfoUpdate,
    onNftIdChange,
    flashingMonitors,
}) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    return (
        <div className={`${isSidebarOpen ? 'hidden lg:block' : 'block'}`}>
            {pools.length > 0 ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                >
                    <SortableContext
                        items={pools.map(pool => pool.uniqueId)}
                        strategy={rectSortingStrategy}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                            <AnimatePresence>
                                {pools.map((pool) => (
                                    <SortablePoolCard
                                        key={pool.uniqueId}
                                        id={pool.uniqueId}
                                        pool={pool}
                                        onRemove={() => onRemove(pool.uniqueId)}
                                        onClone={() => onClone(pool.uniqueId)}
                                        outOfRangeCount={outOfRangeCounts[pool.address] || 0}
                                        onNftInfoUpdate={(updatedNftInfo) => onNftInfoUpdate(pool.uniqueId, updatedNftInfo)}
                                        onNftIdChange={(newId) => onNftIdChange(pool.uniqueId, newId)}
                                        isFlashing={flashingMonitors[pool.uniqueId]}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <EmptyState />
            )}
        </div>
    );
} 