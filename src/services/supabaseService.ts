import { createClient } from '@supabase/supabase-js';
import { SupabaseCredentials } from '@/types/types';

// Supabase credentials
const supabaseCredentials: SupabaseCredentials = {
  url: 'https://nhsblrznakczbtevrrrp.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oc2JscnpuYWtjemJ0ZXZrcnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjQzNzUsImV4cCI6MjA2Mjk0MDM3NX0.e-9FykguZ52bWwPLkQLCBlICDcHOfMNgADty4LUMSY0'
};

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseCredentials.url, supabaseCredentials.key);

export const executeQuery = async (query: string): Promise<any[]> => {
  try {
    console.log('Executing SQL query:', query);
    
    // Use direct SQL query with service role key for more permissions
    const { data, error } = await supabase.rpc('execute_sql_query', { query_string: query });
    
    if (error) {
      console.error('Error executing query:', error);
      throw error;
    }
    
    console.log('Query results:', data);
    return data || [];
  } catch (error) {
    console.error('Error in executeQuery:', error);
    console.log('Returning mock data as fallback');
    // Return mock data that matches the expected format of the query
  }
};

export const fetchTableSchema = async (): Promise<any> => {
  try {
    console.log('Fetching table schema from Supabase');
    
    // Query to get all tables in public schema
    const { data: tablesData, error: tablesError } = await supabase.rpc('execute_sql_query', { 
      query_string: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    });
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      throw tablesError;
    }

    const schema: Record<string, any> = {};
    
    // For each table, get its columns
    for (const table of tablesData || []) {
      const tableName = table.table_name;
      
      const { data: columnsData, error: columnsError } = await supabase.rpc('execute_sql_query', { 
        query_string: `SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}'`
      });
        
      if (columnsError) {
        console.error(`Error fetching columns for ${tableName}:`, columnsError);
        continue;
      }
      
      schema[tableName] = {
        columns: columnsData?.map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          description: `${col.column_name} (${col.data_type})`
        })) || []
      };
    }
    
    console.log('Successfully fetched schema:', schema);
    return schema;
  } catch (error) {
    console.error('Error in fetchTableSchema:', error);
    console.log('Returning mock schema as fallback');
    
  }
};

// Function to return appropriate mock data based on the query

