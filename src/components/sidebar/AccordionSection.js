'use client';

const AccordionSection = ({ title, id, icon, children, openSection, setOpenSection }) => {
    const isOpen = openSection === id;

    return (
        <div className="border-b border-neutral-200 dark:border-neutral-800">
            <button
                onClick={() => setOpenSection(isOpen ? null : id)}
                className="w-full p-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 bg-gradient-to-br rounded-lg ${id === 'find' ? 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20' : 'from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20'}`}>
                            {icon}
                        </div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
                    </div>
                    <svg
                        className={`w-5 h-5 text-neutral-500 dark:text-neutral-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>
            <div
                className={`grid overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
            >
                <div className="overflow-hidden">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AccordionSection; 