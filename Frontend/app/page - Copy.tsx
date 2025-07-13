"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MortgageChatbot() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setMessages([...messages, { text: query, sender: "user" }]);

    try {
      const res = await fetch(`http://127.0.0.1:8001/chat?query=${query}`);
      const data = await res.json();
      setMessages([...messages, { text: query, sender: "user" }, { text: data.response, sender: "bot" }]);
    } catch (error) {
      setMessages([...messages, { text: query, sender: "user" }, { text: "Error fetching response", sender: "bot" }]);
    }
    setLoading(false);
    setQuery("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 p-4 text-center text-xl font-bold shadow-md">
        Mortgage Chat Assistant
      </header>

      <main className="flex flex-col items-center justify-center flex-grow px-4">
        <div className="w-full max-w-4xl bg-gray-800 shadow-xl rounded-2xl p-4">
          <div className="space-y-4 max-h-[70vh] overflow-y-auto p-4">
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`p-3 rounded-lg max-w-full ${msg.sender === "user" ? "ml-auto bg-blue-600" : "mr-auto bg-gray-700"}`}
              >
                {msg.sender === "bot" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="break-words">{msg.text}</ReactMarkdown>
                ) : (
                  msg.text
                )}
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-2 border-t border-gray-700">
            <input
              className="flex-1 bg-gray-700 text-white p-2 rounded-md outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about mortgage rates..."
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 p-2 rounded-md"
            >
              {loading ? "..." : <MessageCircle size={20} />}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 p-4 text-center text-sm shadow-md">
        © 2025 Mortgage Chat. All rights reserved.
      </footer>
    </div>
  );
}
