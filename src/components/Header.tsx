
import React from "react";
import { Database } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center">
      <div className="flex items-center">
        <Database className="h-6 w-6 text-indigo-600 mr-3" />
        <h1 className="text-xl font-bold text-gray-900">SQL Whisperer</h1>
      </div>
      <div className="ml-auto">
        <div className="text-sm text-gray-500">
          Ask complex business questions in natural language
        </div>
      </div>
    </header>
  );
};

export default Header;
