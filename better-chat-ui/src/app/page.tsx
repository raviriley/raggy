"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

// Use the Next.js API route that proxies to Docker
const BACKEND_ROUTE = "/api/routes/chat/";

interface Message {
  text: string;
  type: 'user' | 'bot';
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hi, I'm here to help with any questions about Flare! What would you like to know?",
      type: 'bot'
    }
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<boolean>(false);
  const [pendingTransaction, setPendingTransaction] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string): Promise<string> => {
    try {
      setBackendError(null);
      
      console.log(`Sending request to: ${BACKEND_ROUTE}`);
      
      const response = await fetch(BACKEND_ROUTE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      // Check if response contains a transaction preview
      if (data.response && data.response.includes('Transaction Preview:')) {
        setAwaitingConfirmation(true);
        setPendingTransaction(text);
      }

      return data.response || 'No response from backend';
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setBackendError(errorMessage);
      return `Sorry, there was an error connecting to the Docker backend. Please ensure that the Docker container is running.`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsLoading(true);
    setMessages(prev => [...prev, { text: messageText, type: 'user' }]);

    // Handle transaction confirmation
    if (awaitingConfirmation) {
      if (messageText.toUpperCase() === 'CONFIRM') {
        setAwaitingConfirmation(false);
        const response = await handleSendMessage(pendingTransaction as string);
        setMessages(prev => [...prev, { text: response, type: 'bot' }]);
      } else {
        setAwaitingConfirmation(false);
        setPendingTransaction(null);
        setMessages(prev => [...prev, {
          text: 'Transaction cancelled. How else can I help you?',
          type: 'bot'
        }]);
      }
    } else {
      const response = await handleSendMessage(messageText);
      setMessages(prev => [...prev, { text: response, type: 'bot' }]);
    }

    setIsLoading(false);
  };

  // Custom components for ReactMarkdown
  const MarkdownComponents: Components = {
    // Override paragraph to remove default margins
    p: ({ children }) => <span className="inline">{children}</span>,
    // Style code blocks
    code: ({ inline, className, children, ...props }: any) => {
      if (inline) {
        return <code className="bg-gray-200 rounded px-1 py-0.5 text-sm">{children}</code>;
      }
      return (
        <pre className="bg-gray-200 rounded p-2 my-2 overflow-x-auto">
          <code {...props} className="text-sm">{children}</code>
        </pre>
      );
    },
    // Style links
    a: ({ children, ...props }) => (
      <a {...props} className="text-pink-600 hover:underline">{children}</a>
    )
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex flex-col h-full max-w-4xl mx-auto w-full shadow-lg bg-white">
        {/* Header */}
        <div className="bg-pink-600 text-white p-4">
          <h1 className="text-xl font-bold">Flare AI RAG</h1>
          <p className="text-sm opacity-80">(Based on Flare Dev Hub)</p>
        </div>

        {/* Backend Error Banner */}
        {backendError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Backend Error: </strong>
            <span className="block sm:inline">{backendError}</span>
            <p className="mt-1 text-sm">Please ensure the Docker container is running.</p>
          </div>
        )}

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold mr-2">
                  A
                </div>
              )}
              <div
                className={`max-w-xs px-4 py-2 rounded-xl ${
                  message.type === 'user'
                    ? 'bg-pink-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <div className="text-sm break-words whitespace-pre-wrap">
                  <ReactMarkdown components={MarkdownComponents}>
                    {message.text}
                  </ReactMarkdown>
                </div>
              </div>
              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold ml-2">
                  U
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold mr-2">
                A
              </div>
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-xl rounded-bl-none">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input form */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={awaitingConfirmation ? "Type CONFIRM to proceed or anything else to cancel" : "Type your message... (Markdown supported)"}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-pink-600 text-white p-2 rounded-full hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
