import * as React from "react";
import { useState, useEffect } from "react";
import ChatInterface from "@/components/ChatInterface";
import ResultDisplay from "@/components/ResultDisplay";
import Header from "@/components/Header";
import { QueryResult } from "@/types/types";
import { processChatMessage } from "@/services/chatService";

const Index = () => {
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async (message: string) => {
    try {
      // Add user message to chat
      setMessages(prev => [...prev, { text: message, isUser: true }]);
      setIsLoading(true);
      setError(null);
      
      // Process the message
      const result = await processChatMessage(message);
      
      // Add AI response to chat
      setMessages(prev => [...prev, { text: result.summary, isUser: false }]);
      setCurrentResult(result);
    } catch (err: any) {
      console.error("Error processing message:", err);
      setError(err.message || "Failed to process your request. Please try again.");
      setMessages(prev => [...prev, { 
        text: "I encountered an error processing your request. Please try rephrasing your question.", 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <div className="w-full md:w-1/2 p-4 flex flex-col">
          <ChatInterface 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
          />
        </div>
        <div className="w-full md:w-1/2 p-4 bg-white border-l border-gray-200 overflow-auto">
          <ResultDisplay 
            result={currentResult}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
