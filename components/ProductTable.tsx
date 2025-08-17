import React, { useState, useEffect, useRef } from 'react';
import type { Product, ProcessedProduct } from '../types';
import { RegenerateIcon, SpinnerIcon, UploadCloudIcon, SparklesIcon, DownloadIcon } from './Icons';

interface EditableCellProps {
  initialValue: string;
  onSave: (value: string) => void;
  isTextArea?: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({ initialValue, onSave, isTextArea = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (value !== initialValue) {
        onSave(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isTextArea) {
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    const commonProps = {
      ref: inputRef as any,
      value: value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      className: "w-full p-2 bg-white dark:bg-gray-800 border border-brand-primary rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary",
      'aria-label': `Edit value for ${initialValue}`,
      dir: 'auto' as const,
    };
    return isTextArea ? (
        <textarea {...commonProps} rows={3} />
    ) : (
        <input type="text" {...commonProps} />
    );
  }

  return (
    <span onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/40 p-1 rounded-md transition-colors duration-200" dir="auto">
      {value}
    </span>
  );
};


interface ProductTableProps {
  data: (Product | ProcessedProduct)[];
  onCellChange: (sku: string, field: 'Meta Title' | 'Meta Description', value: string) => void;
  onRegenerateRow: (product: ProcessedProduct) => void;
  regeneratingSkus: Set<string>;
}

const ProductTable: React.FC<ProductTableProps> = ({ data, onCellChange, onRegenerateRow, regeneratingSkus }) => {
  if (data.length === 0) {
    return (
      <div className="text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl mt-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">How It Works</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Get AI-powered meta content in three simple steps.</p>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-16 h-16 mb-4 bg-brand-primary/10 rounded-full">
              <UploadCloudIcon className="w-8 h-8 text-brand-primary" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-200 mb-1">1. Upload CSV</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Select or drop your product file to begin.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-16 h-16 mb-4 bg-brand-primary/10 rounded-full">
              <SparklesIcon className="w-8 h-8 text-brand-primary" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-200 mb-1">2. Generate Content</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Our AI creates SEO-friendly titles & descriptions.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-16 h-16 mb-4 bg-brand-primary/10 rounded-full">
              <DownloadIcon className="w-8 h-8 text-brand-primary" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-200 mb-1">3. Review & Download</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Edit as needed and download your new CSV.</p>
          </div>
        </div>
      </div>
    );
  }

  const isProcessed = 'Meta Title' in data[0];
  const headers = Object.keys(data[0]);
  if(isProcessed) {
      headers.push('Actions');
  }


  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700/60 shadow-lg shadow-gray-500/5 dark:shadow-black/10">
        <div className="w-full overflow-x-auto max-h-[60vh] relative">
            <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-800 dark:text-gray-400 sticky top-0 z-10">
                <tr>
                    {headers.map((header) => (
                    <th key={header} scope="col" className={`px-6 py-3 whitespace-nowrap font-semibold ${(header === 'Meta Title' || header === 'Meta Description') ? 'text-brand-primary' : ''}`}>
                        {header.replace(/_/g, ' ')}
                    </th>
                    ))}
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700/60">
                {data.map((product, index) => (
                    <tr key={product.sku || index} className="bg-white dark:bg-brand-dark-card hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors duration-200">
                    {headers.map((header) => {
                        if (header === 'Actions') {
                            return (
                                <td key={`${product.sku}-actions`} className="px-6 py-4 text-center">
                                    {regeneratingSkus.has(product.sku) ? (
                                        <SpinnerIcon className="w-5 h-5 text-brand-primary animate-spin mx-auto" />
                                    ) : (
                                        <button 
                                            onClick={() => onRegenerateRow(product as ProcessedProduct)} 
                                            className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-brand-primary transition-colors duration-200"
                                            aria-label={`Regenerate content for SKU ${product.sku}`}
                                            title="Regenerate"
                                        >
                                            <RegenerateIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </td>
                            )
                        }

                        const cellValue = product[header] || '';

                        return (
                            <td key={`${product.sku}-${header}`} className="px-6 py-4 whitespace-normal align-top">
                                <span className={`block max-w-xs md:max-w-md ${header === 'name' ? 'font-semibold text-gray-900 dark:text-white' : ''}`}>
                                    {isProcessed && (header === 'Meta Title' || header === 'Meta Description') ? (
                                        <EditableCell
                                            initialValue={cellValue}
                                            onSave={(newValue) => onCellChange(product.sku, header, newValue)}
                                            isTextArea={header === 'Meta Description'}
                                        />
                                    ) : (
                                        <span title={cellValue} dir="auto">{cellValue}</span>
                                    )}
                                </span>
                            </td>
                        )
                    })}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default ProductTable;