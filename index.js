import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5173;

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Constants
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL
});

// Test database connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Function to get database schema
async function getDatabaseSchema() {
  try {
    const query = `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting database schema:', error);
    throw new Error('Failed to connect to database. Please check your database connection.');
  }
}

// Function to generate prompt for SQL
function generatePrompt(schema, question) {
  const tables = {};
  schema.forEach(row => {
    if (!tables[row.table_name]) tables[row.table_name] = [];
    tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
  });
  let schemaText = Object.entries(tables)
    .map(([table, columns]) =>
      `Table: "${table}"
  Columns: ${columns.map(col => `"${col}"`).join(', ')}`
    ).join('\n');
  return `
You are a PostgreSQL SQL expert. Here is the ACTUAL database schema:

${schemaText}

Instructions:
- ONLY use table and column names from the schema above.
- ALWAYS use double quotes around table and column names in SQL.
- If the user asks for something that doesn't exist, use the closest possible match from the schema.
- NEVER invent table or column names.
- If the user uses a different name, map it to the closest real name and explain your mapping in the explanation.
- Generate a valid PostgreSQL SQL query ONLY. Do NOT generate JavaScript or supabase-js code.

User question: ${question}

Please provide:
1. A valid PostgreSQL SQL query (inside triple backticks if needed) using ONLY the schema above and double quotes for all identifiers.
2. A natural language explanation of the results, including how you mapped user terms to schema names.
3. A recommended chart type (bar, line, pie, etc.) for visualizing the data.

Format your response as:
SQL: [your SQL query]
Explanation: [your explanation]
Chart: [chart type]
`;
}

// Function to call Gemini API
async function callGeminiAPI(prompt) {
  try {
    const response = await axios.post(GEMINI_API_URL, {
      contents: [{
        parts: [{ text: prompt }]
      }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    throw new Error('Failed to get response from Gemini API');
  }
}

// API Routes
app.post('/api/ask', async (req, res) => {
  console.log('Received request to /api/ask');
  try {
    const { question } = req.body;
    if (!question) {
      console.log('No question provided in request');
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log('Processing question:', question);

    // Test database connection first
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({
        error: 'Database connection error',
        details: 'Unable to connect to the database. Please check your database configuration.'
      });
    }

    const schema = await getDatabaseSchema();
    let prompt = generatePrompt(schema, question);
    let response, sql, explanation, chart;
    let attempts = 0;
    let lastError = null;

    while (attempts < 3) {
      try {
        response = await callGeminiAPI(prompt);
        // Parse Gemini response for SQL
        const sqlMatch = response.match(/SQL:\s*```sql\n([\s\S]*?)```|SQL:\s*([\s\S]*?)(?=Explanation:)/i);
        const explanationMatch = response.match(/Explanation:\s*([\s\S]*?)(?=Chart:)/i);
        const chartMatch = response.match(/Chart:\s*([\s\S]*?)$/i);

        if (!sqlMatch || !explanationMatch || !chartMatch) {
          console.error('Invalid response format from Gemini:', response);
          lastError = new Error('Invalid response format from Gemini API');
          attempts++;
          continue;
        }

        sql = (sqlMatch[1] || sqlMatch[2]).trim();
        explanation = explanationMatch[1].trim();
        chart = chartMatch[1].trim();

        console.log('SQL QUERY FROM GEMINI:', sql);
        
        try {
          const { rows } = await pool.query(sql);
          // Force chartData to always be { name, value }
          let chartData = rows;
          if (Array.isArray(rows) && rows.length > 0) {
            const first = rows[0];
            // Find the name/label key
            const nameKey = Object.keys(first).find(k => k.toLowerCase().includes('name')) || Object.keys(first)[0];
            // Find the first numeric value key that is not the name key
            const valueKey = Object.keys(first).find(k => k !== nameKey && typeof first[k] === 'number') || Object.keys(first)[1];
            chartData = rows.map(row => ({
              name: row[nameKey] ? String(row[nameKey]) : '',
              value: row[valueKey] || row.value || row.total || row.revenue || 0
            }));
          }
          return res.json({
            answer: explanation,
            sql: sql,
            chart: chart,
            data: chartData
          });
        } catch (err) {
          console.error('SQL execution error:', err);
          lastError = err;
          attempts++;
        }
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
        lastError = geminiError;
        attempts++;
      }
    }

    return res.status(500).json({
      error: 'Failed to generate a valid SQL query after several attempts.',
      details: lastError ? lastError.message : 'Model kept generating invalid code.'
    });
  } catch (error) {
    console.error('Error in /api/ask:', error);
    res.status(500).json({
      error: 'An error occurred while processing your request',
      details: error.message
    });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 