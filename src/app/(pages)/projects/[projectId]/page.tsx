"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp } from "lucide-react";

// --- Type Definitions ---
type Message = {
  id: string;
  type: "user" | "ai" | "system" | "thinking";
  text: string;
  timestamp: number;
  isPending?: boolean;
  thinkingText?: string;
  isThinkingVisible?: boolean;
};

type Briefing = {
  overallTone: string;
  scriptFormat: string;
  templateId: string;
  objectives: string;
  targetAudience: string;
  distributionPlatform: string;
  genre: string;
  subGenres: string[];
  stylisticReferences: string;
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
  scriptFormat: "Narrative",
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
  const aiMessageRef = useRef<string | null>(null);
  const thinkingRef = useRef<string | null>(null);

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
        
        // Parse messages to separate thinking content if it exists
        const initialMessages = (data.project.messages || []).map((msg: {
          id: string;
          role: "USER" | "AI";
          content: string;
          createdAt: string;
        }) => {
          // Check if AI message contains thinking section with <think> tags
          let messageText = msg.content;
          let thinkingText = "";
          
          if (msg.role === "AI") {
            const thinkMatch = msg.content.match(/<think>([\s\S]*?)<\/think>/);
            if (thinkMatch) {
              // Extract content inside <think> tags
              thinkingText = thinkMatch[1].trim();
              // Remove the <think> section from the main content
              messageText = msg.content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
            } else if (msg.content.includes("Thinking:")) {
              // Fallback for older format
              const parts = msg.content.split("Thinking:");
              messageText = parts[0].trim();
              thinkingText = parts.length > 1 ? parts[1].trim() : "";
            }
            
            // Format the messageText to replace * headers with bold
            messageText = formatHeadersAsBold(messageText);
          }
          
          return {
            id: msg.id,
            type: msg.role === "USER" ? "user" : "ai",
            text: messageText,
            thinkingText: thinkingText,
            isThinkingVisible: false,
            timestamp: new Date(msg.createdAt).getTime(),
            isPending: false,
          };
        });
        
        setConversationHistory(initialMessages);
      } catch (error) {
        console.error("Error loading project:", error);
      }
    };
    loadProjectData();
  }, [projectId]);

  // --- Format headers: Replace markdown * with bold text ---
  const formatHeadersAsBold = (text: string) => {
    // Replace # headers with bold text
    return text.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, content) => {
      return `**${content.trim()}**`;
    });
  };

  // --- Auto-save project details (debounced) ---
  useEffect(() => {
    const autoSave = async () => {
      if (!isSaving) {
        setIsSaving(true);
        try {
          await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
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
        // Combine thinking and response text for storage
        let contentToStore = msg.text;
        if (msg.thinkingText && msg.thinkingText.trim() !== "") {
          contentToStore = `${contentToStore}\n\n<think>${msg.thinkingText}</think>`;
        }
        
        await fetch(`/api/projects/${projectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: contentToStore,
            role: msg.type === "thinking" ? "AI" : msg.type.toUpperCase(),
          }),
        });
      } catch (error) {
        console.error("Failed to save message:", error);
      }
    }
    return newMessage.id;
  };

  // --- Toggle thinking visibility ---
  const toggleThinking = (messageId: string) => {
    setConversationHistory((prev) => {
      return prev.map((msg) => {
        if (msg.id === messageId) {
          return { ...msg, isThinkingVisible: !msg.isThinkingVisible };
        }
        return msg;
      });
    });
  };

  // --- Update AI message with new streamed content ---
  const updateAiMessage = (messageId: string, text: string) => {
    setConversationHistory((prev) => {
      return prev.map((msg) => {
        if (msg.id === messageId) {
          return { ...msg, text: formatHeadersAsBold(text) };
        }
        return msg;
      });
    });
  };

  // --- Update Thinking content ---
  const updateThinkingMessage = (messageId: string, text: string) => {
    setConversationHistory((prev) => {
      return prev.map((msg) => {
        if (msg.id === messageId) {
          return { ...msg, thinkingText: text };
        }
        return msg;
      });
    });
  };

  // --- Handle Submission (Generate/Expand) ---
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;

    try {
      setLoading(true);
      // Add user message
      await addMessage({ type: "user", text: inputText });
      
      // Add a thinking message with expandable section
      const thinkingId = await addMessage({ 
        type: "ai", 
        text: "",
        thinkingText: "AI is thinking...",
        isThinkingVisible: true,
        isPending: true 
      }, false);

      const conversationContextStr = conversationHistory
        .filter(msg => !msg.isPending)
        .map(msg => `${msg.type}: ${msg.text}`)
        .join("\n");

      const endpoint = selectedAction === "generate" ? "/api/generate" : "/api/expand";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: projectDetails.briefing.overallTone,
          style: projectDetails.briefing.scriptFormat,
          scriptFormat: projectDetails.briefing.scriptFormat,
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

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let fullContent = "";
        let currentThinkingText = "";
        let currentResponseText = "";
        let isInsideThinkTag = false;
        
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          
          if (value) {
            const chunk = decoder.decode(value, { stream: !done });
            fullContent += chunk;
            
            // Parse the content to extract <think> tags and response
            let updatedThinking = currentThinkingText;
            let updatedResponse = currentResponseText;
            
            // Look for opening and closing think tags
            const openTagIndex = fullContent.indexOf("<think>");
            const closeTagIndex = fullContent.indexOf("</think>");
            
            if (openTagIndex !== -1 && closeTagIndex === -1) {
              // Found opening tag but not closing tag yet
              isInsideThinkTag = true;
              // Extract everything before the think tag as response
              if (openTagIndex > 0) {
                updatedResponse = fullContent.substring(0, openTagIndex).trim();
              }
              // Extract partial thinking content
              updatedThinking = fullContent.substring(openTagIndex + 7).trim();
            } else if (openTagIndex !== -1 && closeTagIndex !== -1) {
              // Found both opening and closing tags
              isInsideThinkTag = false;
              // Extract thinking content
              updatedThinking = fullContent.substring(openTagIndex + 7, closeTagIndex).trim();
              
              // Extract response (combine before and after think tags)
              const beforeThink = fullContent.substring(0, openTagIndex).trim();
              const afterThink = fullContent.substring(closeTagIndex + 8).trim();
              updatedResponse = (beforeThink + " " + afterThink).trim();
            } else if (isInsideThinkTag) {
              // Still inside an open think tag from previous chunks
              updatedThinking = fullContent.substring(fullContent.indexOf("<think>") + 7).trim();
            } else {
              // No think tags found, treat as response
              updatedResponse = fullContent.trim();
            }
            
            // Update the message with separated thinking and response
            if (updatedThinking !== currentThinkingText) {
              currentThinkingText = updatedThinking;
              updateThinkingMessage(thinkingId, currentThinkingText);
            }
            
            if (updatedResponse !== currentResponseText) {
              currentResponseText = updatedResponse;
              updateAiMessage(thinkingId, currentResponseText);
            }
            
            // Keep references updated for final saving
            thinkingRef.current = currentThinkingText;
            aiMessageRef.current = currentResponseText;
            
            // Smooth scroll to bottom
            requestAnimationFrame(() => {
              chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
            });
          }
        }
        
        // Process full content one last time to ensure everything is captured
        let finalThinking = "";
        let finalResponse = "";
        
        const thinkMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/);
        if (thinkMatch) {
          finalThinking = thinkMatch[1].trim();
          // Remove the think tags and its content from the response
          finalResponse = fullContent.replace(/<think>[\s\S]*?<\/think>/, "").trim();
        } else {
          // No think tags found in the final content
          finalResponse = fullContent;
        }
        
        // Update refs for final saving
        thinkingRef.current = finalThinking;
        aiMessageRef.current = finalResponse;
        
        // Update final message state
        setConversationHistory(prev => 
          prev.map(msg => {
            if (msg.id === thinkingId) {
              return { 
                ...msg, 
                text: formatHeadersAsBold(aiMessageRef.current || ""),
                thinkingText: thinkingRef.current || "", 
                isPending: false,
                isThinkingVisible: false // Auto-collapse thinking when done
              };
            }
            return msg;
          })
        );

        // Persist final AI message with thinking content in <think> tags
        await fetch(`/api/projects/${projectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `${aiMessageRef.current || ""}\n\n<think>${thinkingRef.current || ""}</think>`,
            role: "AI",
          }),
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setConversationHistory(prev => {
        return prev.map(msg => {
          if (msg.type === "ai" && msg.isPending) {
            return {
              ...msg,
              text: "Error processing request. Please try again.",
              isPending: false,
            };
          }
          return msg;
        });
      });
    } finally {
      setLoading(false);
      setInputText("");
      aiMessageRef.current = null;
      thinkingRef.current = null;
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
          {isSaving ? "Saving changes..." : "Changes auto-save every 20 seconds"}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-gray-200 bg-white p-4">
          <h1 className="text-xl font-semibold text-gray-900">{projectDetails.title || "Untitled Project"}</h1>
          <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div>Genre: <span className="font-medium">{projectDetails.briefing?.genre || "N/A"}</span></div>
            <div>Platform: <span className="font-medium">{projectDetails.briefing?.distributionPlatform || "N/A"}</span></div>
            <div>Tone: <span className="font-medium">{projectDetails.briefing?.overallTone || "N/A"}</span></div>
            <div>Style: <span className="font-medium">{projectDetails.briefing?.scriptFormat || "N/A"}</span></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth">
          {conversationHistory.length === 0 ? (
            <p className="text-center text-gray-500">No conversation yet. Start by sending a message below.</p>
          ) : (
            conversationHistory.map((message) => (
              <div 
                key={message.id} 
                className={`flex transition-all duration-300 ease-in-out ${
                  message.type === "user" 
                    ? "justify-end" 
                    : message.type === "system" || message.type === "thinking"
                      ? "justify-center" 
                      : "justify-start"
                }`}
              >
                <div className={`relative max-w-2xl rounded-lg p-4 ${
                  message.type === "user" 
                    ? "bg-blue-600 text-white" 
                    : message.type === "system" || message.type === "thinking"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-white border border-gray-200 text-gray-900"
                } ${message.isPending ? 'opacity-80' : ''} shadow-sm animate-fade-in-up`}>
                  {message.type === "system" ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-current" />
                      <div className="h-2 w-2 animate-pulse rounded-full bg-current" style={{ animationDelay: "0.2s" }} />
                      <div className="h-2 w-2 animate-pulse rounded-full bg-current" style={{ animationDelay: "0.4s" }} />
                    </div>
                  ) : (
                    <>
                      {/* Regular Message Content */}
                      <div className="prose max-w-none text-sm overflow-x-auto break-words">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          //@ts-expect-error there is some type error
                          components={{
                            p: ({ node, ...props }) => (
                              <p 
                                {...props} 
                                className="animate-text-reveal leading-relaxed" 
                                style={{ animationDelay: '0.1s' }}
                              />
                            ),
                            h1: ({ node, ...props }) => (
                              <h1 {...props} className="text-xl font-bold mt-4 mb-2" />
                            ),
                            h2: ({ node, ...props }) => (
                              <h2 {...props} className="text-lg font-bold mt-3 mb-2" />
                            ),
                            h3: ({ node, ...props }) => (
                              <h3 {...props} className="text-md font-bold mt-3 mb-1" />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong {...props} className="font-bold" />
                            ),
                            em: ({ node, ...props }) => (
                              <em {...props} className="italic" />
                            ),
                            code: ({ node, inline, ...props }) => (
                              inline 
                                ? <code {...props} className="px-1 py-0.5 bg-gray-100 text-red-500 rounded text-sm" />
                                : <code {...props} className="block p-2 my-2 bg-gray-100 rounded-md overflow-x-auto text-sm" />
                            )
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                        {message.isPending && (
                          <span className="animate-blink ml-1">|</span>
                        )}
                      </div>
                      
                      {/* Thinking Toggle - Only for AI messages with thinking content */}
                      {message.type === "ai" && message.thinkingText && message.thinkingText.trim() !== "" && (
                        <div className="mt-3">
                          <button 
                            onClick={() => toggleThinking(message.id)}
                            className="flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {message.isThinkingVisible ? (
                              <>
                                <ChevronUp size={14} className="mr-1" />
                                Hide thinking
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} className="mr-1" />
                                Show thinking
                              </>
                            )}
                          </button>
                          
                          {message.isThinkingVisible && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-800 border border-gray-200 max-h-96 overflow-y-auto">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.thinkingText}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
              className="w-32 p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="generate">Generate</option>
              <option value="expand">Expand</option>
            </select>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter your scene description or instructions..."
              className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading} 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Processing..." : "Send"}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Character Development", "Plot Twist", "Dialogue Scene", "Scene Transition", "Setting Description"].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInputText(`Add ${suggestion.toLowerCase()} for...`)}
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
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

// Add these animations to your global CSS file
/*
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes text-reveal {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.3s ease-out forwards;
}

.animate-text-reveal {
  animation: text-reveal 0.5s ease-out forwards;
}

.animate-blink {
  animation: blink 0.8s infinite;
}
*/


// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import { useSession } from "next-auth/react";
// import { useParams } from "next/navigation";
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";

// import axios from "axios";

// // --- Type Definitions ---
// type Message = {
//   id: string;
//   type: "user" | "ai" | "system";
//   text: string;
//   timestamp: number;
//   isPending?: boolean;
// };

// type Briefing = {
//   overallTone: string;
//   scriptFormat: string; // renamed from "style"
//   templateId: string;
//   objectives: string;
//   targetAudience: string;
//   distributionPlatform: string;
//   genre: string;
//   subGenres: string[];
//   stylisticReferences: string; // a comma-separated string
//   logline: string;
//   plotOutline: string;
//   theme: string;
// };

// type ProjectDetails = {
//   id: string;
//   title: string;
//   briefing: Briefing;
//   messages: Array<{
//     id: string;
//     content: string;
//     role: "USER" | "AI";
//     createdAt: string;
//   }>;
// };

// // --- Default Briefing Object ---
// const defaultBriefing: Briefing = {
//   overallTone: "Dramatic",
//   scriptFormat: "Narrative", // Default style value stored as scriptFormat
//   templateId: "template-1",
//   objectives: "",
//   targetAudience: "",
//   distributionPlatform: "",
//   genre: "",
//   subGenres: [],
//   stylisticReferences: "",
//   logline: "",
//   plotOutline: "",
//   theme: "",
// };

// export default function ProjectEditor() {
//   const { data: session } = useSession();
//   const { projectId } = useParams();
//   const [inputText, setInputText] = useState("");
//   const [selectedAction, setSelectedAction] = useState<"generate" | "expand">("generate");
//   const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);
//   const chatEndRef = useRef<HTMLDivElement>(null);
//   const messageIdCounter = useRef(0);
//   const aiMessageRef = useRef<string | null>(null); // To keep track of the current AI message content

//   // --- Initialize Project Details with a default briefing ---
//   const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
//     id: (projectId as string) || "",
//     title: "",
//     briefing: defaultBriefing,
//     messages: [],
//   });

//   // --- Load project data on mount ---
//   useEffect(() => {
//     if (!projectId) return;
//     const loadProjectData = async () => {
//       try {
//         const response = await fetch(`/api/projects/${projectId}`);
//         if (!response.ok) throw new Error("Failed to load project");
//         const data = await response.json();
//         if (!data || !data.project) {
//           console.error("No project data received");
//           return;
//         }
//         setProjectDetails({
//           ...data.project,
//           briefing: data.project.briefing || defaultBriefing,
//         });
//         const initialMessages = (data.project.messages || []).map((msg: {
//           id: string;
//           role: "USER" | "AI";
//           content: string;
//           createdAt: string;
//         }) => ({
//           id: msg.id,
//           type: msg.role === "USER" ? "user" : "ai",
//           text: msg.content,
//           timestamp: new Date(msg.createdAt).getTime(),
//           isPending: false,
//         }));
//         setConversationHistory(initialMessages);
//       } catch (error) {
//         console.error("Error loading project:", error);
//       }
//     };
//     loadProjectData();
//   }, [projectId]);

//   // --- Auto-save project details (debounced) ---
//   useEffect(() => {
//     const autoSave = async () => {
//       if (!isSaving) {
//         setIsSaving(true);
//         try {
//           await fetch(`/api/projects/${projectId}`, {
//             method: "PATCH",
//             headers: { "Content-Type": "application/json" },
//             // Note: The payload includes the full projectDetails. The backend
//             // should map briefing.scriptFormat correctly.
//             body: JSON.stringify(projectDetails),
//           });
//         } catch (error) {
//           console.error("Auto-save failed:", error);
//         }
//         setIsSaving(false);
//       }
//     };

//     const debounceTimer = setTimeout(autoSave, 20000);
//     return () => clearTimeout(debounceTimer);
//   }, [projectDetails, projectId, isSaving]);

//   // --- Auto-scroll to bottom ---
//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [conversationHistory]);

//   // --- Utility: Unique ID generator ---
//   const createUniqueId = () => {
//     messageIdCounter.current += 1;
//     return `${Date.now()}-${messageIdCounter.current}`;
//   };

//   // --- Add Message & Persist to Backend ---
//   const addMessage = async (msg: Omit<Message, "id" | "timestamp">, persist = true) => {
//     const newMessage: Message = {
//       ...msg,
//       id: createUniqueId(),
//       timestamp: Date.now(),
//     };
//     setConversationHistory((prev) => [...prev, newMessage]);
//     if (persist && (msg.type !== "ai" || (msg.type === "ai" && msg.text.trim() !== ""))) {
//       try {
//         await fetch(`/api/projects/${projectId}/messages`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             content: newMessage.text,
//             role: newMessage.type.toUpperCase(),
//           }),
//         });
//       } catch (error) {
//         console.error("Failed to save message:", error);
//       }
//     }
//     return newMessage.id;
//   };

//   // --- Update AI message with new streamed content ---
//   const updateAiMessage = (messageId: string, text: string) => {
//     setConversationHistory((prev) => {
//       return prev.map((msg) => {
//         if (msg.id === messageId) {
//           return { ...msg, text };
//         }
//         return msg;
//       });
//     });
//   };

//   // --- Handle Submission (Generate/Expand) ---
//   const handleSubmit = async (e?: React.FormEvent) => {
//     e?.preventDefault();
//     if (!inputText.trim() || loading) return;

//     try {
//       setLoading(true);
//       // Append user's message (persisted immediately)
//       await addMessage({ type: "user", text: inputText });
      
//       // Create a pending AI message and get its ID
//       const aiMessageId = await addMessage({ type: "ai", text: "", isPending: true }, false);
//       aiMessageRef.current = "";

//       // Build conversation context from all non-pending messages
//       const conversationContextStr = conversationHistory
//         .filter((msg) => !msg.isPending)
//         .map((msg) => `${msg.type}: ${msg.text}`)
//         .join("\n");

//       // Determine endpoint
//       const endpoint = selectedAction === "generate" ? "/api/generate" : "/api/expand";

//       // Build payload; note we send scriptFormat (instead of style) from briefing
//       const response = await fetch(endpoint, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           tone: projectDetails.briefing.overallTone,
//           style: projectDetails.briefing.scriptFormat,
//           scriptFormat: projectDetails.briefing.scriptFormat, // using scriptFormat
//           templateId: projectDetails.briefing.templateId,
//           outline: inputText,
//           conversationContext: conversationContextStr,
//           title: projectDetails.title,
//           targetAudience: projectDetails.briefing.targetAudience,
//           distributionPlatform: projectDetails.briefing.distributionPlatform,
//           genre: projectDetails.briefing.genre,
//           stylisticReferences: projectDetails.briefing.stylisticReferences,
//           logline: projectDetails.briefing.logline,
//           plotOutline: projectDetails.briefing.plotOutline,
//           theme: projectDetails.briefing.theme,
//         }),
//       });

//       if (!response.ok) throw new Error("Request failed");

//       // Improved streaming logic with proper error handling
//       if (response.body) {
//         const reader = response.body.getReader();
//         const decoder = new TextDecoder();
//         let done = false;
//         let aiText = "";

//         while (!done) {
//           const { value, done: doneReading } = await reader.read();
//           done = doneReading;
          
//           if (value) {
//             const chunk = decoder.decode(value, { stream: !done });
//             aiText += chunk;
            
//             // Update the AI message with the current accumulated text
//             updateAiMessage(aiMessageId, aiText);
            
//             // Store the current state for potential use later
//             aiMessageRef.current = aiText;
            
//             // Scroll to bottom on each update
//             chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
//           }
//         }
        
//         // After streaming is complete, update the pending status and persist the message
//         setConversationHistory((prev) => 
//           prev.map(msg => 
//             msg.id === aiMessageId 
//               ? { ...msg, isPending: false } 
//               : msg
//           )
//         );

//         // Now persist the final AI message
//         await fetch(`/api/projects/${projectId}/messages`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             content: aiText,
//             role: "AI",
//           }),
//         });
//       }
//     } catch (error) {
//       console.error("Error processing request:", error);
//       setConversationHistory((prev) => {
//         // Find the pending AI message and update it with an error
//         return prev.map((msg) => {
//           if (msg.type === "ai" && msg.isPending) {
//             return {
//               ...msg,
//               text: "Error processing request. Please try again.",
//               isPending: false,
//             };
//           }
//           return msg;
//         });
//       });
//     } finally {
//       setLoading(false);
//       setInputText("");
//       aiMessageRef.current = null;
//     }
//   };

//   // --- Update Briefing Field ---
//   const handleProjectUpdate = (field: keyof Briefing, value: any) => {
//     setProjectDetails((prev) => ({
//       ...prev,
//       briefing: {
//         ...prev.briefing,
//         [field]: value,
//       },
//     }));
//   };

//   return (
//     <div className="flex h-screen bg-gray-50">
//       {/* Sidebar: Project Briefing/Settings */}
//       <div className="w-80 border-r border-gray-200 bg-white p-4 flex flex-col overflow-y-auto">
//         <h2 className="mb-4 text-lg font-semibold text-gray-900">Project Briefing</h2>
//         <div className="space-y-4 flex-1">
//           {/* Project Title */}
//           <div className="space-y-2">
//             <label htmlFor="title" className="block text-sm font-medium">Project Title</label>
//             <input
//               id="title"
//               value={projectDetails.title}
//               onChange={(e) =>
//                 setProjectDetails((prev) => ({
//                   ...prev,
//                   title: e.target.value,
//                 }))
//               }
//               placeholder="Untitled Project"
//               className="w-full p-2 border rounded-md text-sm"
//             />
//           </div>
//           {/* Target Audience */}
//           <div className="space-y-2">
//             <label htmlFor="audience" className="block text-sm font-medium">Target Audience</label>
//             <input
//               id="audience"
//               value={projectDetails.briefing?.targetAudience || ""}
//               onChange={(e) => handleProjectUpdate("targetAudience", e.target.value)}
//               placeholder="Demographics, cultural background..."
//               className="w-full p-2 border rounded-md text-sm"
//             />
//           </div>
//           {/* Distribution Platform */}
//           <div className="space-y-2">
//             <label htmlFor="platform" className="block text-sm font-medium">Distribution Platform</label>
//             <select
//               id="platform"
//               value={projectDetails.briefing?.distributionPlatform || ""}
//               onChange={(e) => handleProjectUpdate("distributionPlatform", e.target.value)}
//               className="w-full p-2 border rounded-md text-sm"
//             >
//               <option value="">Select Platform</option>
//               <option value="film">Feature Film</option>
//               <option value="tv">Television</option>
//               <option value="web">Web Series</option>
//               <option value="stage">Stage Play</option>
//               <option value="podcast">Podcast</option>
//               <option value="youtube">YouTube</option>
//             </select>
//           </div>
//           {/* Genre */}
//           <div className="space-y-2">
//             <label htmlFor="genre" className="block text-sm font-medium">Genre</label>
//             <input
//               id="genre"
//               value={projectDetails.briefing?.genre || ""}
//               onChange={(e) => handleProjectUpdate("genre", e.target.value)}
//               placeholder="Primary genre/sub-genres..."
//               className="w-full p-2 border rounded-md text-sm"
//             />
//           </div>
//           {/* Stylistic References */}
//           <div className="space-y-2">
//             <label htmlFor="references" className="block text-sm font-medium">Stylistic References</label>
//             <textarea
//               id="references"
//               value={projectDetails.briefing?.stylisticReferences || ""}
//               onChange={(e) => handleProjectUpdate("stylisticReferences", e.target.value)}
//               placeholder="Films, writers, or style references..."
//               className="w-full p-2 border rounded-md text-sm h-16"
//             />
//           </div>
//           {/* Logline */}
//           <div className="space-y-2">
//             <label htmlFor="logline" className="block text-sm font-medium">Logline</label>
//             <textarea
//               id="logline"
//               value={projectDetails.briefing?.logline || ""}
//               onChange={(e) => handleProjectUpdate("logline", e.target.value)}
//               placeholder="One-sentence summary..."
//               className="w-full p-2 border rounded-md text-sm h-24"
//             />
//           </div>
//         </div>
//         <div className="text-xs text-gray-500">
//           {isSaving ? "Saving changes..." : "Changes auto-save every 20 seconds"}
//         </div>
//       </div>

//       {/* Main Chat Area */}
//       <div className="flex-1 flex flex-col">
//         <header className="border-b border-gray-200 bg-white p-4">
//           <h1 className="text-xl font-semibold text-gray-900">{projectDetails.title || "Untitled Project"}</h1>
//           <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-gray-600">
//             <div>Genre: {projectDetails.briefing?.genre || "N/A"}</div>
//             <div>Platform: {projectDetails.briefing?.distributionPlatform || "N/A"}</div>
//             <div>Tone: {projectDetails.briefing?.overallTone || "N/A"}</div>
//             <div>Style: {projectDetails.briefing?.scriptFormat || "N/A"}</div>
//           </div>
//         </header>

//         <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
//           {conversationHistory.length === 0 ? (
//             <p className="text-center text-gray-500">No conversation yet. Start by sending a message below.</p>
//           ) : (
//             conversationHistory.map((message) => (
//               <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
//                 <div
//                   className={`relative max-w-2xl rounded-lg p-4 ${
//                     message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-gray-900"
//                   } ${message.isPending ? "opacity-75" : ""}`}
//                 >
//                   {message.isPending ? (
//                     <div className="flex items-center space-x-2">
//                       <div className="h-2 w-2 animate-pulse rounded-full bg-current" />
//                       <div className="h-2 w-2 animate-pulse rounded-full bg-current" style={{ animationDelay: "0.2s" }} />
//                       <div className="h-2 w-2 animate-pulse rounded-full bg-current" style={{ animationDelay: "0.4s" }} />
//                       <span className="ml-2">Generating...</span>
//                     </div>
//                   ) : (
//                     <>
//                       {/* Fix for overflow: Use overflow-x-auto and break-words for long content */}
//                       <div className="prose max-w-none text-sm overflow-x-auto break-words">
//                         <ReactMarkdown remarkPlugins={[remarkGfm]}>
//                           {message.text}
//                         </ReactMarkdown>
//                       </div>
//                       <div className="mt-2 text-xs text-gray-500">
//                         {new Date(message.timestamp).toLocaleTimeString()}
//                       </div>
//                     </>
//                   )}
//                 </div>
//               </div>
//             ))
//           )}
//           <div ref={chatEndRef} />
//         </div>

//         {/* Input Area */}
//         <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-4">
//           <div className="flex gap-2">
//             <select
//               value={selectedAction}
//               onChange={(e) => setSelectedAction(e.target.value as "generate" | "expand")}
//               className="w-32 p-2 border rounded-md text-sm"
//             >
//               <option value="generate">Generate</option>
//               <option value="expand">Expand</option>
//             </select>
//             <input
//               value={inputText}
//               onChange={(e) => setInputText(e.target.value)}
//               placeholder="Enter your scene description or instructions..."
//               className="flex-1 p-2 border rounded-md"
//               disabled={loading}
//             />
//             <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
//               {loading ? "Processing..." : "Send"}
//             </button>
//           </div>
//           <div className="mt-2 flex flex-wrap gap-2">
//             {["Character Development", "Plot Twist", "Dialogue Scene", "Scene Transition"].map((suggestion) => (
//               <button
//                 key={suggestion}
//                 type="button"
//                 onClick={() => setInputText(`Add ${suggestion.toLowerCase()} for...`)}
//                 className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
//               >
//                 {suggestion}
//               </button>
//             ))}
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
