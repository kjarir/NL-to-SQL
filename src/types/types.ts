
export interface QueryResult {
  summary: string;
  sqlQuery: string;
  rawData: any[];
  chartType: 'bar' | 'line' | 'pie' | null;
  chartData: any;
  columns: string[];
}

export interface Message {
  text: string;
  isUser: boolean;
}

export interface SupabaseCredentials {
  url: string;
  key: string;
}
