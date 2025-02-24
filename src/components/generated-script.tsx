import { ScrollArea } from "@/components/ui/scroll-area"

interface GeneratedScriptProps {
  generatedText: string
}

export function GeneratedScript({ generatedText }: GeneratedScriptProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">Generated Script</h3>
        <p className="text-sm text-muted-foreground">The AI-generated script section will appear here.</p>
      </div>
      <ScrollArea className="h-[400px] p-6">
        {generatedText ? (
          <pre className="whitespace-pre-wrap text-sm">{generatedText}</pre>
        ) : (
          <p className="text-sm text-gray-500">Generated script will appear here.</p>
        )}
      </ScrollArea>
    </div>
  )
}
