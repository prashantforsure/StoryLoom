"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScriptOptions } from "@/components/script-options"
import { ConversationHistory } from "@/components/conversation-history"
import { GeneratedScript } from "@/components/generated-script"

type Message = {
  type: "user" | "ai"
  text: string
}

export function ScriptEditor() {
  const [title, setTitle] = useState("")
  const [tone, setTone] = useState("")
  const [style, setStyle] = useState("")
  const [template, setTemplate] = useState("")
  const [outline, setOutline] = useState("")
  const [generatedText, setGeneratedText] = useState("")
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const addMessage = (msg: Message) => {
    setConversationHistory((prev) => [...prev, msg])
  }

  const handleGenerate = async () => {
    if (!title || !tone || !style || !outline) {
      alert("Please fill out all fields.")
      return
    }
    setLoading(true)
    addMessage({ type: "user", text: `Title: ${title}` })
    addMessage({ type: "user", text: outline })
    setGeneratedText("")

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          tone,
          style,
          templateId: template,
          outline,
          conversationContext: conversationHistory.map((msg) => msg.text).join("\n"),
        }),
      })
      if (!response.ok) {
        throw new Error("Failed to generate script section.")
      }
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { value, done } = await reader!.read()
        if (done) break
        const chunk = decoder.decode(value)
        setGeneratedText((prev) => prev + chunk)
      }
      addMessage({ type: "ai", text: generatedText })
    } catch (error) {
      console.error("Error generating script:", error)
      alert("An error occurred during generation.")
    }
    setLoading(false)
  }

  const handleExpand = async () => {
    if (!outline) {
      alert("Please enter a scene description to expand.")
      return
    }
    setLoading(true)
    addMessage({ type: "user", text: outline })
    setGeneratedText("")

    try {
      const response = await fetch("/api/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneDescription: outline,
          conversationContext: conversationHistory.map((msg) => msg.text).join("\n"),
        }),
      })
      if (!response.ok) {
        throw new Error("Failed to expand script section.")
      }
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { value, done } = await reader!.read()
        if (done) break
        const chunk = decoder.decode(value)
        setGeneratedText((prev) => prev + chunk)
      }
      addMessage({ type: "ai", text: generatedText })
    } catch (error) {
      console.error("Error expanding script:", error)
      alert("An error occurred during expansion.")
    }
    setLoading(false)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">AI Script Editor</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Generate and refine your script using our AI-powered editor.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Script Title</Label>
            <Input
              id="title"
              placeholder="Enter your script title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <ScriptOptions
            tone={tone}
            setTone={setTone}
            style={style}
            setStyle={setStyle}
            template={template}
            setTemplate={setTemplate}
          />
          <div className="space-y-2">
            <Label htmlFor="outline">Outline / Scene Description</Label>
            <Textarea
              id="outline"
              placeholder="Describe the scene or dialogue you want to generate..."
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              rows={6}
            />
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate"}
            </Button>
            <Button onClick={handleExpand} disabled={loading} variant="outline">
              {loading ? "Expanding..." : "Expand"}
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <ConversationHistory messages={conversationHistory} />
        <GeneratedScript generatedText={generatedText} />
      </div>
    </div>
  )
}

