import type { Metadata } from "next"
import { ScriptEditor } from "@/components/script-editor"

export const metadata: Metadata = {
  title: "AI Script Editor",
  description: "Generate and refine your script using our AI-powered editor.",
}

export default function EditorPage() {
  return (
    <div className="container mx-auto py-10">
      <ScriptEditor />
    </div>
  )
}

