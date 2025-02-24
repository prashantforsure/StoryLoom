import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  type: "user" | "ai"
  text: string
}

interface ConversationHistoryProps {
  messages: Message[]
}

export function ConversationHistory({ messages }: ConversationHistoryProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">Conversation</h3>
        <p className="text-sm text-muted-foreground">Your conversation history with the AI.</p>
      </div>
      <ScrollArea className="h-[400px] p-6">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">Your conversation will appear here as you interact with the AI.</p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 rounded-lg p-3 ${
                msg.type === "ai" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              <p className="text-sm">{msg.text}</p>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  )
}