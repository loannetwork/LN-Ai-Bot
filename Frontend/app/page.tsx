"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageCircle, RefreshCw, Sparkles, Brain, Zap, Shield, TrendingUp, Calculator, FileText } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

const defaultWelcomeMessage: Message = {
  role: "assistant",
  content: `🤖 **Welcome to LoanNetwork AI** - Your Advanced Mortgage Intelligence Platform\n\n✨ **I'm powered by cutting-edge AI to help you:**\n• **Analyze** mortgage rates across 50+ lenders\n• **Calculate** personalized eligibility instantly\n• **Compare** loan products with real-time data\n• **Optimize** your mortgage strategy\n\n💡 **Let's get started! Ask me anything about home loans.**`,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

export default function MortgageChatbot() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("mortgage_chat");
    if (stored) {
      setMessages(JSON.parse(stored));
    } else {
      setMessages([defaultWelcomeMessage]);
    }
  }, []);

  // Save messages to localStorage and auto-scroll
  useEffect(() => {
    localStorage.setItem("mortgage_chat", JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!query.trim()) return;

    setLoading(true);

    const userMsg: Message = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setQuery("");

    try {
      const res = await fetch("http://127.0.0.1:8001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const botText = await res.text();

      const botMsg: Message = {
        role: "assistant",
        content: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages([...updatedMessages, botMsg]);
    } catch (error) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "⚠️ Sorry, something went wrong.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl animate-bounce"></div>
      </div>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 backdrop-blur-xl border-b border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                LoanNetwork AI
              </h1>
              <p className="text-sm text-gray-300 mt-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Advanced Mortgage Intelligence • <span className="text-green-400">Online</span>
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Bank-Grade Security</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Real-Time Rates</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative flex flex-col items-center justify-center flex-1 px-4 py-8 overflow-hidden">
        <div className="w-full max-w-4xl h-full bg-white/5 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/10 flex flex-col">
          {/* AI Status Bar */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">AI Online</span>
              </div>
              <div className="text-xs text-gray-400">•</div>
              <div className="text-xs text-gray-400">Model: LN-GPT-4 Turbo</div>
              <div className="text-xs text-gray-400">•</div>
              <div className="text-xs text-gray-400">Response Time: ~2s</div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-300">Enhanced Mode</span>
            </div>
          </div>
          <div
            ref={scrollRef}
            className="space-y-4 flex-1 overflow-y-auto p-6 scrollbar-hide scroll-smooth"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
 {messages.map((msg, index) => (
  <motion.div
    key={index}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`w-full flex ${
      msg.role === "user" ? "justify-end" : "justify-start"
    }`}
  >
    <div
      className={`max-w-[80%] px-5 py-3 rounded-2xl text-left shadow-lg backdrop-blur-sm border ${
        msg.role === "user"
          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md border-blue-400/30"
          : "bg-white/10 text-white rounded-bl-md border-white/20"
      }`}
    >
      <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
        {msg.role === "user" ? (
          <>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>You</span>
          </>
        ) : (
          <>
            <Brain className="w-3 h-3 text-purple-400" />
            <span>LoanNetwork AI</span>
          </>
        )}
        <span>• {msg.timestamp}</span>
      </div>
      {msg.role === "assistant" ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className="prose prose-invert text-white text-sm prose-p:my-1 prose-li:my-1 prose-table:text-sm prose-th:p-2 prose-td:p-2"
        >
          {msg.content}
        </ReactMarkdown>
      ) : (
        <p className="text-white text-right">{msg.content}</p>
      )}
    </div>
  </motion.div>
))}


            {/* Typing Indicator */}
            {loading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mr-auto bg-white/10 backdrop-blur-sm text-white px-5 py-4 rounded-2xl text-sm border border-white/20 flex items-center gap-3"
              >
                <div className="relative">
                  <Brain className="w-5 h-5 text-blue-400 animate-pulse" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="font-medium">AI Processing...</span>
                  </div>
                  <span className="text-xs text-gray-400 mt-1">Analyzing mortgage data • Powered by LN AI</span>
                </div>
              </motion.div>
            )}

            {/* Quick Suggestions */}
{messages.length === 1 &&
  messages[0].role === "assistant" &&
  !loading && (
    <div className="flex flex-wrap gap-3 mt-4 animate-fade-in-slow">
      {[
        { text: "Check best rates across all lenders", icon: TrendingUp },
        { text: "Calculate eligibility for ₹1 Cr loan", icon: Calculator },
        { text: "Compare banks for 600 CIBIL score", icon: FileText },
      ].map((item, idx) => (
        <motion.button
          key={item.text}
          onClick={() => setQuery(item.text)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: idx * 0.2 }}
          className="bg-white/10 hover:bg-white/20 text-white px-5 py-4 rounded-xl shadow-lg transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 transform hover:scale-105 flex items-center gap-3"
        >
          <item.icon className="w-4 h-4 text-blue-400" />
          <span>{item.text}</span>
        </motion.button>
      ))}
    </div>
)}

          </div>

{/* Input + Reset Icon */}
<div className="flex items-center gap-3 p-6 border-t border-white/10 bg-white/5 backdrop-blur-sm rounded-b-3xl">
  {/* Reset Icon Button */}
  <button
    onClick={() => {
      if (confirm("Start a new chat? This will clear your current conversation.")) {
        localStorage.removeItem("mortgage_chat");
        setMessages([defaultWelcomeMessage]);
        setQuery("");
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }
    }}
    className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 transform hover:scale-110"
    title="Start new chat"
  >
    <RefreshCw size={20} />
  </button>

  {/* Input Field */}
  <input
    className="flex-1 bg-white/10 text-white px-4 py-3 rounded-xl outline-none border border-white/20 focus:border-blue-400/50 focus:bg-white/15 transition-all duration-300 placeholder-gray-400"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }}
    placeholder="Ask anything about mortgages - I understand complex queries and provide detailed analysis..."
  />

  {/* Send Button */}
  <motion.button
    onClick={sendMessage}
    disabled={loading || !query.trim()}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={`p-3 rounded-xl transition-all duration-300 ${
      loading || !query.trim() 
        ? "bg-gray-600 cursor-not-allowed" 
        : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
    }`}
  >
    {loading ? (
      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
    ) : (
      <MessageCircle size={20} className="text-white" />
    )}
  </motion.button>
</div>


        </div>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-50 bg-white/5 backdrop-blur-xl border-t border-white/10 p-6 text-center text-sm">
        <div className="text-gray-300">
          © 2025 <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-semibold">LoanNetwork AI</span>. All rights reserved.
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Powered by advanced AI for intelligent mortgage assistance
        </div>
      </footer>
    </div>
  );
}
