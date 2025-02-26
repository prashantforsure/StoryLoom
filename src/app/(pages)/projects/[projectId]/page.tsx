"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// If you're using custom UI components like Label, Input, etc., import them here.
// Otherwise, standard HTML elements are used.

import axios from "axios";

// --- Type Definitions ---
type Message = {
  id: string;
  type: "user" | "ai" | "system";
  text: string;
  timestamp: number;
  isPending?: boolean;
};

type Briefing = {
  overallTone: string;
  scriptFormat: string; // renamed from "style"
  templateId: string;
  objectives: string;
  targetAudience: string;
  distributionPlatform: string;
  genre: string;
  subGenres: string[];
  stylisticReferences: string; // a comma-separated string
  logline: string;
  plotOutline: string;
  theme: string;
};

type ProjectDetails = {
  id: string;
  title: string;
  briefing: Briefing;
  messages: Array<{
    id: string;
    content: string;
    role: "USER" | "AI";
    createdAt: string;
  }>;
};

// --- Default Briefing Object ---
const defaultBriefing: Briefing = {
  overallTone: "Dramatic",
  scriptFormat: "Narrative", // Default style value stored as scriptFormat
  templateId: "template-1",
  objectives: "",
  targetAudience: "",
  distributionPlatform: "",
  genre: "",
  subGenres: [],
  stylisticReferences: "",
  logline: "",
  plotOutline: "",
  theme: "",
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

  // --- Initialize Project Details with a default briefing ---
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    id: (projectId as string) || "",
    title: "",
    briefing: defaultBriefing,
    messages: [],
  });

  // --- Load project data on mount ---
  useEffect(() => {
    if (!projectId) return;
    const loadProjectData = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) throw new Error("Failed to load project");
        const data = await response.json();
        if (!data || !data.project) {
          console.error("No project data received");
          return;
        }
        setProjectDetails({
          ...data.project,
          briefing: data.project.briefing || defaultBriefing,
        });
        const initialMessages = (data.project.messages || []).map((msg: {
          id: string;
          role: "USER" | "AI";
          content: string;
          createdAt: string;
        }) => ({
          id: msg.id,
          type: msg.role === "USER" ? "user" : "ai",
          text: msg.content,
          timestamp: new Date(msg.createdAt).getTime(),
          isPending: false,
        }));
        setConversationHistory(initialMessages);
      } catch (error) {
        console.error("Error loading project:", error);
      }
    };
    loadProjectData();
  }, [projectId]);

  // --- Auto-save project details (debounced) ---
  useEffect(() => {
    const autoSave = async () => {
      if (!isSaving) {
        setIsSaving(true);
        try {
          await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            // Note: The payload includes the full projectDetails. The backend
            // should map briefing.scriptFormat correctly.
            body: JSON.stringify(projectDetails),
          });
        } catch (error) {
          console.error("Auto-save failed:", error);
        }
        setIsSaving(false);
      }
    };

    const debounceTimer = setTimeout(autoSave, 20000);
    return () => clearTimeout(debounceTimer);
  }, [projectDetails, projectId, isSaving]);

  // --- Auto-scroll to bottom ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory]);

  // --- Utility: Unique ID generator ---
  const createUniqueId = () => {
    messageIdCounter.current += 1;
    return `${Date.now()}-${messageIdCounter.current}`;
  };

  // --- Add Message & Persist to Backend ---
  const addMessage = async (msg: Omit<Message, "id" | "timestamp">, persist = true) => {
    const newMessage: Message = {
      ...msg,
      id: createUniqueId(),
      timestamp: Date.now(),
    };
    setConversationHistory((prev) => [...prev, newMessage]);
    if (persist && (msg.type !== "ai" || (msg.type === "ai" && msg.text.trim() !== ""))) {
      try {
        await fetch(`/api/projects/${projectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: newMessage.text,
            role: newMessage.type.toUpperCase(),
          }),
        });
      } catch (error) {
        console.error("Failed to save message:", error);
      }
    }
  };

  // --- Handle Submission (Generate/Expand) ---
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;

    try {
      setLoading(true);
      // Append user's message (persisted immediately)
      await addMessage({ type: "user", text: inputText });
      // Append a temporary AI message (do not persist until finalized)
      await addMessage({ type: "ai", text: "", isPending: true }, false);

      // Build conversation context from all non-pending messages
      const conversationContextStr = conversationHistory
        .filter((msg) => !msg.isPending)
        .map((msg) => `${msg.type}: ${msg.text}`)
        .join("\n");

      // Determine endpoint
      const endpoint = selectedAction === "generate" ? "/api/generate" : "/api/expand";

      // Build payload; note we send scriptFormat (instead of style) from briefing
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: projectDetails.briefing.overallTone,
          style: projectDetails.briefing.scriptFormat,
          scriptFormat: projectDetails.briefing.scriptFormat, // using scriptFormat
          templateId: projectDetails.briefing.templateId,
          outline: inputText,
          conversationContext: conversationContextStr,
          title: projectDetails.title,
          targetAudience: projectDetails.briefing.targetAudience,
          distributionPlatform: projectDetails.briefing.distributionPlatform,
          genre: projectDetails.briefing.genre,
          stylisticReferences: projectDetails.briefing.stylisticReferences,
          logline: projectDetails.briefing.logline,
          plotOutline: projectDetails.briefing.plotOutline,
          theme: projectDetails.briefing.theme,
        }),
      });

      if (!response.ok) throw new Error("Request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let aiText = "";

      while (!done && reader) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value);
        aiText += chunk;
        setConversationHistory((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.type === "ai" && lastMessage.isPending) {
            return [...prev.slice(0, -1), { ...lastMessage, text: aiText }];
          }
          return prev;
        });
      }

      // Remove the temporary AI message and add a finalized one (persisted)
      setConversationHistory((prev) => prev.filter((msg, idx) => idx !== prev.length - 1));
      await addMessage({ type: "ai", text: aiText, isPending: false }, true);
    } catch (error) {
      console.error("Error processing request:", error);
      setConversationHistory((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.type === "ai") {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, text: "Error processing request. Please try again.", isPending: false },
          ];
        }
        return prev;
      });
    } finally {
      setLoading(false);
      setInputText("");
    }
  };

  // --- Update Briefing Field ---
  const handleProjectUpdate = (field: keyof Briefing, value: any) => {
    setProjectDetails((prev) => ({
      ...prev,
      briefing: {
        ...prev.briefing,
        [field]: value,
      },
    }));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar: Project Briefing/Settings */}
      <div className="w-80 border-r border-gray-200 bg-white p-4 flex flex-col overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Project Briefing</h2>
        <div className="space-y-4 flex-1">
          {/* Project Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium">Project Title</label>
            <input
              id="title"
              value={projectDetails.title}
              onChange={(e) =>
                setProjectDetails((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              placeholder="Untitled Project"
              className="w-full p-2 border rounded-md text-sm"
            />
          </div>
          {/* Target Audience */}
          <div className="space-y-2">
            <label htmlFor="audience" className="block text-sm font-medium">Target Audience</label>
            <input
              id="audience"
              value={projectDetails.briefing?.targetAudience || ""}
              onChange={(e) => handleProjectUpdate("targetAudience", e.target.value)}
              placeholder="Demographics, cultural background..."
              className="w-full p-2 border rounded-md text-sm"
            />
          </div>
          {/* Distribution Platform */}
          <div className="space-y-2">
            <label htmlFor="platform" className="block text-sm font-medium">Distribution Platform</label>
            <select
              id="platform"
              value={projectDetails.briefing?.distributionPlatform || ""}
              onChange={(e) => handleProjectUpdate("distributionPlatform", e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            >
              <option value="">Select Platform</option>
              <option value="film">Feature Film</option>
              <option value="tv">Television</option>
              <option value="web">Web Series</option>
              <option value="stage">Stage Play</option>
              <option value="podcast">Podcast</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          {/* Genre */}
          <div className="space-y-2">
            <label htmlFor="genre" className="block text-sm font-medium">Genre</label>
            <input
              id="genre"
              value={projectDetails.briefing?.genre || ""}
              onChange={(e) => handleProjectUpdate("genre", e.target.value)}
              placeholder="Primary genre/sub-genres..."
              className="w-full p-2 border rounded-md text-sm"
            />
          </div>
          {/* Stylistic References */}
          <div className="space-y-2">
            <label htmlFor="references" className="block text-sm font-medium">Stylistic References</label>
            <textarea
              id="references"
              value={projectDetails.briefing?.stylisticReferences || ""}
              onChange={(e) => handleProjectUpdate("stylisticReferences", e.target.value)}
              placeholder="Films, writers, or style references..."
              className="w-full p-2 border rounded-md text-sm h-16"
            />
          </div>
          {/* Logline */}
          <div className="space-y-2">
            <label htmlFor="logline" className="block text-sm font-medium">Logline</label>
            <textarea
              id="logline"
              value={projectDetails.briefing?.logline || ""}
              onChange={(e) => handleProjectUpdate("logline", e.target.value)}
              placeholder="One-sentence summary..."
              className="w-full p-2 border rounded-md text-sm h-24"
            />
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {isSaving ? "Saving changes..." : "Changes auto-save every 2 seconds"}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-gray-200 bg-white p-4">
          <h1 className="text-xl font-semibold text-gray-900">{projectDetails.title || "Untitled Project"}</h1>
          <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div>Genre: {projectDetails.briefing?.genre || "N/A"}</div>
            <div>Platform: {projectDetails.briefing?.distributionPlatform || "N/A"}</div>
            <div>Tone: {projectDetails.briefing?.overallTone || "N/A"}</div>
            <div>Style: {projectDetails.briefing?.scriptFormat || "N/A"}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {conversationHistory.length === 0 ? (
            <p className="text-center text-gray-500">No conversation yet. Start by sending a message below.</p>
          ) : (
            conversationHistory.map((message) => (
              <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`relative max-w-2xl rounded-lg p-4 ${
                    message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-gray-900"
                  } ${message.isPending ? "opacity-75" : ""}`}
                >
                  {message.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-current" />
                      <div className="h-2 w-2 animate-pulse rounded-full bg-current" style={{ animationDelay: "0.2s" }} />
                      <div className="h-2 w-2 animate-pulse rounded-full bg-current" style={{ animationDelay: "0.4s" }} />
                      <span className="ml-2">Generating...</span>
                    </div>
                  ) : (
                    <>
                      <div className="prose max-w-none text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.text}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-4">
          <div className="flex gap-2">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value as "generate" | "expand")}
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
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Processing..." : "Send"}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Character Development", "Plot Twist", "Dialogue Scene", "Scene Transition"].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInputText(`Add ${suggestion.toLowerCase()} for...`)}
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
