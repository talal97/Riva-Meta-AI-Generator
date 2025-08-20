
export interface Product {
  sku: string;
  name: string;
  position?: string;
  status?: string;
  theme?: string;
  disabling_reason?: string;
  B101_stock?: string;
  K9901_stock?: string;
  magento_stock?: string;
  stock_status?: string;
  'price (KWD)'?: string;
  'special_price (KWD)'?: string;
  'special_from_date (YYYY-MM-DD)'?: string;
  'special_to_date (YYYY-MM-DD)'?: string;
  size?: string;
  // New fields from the second CSV format
  Season?: string;
  Gender?: string;
  'Product Type'?: string;
  // Generic property to allow any other columns
  [key: string]: string | undefined;
}

export interface ProcessedProduct extends Product {
  'Meta Title EN': string;
  'Meta Description EN': string;
  'Meta Title AR': string;
  'Meta Description AR': string;
}
