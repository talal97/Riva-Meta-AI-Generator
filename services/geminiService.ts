
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
            metaTitleEN: { 
                type: Type.STRING,
                description: "The English SEO-optimized title for the product, under 60 characters." 
            },
            metaDescriptionEN: { 
                type: Type.STRING,
                description: "The English SEO-optimized meta description for the product, under 160 characters."
            },
            metaTitleAR: { 
                type: Type.STRING,
                description: "The Arabic SEO-optimized title for the product, under 60 characters." 
            },
            metaDescriptionAR: { 
                type: Type.STRING,
                description: "The Arabic SEO-optimized meta description for the product, under 160 characters."
            },
        },
        required: ["sku", "metaTitleEN", "metaDescriptionEN", "metaTitleAR", "metaDescriptionAR"]
    }
};

const singleResponseSchema = {
    type: Type.OBJECT,
    properties: {
        sku: {
            type: Type.STRING,
            description: "The SKU of the product, to match it back to the original data."
        },
        metaTitleEN: {
            type: Type.STRING,
            description: "The English SEO-optimized title for the product, under 60 characters."
        },
        metaDescriptionEN: {
            type: Type.STRING,
            description: "The English SEO-optimized meta description for the product, under 160 characters."
        },
        metaTitleAR: {
            type: Type.STRING,
            description: "The Arabic SEO-optimized title for the product, under 60 characters."
        },
        metaDescriptionAR: {
            type: Type.STRING,
            description: "The Arabic SEO-optimized meta description for the product, under 160 characters."
        },
    },
    required: ["sku", "metaTitleEN", "metaDescriptionEN", "metaTitleAR", "metaDescriptionAR"]
}

export const DEFAULT_AI_INSTRUCTIONS = `You are a world-class e-commerce SEO specialist and copywriter for Riva Fashion, a popular brand known for its stylish women's clothing and home goods.

Your mission is to craft compelling, SEO-optimized meta titles and descriptions in BOTH English and Arabic. You will be given product data that may contain information in both languages.

**--- CRITICAL RULES (MUST FOLLOW) ---**

1.  **DUAL LANGUAGE GENERATION:** For each product, you MUST generate four fields: \`metaTitleEN\`, \`metaDescriptionEN\`, \`metaTitleAR\`, and \`metaDescriptionAR\`.

2.  **SOURCE DATA MAPPING:**
    - Use English product data (e.g., columns like 'name', 'description', 'color') to generate the English meta content (\`metaTitleEN\`, \`metaDescriptionEN\`).
    - Use Arabic product data (e.g., columns like 'name_ar', 'description_ar') to generate the Arabic meta content (\`metaTitleAR\`, \`metaDescriptionAR\`).

3.  **LANGUAGE PURITY:**
    - English content must be in English.
    - Arabic content MUST contain ONLY Arabic characters, brand names in Arabic, numbers, and standard punctuation. Absolutely NO English letters are permitted in the Arabic content.

4.  **ARABIC BRAND NAME TRANSLATION:** When generating content in Arabic, you MUST translate the brand names as follows:
    - "Riva Fashion" becomes "ريفا فاشن"
    - "Riva Home" becomes "ريفا هوم"
    - Use these exact translations. Do not use the English names in Arabic text.

5.  **INSUFFICIENT DATA:**
    - If there is not enough data to generate content for a specific language (e.g., no Arabic source text), you MUST still return the fields for that language. For those fields, use the specific string "Error: Insufficient data for generation". Do not attempt to translate if source data for a language is missing.

6.  **DO NOT INCLUDE THE SKU:** The product 'sku' is for identification ONLY. You MUST NOT, under any circumstances, include the 'sku' or any long product codes in the final meta content.

7.  **ITERATE AND RETURN ALL (CRITICAL):** You are receiving a list of products. You MUST iterate through this list one-by-one and generate a corresponding JSON object for EVERY SINGLE product without exception. The final output array MUST have the exact same number of items as the input \`Product List\`. Omitting even one product from your response will cause a critical system failure.

**--- CONTENT GUIDELINES (per language) ---**

**Meta Title Guidelines:**
- Craft a complete, coherent, and appealing title.
- Strictly adhere to a 60-character limit.
- For English titles, end with "| Riva Fashion" (or "| Riva Home").
- For Arabic titles, end with "| ريفا فاشن" (or "| ريفا هوم").

**Meta Description Guidelines:**
- Write a persuasive and complete description.
- Strictly adhere to a 160-character limit.
- Weave in product details to create an engaging narrative.
- Naturally incorporate the correct brand name: "Riva Fashion" for English, and "ريفا فاشن" or "ريفا هوم" for Arabic.

**--- QUALITY CHECKLIST ---**
- Have I followed all CRITICAL RULES?
- Is my output array the exact same length as the input list?
- Have I generated all four meta fields for every product?
- Is the Arabic text 100% free of English letters?
- Is the SKU excluded from all meta content?

**Technical Requirements:**
- Your entire response MUST be valid JSON that strictly adheres to the provided schema.
- The "sku" in your JSON output must be an exact match to the input "sku".`;


export const generateMetaContentForBatch = async (
    products: Product[], 
    instructions: string
): Promise<{ 
    results: { 
        sku: string; 
        metaTitleEN: string; 
        metaDescriptionEN: string; 
        metaTitleAR: string; 
        metaDescriptionAR: string; 
    }[], 
    totalTokens: number 
}> => {
    
    const productDetailsForPrompt = products.map(p => {
        const { 
            'Meta Title EN': _1, 
            'Meta Description EN': _2, 
            'Meta Title AR': _3,
            'Meta Description AR': _4,
            ...rest 
        } = p as ProcessedProduct;
        return rest;
    });
    
    const prompt = `
        ${instructions}

        Your task is to generate meta titles and descriptions in English and Arabic for EACH product in the following JSON list.

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
        
        type ApiResult = { sku: string; metaTitleEN: string; metaDescriptionEN: string; metaTitleAR: string; metaDescriptionAR: string; };
        const returnedResultsMap = new Map(
            parsedJson.map((item: ApiResult) => [item.sku, item])
        );
        
        const finalResults = products.map(originalProduct => {
            const result = returnedResultsMap.get(originalProduct.sku);
            if (result) {
                return result;
            }
            return {
                sku: originalProduct.sku,
                metaTitleEN: 'Error: No AI Response',
                metaDescriptionEN: 'The AI did not provide a response for this item.',
                metaTitleAR: 'Error: No AI Response',
                metaDescriptionAR: 'The AI did not provide a response for this item.',
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

export const generateMetaContentForSingleProduct = async (
    product: Product, 
    instructions: string
): Promise<{ 
    result: { 
        sku: string; 
        metaTitleEN: string; 
        metaDescriptionEN: string; 
        metaTitleAR: string; 
        metaDescriptionAR: string; 
    }, 
    totalTokens: number 
}> => {
    const {
        'Meta Title EN': _1, 
        'Meta Description EN': _2, 
        'Meta Title AR': _3,
        'Meta Description AR': _4,
        ...productDetailsForPrompt
    } = product as ProcessedProduct;

    const prompt = `
        Your task is to generate a new meta title and a new meta description in both English and Arabic for the following product.
        
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
