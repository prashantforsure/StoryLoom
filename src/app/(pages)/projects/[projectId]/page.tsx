// app/projects/[projectId]/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: string;
  type: "user" | "ai" | "system";
  text: string;
  timestamp: number;
  isPending?: boolean;
};

type ProjectDetails = {
  id: string;
  title: string;
  briefing: {
    overallTone: string;
    style: string;
    templateId: string;
    objectives: string;
    targetAudience: string;
    distributionPlatform: string;
    genre: string;
    stylisticReferences: string[];
    logline: string;
    plotOutline: string;
    theme: string;
    characters: any[];
  };
  messages: Array<{
    id: string;
    content: string;
    role: "USER" | "AI";
    createdAt: string;
  }>;
};

export default function ProjectEditor() {
  const { data: session } = useSession();
  const { projectId } = useParams();
  const [inputText, setInputText] = useState("");
  const [selectedAction, setSelectedAction] = useState<"generate" | "expand">("generate");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef(0);
  
  // Project configuration state
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    id: projectId as string,
    title: "",
    briefing: {
      overallTone: "Dramatic",
      style: "Narrative",
      templateId: "template-1",
      objectives: "",
      targetAudience: "",
      distributionPlatform: "",
      genre: "",
      stylisticReferences: [],
      logline: "",
      plotOutline: "",
      theme: "",
      characters: []
    },
    messages: []
  });

  // Load project data on mount
 // Update the useEffect loading logic
useEffect(() => {
  const loadProjectData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to load project");
      const data = await response.json();
      
      if (!data) {
        console.error("No project data received");
        return;
      }

      setProjectDetails(data);
      
      // Convert stored messages to conversation history
      const initialMessages = (data.messages || []).map((msg: {
        id: string;
        role: "USER" | "AI";
        content: string;
        createdAt: string;
      }) => ({
        id: msg.id,
        type: msg.role === "USER" ? "user" : "ai",
        text: msg.content,
        timestamp: new Date(msg.createdAt).getTime(),
        isPending: false
      }));
      
      setConversationHistory(initialMessages);
    } catch (error) {
      console.error("Error loading project:", error);
      console.log("API Response:"); // Add debug logging
    }
  };

  loadProjectData();
}, [projectId]);

  // Auto-save project details
  useEffect(() => {
    const autoSave = async () => {
      if (!isSaving) {
        setIsSaving(true);
        try {
          await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(projectDetails)
          });
        } catch (error) {
          console.error("Auto-save failed:", error);
        }
        setIsSaving(false);
      }
    };

    const debounceTimer = setTimeout(autoSave, 2000);
    return () => clearTimeout(debounceTimer);
  }, [projectDetails, projectId]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory]);

  const createUniqueId = () => {
    messageIdCounter.current += 1;
    return `${Date.now()}-${messageIdCounter.current}`;
  };

  const addMessage = async (msg: Omit<Message, "id" | "timestamp">) => {
    const newMessage = {
      ...msg,
      id: createUniqueId(),
      timestamp: Date.now()
    };
    
    setConversationHistory(prev => [...prev, newMessage]);
    
    // Persist message to backend
    try {
      await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage.text,
          role: newMessage.type.toUpperCase()
        })
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;

    try {
      setLoading(true);
      
      // Add user message
      await addMessage({
        type: "user",
        text: inputText
      });

      // Add temporary AI message
      await addMessage({
        type: "ai",
        text: "",
        isPending: true
      });

      const endpoint = selectedAction === "generate" ? "/api/generate" : "/api/expand";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...projectDetails.briefing,
          title: projectDetails.title,
          conversationContext: conversationHistory
            .filter(msg => !msg.isPending)
            .map(msg => `${msg.type}: ${msg.text}`)
            .join("\n"),
          currentInput: inputText
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

  const handleProjectUpdate = (field: string, value: any) => {
    setProjectDetails(prev => ({
      ...prev,
      briefing: {
        ...prev.briefing,
        [field]: value
      }
    }));
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Project Settings Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 p-4 flex flex-col overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Project Briefing</h2>
        
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium mb-1">Project Title</label>
            <input
              value={projectDetails.title}
              onChange={(e) => setProjectDetails(prev => ({
                ...prev,
                title: e.target.value
              }))}
              className="w-full p-2 border rounded-md text-sm"
              placeholder="Untitled Project"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Objectives</label>
            {/* <textarea
              value={projectDetails.briefing.objectives}
              onChange={(e) => handleProjectUpdate("objectives", e.target.value)}
              className="w-full p-2 border rounded-md text-sm h-24"
              placeholder="Primary purpose of the script..."
            /> */}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Target Audience</label>
            <input
              value={projectDetails.briefing.targetAudience}
              onChange={(e) => handleProjectUpdate("targetAudience", e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
              placeholder="Demographics, cultural background..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Distribution Platform</label>
            <select
              value={projectDetails.briefing.distributionPlatform}
              onChange={(e) => handleProjectUpdate("distributionPlatform", e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            >
              <option value="film">Feature Film</option>
              <option value="tv">Television</option>
              <option value="web">Web Series</option>
              <option value="stage">Stage Play</option>
              <option value="podcast">Podcast</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Genre</label>
            <input
              value={projectDetails.briefing.genre}
              onChange={(e) => handleProjectUpdate("genre", e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
              placeholder="Primary genre/sub-genres..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Stylistic References</label>
            <textarea
              value={projectDetails.briefing.stylisticReferences.join(", ")}
              onChange={(e) => handleProjectUpdate("stylisticReferences", e.target.value.split(", "))}
              className="w-full p-2 border rounded-md text-sm h-16"
              placeholder="Films, writers, or style references..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Logline</label>
            <textarea
              value={projectDetails.briefing.logline}
              onChange={(e) => handleProjectUpdate("logline", e.target.value)}
              className="w-full p-2 border rounded-md text-sm h-24"
              placeholder="One-sentence summary..."
            />
          </div>

          <div className="text-xs text-gray-500">
            {isSaving ? "Saving changes..." : "Changes auto-save every 2 seconds"}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 p-4">
          <h1 className="text-xl font-semibold">{projectDetails.title || "Untitled Project"}</h1>
          <div className="text-sm text-gray-500 mt-1 grid grid-cols-2 gap-2">
            <div>Genre: {projectDetails.briefing.genre}</div>
            <div>Platform: {projectDetails.briefing.distributionPlatform}</div>
            <div>Tone: {projectDetails.briefing.overallTone}</div>
            <div>Style: {projectDetails.briefing.style}</div>
          </div>
        </header>

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
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
          
          <div className="mt-2 flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setInputText("Add character development for...")}
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              Character Development
            </button>
            <button
              type="button"
              onClick={() => setInputText("Create a plot twist involving...")}
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              Plot Twist
            </button>
            <button
              type="button"
              onClick={() => setInputText("Write dialogue between...")}
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              Dialogue Scene
            </button>
            <button
              type="button"
              onClick={() => setInputText("Describe a transition to...")}
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              Scene Transition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}