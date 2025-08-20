
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Product, ProcessedProduct } from './types';
import { generateMetaContentForBatch, generateMetaContentForSingleProduct, DEFAULT_AI_INSTRUCTIONS } from './services/geminiService';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ProductTable from './components/ProductTable';
import Button from './components/Button';
import { DownloadIcon, SparklesIcon, InfoIcon, ResumeIcon, StopIcon, ChipIcon } from './components/Icons';
import ProgressBar from './components/ProgressBar';
import AdvancedSettings from './components/AdvancedSettings';
import ColumnBestPractices from './components/ColumnBestPractices';

type SavedSession = {
  fileName: string;
  originalData: Product[];
  processedData: ProcessedProduct[];
  isResumable?: boolean;
};

const App: React.FC = () => {
  const [originalData, setOriginalData] = useState<Product[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [regeneratingSkus, setRegeneratingSkus] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const [customInstructions, setCustomInstructions] = useState(DEFAULT_AI_INSTRUCTIONS);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const [isResumable, setIsResumable] = useState<boolean>(false);
  const [estimatedTokens, setEstimatedTokens] = useState<number | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    // --- Theme Initialization ---
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme(systemPrefersDark ? 'dark' : 'light');
    }

    // --- Session Initialization ---
    try {
        const sessionJson = localStorage.getItem('riva-meta-generator-session');
        if (sessionJson) {
            const sessionData = JSON.parse(sessionJson) as SavedSession;
            if (sessionData.fileName && sessionData.originalData && sessionData.processedData) {
                setSavedSession(sessionData);
            }
        }
    } catch (e) {
        console.error("Failed to parse saved session.", e);
        localStorage.removeItem('riva-meta-generator-session');
    }
  }, []);

  useEffect(() => {
    if (theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }
  }, [theme]);

  // Real-time token estimation
  useEffect(() => {
    if (originalData.length > 0) {
        // Heuristic: 1 token is roughly 4 characters for English text.
        // This calculates the total characters and divides by 4 to estimate tokens.
        const productDataString = JSON.stringify(originalData);
        const totalChars = productDataString.length + customInstructions.length;
        const estimate = Math.ceil(totalChars / 4);
        setEstimatedTokens(estimate);
    } else {
        setEstimatedTokens(null);
    }
  }, [originalData, customInstructions]);


  const saveCurrentStateToSession = (isPartial: boolean = false) => {
    if (file && originalData.length > 0) {
        const sessionToSave: SavedSession = {
            fileName: file.name,
            originalData: originalData,
            processedData: processedData,
            isResumable: isPartial,
        };
        localStorage.setItem('riva-meta-generator-session', JSON.stringify(sessionToSave));
    }
  };

  // Syncs edits to localStorage
  useEffect(() => {
    if (file && processedData.length > 0 && localStorage.getItem('riva-meta-generator-session')) {
        saveCurrentStateToSession(isResumable);
    }
  }, [processedData, isResumable]);


  const handleToggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleDismissSession = () => {
    setSavedSession(null);
    localStorage.removeItem('riva-meta-generator-session');
  };

  const handleFileSelect = (selectedFile: File) => {
    handleDismissSession();
    setFile(selectedFile);
    setOriginalData([]);
    setProcessedData([]);
    setError(null);
    setProgress(0);
    setProgressMessage(null);
    setIsResumable(false);
    setEstimatedTokens(null);
  
    const reader = new FileReader();
  
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result;
        if (!fileContent) {
          setError("Could not read file content.");
          return;
        }
  
        let resultsData: any[];
  
        if (selectedFile.name.toLowerCase().endsWith('.csv')) {
          const results = Papa.parse<any>(fileContent as string, {
            header: true,
            skipEmptyLines: true,
          });
  
          if (results.errors.length > 0) {
            console.error("CSV Parsing errors:", results.errors);
            setError(`Error parsing CSV file. Please check the console for details. First error: ${results.errors[0].message}`);
            return;
          }
          resultsData = results.data;
        } else if (selectedFile.name.toLowerCase().endsWith('.xlsx')) {
          const workbook = XLSX.read(fileContent, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          resultsData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });
        } else {
          setError("Unsupported file type. Please upload a CSV or XLSX file.");
          return;
        }
  
        const normalizeData = (data: any[]): Product[] => {
            return data.map(row => {
                const normalizedRow: { [key: string]: any } = {};
                for (const originalKey in row) {
                    if (Object.prototype.hasOwnProperty.call(row, originalKey)) {
                        const lowerKey = originalKey.toLowerCase().trim();
                        let newKey = originalKey;

                        if (lowerKey === 'sku' || lowerKey === 'skus' || lowerKey === 'article number') {
                            newKey = 'sku';
                        } else if (lowerKey === 'name') {
                            newKey = 'name';
                        }
                        
                        normalizedRow[newKey] = String(row[originalKey] ?? "");
                    }
                }
                return normalizedRow as Product;
            });
        };

        const normalizedData = normalizeData(resultsData);

        if (normalizedData.length > 0) {
             const firstRow = normalizedData[0];
             if (!firstRow.hasOwnProperty('sku') || !firstRow.hasOwnProperty('name')) {
                 setError("Upload failed: Your file must contain 'sku' (or 'skus', 'Article Number') and 'name' columns.");
                 return;
             }
             if (!firstRow.sku) {
                 setError("Data validation failed: The first product is missing a value in the 'sku' column. SKUs are required for all products.");
                 return;
             }
             if (!firstRow.name) {
                  setError("Data validation failed: The first product is missing a value in the 'name' column. Product names are required.");
                  return;
             }
        }
  
        setOriginalData(normalizedData);
  
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Error parsing file: ${errorMessage}`);
      }
    };
  
    reader.onerror = () => {
      setError("Failed to read the file.");
    };
  
    if (selectedFile.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(selectedFile);
    } else if (selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      reader.readAsArrayBuffer(selectedFile);
    } else {
      setError("Unsupported file type. Please upload a CSV or XLSX file.");
    }
  };
  
  const runGenerationProcess = async (productsToProcess: Product[]) => {
      setIsLoading(true);
      setError(null);
      setIsResumable(false);
      let wasCancelled = false;
      let totalTokensThisRun = 0;
      
      const totalProductsInJob = productsToProcess.length;
      if (totalProductsInJob === 0) {
          setIsLoading(false);
          setProgressMessage('✓ All products have been processed!');
          return;
      }
      
      const BATCH_SIZE = 15;
      const productChunks: Product[][] = [];
      for (let i = 0; i < productsToProcess.length; i += BATCH_SIZE) {
          productChunks.push(productsToProcess.slice(i, i + BATCH_SIZE));
      }
      
      const currentRunResults: ProcessedProduct[] = [];
      const initialProcessedCount = processedData.length;

      try {
        setProgressMessage(`Processing... (${initialProcessedCount} of ${originalData.length} products)`);

        for (let i = 0; i < productChunks.length; i++) {
          if (isCancelledRef.current) {
            wasCancelled = true;
            break;
          }

          const chunk = productChunks[i];
          if (chunk.length === 0) continue;
          
          const { results: generatedMetas, totalTokens } = await generateMetaContentForBatch(chunk, customInstructions);
          totalTokensThisRun += totalTokens;

          const metasMap = new Map(generatedMetas.map(m => [m.sku, m]));

          const processedChunk = chunk.map(product => {
              const meta = metasMap.get(product.sku);
              return {
                  ...product,
                  'Meta Title': meta?.metaTitle || 'Error: Not Generated',
                  'Meta Description': meta?.metaDescription || 'Error: Not Generated',
              };
          });
          currentRunResults.push(...processedChunk);
          
          setProcessedData(prevData => {
              const newDataMap = new Map(prevData.map(p => [p.sku, p]));
              currentRunResults.forEach(p => newDataMap.set(p.sku, p));
              return originalData.map(og => newDataMap.get(og.sku)).filter(Boolean) as ProcessedProduct[];
          });
          
          const overallProcessedCount = initialProcessedCount + currentRunResults.length;
          const currentProgress = (overallProcessedCount / originalData.length) * 100;
          setProgress(currentProgress);
          setProgressMessage(`Processing... (${overallProcessedCount} of ${originalData.length} products)`);
        }
        
        if (wasCancelled) {
            setProgressMessage('Generation stopped. Ready to resume.');
            setIsResumable(true);
            saveCurrentStateToSession(true);
        } else {
            setProgressMessage(`✓ Generation complete for ${originalData.length} products! Tokens used: ${totalTokensThisRun.toLocaleString()}`);
            saveCurrentStateToSession(false);
        }

      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        
        if (errorMessage.includes("[QUOTA_EXCEEDED]")) {
            const processedCount = initialProcessedCount + currentRunResults.length;
            setError(`Daily token limit reached. ${processedCount} of ${originalData.length} products were processed. You can download the partial results now or resume later when your quota is reset (midnight UTC).`);
            setIsResumable(true);
            saveCurrentStateToSession(true); // Save partial progress
        } else {
            setError(errorMessage);
        }
        setProgressMessage(null);
      } finally {
        setIsLoading(false);
      }
  };

  const handleGenerate = useCallback(() => {
      if (originalData.length === 0) {
        setError("No product data to process. Please upload a valid CSV or Excel file.");
        return;
      }
      isCancelledRef.current = false;
      setProcessedData([]); // Start fresh
      setProgress(0);
      runGenerationProcess(originalData);
  }, [originalData, customInstructions]);

  const handleResume = useCallback(() => {
    isCancelledRef.current = false;
    const processedSkus = new Set(processedData.map(p => p.sku));
    const remainingProducts = originalData.filter(p => !processedSkus.has(p.sku));
    runGenerationProcess(remainingProducts);
  }, [originalData, processedData, customInstructions]);
  
  const handleStop = () => {
    isCancelledRef.current = true;
  };

  const handleDownload = () => {
    if (processedData.length === 0) {
      setError("No processed data to download.");
      return;
    }
    const csv = Papa.unparse(processedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `processed_${file?.name.split('.')[0] || 'products'}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const handleCellChange = (sku: string, field: 'Meta Title' | 'Meta Description', value: string) => {
      setProcessedData(currentData =>
        currentData.map(row =>
            row.sku === sku ? { ...row, [field]: value } : row
        )
      );
  };

  const handleRegenerateRow = useCallback(async (productToRegenerate: ProcessedProduct) => {
    const sku = productToRegenerate.sku;
    setRegeneratingSkus(prev => new Set(prev).add(sku));
    setError(null);

    try {
        const { result, totalTokens } = await generateMetaContentForSingleProduct(productToRegenerate, customInstructions);
        setProcessedData(currentData =>
            currentData.map(row => 
                row.sku === sku ? { ...row, 'Meta Title': result.metaTitle, 'Meta Description': result.metaDescription } : row
            )
        );
    } catch (err) {
        console.error(`Failed to regenerate for SKU ${sku}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        
        if (errorMessage.includes("[QUOTA_EXCEEDED]")) {
            setError(`Daily token limit reached. Regeneration failed for SKU ${sku}. Please try again later when your quota resets (midnight UTC).`);
            // When quota is hit on regenerate, we don't change the cell content. We just show the banner.
        } else {
             setProcessedData(currentData =>
                currentData.map(row =>
                    row.sku === sku ? { ...row, 'Meta Title': 'Error: Regeneration failed', 'Meta Description': 'Please try again or edit manually.' } : row
                )
            );
        }
    } finally {
        setRegeneratingSkus(prev => {
            const next = new Set(prev);
            next.delete(sku);
            return next;
        });
    }
  }, [customInstructions]);

  const handleRestoreSession = () => {
    if (savedSession) {
        setFile(new File([], savedSession.fileName, { type: 'text/csv' }));
        setOriginalData(savedSession.originalData);
        setProcessedData(savedSession.processedData);
        if (savedSession.isResumable) {
            setIsResumable(true);
            setError(`Daily token limit reached. ${savedSession.processedData.length} of ${savedSession.originalData.length} products were processed. You can download the partial results now or resume later when your quota is reset (midnight UTC).`);
        }
        handleDismissSession();
    }
  };

  if (!theme) {
    return null; // Render nothing until theme is determined to avoid FOUC
  }

  return (
    <div className="min-h-screen text-gray-800 bg-brand-light dark:text-gray-200 dark:bg-brand-dark">
      <Header theme={theme} onToggleTheme={handleToggleTheme} />
      {savedSession && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="bg-blue-100 dark:bg-blue-900/40 border border-blue-400/50 dark:border-blue-500/50 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg flex items-center justify-between shadow-md animate-fade-in-down">
                <div className="flex items-center">
                    <InfoIcon className="w-6 h-6 mr-3 text-blue-500 flex-shrink-0"/>
                    <p>
                        <span className="font-bold">Welcome back!</span> Restore your previous session for <span className="font-semibold italic">"{savedSession.fileName}"</span>?
                    </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <button onClick={handleRestoreSession} className="font-bold text-blue-600 dark:text-blue-300 hover:underline">Restore</button>
                    <button onClick={handleDismissSession} className="text-sm text-gray-600 dark:text-gray-400 hover:underline">Dismiss</button>
                </div>
            </div>
        </div>
      )}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-5xl mx-auto bg-white dark:bg-brand-dark-card rounded-2xl shadow-2xl shadow-gray-500/10 dark:shadow-black/20 p-6 md:p-10 border border-gray-200/80 dark:border-gray-700/60">
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Step 1: Upload Your Product Data</h2>
              <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
                Drag and drop or select a CSV or Excel file containing your product information.
              </p>
              <ColumnBestPractices />
              <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} />
            </div>

            {file && !processedData.length && !isLoading && !isResumable && (
              <div className="text-center text-green-600 dark:text-green-400 font-medium">
                <p>✓ File "{file.name}" loaded with {originalData.length} products.</p>
              </div>
            )}

            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400/50 dark:border-red-600/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">
                <strong className="font-bold">An error occurred: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            {(originalData.length > 0 && !processedData.length && !isResumable) || (isResumable && originalData.length > 0) ? (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Step 2: Configure & Generate</h2>
                   <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
                    {isResumable 
                        ? "You can resume generation now or customize instructions before proceeding."
                        : "You can customize the instructions for the AI below, or use the defaults."
                    }
                  </p>
                </div>
                
                <AdvancedSettings 
                    instructions={customInstructions}
                    setInstructions={setCustomInstructions}
                    defaultInstructions={DEFAULT_AI_INSTRUCTIONS}
                />
                
                {estimatedTokens !== null && !isLoading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 -mt-4">
                    <ChipIcon className="w-5 h-5" />
                    <span>Estimated tokens for this job: <strong>~{estimatedTokens.toLocaleString()}</strong></span>
                    <div className="group relative flex items-center">
                      <InfoIcon className="w-4 h-4 cursor-help" />
                      <span className="absolute bottom-full mb-2 w-64 p-2 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          This is a real-time estimate based on the size of your data and instructions (approx. 4 characters per token). Actual token usage will be shown upon completion.
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="text-center">
                  {isResumable ? (
                      <Button onClick={handleResume} disabled={isLoading}>
                        <ResumeIcon className="w-5 h-5 mr-2" />
                        {isLoading ? 'Resuming...' : 'Resume Generation'}
                      </Button>
                  ) : (
                      <Button onClick={handleGenerate} disabled={isLoading || originalData.length === 0}>
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        {isLoading ? 'Generating...' : 'Generate with AI'}
                      </Button>
                  )}
                </div>
              </div>
            ): null}
            
            {isLoading && (
              <div className="flex items-center gap-4 mt-6">
                <div className="flex-grow">
                  <ProgressBar progress={progress} />
                </div>
                <button
                  onClick={handleStop}
                  className="p-2 rounded-full text-red-500 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-brand-dark-card transition-colors duration-200"
                  aria-label="Stop generation"
                >
                  <StopIcon className="w-6 h-6" />
                </button>
              </div>
            )}
            {progressMessage && (
               <p className={`text-center text-sm mt-2 ${!isLoading && (progressMessage.startsWith('✓') || progressMessage.startsWith('Generation stopped')) ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                {progressMessage}
              </p>
            )}
            
            {(processedData.length > 0) && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Step 3: Review & Download
                  </h2>
                  <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
                    Review, edit, and regenerate content below. Download the new CSV when you're ready.
                  </p>
                </div>
                
                <div className="flex justify-center md:justify-end gap-4">
                     {isResumable && !isLoading && (
                        <Button onClick={handleResume}>
                            <ResumeIcon className="w-5 h-5 mr-2" />
                            Resume Generation
                        </Button>
                    )}
                    <Button onClick={handleDownload} disabled={isLoading}>
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Download CSV
                    </Button>
                </div>
                
                <ProductTable 
                  data={processedData} 
                  onCellChange={handleCellChange}
                  onRegenerateRow={handleRegenerateRow}
                  regeneratingSkus={regeneratingSkus}
                />
              </div>
            )}
             {originalData.length > 0 && processedData.length === 0 && !isLoading && !isResumable && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Preview Data</h2>
                        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
                            Here's a preview of your uploaded data. Click 'Generate with AI' above to proceed.
                        </p>
                    </div>
                     <ProductTable 
                        data={originalData} 
                        onCellChange={handleCellChange}
                        onRegenerateRow={handleRegenerateRow}
                        regeneratingSkus={regeneratingSkus}
                    />
                </div>
            )}

          </div>
        </div>
      </main>
      <footer className="text-center py-8 mt-8 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200/80 dark:border-gray-700/60">
        <p>Powered by the Google Gemini API</p>
      </footer>
    </div>
  );
};

export default App;
