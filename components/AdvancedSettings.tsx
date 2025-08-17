import React, { useState } from 'react';
import { SettingsIcon, ChevronDownIcon } from './Icons';

interface AdvancedSettingsProps {
    instructions: string;
    setInstructions: (instructions: string) => void;
    defaultInstructions: string;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ instructions, setInstructions, defaultInstructions }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleReset = () => {
        setInstructions(defaultInstructions);
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200/80 dark:border-gray-700/60 transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary dark:focus-visible:ring-offset-gray-900/40 rounded-lg"
                aria-expanded={isOpen}
                aria-controls="advanced-settings-panel"
            >
                <div className="flex items-center">
                    <SettingsIcon className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400" />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Customize AI Instructions</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <div
                id="advanced-settings-panel"
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[30rem]' : 'max-h-0'}`}
            >
                <div className="p-4 border-t border-gray-200/80 dark:border-gray-700/60">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Edit the system prompt below to change the AI's behavior, tone, or SEO rules.
                    </p>
                    <textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        rows={12}
                        className="w-full p-3 text-sm font-mono bg-white dark:bg-brand-dark border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        aria-label="AI Custom Instructions"
                    />
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-sm font-semibold text-brand-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
                        >
                            Reset to Default
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedSettings;
