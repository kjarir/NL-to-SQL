import { QueryResult } from "@/types/types";
import { toast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

// This function processes a natural language query and returns structured data
export const processChatMessage = async (message: string): Promise<QueryResult> => {
  try {
    // Call the backend API
    const response = await fetch(`${API_URL}/api/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Failed to process your request');
    }

    const data = await response.json();
    
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
