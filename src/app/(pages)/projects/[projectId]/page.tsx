"use client"

import type { RefObject } from "react"
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ChevronDown, ChevronUp, Loader2, Send, Plus, X, Settings, Save, ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"

// --- Type Definitions ---
type Message = {
  id: string
  type: "user" | "ai" | "system" | "thinking"
  text: string
  timestamp: number
  isPending?: boolean
  thinkingText?: string
  isThinkingVisible?: boolean
}

type Briefing = {
  overallTone: string
  scriptFormat: string
  templateId: string
  objectives: string
  targetAudience: string
  distributionPlatform: string
  genre: string
  subGenres: string[]
  stylisticReferences: string
  logline: string
  plotOutline: string
  theme: string
}

type ProjectDetails = {
  id: string
  title: string
  briefing: Briefing
  messages: Array<{
    id: string
    content: string
    role: "USER" | "AI"
    createdAt: string
  }>
}

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
}

// Custom hook for intersection observer (animations)
const useIntersectionObserver = (options = {}): [RefObject<HTMLDivElement>, boolean] => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  //@ts-expect-error there is some type error
  return [ref, isVisible];
};

export default function ProjectEditor() {
  const { data: session } = useSession()
  const router = useRouter()
  const { projectId } = useParams()
  const [inputText, setInputText] = useState("")
  const [selectedAction, setSelectedAction] = useState<"generate" | "expand">("generate")
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const messageIdCounter = useRef(0)
  const aiMessageRef = useRef<string | null>(null)
  const thinkingRef = useRef<string | null>(null)
  const [headerRef, headerVisible] = useIntersectionObserver({ threshold: 0.1 })

  // --- Initialize Project Details with a default briefing ---
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    id: (projectId as string) || "",
    title: "",
    briefing: defaultBriefing,
    messages: [],
  })

  // --- Load project data on mount ---
  useEffect(() => {
    if (!projectId) return
    const loadProjectData = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (!response.ok) throw new Error("Failed to load project")
        const data = await response.json()
        if (!data || !data.project) {
          console.error("No project data received")
          return
        }
        setProjectDetails({
          ...data.project,
          briefing: data.project.briefing || defaultBriefing,
        })

        // Parse messages to separate thinking content if it exists
        const initialMessages = (data.project.messages || []).map(
          (msg: {
            id: string
            role: "USER" | "AI"
            content: string
            createdAt: string
          }) => {
            // Check if AI message contains thinking section with <Thinking> tags
            let messageText = msg.content
            let thinkingText = ""

            if (msg.role === "AI") {
              const thinkMatch = msg.content.match(/<Thinking>([\s\S]*?)<\/think>/)
              if (thinkMatch) {
                // Extract content inside <Thinking> tags
                thinkingText = thinkMatch[1].trim()
                // Remove the <Thinking> section from the main content
                messageText = msg.content.replace(/<Thinking>[\s\S]*?<\/think>/, "").trim()
              } else if (msg.content.includes("Thinking:")) {
                // Fallback for older format
                const parts = msg.content.split("Thinking:")
                messageText = parts[0].trim()
                thinkingText = parts.length > 1 ? parts[1].trim() : ""
              }

              // Format the messageText to replace * headers with bold
              messageText = formatHeadersAsBold(messageText)
            }

            return {
              id: msg.id,
              type: msg.role === "USER" ? "user" : "ai",
              text: messageText,
              thinkingText: thinkingText,
              isThinkingVisible: false,
              timestamp: new Date(msg.createdAt).getTime(),
              isPending: false,
            }
          },
        )

        setConversationHistory(initialMessages)
      } catch (error) {
        console.error("Error loading project:", error)
      }
    }
    loadProjectData()
  }, [projectId])

  // --- Format headers: Replace markdown * with bold text ---
  const formatHeadersAsBold = (text: string) => {
    // Replace # headers with bold text
    return text.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, content) => {
      return `**${content.trim()}**`
    })
  }

  // --- Auto-save project details (debounced) ---
  useEffect(() => {
    const autoSave = async () => {
      if (!isSaving) {
        setIsSaving(true)
        try {
          await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(projectDetails),
          })
        } catch (error) {
          console.error("Auto-save failed:", error)
        }
        setIsSaving(false)
      }
    }

    const debounceTimer = setTimeout(autoSave, 20000)
    return () => clearTimeout(debounceTimer)
  }, [projectDetails, projectId, isSaving])

  // --- Auto-scroll to bottom ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // --- Utility: Unique ID generator ---
  const createUniqueId = () => {
    messageIdCounter.current += 1
    return `${Date.now()}-${messageIdCounter.current}`
  }

  // --- Add Message & Persist to Backend ---
  const addMessage = async (msg: Omit<Message, "id" | "timestamp">, persist = true) => {
    const newMessage: Message = {
      ...msg,
      id: createUniqueId(),
      timestamp: Date.now(),
    }
    setConversationHistory((prev) => [...prev, newMessage])

    if (persist && (msg.type !== "ai" || (msg.type === "ai" && msg.text.trim() !== ""))) {
      try {
        // Combine thinking and response text for storage
        let contentToStore = msg.text
        if (msg.thinkingText && msg.thinkingText.trim() !== "") {
          contentToStore = `${contentToStore}\n\n<Thinking>${msg.thinkingText}</Thinking>`
        }

        await fetch(`/api/projects/${projectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: contentToStore,
            role: msg.type === "thinking" ? "AI" : msg.type.toUpperCase(),
          }),
        })
      } catch (error) {
        console.error("Failed to save message:", error)
      }
    }
    return newMessage.id
  }

  // --- Toggle thinking visibility ---
  const toggleThinking = (messageId: string) => {
    setConversationHistory((prev) => {
      return prev.map((msg) => {
        if (msg.id === messageId) {
          return { ...msg, isThinkingVisible: !msg.isThinkingVisible }
        }
        return msg
      })
    })
  }

  // --- Update AI message with new streamed content ---
  const updateAiMessage = (messageId: string, text: string) => {
    setConversationHistory((prev) => {
      return prev.map((msg) => {
        if (msg.id === messageId) {
          return { ...msg, text: formatHeadersAsBold(text) }
        }
        return msg
      })
    })
  }

  // --- Update Thinking content ---
  const updateThinkingMessage = (messageId: string, text: string) => {
    setConversationHistory((prev) => {
      return prev.map((msg) => {
        if (msg.id === messageId) {
          return { ...msg, thinkingText: text }
        }
        return msg
      })
    })
  }

  // --- Handle Submission (Generate/Expand) ---
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputText.trim() || loading) return

    try {
      setLoading(true)
      // Add user message
      await addMessage({ type: "user", text: inputText })

      // Add a thinking message with expandable section
      const thinkingId = await addMessage(
        {
          type: "ai",
          text: "",
          thinkingText: "AI is thinking...",
          isThinkingVisible: true,
          isPending: true,
        },
        false,
      )

      const conversationContextStr = conversationHistory
        .filter((msg) => !msg.isPending)
        .map((msg) => `${msg.type}: ${msg.text}`)
        .join("\n")

      const endpoint = selectedAction === "generate" ? "/api/generate" : "/api/expand"
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
      })

      if (!response.ok) throw new Error("Request failed")

      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let done = false
        let fullContent = ""
        let currentThinkingText = ""
        let currentResponseText = ""
        let isInsideThinkTag = false

        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading

          if (value) {
            const chunk = decoder.decode(value, { stream: !done })
            fullContent += chunk

            // Parse the content to extract <Thinking> tags and response
            let updatedThinking = currentThinkingText
            let updatedResponse = currentResponseText

            // Look for opening and closing think tags
            const openTagIndex = fullContent.indexOf("<Thinking>")
            const closeTagIndex = fullContent.indexOf("</Thinking>")

            if (openTagIndex !== -1 && closeTagIndex === -1) {
              // Found opening tag but not closing tag yet
              isInsideThinkTag = true
              // Extract everything before the think tag as response
              if (openTagIndex > 0) {
                updatedResponse = fullContent.substring(0, openTagIndex).trim()
              }
              // Extract partial thinking content
              updatedThinking = fullContent.substring(openTagIndex + 7).trim()
            } else if (openTagIndex !== -1 && closeTagIndex !== -1) {
              // Found both opening and closing tags
              isInsideThinkTag = false
              // Extract thinking content
              updatedThinking = fullContent.substring(openTagIndex + 7, closeTagIndex).trim()

              // Extract response (combine before and after think tags)
              const beforeThink = fullContent.substring(0, openTagIndex).trim()
              const afterThink = fullContent.substring(closeTagIndex + 8).trim()
              updatedResponse = (beforeThink + " " + afterThink).trim()
            } else if (isInsideThinkTag) {
              // Still inside an open think tag from previous chunks
              updatedThinking = fullContent.substring(fullContent.indexOf("<Thinking>") + 7).trim()
            } else {
              // No think tags found, treat as response
              updatedResponse = fullContent.trim()
            }

            // Update the message with separated thinking and response
            if (updatedThinking !== currentThinkingText) {
              currentThinkingText = updatedThinking
              updateThinkingMessage(thinkingId, currentThinkingText)
            }

            if (updatedResponse !== currentResponseText) {
              currentResponseText = updatedResponse
              updateAiMessage(thinkingId, currentResponseText)
            }

            // Keep references updated for final saving
            thinkingRef.current = currentThinkingText
            aiMessageRef.current = currentResponseText

            // Smooth scroll to bottom
            requestAnimationFrame(() => {
              chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
            })
          }
        }

        // Process full content one last time to ensure everything is captured
        let finalThinking = ""
        let finalResponse = ""

        const thinkMatch = fullContent.match(/<Thinking>([\s\S]*?)<\/think>/)
        if (thinkMatch) {
          finalThinking = thinkMatch[1].trim()
          // Remove the think tags and its content from the response
          finalResponse = fullContent.replace(/<Thinking>[\s\S]*?<\/think>/, "").trim()
        } else {
          // No think tags found in the final content
          finalResponse = fullContent
        }

        // Update refs for final saving
        thinkingRef.current = finalThinking
        aiMessageRef.current = finalResponse

        // Update final message state
        setConversationHistory((prev) =>
          prev.map((msg) => {
            if (msg.id === thinkingId) {
              return {
                ...msg,
                text: formatHeadersAsBold(aiMessageRef.current || ""),
                thinkingText: thinkingRef.current || "",
                isPending: false,
                isThinkingVisible: false, // Auto-collapse thinking when done
              }
            }
            return msg
          }),
        )

        // Persist final AI message with thinking content in <Thinking> tags
        await fetch(`/api/projects/${projectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `${aiMessageRef.current || ""}\n\n<Thinking>${thinkingRef.current || ""}</Thinking>`,
            role: "AI",
          }),
        })
      }
    } catch (error) {
      console.error("Error:", error)
      setConversationHistory((prev) => {
        return prev.map((msg) => {
          if (msg.type === "ai" && msg.isPending) {
            return {
              ...msg,
              text: "Error processing request. Please try again.",
              isPending: false,
            }
          }
          return msg
        })
      })
    } finally {
      setLoading(false)
      setInputText("")
      aiMessageRef.current = null
      thinkingRef.current = null
    }
  }

  // --- Update Briefing Field ---
  const handleProjectUpdate = (field: keyof Briefing, value: any) => {
    setProjectDetails((prev) => ({
      ...prev,
      briefing: {
        ...prev.briefing,
        [field]: value,
      },
    }))
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      {/* Sidebar: Project Briefing/Settings */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out overflow-y-auto`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Project Briefing
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-6">
            {/* Project Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                Project Title
              </label>
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
                className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            {/* Target Audience */}
            <div className="space-y-2">
              <label htmlFor="audience" className="block text-sm font-medium text-slate-700">
                Target Audience
              </label>
              <input
                id="audience"
                value={projectDetails.briefing?.targetAudience || ""}
                onChange={(e) => handleProjectUpdate("targetAudience", e.target.value)}
                placeholder="Demographics, cultural background..."
                className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            {/* Distribution Platform */}
            <div className="space-y-2">
              <label htmlFor="platform" className="block text-sm font-medium text-slate-700">
                Distribution Platform
              </label>
              <select
                id="platform"
                value={projectDetails.briefing?.distributionPlatform || ""}
                onChange={(e) => handleProjectUpdate("distributionPlatform", e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              <label htmlFor="genre" className="block text-sm font-medium text-slate-700">
                Genre
              </label>
              <input
                id="genre"
                value={projectDetails.briefing?.genre || ""}
                onChange={(e) => handleProjectUpdate("genre", e.target.value)}
                placeholder="Primary genre/sub-genres..."
                className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            {/* Stylistic References */}
            <div className="space-y-2">
              <label htmlFor="references" className="block text-sm font-medium text-slate-700">
                Stylistic References
              </label>
              <textarea
                id="references"
                value={projectDetails.briefing?.stylisticReferences || ""}
                onChange={(e) => handleProjectUpdate("stylisticReferences", e.target.value)}
                placeholder="Films, writers, or style references..."
                className="w-full p-2 border border-slate-300 rounded-md text-sm h-24 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            {/* Logline */}
            <div className="space-y-2">
              <label htmlFor="logline" className="block text-sm font-medium text-slate-700">
                Logline
              </label>
              <textarea
                id="logline"
                value={projectDetails.briefing?.logline || ""}
                onChange={(e) => handleProjectUpdate("logline", e.target.value)}
                placeholder="One-sentence summary..."
                className="w-full p-2 border border-slate-300 rounded-md text-sm h-24 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {isSaving ? "Saving changes..." : "Changes auto-save every 20 seconds"}
            </span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-sm text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header
          ref={headerRef}
          className={`sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all duration-500 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          }`}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link href="/dashboard" className="mr-4">
                  <ArrowLeft size={24} className="text-slate-600 hover:text-purple-600 transition-colors" />
                </Link>
                <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                  {projectDetails.title || "Untitled Project"}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-md text-slate-600 hover:text-purple-600 hover:bg-purple-100 transition-colors"
                >
                  <Settings size={20} />
                </button>
                <button
                  onClick={() => {
                    /* Implement save functionality */
                  }}
                  className="p-2 rounded-md text-slate-600 hover:text-purple-600 hover:bg-purple-100 transition-colors"
                >
                  <Save size={20} />
                </button>
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium">
                  {session?.user?.name?.[0] || "U"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversationHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles size={48} className="text-purple-400 mb-4" />
              <h2 className="text-2xl font-bold text-slate-700 mb-2">Start Your Creative Journey</h2>
              <p className="text-slate-500 max-w-md mb-8">
                Begin by describing your scene or asking for ideas. Our AI will help you craft your script step by step.
              </p>
              <button
                onClick={() => setInputText("Describe the opening scene of a sci-fi movie set in a distant future.")}
                className="px-6 py-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg text-sm font-medium"
              >
                Get Started with an Example
              </button>
            </div>
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
                <div
                  className={`relative max-w-2xl rounded-lg p-4 ${
                    message.type === "user"
                      ? "bg-purple-600 text-white"
                      : message.type === "system" || message.type === "thinking"
                        ? "bg-slate-100 text-slate-800"
                        : "bg-white border border-slate-200 text-slate-900"
                  } ${message.isPending ? "opacity-80" : ""} shadow-md animate-fade-in-up`}
                >
                  {message.type === "system" ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-current" />
                      <div
                        className="h-2 w-2 animate-pulse rounded-full bg-current"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <div
                        className="h-2 w-2 animate-pulse rounded-full bg-current"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Message Content */}
                      <div className="prose max-w-none text-sm overflow-x-auto break-words">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          //@ts-expect-error there is some type error
                          components={{
                            p: ({ node, ...props }) => (
                              <p
                                {...props}
                                className="animate-text-reveal leading-relaxed"
                                style={{ animationDelay: "0.1s" }}
                              />
                            ),
                            h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-bold mt-4 mb-2" />,
                            h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-bold mt-3 mb-2" />,
                            h3: ({ node, ...props }) => <h3 {...props} className="text-md font-bold mt-3 mb-1" />,
                            strong: ({ node, ...props }) => <strong {...props} className="font-bold" />,
                            em: ({ node, ...props }) => <em {...props} className="italic" />,
                            code: ({ node, inline, ...props }) =>
                              inline ? (
                                <code {...props} className="px-1 py-0.5 bg-slate-100 text-purple-600 rounded text-sm" />
                              ) : (
                                <code
                                  {...props}
                                  className="block p-2 my-2 bg-slate-100 rounded-md overflow-x-auto text-sm"
                                />
                              ),
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                        {message.isPending && <span className="animate-blink ml-1">|</span>}
                      </div>

                      {/* Thinking Toggle - Only for AI messages with thinking content */}
                      {message.type === "ai" && message.thinkingText && message.thinkingText.trim() !== "" && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleThinking(message.id)}
                            className="flex items-center text-xs text-slate-500 hover:text-purple-600 transition-colors"
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
                            <div className="mt-2 p-3 bg-slate-50 rounded-md text-sm text-slate-800 border border-slate-200 max-h-96 overflow-y-auto">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.thinkingText}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-2 text-xs text-slate-500">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
        <div className="border-t border-slate-200 bg-white p-4">
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <div className="flex gap-2">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value as "generate" | "expand")}
                className="w-32 p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="generate">Generate</option>
                <option value="expand">Expand</option>
              </select>
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter your scene description or instructions..."
                className="flex-1 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    Send
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Character Development", "Plot Twist", "Dialogue Scene", "Scene Transition", "Setting Description"].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setInputText(`Add ${suggestion.toLowerCase()} for...`)}
                    className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full hover:bg-purple-100 hover:text-purple-700 transition-colors"
                  >
                    <Plus size={12} className="inline mr-1" />
                    {suggestion}
                  </button>
                ),
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Add custom styles for animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes textReveal {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
        
        .animate-text-reveal {
          animation: textReveal 0.5s ease-out forwards;
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        
        .animate-blink {
          animation: blink 1s infinite;
        }
      `}</style>
    </div>
  )
}

