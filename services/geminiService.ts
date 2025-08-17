import { GoogleGenAI, Type } from "@google/genai";
import type { Product, ProcessedProduct } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const batchResponseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            sku: {
                type: Type.STRING,
                description: "The SKU of the product, to match it back to the original data."
            },
            metaTitle: { 
                type: Type.STRING,
                description: "A concise and SEO-optimized title for the product, under 60 characters." 
            },
            metaDescription: { 
                type: Type.STRING,
                description: "A compelling and SEO-optimized meta description for the product, under 160 characters."
            },
        },
        required: ["sku", "metaTitle", "metaDescription"]
    }
};

const singleResponseSchema = {
    type: Type.OBJECT,
    properties: {
        sku: {
            type: Type.STRING,
            description: "The SKU of the product, to match it back to the original data."
        },
        metaTitle: {
            type: Type.STRING,
            description: "A concise and SEO-optimized title for the product, under 60 characters."
        },
        metaDescription: {
            type: Type.STRING,
            description: "A compelling and SEO-optimized meta description for the product, under 160 characters."
        },
    },
    required: ["sku", "metaTitle", "metaDescription"]
}

export const DEFAULT_AI_INSTRUCTIONS = `You are a world-class e-commerce SEO specialist and copywriter for Riva Fashion, a popular brand known for its stylish women's clothing and home goods.

Your mission is to craft compelling, SEO-optimized meta titles and descriptions. You will be given product data that includes a 'sku'.

**--- CRITICAL RULES (MUST FOLLOW) ---**

1.  **DO NOT INCLUDE THE SKU:** The product 'sku' is for identification ONLY. You MUST NOT, under any circumstances, include the 'sku' or any long product codes in the final 'metaTitle' or 'metaDescription'.

2.  **LANGUAGE DETECTION & PURITY:**
    - If a product's 'name' contains Arabic characters, you MUST generate the 'metaTitle' and 'metaDescription' in ARABIC.
    - If the language is ARABIC, the output text MUST contain ONLY Arabic characters, brand names in Arabic, numbers, and standard punctuation. Absolutely NO English letters are permitted in the Arabic content.
    - Otherwise, generate the 'metaTitle' and 'metaDescription' in ENGLISH.

3.  **ARABIC BRAND NAME TRANSLATION:** When generating content in Arabic, you MUST translate the brand names as follows:
    - "Riva Fashion" becomes "ريفا فاشن"
    - "Riva Home" becomes "ريفا هوم"
    - Use these exact translations. Do not use the English names in Arabic text.

4.  **ITERATE AND RETURN ALL (CRITICAL):** This is your most important instruction. You are receiving a list of products. You MUST iterate through this list one-by-one and generate a corresponding JSON object for EVERY SINGLE product without exception. The final output array MUST have the exact same number of items as the input \`Product List\`. If a product has insufficient data, you must still generate its JSON object with its correct "sku" and use the specific string "Error: Could not generate due to insufficient data" for both the "metaTitle" and "metaDescription" fields. DO NOT SKIP ANY PRODUCT. Omitting even one product from your response will cause a critical system failure.

**--- CONTENT GUIDELINES ---**

**Meta Title Guidelines:**
- Craft a complete, coherent, and appealing title.
- Strictly adhere to a 60-character limit. Do not truncate words or phrases unnaturally to meet this limit; prioritize a complete thought.
- Incorporate the primary product name and key features.
- For English titles, end with "| Riva Fashion" (or "| Riva Home").
- For Arabic titles, end with "| ريفا فاشن" (or "| ريفا هوم" if it is a home product).

**Meta Description Guidelines:**
- Write a persuasive and complete description that sparks interest.
- Strictly adhere to a 160-character limit. Avoid abrupt endings.
- Showcase key features, style, and benefits by weaving in details from the product data.
- Transform product details into an engaging narrative. Avoid simply listing attributes.
- Naturally incorporate the correct brand name: "Riva Fashion" for English, and "ريفا فاشن" or "ريفا هوم" for Arabic.

**--- QUALITY CHECKLIST (Before generating the final JSON) ---**
- Have I followed all CRITICAL RULES?
- Is my output array the exact same length as the input list?
- Is the language (English/Arabic) correct for the product?
- If Arabic, is the text 100% free of English letters?
- Is the SKU excluded from the title and description?
- Are the title and description complete, coherent, and not cut off?
- Is the correct brand name (and its correct translation) included?

**Technical Requirements:**
- Your entire response MUST be valid JSON that strictly adheres to the provided schema.
- The "sku" in your JSON output must be an exact match to the input "sku" to ensure correct data mapping. This is the ONLY place the SKU should appear.`;


export const generateMetaContentForBatch = async (products: Product[], instructions: string): Promise<{ results: { sku: string; metaTitle: string; metaDescription: string; }[], totalTokens: number }> => {
    
    const productDetailsForPrompt = products.map(p => {
        const { 
            'Meta Title': metaTitle, 
            'Meta Description': metaDescription, 
            ...rest 
        } = p as ProcessedProduct;
        return rest;
    });
    
    const prompt = `
        ${instructions}

        Your task is to generate a meta title and a meta description for EACH product in the following JSON list, using the provided product attributes.

        Product List:
        ${JSON.stringify(productDetailsForPrompt, null, 2)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: batchResponseSchema,
                temperature: 0.3,
            }
        });

        const totalTokens = response.usageMetadata?.totalTokenCount ?? 0;
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        if (!Array.isArray(parsedJson)) {
            throw new Error("API response was not a JSON array as expected.");
        }
        
        // Create a map for efficient lookup of returned results.
        const returnedResultsMap = new Map(
            parsedJson.map((item: { sku: string; metaTitle: string; metaDescription: string; }) => [item.sku, item])
        );
        
        // Ensure every product from the original chunk has a corresponding result.
        const finalResults = products.map(originalProduct => {
            const result = returnedResultsMap.get(originalProduct.sku);
            if (result) {
                return {
                    sku: result.sku,
                    metaTitle: result.metaTitle,
                    metaDescription: result.metaDescription,
                };
            }
            // If the model omitted a SKU, create a fallback entry. This makes the system more resilient.
            return {
                sku: originalProduct.sku,
                metaTitle: 'Error: No AI Response',
                metaDescription: 'The AI did not provide a response for this item in the batch.',
            };
        });

        return { results: finalResults, totalTokens };

    } catch (error) {
        console.error(`Error generating content for batch:`, error);
        
        let isQuotaError = false;
        let detailedMessage = "An unknown error occurred.";

        let rawErrorString = "";
        if (error instanceof Error) {
            rawErrorString = error.message;
        } else if (typeof error === 'object' && error !== null) {
            rawErrorString = JSON.stringify(error);
        } else {
            rawErrorString = String(error);
        }
        
        detailedMessage = rawErrorString;

        try {
            const parsedError = JSON.parse(rawErrorString);
            if (parsedError?.error) {
                detailedMessage = parsedError.error.message || detailedMessage;
                if (parsedError.error.status === 'RESOURCE_EXHAUSTED') {
                    isQuotaError = true;
                }
            }
        } catch (e) {
            // Not a JSON string, proceed with string check.
        }
        
        if (!isQuotaError && (detailedMessage.includes("RESOURCE_EXHAUSTED") || detailedMessage.includes("quota"))) {
            isQuotaError = true;
        }
        
        if (isQuotaError) {
             throw new Error(`[QUOTA_EXCEEDED] ${detailedMessage}`);
        }
        throw new Error(`Failed to generate meta content for a batch of products. ${detailedMessage}`);
    }
};

export const generateMetaContentForSingleProduct = async (product: Product, instructions: string): Promise<{ result: { sku: string; metaTitle: string; metaDescription: string; }, totalTokens: number }> => {
    const {
        'Meta Title': metaTitle, 
        'Meta Description': metaDescription, 
        ...productDetailsForPrompt
    } = product as ProcessedProduct;

    const prompt = `
        Your task is to generate a new meta title and a new meta description for the following product.
        
        ${instructions}

        Product Details:
        ${JSON.stringify(productDetailsForPrompt, null, 2)}
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: singleResponseSchema,
                temperature: 0.75, // Slightly higher temp for more variety on regeneration
            }
        });
        
        const totalTokens = response.usageMetadata?.totalTokenCount ?? 0;
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        return { result, totalTokens };

    } catch(error) {
        console.error(`Error generating content for single product SKU ${product.sku}:`, error);
        
        let isQuotaError = false;
        let detailedMessage = "An unknown error occurred.";

        let rawErrorString = "";
        if (error instanceof Error) {
            rawErrorString = error.message;
        } else if (typeof error === 'object' && error !== null) {
            rawErrorString = JSON.stringify(error);
        } else {
            rawErrorString = String(error);
        }
        
        detailedMessage = rawErrorString;

        try {
            const parsedError = JSON.parse(rawErrorString);
            if (parsedError?.error) {
                detailedMessage = parsedError.error.message || detailedMessage;
                if (parsedError.error.status === 'RESOURCE_EXHAUSTED') {
                    isQuotaError = true;
                }
            }
        } catch (e) {
            // Not a JSON string, proceed with string check.
        }
        
        if (!isQuotaError && (detailedMessage.includes("RESOURCE_EXHAUSTED") || detailedMessage.includes("quota"))) {
            isQuotaError = true;
        }
        
        if (isQuotaError) {
             throw new Error(`[QUOTA_EXCEEDED] ${detailedMessage}`);
        }
        throw new Error(`Failed to generate meta content for product SKU ${product.sku}. ${detailedMessage}`);
    }
};