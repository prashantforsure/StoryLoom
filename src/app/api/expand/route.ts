// app/api/expand/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import Together from "together-ai";
import { authOptions } from "@/lib/auth/auth";

export async function POST(request: Request) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { sceneDescription, expansionType, conversationContext } = body;

    if (!sceneDescription) {
      return NextResponse.json(
        { error: "Missing required field: sceneDescription" },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.TOGETHER_API_KEY) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Construct the prompt
    const contextText = conversationContext ? `Context:\n${conversationContext}\n\n` : "";
    const expansionFocus = expansionType ? `Focus on: ${expansionType}\n` : "";
    const prompt = `${contextText}Expand this scene with additional details, dialogue, and transitions.\n${expansionFocus}Scene description: ${sceneDescription}`;

    // Initialize Together client
    const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

    // Create streaming response
    const stream = await together.chat.completions.create({
      model: "meta-llama/Llama-3.1-8B-Instruct-Turbo",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000
    });

    // Create ReadableStream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            controller.enqueue(encoder.encode(content));
          }
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: { 
        "Content-Type": "text/plain",
        "X-Content-Type-Options": "nosniff" 
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}