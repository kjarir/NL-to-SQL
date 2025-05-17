import { QueryResult } from "@/types/types";
import { toast } from "@/hooks/use-toast";

// Get the API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || '';
const isDevelopment = import.meta.env.DEV;

// This function processes a natural language query and returns structured data
export const processChatMessage = async (message: string): Promise<QueryResult> => {
  try {
    // In development, use the proxy. In production, use the full URL
    const apiEndpoint = isDevelopment ? '/api/ask' : `${API_URL}/api/ask`;
    console.log('Making API call to:', apiEndpoint);
    
    // Call the backend API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ question: message }),
    });

    console.log('Response status:', response.status);
    
    // Try to get the response text first
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.details || errorData.error || 'Failed to process your request';
      } catch (e) {
        errorMessage = `Server error (${response.status}): ${responseText}`;
      }
      throw new Error(errorMessage);
    }

    // Parse the response text as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      throw new Error('Invalid JSON response from server');
    }
    
    // Format the response according to the QueryResult interface
    return {
      summary: data.answer,
      sqlQuery: data.sql,
      rawData: data.data,
      chartType: data.chart.toLowerCase() as 'bar' | 'line' | 'pie' | null,
      chartData: formatChartData(data.data, data.chart.toLowerCase() as 'bar' | 'line' | 'pie' | null),
      columns: data.data.length > 0 ? Object.keys(data.data[0]) : []
    };
  } catch (error: any) {
    console.error("Error processing message:", error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message || "Failed to process your request. Please try again."
    });
    
    return {
      summary: "I encountered an error while trying to analyze the data. Please try a different question or check if the database is accessible.",
      sqlQuery: "",
      rawData: [],
      chartType: null,
      chartData: null,
      columns: []
    };
  }
};

// Format chart data based on the result
const formatChartData = (data: any[], chartType: 'bar' | 'line' | 'pie' | null): any => {
  if (!data.length || !chartType) return null;
  
  if (chartType === 'pie') {
    return data.map((item: any) => ({
      name: item.segment || Object.values(item)[0],
      value: item.customer_count || item.count || Object.values(item)[1]
    }));
  } else if (chartType === 'line') {
    return data.map((item: any) => {
      const obj: any = { name: item.quarter || item.date || Object.values(item)[0] };
      
      // Add other numeric properties
      Object.entries(item).forEach(([key, value]) => {
        if (typeof value === 'number' && key !== 'name') {
          obj[key] = value;
        }
      });
      
      return obj;
    });
  } else {
    return data.map((item: any) => {
      const obj: any = { name: Object.values(item)[0] };
      
      // Add other numeric properties
      Object.entries(item).slice(1).forEach(([key, value]) => {
        if (typeof value === 'number') {
          obj[key] = value;
        }
      });
      
      return obj;
    });
  }
};
