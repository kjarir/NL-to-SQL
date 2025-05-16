import React from "react";
import { QueryResult } from "@/types/types";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];
const PLACEHOLDER_DATA = [
  { name: 'Electronics', value: 100 },
  { name: 'Clothing', value: 80 },
  { name: 'Books', value: 60 },
  { name: 'Home', value: 40 },
  { name: 'Sports', value: 20 }
];

interface ResultDisplayProps {
  result: QueryResult | null;
  isLoading: boolean;
  error: string | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Analyzing your query...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Ask a question to see results</p>
      </div>
    );
  }

  const renderChart = () => {
    // Use placeholder if no data or all values are zero/empty
    const isEmpty = !result.chartData || !result.chartType || !Array.isArray(result.chartData) || result.chartData.length === 0 || result.chartData.every((d: any) => Object.values(d).every((v) => v === 0 || v === null || v === undefined || v === ''));
    const chartData = isEmpty ? PLACEHOLDER_DATA : result.chartData;
    const chartType = result.chartType || 'bar';

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} barCategoryGap={isEmpty ? 60 : 20}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name">
                <Label value="Category" offset={-5} position="insideBottom" />
              </XAxis>
              <YAxis>
                <Label value="Value" angle={-90} position="insideLeft" />
              </YAxis>
              <Tooltip />
              <Legend />
              <Bar
                dataKey={isEmpty ? 'value' : Object.keys(chartData[0] || {}).find(k => k !== 'name') || 'value'}
                fill={COLORS[0]}
                radius={[10, 10, 0, 0]}
                isAnimationActive={true}
                animationDuration={1200}
                background={{ fill: '#f3f4f6' }}
                minPointSize={isEmpty ? 20 : 2}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name">
                <Label value="Category" offset={-5} position="insideBottom" />
              </XAxis>
              <YAxis>
                <Label value="Value" angle={-90} position="insideLeft" />
              </YAxis>
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={isEmpty ? 'value' : Object.keys(chartData[0] || {}).find(k => k !== 'name') || 'value'}
                stroke={COLORS[1]}
                strokeWidth={3}
                dot={{ r: 6, stroke: COLORS[1], strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 10, fill: COLORS[1] }}
                isAnimationActive={true}
                animationDuration={1200}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => entry.name}
                isAnimationActive={true}
                animationDuration={1200}
              >
                {chartData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="space-y-6">
            {/* Summary Section */}
            <motion.div
              className="bg-indigo-50 p-4 rounded-lg border border-indigo-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="font-medium mb-2 text-indigo-800">Summary</h3>
              <p className="text-gray-700">{result.summary}</p>
            </motion.div>

            {/* Tabs for different views */}
            <Tabs defaultValue="visualization">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="visualization">Visualization</TabsTrigger>
                <TabsTrigger value="data">Data Table</TabsTrigger>
                <TabsTrigger value="query">SQL Query</TabsTrigger>
              </TabsList>
              
              {/* Visualization Tab */}
              <TabsContent value="visualization" className="pt-4">
                <AnimatePresence mode="wait">
                  {result.chartType ? (
                    <motion.div
                      key={result.chartType + JSON.stringify(result.chartData)}
                      className="border rounded-lg p-4 bg-white"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.5 }}
                    >
                      {renderChart()}
                    </motion.div>
                  ) : (
                    <motion.p
                      className="text-gray-500 text-center py-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      No visualization available for this query
                    </motion.p>
                  )}
                </AnimatePresence>
              </TabsContent>
              
              {/* Data Table Tab */}
              <TabsContent value="data" className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs uppercase bg-gray-50 text-gray-700">
                      <tr>
                        {result.columns.map((column, i) => (
                          <th key={i} className="px-4 py-3">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rawData.map((row, i) => (
                        <tr key={i} className="border-b">
                          {Object.values(row).map((cell, j) => (
                            <td key={j} className="px-4 py-3">
                              {cell !== null && cell !== undefined ? String(cell) : 'N/A'}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {result.rawData.length === 0 && (
                        <tr>
                          <td 
                            colSpan={result.columns.length} 
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            No data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              
              {/* SQL Query Tab */}
              <TabsContent value="query" className="pt-4">
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
                    <code>{result.sqlQuery}</code>
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ResultDisplay;
