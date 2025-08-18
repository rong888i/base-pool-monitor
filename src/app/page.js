'use client';

import { useState } from 'react';

import Sidebar from '../components/Sidebar';
import RightSidebar from '../components/RightSidebar';
import Settings from '../components/Settings';
import ControlPanel from '../components/home/ControlPanel';
import PoolList from '../components/home/PoolList';
import Footer from '../components/home/Footer';

import { useSettings } from '../hooks/useSettings';
import { usePools } from '../hooks/usePools';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const {
    settings,
    isSettingsOpen,
    setIsSettingsOpen,
    onSettingsUpdate,
  } = useSettings();

  const {
    pools,
    customAddress,
    setCustomAddress,
    outOfRangeCounts,
    addPool,
    removePool,
    clonePool,
    refreshAllPools,
    handleAddPoolFromSidebar,
    handleDragEnd,
    handleNftIdChange,
    handleNftInfoUpdate,
    flashingMonitors,
  } = usePools(settings);

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-neutral-900 dark:to-neutral-800 flex overflow-x-hidden">
      <Sidebar
        onAddPool={handleAddPoolFromSidebar}
        pools={pools}
        onToggle={setIsSidebarOpen}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-3 py-4 min-h-full flex flex-col">
          <ControlPanel
            isSidebarOpen={isSidebarOpen}
            customAddress={customAddress}
            onCustomAddressChange={setCustomAddress}
            addPool={addPool}
            refreshAllPools={refreshAllPools}
            openSettings={() => setIsSettingsOpen(true)}
            pools={pools}
            settings={settings}
          />

          <PoolList
            isSidebarOpen={isSidebarOpen}
            pools={pools}
            onDragEnd={handleDragEnd}
            onRemove={removePool}
            onClone={clonePool}
            outOfRangeCounts={outOfRangeCounts}
            onNftInfoUpdate={handleNftInfoUpdate}
            onNftIdChange={handleNftIdChange}
            flashingMonitors={flashingMonitors}
          />

          <Footer />
        </div>
      </main>

      <RightSidebar
        settings={settings}
        isOpen={isRightSidebarOpen}
        onToggle={setIsRightSidebarOpen}
      />

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdate={onSettingsUpdate}
      />

    </div>
  );
}
