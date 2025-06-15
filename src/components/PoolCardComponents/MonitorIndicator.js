import React from 'react';

const MonitorIndicator = ({ text, color, enabled, isFlashing }) => {
    if (!enabled) return null;

    const colorClasses = {
        blue: 'border-blue-400 text-blue-600 bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:bg-blue-900/50 shadow-blue-500/50',
        green: 'border-green-400 text-green-600 bg-green-100 dark:border-green-600 dark:text-green-300 dark:bg-green-900/50 shadow-green-500/50',
        purple: 'border-purple-400 text-purple-600 bg-purple-100 dark:border-purple-600 dark:text-purple-300 dark:bg-purple-900/50 shadow-purple-500/50',
    };
    
    const flashingClass = isFlashing ? 'flash' : '';

    return (
        <span className={`px-1.5 py-0.5 border rounded-md text-xs font-medium transition-all duration-300 ${colorClasses[color]} ${flashingClass}`}>
            {text}
        </span>
    );
};

export default MonitorIndicator; 