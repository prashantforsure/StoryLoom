"use client"

import type { RefObject } from "react"
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  Plus,
  X,
  Settings,
  Save,
  ArrowLeft,
  Sparkles,
  Menu,
  Copy,
  Check,
} from "lucide-react"
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
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting)
    }, options)

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [options])
//@ts-expect-error there is some type error
  return [ref, isVisible]
}

// Custom hook to detect mobile view
const useMobileDetect = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  return isMobile
}

// Add this function before the ProjectEditor component
const formatScriptContent = (content: string) => {
  // Format headings with proper styling
  // Match patterns like ****HEADING:**** or **HEADING:**
  return content
    .replace(/\*\*\*\*(.*?)\*\*\*\*/g, '<h2 class="text-xl font-bold mt-6 mb-3 text-purple-700">$1</h2>')
    .replace(/\*\*(.*?):\*\*/g, '<h3 class="text-lg font-semibold mt-4 mb-2 text-purple-600">$1:</h3>')
}

// Add this function to better handle large script content
// Add this after your existing formatScriptContent function

const truncateForDisplay = (content: string, maxLength = 100000) => {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + "..."
}

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
  const lastSaveTimeRef = useRef<number>(Date.now())
  const savedMessageIdsRef = useRef<Set<string>>(new Set())
  const isMobile = useMobileDetect()

  // Add a debug mode to help troubleshoot issues
  // Add this state near your other state declarations

  const [debugMode, setDebugMode] = useState(false)

  // Add this hook inside the ProjectEditor component, after the other state declarations
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  // --- Initialize Project Details with a default briefing ---
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    id: (projectId as string) || "",
    title: "",
    briefing: defaultBriefing,
    messages: [],
  })

  // Add this function inside the ProjectEditor component
  const handleCopyScript = (messageId: string, text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedMessageId(messageId)
        setTimeout(() => setCopiedMessageId(null), 2000)
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err)
      })
  }

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
              // Fix: Check for both <Thinking> and <Thinking> tags with case insensitivity
              const thinkMatch = msg.content.match(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/i)
              if (thinkMatch) {
                // Extract content inside thinking tags
                thinkingText = thinkMatch[1].trim()
                // Remove the thinking section from the main content
                messageText = msg.content.replace(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/i, "").trim()
              } else if (msg.content.includes("Thinking:")) {
                // Fallback for older format
                const parts = msg.content.split("Thinking:")
                messageText = parts[0].trim()
                thinkingText = parts.length > 1 ? parts[1].trim() : ""
              }

              // Format the messageText to replace * headers with bold
              messageText = formatHeadersAsBold(messageText)
            }

            // Add message ID to saved messages set
            savedMessageIdsRef.current.add(msg.id)

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
        // Set the last save time to now to prevent immediate auto-save
        lastSaveTimeRef.current = Date.now()
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
      const currentTime = Date.now()
      // Only save if it's been at least 20 seconds since the last save
      if (!isSaving && projectId && currentTime - lastSaveTimeRef.current >= 20000) {
        setIsSaving(true)
        try {
          // Create a copy of projectDetails without messages to avoid duplicating them
          const projectWithoutMessages = {
            id: projectDetails.id,
            title: projectDetails.title,
            briefing: projectDetails.briefing,
            // Don't include the messages array
          }

          await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(projectWithoutMessages),
          })

          // Update the last save time
          lastSaveTimeRef.current = currentTime
        } catch (error) {
          console.error("Auto-save failed:", error)
        }
        setIsSaving(false)
      }
    }

    const debounceTimer = setTimeout(autoSave, 20000)
    return () => clearTimeout(debounceTimer)
  }, [projectDetails.title, projectDetails.briefing, projectId, isSaving])

  // --- Auto-scroll to bottom ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversationHistory])

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
        // Check if this message has already been saved
        if (savedMessageIdsRef.current.has(newMessage.id)) {
          return newMessage.id
        }

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

        // Mark this message as saved
        savedMessageIdsRef.current.add(newMessage.id)
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

      // Modify the fetch request to include a longer timeout
      // Add this near the beginning of the handleSubmit function, after the initial setup
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

      // Then replace the existing fetch call with this:
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
        signal: controller.signal,
      })

      // Don't forget to clear the timeout
      clearTimeout(timeoutId)

      if (!response.ok) throw new Error("Request failed")

      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let done = false
        let fullContent = ""

        // Also modify the streaming part to handle larger responses better
        // In the streaming section, add a buffer size check:

        let bufferSize = 0
        const MAX_BUFFER_SIZE = 1024 * 1024 // 1MB buffer limit

        let currentThinkingText = ""
        let currentResponseText = ""
        let isInsideThinkTag = false

        while (!done) {
          try {
            const { value, done: doneReading } = await reader.read()
            done = doneReading

            if (value) {
              const chunk = decoder.decode(value, { stream: !done })
              fullContent += chunk
              bufferSize += chunk.length

              // Check if buffer is getting too large
              if (bufferSize > MAX_BUFFER_SIZE) {
                console.warn("Response buffer size exceeds limit, may cause issues")
              }

              // Parse the content to extract thinking tags and response
              let updatedThinking = currentThinkingText
              let updatedResponse = currentResponseText

              // Fix: Look for both <Thinking> and <Thinking> tags with consistent handling
              // First check for <Thinking> tags (standard format)
              const openTagIndex = fullContent.indexOf("<Thinking>")
              const closeTagIndex = fullContent.indexOf("</Thinking>")

              // If not found, check for <Thinking> tags (alternative format)
              const altOpenTagIndex = openTagIndex === -1 ? fullContent.indexOf("<Thinking>") : -1
              const altCloseTagIndex = closeTagIndex === -1 ? fullContent.indexOf("</Thinking>") : -1

              // Use whichever tag format was found
              const effectiveOpenTagIndex = openTagIndex !== -1 ? openTagIndex : altOpenTagIndex
              const effectiveCloseTagIndex = closeTagIndex !== -1 ? closeTagIndex : altCloseTagIndex
              const tagLength = openTagIndex !== -1 ? 10 : altOpenTagIndex !== -1 ? 7 : 10 // <Thinking> is 10 chars, <Thinking> is 7
              const closeTagLength = closeTagIndex !== -1 ? 11 : altCloseTagIndex !== -1 ? 8 : 11 // </Thinking> is 11 chars, </Thinking> is 8

              if (effectiveOpenTagIndex !== -1 && effectiveCloseTagIndex === -1) {
                // Found opening tag but not closing tag yet
                isInsideThinkTag = true
                // Extract everything before the think tag as response
                if (effectiveOpenTagIndex > 0) {
                  updatedResponse = fullContent.substring(0, effectiveOpenTagIndex).trim()
                }
                // Extract partial thinking content
                updatedThinking = fullContent.substring(effectiveOpenTagIndex + tagLength).trim()
              } else if (effectiveOpenTagIndex !== -1 && effectiveCloseTagIndex !== -1) {
                // Found both opening and closing tags
                isInsideThinkTag = false
                // Extract thinking content
                updatedThinking = fullContent
                  .substring(effectiveOpenTagIndex + tagLength, effectiveCloseTagIndex)
                  .trim()

                // Extract response (combine before and after think tags)
                const beforeThink = fullContent.substring(0, effectiveOpenTagIndex).trim()
                const afterThink = fullContent.substring(effectiveCloseTagIndex + closeTagLength).trim()
                updatedResponse = (beforeThink + " " + afterThink).trim()
              } else if (isInsideThinkTag) {
                // Still inside an open think tag from previous chunks
                const tagStart =
                  fullContent.indexOf("<Thinking>") !== -1
                    ? fullContent.indexOf("<Thinking>") + 10
                    : fullContent.indexOf("<Thinking>") + 7
                updatedThinking = fullContent.substring(tagStart).trim()
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
          } catch (error) {
            console.error("Error reading stream:", error)
            break
          }
        }

        // Process full content one last time to ensure everything is captured
        let finalThinking = ""
        let finalResponse = ""

        // Fix: Check for both tag formats with case insensitivity
        const thinkMatch = fullContent.match(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/i)
        if (thinkMatch) {
          finalThinking = thinkMatch[1].trim()
          // Remove the think tags and its content from the response
          finalResponse = fullContent.replace(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/i, "").trim()
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

        // Check if this message has already been saved
        if (!savedMessageIdsRef.current.has(thinkingId)) {
          // Persist final AI message with thinking content in <Thinking> tags
          await fetch(`/api/projects/${projectId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `${aiMessageRef.current || ""}\n\n<Thinking>${thinkingRef.current || ""}</Thinking>`,
              role: "AI",
            }),
          })

          // Mark this message as saved
          savedMessageIdsRef.current.add(thinkingId)
        }
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

  // --- Manual save function ---
  const handleManualSave = async () => {
    if (isSaving || !projectId) return

    setIsSaving(true)
    try {
      // Create a copy of projectDetails without messages to avoid duplicating them
      const projectWithoutMessages = {
        id: projectDetails.id,
        title: projectDetails.title,
        briefing: projectDetails.briefing,
      }

      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectWithoutMessages),
      })

      // Update the last save time
      lastSaveTimeRef.current = Date.now()
    } catch (error) {
      console.error("Manual save failed:", error)
    }
    setIsSaving(false)
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      {/* Sidebar: Project Briefing/Settings */}
      <div
        className={`fixed inset-y-0 left-0 z-50 ${isMobile ? "w-full" : "w-80"} bg-white shadow-lg transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out overflow-y-auto`}
      >
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Project Briefing
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4 sm:space-y-6">
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
                <option value="instagram">Instagram Reels</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>

            {/* tone */}
            <div className="space-y-2">
              <label htmlFor="tone" className="block text-sm font-medium text-slate-700">
                Tone
              </label>
              <select
                id="tone"
                value={projectDetails.briefing?.overallTone || ""}
                onChange={(e) => handleProjectUpdate("overallTone", e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select Tone</option>
                <option value="Formal">Formal Tone</option>
                <option value="Dramatic">Dramatic</option>
                <option value="Comedic">Comedic</option>
                <option value="Sarcastic">Sarcastic</option>
                <option value="Serious">Serious</option>
                <option value="Lighthearted">Lighthearted</option>
                <option value="Melancholic">Melancholic</option>
                <option value="Inspirational">Inspirational</option>
                <option value="Suspenseful">Suspenseful</option>
                <option value="Romantic">Romantic</option>
                <option value="Optimistic">Optimistic</option>
                <option value="Pessimistic">Pessimistic</option>
                <option value="Ironic">Ironic</option>
                <option value="Whimsical">Whimsical</option>
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
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200">
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
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                {isMobile ? (
                  <button onClick={() => setIsSidebarOpen(true)} className="mr-3 text-slate-600 hover:text-purple-600">
                    <Menu size={24} />
                  </button>
                ) : (
                  <Link href="/dashboard" className="mr-4">
                    <ArrowLeft size={24} className="text-slate-600 hover:text-purple-600 transition-colors" />
                  </Link>
                )}
                <h1 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent truncate max-w-[200px] sm:max-w-md">
                  {projectDetails.title || "Untitled Project"}
                </h1>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                {!isMobile && (
                  <button
                    onClick={() => setDebugMode(!debugMode)}
                    className="p-2 rounded-md text-slate-600 hover:text-purple-600 hover:bg-purple-100 transition-colors"
                  >
                    {debugMode ? "Hide Debug" : "Debug"}
                  </button>
                )}
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-md text-slate-600 hover:text-purple-600 hover:bg-purple-100 transition-colors"
                >
                  <Settings size={20} />
                </button>
                <button
                  onClick={handleManualSave}
                  className="p-2 rounded-md text-slate-600 hover:text-purple-600 hover:bg-purple-100 transition-colors"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                </button>
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium">
                  {session?.user?.name?.[0] || "U"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {conversationHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles size={48} className="text-purple-400 mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-700 mb-2">Start Your Creative Journey</h2>
              <p className="text-slate-500 max-w-md mb-8">
                Begin by describing your scene or asking for ideas. Our AI will help you craft your script step by step.
              </p>
              <button
                onClick={() => setInputText("Describe the opening scene of a sci-fi movie set in a distant future.")}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg text-sm font-medium"
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
                  className={`relative ${isMobile ? "max-w-[85%]" : "max-w-2xl"} rounded-lg p-3 sm:p-4 ${
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
                        {message.type === "ai" ? (
                          <>
                            <div
                              className="relative"
                              dangerouslySetInnerHTML={{
                                __html: formatScriptContent(truncateForDisplay(message.text)),
                              }}
                            />
                            {message.text.trim().length > 0 && (
                              <button
                                onClick={() => handleCopyScript(message.id, message.text)}
                                className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-white rounded-md text-slate-600 hover:text-purple-600 transition-colors shadow-sm"
                                aria-label="Copy script"
                              >
                                {copiedMessageId === message.id ? (
                                  <Check size={16} className="text-green-500" />
                                ) : (
                                  <Copy size={16} />
                                )}
                              </button>
                            )}
                          </>
                        ) : (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
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
                                  <code
                                    {...props}
                                    className="px-1 py-0.5 bg-slate-100 text-purple-600 rounded text-sm"
                                  />
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
                        )}
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
                            <div className="mt-2 p-3 bg-slate-50 rounded-md text-xs sm:text-sm text-slate-800 border border-slate-200 max-h-60 sm:max-h-96 overflow-y-auto">
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
          {debugMode && (
            <div className="bg-slate-800 text-white p-4 rounded-md text-xs font-mono">
              <h3 className="text-sm font-bold mb-2">Debug Info:</h3>
              <p>
                Last message length:{" "}
                {conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1].text.length : 0}{" "}
                chars
              </p>
              <p>Messages in history: {conversationHistory.length}</p>
              <p>Saved message IDs: {Array.from(savedMessageIdsRef.current).length}</p>
              <details>
                <summary className="cursor-pointer">Last message preview</summary>
                <pre className="mt-2 overflow-x-auto max-h-40">
                  {conversationHistory.length > 0
                    ? conversationHistory[conversationHistory.length - 1].text.substring(0, 500) +
                      (conversationHistory[conversationHistory.length - 1].text.length > 500 ? "..." : "")
                    : "No messages"}
                </pre>
              </details>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <form onSubmit={handleSubmit} className="flex flex-col space-y-3 sm:space-y-4">
            <div className="flex gap-2">
              {!isMobile && (
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value as "generate" | "expand")}
                  className="w-32 p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="generate">Generate</option>
                  <option value="expand">Expand</option>
                </select>
              )}
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
                className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="mr-1 sm:mr-2 animate-spin" />
                    {!isMobile && "Processing..."}
                  </>
                ) : (
                  <>
                    <Send size={18} className={isMobile ? "" : "mr-2"} />
                    {!isMobile && "Send"}
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Character", "Plot Twist", "Dialogue", "Transition", "Setting"].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInputText(`Add ${suggestion.toLowerCase()} for...`)}
                  className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-100 text-slate-700 rounded-full hover:bg-purple-100 hover:text-purple-700 transition-colors"
                >
                  <Plus size={12} className="inline mr-1" />
                  {suggestion}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


  
