import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, User, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../utils.tsx';

export const AICopilot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ prompt: userMessage })
      });
      setMessages(prev => [...prev, { role: 'ai', content: res.response || 'I could not process that request.' }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${err.message || 'Failed to connect to AI.'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: isOpen ? 0 : 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#111111] dark:bg-[#2563EB] text-white rounded-full shadow-xl flex items-center justify-center border-2 border-white/10"
        aria-label="Open AI Copilot"
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[550px] max-h-[calc(100vh-120px)] bg-[#FFFFFF] dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-[#D9D9D4] dark:border-[#333330] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#D9D9D4] dark:border-[#333330] flex items-center justify-between shrink-0 bg-[#F5F5F3] dark:bg-[#1A1A1A]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#111111] dark:bg-[#2563EB] text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111111] dark:text-[#F5F5F3]">FinanceOS Copilot</h3>
                  <p className="text-[11px] text-[#6B6B67] dark:text-[#A1A19D]">Powered by Gemini AI</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#6B6B67] dark:text-[#A1A19D] hover:text-[#111111] dark:hover:text-[#F5F5F3] rounded-lg hover:bg-[#EBEBE7] dark:hover:bg-[#2A2A28] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-[#1E1E1E]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#EBEBE7] dark:bg-[#2A2A28] flex items-center justify-center text-[#6B6B67] dark:text-[#A1A19D]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F3]">How can I help you today?</p>
                  <p className="text-xs text-[#6B6B67] dark:text-[#A1A19D]">
                    I can analyze your spending, check budgets, or summarize your accounts based on your real-time data.
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex space-x-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-1 ${
                        msg.role === 'user' 
                          ? 'bg-[#EBEBE7] dark:bg-[#2A2A28] text-[#111111] dark:text-[#F5F5F3]' 
                          : 'bg-[#111111] dark:bg-[#2563EB] text-white shadow-sm'
                      }`}>
                        {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-[#111111] text-white dark:bg-[#333330] rounded-tr-sm' 
                          : 'bg-[#F5F5F3] dark:bg-[#2A2A28] text-[#111111] dark:text-[#E8E8E6] border border-[#D9D9D4]/50 dark:border-transparent rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex space-x-2 max-w-[85%]">
                    <div className="w-7 h-7 rounded-full shrink-0 bg-[#111111] dark:bg-[#2563EB] text-white shadow-sm flex items-center justify-center mt-1">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-[#F5F5F3] dark:bg-[#2A2A28] rounded-tl-sm border border-[#D9D9D4]/50 dark:border-transparent flex items-center space-x-2 text-[#6B6B67] dark:text-[#A1A19D]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-medium">Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#FFFFFF] dark:bg-[#1E1E1E] border-t border-[#D9D9D4] dark:border-[#333330]">
              <form onSubmit={handleSend} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your finances..."
                  className="w-full bg-[#F5F5F3] dark:bg-[#2A2A28] text-[#111111] dark:text-[#F5F5F3] placeholder:text-[#8E8E89] border border-transparent focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 rounded-xl pl-4 pr-12 py-3 text-sm transition-all"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 w-9 rounded-lg bg-[#111111] hover:bg-[#333333] dark:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-50 disabled:bg-[#D9D9D4] dark:disabled:bg-[#333330] text-white flex items-center justify-center transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
