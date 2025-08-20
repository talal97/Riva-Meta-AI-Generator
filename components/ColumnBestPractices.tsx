
import React, { useState } from 'react';
import { ClipboardListIcon, ChevronDownIcon } from './Icons';

const ColumnBestPractices: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <code className="bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5 text-xs font-semibold font-mono text-gray-800 dark:text-gray-200">{children}</code>
    );

    return (
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200/80 dark:border-gray-700/60 transition-all duration-300 mt-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary dark:focus-visible:ring-offset-gray-900/40 rounded-lg"
                aria-expanded={isOpen}
                aria-controls="column-best-practices-panel"
            >
                <div className="flex items-center">
                    <ClipboardListIcon className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400" />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">View Column Best Practices</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <div
                id="column-best-practices-panel"
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[40rem]' : 'max-h-0'}`}
            >
                <div className="px-5 pb-4 border-t border-gray-200/80 dark:border-gray-700/60">
                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-4 pt-4">
                        <p>For the best results, structure your file with the following columns:</p>
                        
                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">Required Columns</h4>
                            <p className="mt-1 text-gray-600 dark:text-gray-400">Your file <strong>must</strong> contain these columns for the tool to work correctly.</p>
                            <ul className="list-disc list-inside mt-2 space-y-1.5 pl-2 text-gray-600 dark:text-gray-400">
                                <li><Code>sku</Code> (or <Code>skus</Code>, <Code>Article Number</Code>): The unique product identifier.</li>
                                <li><Code>name</Code>: The primary name of the product.</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Recommended Columns</h4>
                            <p className="mt-1 text-gray-600 dark:text-gray-400">Including these columns will provide more context to the AI, resulting in higher-quality, more accurate meta content. <strong>The column names can be whatever you use internally.</strong> The AI is smart enough to understand them.</p>
                            <ul className="list-disc list-inside mt-2 space-y-1.5 pl-2 text-gray-600 dark:text-gray-400">
                                <li><Code>description</Code></li>
                                <li><Code>price</Code> (e.g., <Code>price (KWD)</Code>)</li>
                                <li><Code>color</Code> (or <Code>Main_Color</Code>)</li>
                                <li><Code>material</Code></li>
                                <li><Code>Season</Code> (or <Code>Collection</Code>)</li>
                                <li><Code>Product Type</Code> (e.g., 'Dress', 'T-shirt')</li>
                                <li><Code>Gender</Code> (e.g., 'Women', 'Girls')</li>
                            </ul>
                        </div>
                        <p className="!mt-5 text-center text-xs text-gray-500 dark:text-gray-400">
                            <strong>General Tip:</strong> The more descriptive your column names and data are, the better the AI's output will be.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ColumnBestPractices;
