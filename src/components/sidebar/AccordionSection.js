'use client';

const AccordionSection = ({ title, id, icon, children, openSection, setOpenSection }) => {
    const isOpen = openSection === id;

    return (
        <div className="border-b border-neutral-200 dark:border-neutral-800">
            <button
                onClick={() => setOpenSection(isOpen ? null : id)}
                className="w-full p-4 text-left transition-colors duration-200 group"
                data-tooltip-id="my-tooltip"
                data-tooltip-content={title}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                            {icon}
                        </div>
                        <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{title}</h2>
                    </div>
                    <svg
                        className={`w-5 h-5 text-neutral-400 dark:text-neutral-500 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
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