// app/api/expand/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
 // adjust import path as needed

export async function POST(request: Request) {
  // Check user session
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sceneDescription, expansionType, conversationContext } = body;

  if (!sceneDescription) {
    return NextResponse.json(
      { error: "Missing scene description" },
      { status: 400 }
    );
  }

  const contextText = conversationContext
    ? `Previous context: ${conversationContext}\n`
    : "";

  const expansionInstruction = expansionType
    ? `Expand the scene focusing on ${expansionType}.`
    : "Expand the scene with additional dialogue, transitions, and descriptive details.";

  const prompt = `${contextText}${expansionInstruction} Here is the scene description: ${sceneDescription}`;

  try {
    // Check if environment variables are defined
    if (!process.env.AI_API_ENDPOINT || !process.env.AI_API_KEY) {
      console.error("Missing AI API configuration");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const aiResponse = await fetch(process.env.AI_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", errorText);
      throw new Error(`AI API Error: ${errorText}`);
    }

    const data = await aiResponse.json();
    
    // Check if the response has the expected structure
    if (!data.generatedText) {
      throw new Error("Invalid response format from AI API");
    }

    return NextResponse.json({ expandedText: data.generatedText });
  } catch (error) {
    console.error("Error in /api/expand:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
