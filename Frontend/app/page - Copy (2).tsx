"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MortgageChatbot() {
  const [query, setQuery] = useState("");
  
  type Message = {
    role: "user" | "assistant";
    content: string;
  };

  const [messages, setMessages] = useState<Message[]>([]);

  const [loading, setLoading] = useState(false);

 const sendMessage = async () => {
  if (!query.trim()) return;

  setLoading(true);

  // Add the user's new message to the history
  const updatedMessages = [...messages, { role: "user", content: query }];
  setMessages(updatedMessages);

  try {
    const res = await fetch("http://127.0.0.1:8001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: updatedMessages }),
    });

    const botResponse = await res.text();

    setMessages([
      ...updatedMessages,
      { role: "assistant", content: botResponse }
    ]);
  } catch (error) {
    setMessages([
      ...updatedMessages,
      { role: "assistant", content: "Sorry, something went wrong." }
    ]);
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
    className={`p-3 rounded-lg max-w-full ${
      msg.role === "user" ? "ml-auto bg-blue-600" : "mr-auto bg-gray-700"
    }`}
  >
    {msg.role === "assistant" ? (
      <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert text-white">
        {msg.content}
      </ReactMarkdown>
    ) : (
      msg.content
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
