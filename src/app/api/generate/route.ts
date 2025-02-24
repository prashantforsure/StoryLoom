// app/api/generate/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import Together from "together-ai";
import { authOptions } from "@/lib/auth/auth";

export async function POST(request: Request) {
  // Verify the user's session
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  const body = await request.json();
  const { tone, style, templateId, outline, conversationContext } = body;

  // Validate required fields
  if (!tone || !style || !outline) {
    return NextResponse.json(
      { error: "Missing required fields: tone, style, or outline" },
      { status: 400 }
    );
  }

  // Build optional instructions based on template and previous context
  const templateInstruction = templateId ? `Use the template with ID ${templateId}. ` : "";
  const contextText = conversationContext ? `Previous context: ${conversationContext}\n` : "";
  const prompt = `${contextText}Generate a script section with a tone of "${tone}" and a style of "${style}". ${templateInstruction}Based on the following outline: ${outline}.`;

  // Instantiate Together AI client
  const together = new Together();

  try {
    // Request a streaming chat completion from Together AI
    const stream = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    // Create a ReadableStream to stream data to the client
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Stream each chunk from Together AI
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            controller.enqueue(encoder.encode(content));
          }
        } catch (error) {
          console.error("Error during streaming:", error);
          controller.error(error);
        }
        controller.close();
      },
    });

    // Return the streaming response with plain text content type
    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Error in /api/generate:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
