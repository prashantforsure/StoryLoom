"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from 'react-markdown';
type Message = {
  id: string;
  type: "user" | "ai" | "system";
  text: string;
  timestamp: number;
  isPending?: boolean;
};

type Template = {
  id: string;
  name: string;
  description: string;
};

export default function Editor() {
  const { data: session } = useSession();
  const [inputText, setInputText] = useState("");
  const [selectedAction, setSelectedAction] = useState<"generate" | "expand">("generate");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef(0);
  
  // Configuration state
  const [title, setTitle] = useState("");
  const [tone, setTone] = useState("Dramatic");
  const [style, setStyle] = useState("Narrative");
  const [template, setTemplate] = useState("template-1");
  
  // Predefined options
  const predefinedTones = ["Dramatic", "Comedic", "Sarcastic", "Serious", "Lighthearted"];
  const predefinedStyles = ["Narrative", "Dialogic", "Cinematic", "Descriptive", "Minimalist"];
  const predefinedTemplates: Template[] = [
    { 
      id: "template-1", 
      name: "Movie Script",
      description: "Standard feature film format with scene descriptions and dialogues"
    },
    { 
      id: "template-2", 
      name: "Stage Play",
      description: "Theater script format with act/scene breakdowns"
    },
    { 
      id: "template-3", 
      name: "Web Series",
      description: "Short episode format optimized for digital platforms"
    }
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory]);

  const createUniqueId = () => {
    messageIdCounter.current += 1;
    return `${Date.now()}-${messageIdCounter.current}`;
  };

  const addMessage = (msg: Omit<Message, "id" | "timestamp">) => {
    setConversationHistory(prev => [
      ...prev,
      {
        ...msg,
        id: createUniqueId(),
        timestamp: Date.now()
      }
    ]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;

    try {
      setLoading(true);
      
      // Add user message
      addMessage({
        type: "user",
        text: inputText
      });

      // Add temporary AI message
      addMessage({
        type: "ai",
        text: "",
        isPending: true
      });

      const endpoint = selectedAction === "generate" ? "/api/generate" : "/api/expand";
      
      
const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title,
    tone,
    style,
    templateId: template,
    outline: inputText, 
    conversationContext: conversationHistory 
      .filter(msg => !msg.isPending)
      .map(msg => `${msg.type}: ${msg.text}`)
      .join("\n")
  })
});

      if (!response.ok) throw new Error("Request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done && reader) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value);
        
        setConversationHistory(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.type === "ai" && lastMessage.isPending) {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, text: lastMessage.text + chunk }
            ];
          }
          return prev;
        });
      }

      // Finalize AI message
      setConversationHistory(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.type === "ai") {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, isPending: false }
          ];
        }
        return prev;
      });

    } catch (error) {
      setConversationHistory(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.type === "ai") {
          return [
            ...prev.slice(0, -1),
            { 
              ...lastMessage, 
              text: "Error processing request. Please try again.",
              isPending: false
            }
          ];
        }
        return prev;
      });
    } finally {
      setLoading(false);
      setInputText("");
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Script Settings</h2>
        
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
              placeholder="Untitled Script"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            >
              {predefinedTones.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            >
              {predefinedStyles.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            >
              {predefinedTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {predefinedTemplates.find(t => t.id === template)?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <header className="bg-white border-b border-gray-200 p-4">
          <h1 className="text-xl font-semibold">Script Editor</h1>
          <p className="text-sm text-gray-500">
            {title || "Untitled Script"} - {tone} {style}
          </p>
        </header>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversationHistory.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl p-3 rounded-lg ${
                  message.type === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                } ${message.isPending ? "opacity-75" : ""}`}
              >
                {message.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="dot-flashing"></div>
                    <span>Generating...</span>
                  </div>
                ) : (
                  <>
                <div className="text-sm whitespace-pre-wrap prose max-w-none">
  <ReactMarkdown>
    {message.text}
  </ReactMarkdown>
</div>
                    <div className="text-xs mt-1 opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value as any)}
              className="w-32 p-2 border rounded-md text-sm"
            >
              <option value="generate">Generate</option>
              <option value="expand">Expand</option>
            </select>
            
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter your scene description or instructions..."
              className="flex-1 p-2 border rounded-md"
              disabled={loading}
            />
            
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Send"}
            </button>
          </div>
          
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setInputText("Add a plot twist here...")}
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              Suggest Plot Twist
            </button>
            <button
              type="button"
              onClick={() => setInputText("Develop character interaction...")}
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              Add Dialogue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}