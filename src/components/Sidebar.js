'use client';

import { useState } from 'react';
import AccordionSection from './sidebar/AccordionSection';
import NftSearchSection from './sidebar/NftSearchSection';
import PoolSearchSection from './sidebar/PoolSearchSection';

const Sidebar = ({ onAddPool, pools, onToggle }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [openSection, setOpenSection] = useState('find'); // 'find' or 'search'

    // 处理侧边栏切换
    const handleToggle = () => {
        const newCollapsedState = !isCollapsed;
        setIsCollapsed(newCollapsedState);
        if (onToggle) {
            onToggle(!newCollapsedState); // 传递的是isOpen状态
        }
    };

    return (
        <div className={`${isCollapsed ? 'w-0' : 'w-full sm:w-96'} bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800/50 transition-[width] duration-300 relative overflow-y-auto overflow-x-hidden custom-scrollbar`}>
            {/* 收起/展开按钮 */}
            <button
                onClick={handleToggle}
                className={`fixed top-1/2 -translate-y-1/2 z-50 rounded-full p-1.5
                bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm
                border border-neutral-200/50 dark:border-neutral-700
                shadow-md hover:shadow-lg
                hover:bg-white/90 dark:hover:bg-neutral-800
                transition-all duration-300
                ${isCollapsed
                        ? 'left-2'
                        : 'sm:left-[23rem] left-[calc(100%-3.25rem)]'
                    }`}
                aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
            >
                <svg
                    className={`w-6 h-6 text-neutral-600 dark:text-neutral-300 transition-transform duration-300 ${!isCollapsed ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* 内容区域 */}
            <div className="h-full">
                <AccordionSection
                    title="查找地址的LP NFT"
                    id="find"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-600 dark:text-green-400">
                        <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v1.286a.75.75 0 0 0 .75.75h.25a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 0 .75.75h.25a.75.75 0 0 0 .75-.75V6.03a9.703 9.703 0 0 0 2.25-.533Z" />
                        <path fillRule="evenodd" d="M12.75 3a9.735 9.735 0 0 1 3.25.555.75.75 0 0 1 .5.707v1.286a.75.75 0 0 1-.75.75h-.25a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 1-.75.75h-.25a.75.75 0 0 1-.75-.75V6.03a9.703 9.703 0 0 1-2.25-.533.75.75 0 0 1-.5-.707V3.555A.75.75 0 0 1 8.25 3c1.045 0 2.019.311 2.812.86a3.74 3.74 0 0 1 1.688 0ZM18 5.25a.75.75 0 0 0-.75.75v1.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V6a.75.75 0 0 0-.75-.75h-.75a.75.75 0 0 0-.75.75v3a3 3 0 0 0 3 3h1.5a3 3 0 0 0 3-3V6a.75.75 0 0 0-.75-.75h-.75Z" clipRule="evenodd" />
                        <path d="M5.25 12.375a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 .75.75h.75a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 0-.75-.75H5.25ZM9 12.375a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 .75.75h.75a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 0-.75-.75H9Z" />
                        <path d="M13.5 12.375a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 0-.75-.75h-3Z" />
                    </svg>}
                    openSection={openSection}
                    setOpenSection={setOpenSection}
                >
                    {!isCollapsed && <NftSearchSection pools={pools} onAddPool={onAddPool} />}
                </AccordionSection>

                <AccordionSection
                    title="搜索池子"
                    id="search"
                    icon={<svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>}
                    openSection={openSection}
                    setOpenSection={setOpenSection}
                >
                    {!isCollapsed && <PoolSearchSection pools={pools} onAddPool={onAddPool} />}
                </AccordionSection>
            </div>
        </div>
    );
};

export default Sidebar; 