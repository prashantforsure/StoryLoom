import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import Together from "together-ai";
import { authOptions } from "@/lib/auth/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      tone, 
      style, 
      templateId, 
      outline, 
      conversationContext, 
      title,
      // Optional additional briefing fields:
      targetAudience,
      distributionPlatform,
      genre,
      stylisticReferences,
      logline,
      plotOutline,
      theme,
      overallTone,
      // You can add more as needed…
    } = body;

    // Enhanced validation: Require tone, style, and outline.
    const missingFields: string[] = [];
    if (!tone) missingFields.push("tone");
    if (!style) missingFields.push("style");
    if (!outline) missingFields.push("outline");
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Build extended context strings if available
    const contextText = conversationContext
      ? `Previous Conversation Context:\n${conversationContext}\n\n`
      : "";
    const titleText = title ? `Title: ${title}\n\n` : "Title: Untitled Script\n\n";
    const targetAudienceText = targetAudience ? `Target Audience: ${targetAudience}\n` : "";
    const distributionText = distributionPlatform ? `Distribution Platform: ${distributionPlatform}\n` : "";
    const genreText = genre ? `Genre: ${genre}\n` : "";
    const stylisticText = stylisticReferences && stylisticReferences.length > 0
      ? `Stylistic References: ${stylisticReferences.join(", ")}\n`
      : "";
    const loglineText = logline ? `Logline: ${logline}\n` : "";
    const plotOutlineText = plotOutline ? `Plot Outline: ${plotOutline}\n` : "";
    const themeText = theme ? `Theme: ${theme}\n` : "";
    const overallToneText = overallTone ? `Overall Tone: ${overallTone}\n` : "";

    // Template instructions if provided
    const templateInstruction = templateId
      ? `Follow the formatting and style guidelines of the ${templateId} template.\n`
      : "";

    // Construct the comprehensive prompt
    const prompt = `
Imagine you are a world-class, award-winning scriptwriter known for crafting engaging, visually rich screenplays for film, television, and digital media. You have been given the following detailed project briefing:

${titleText}
${overallToneText}${targetAudienceText}${distributionText}${genreText}${stylisticText}${loglineText}${plotOutlineText}${themeText}

**Project Overview & Objectives:**
- Purpose & Goal: Create an immersive narrative that captivates the audience.
- Target Audience: ${targetAudience || "Not specified"}
- Distribution & Platform: ${distributionPlatform || "Not specified"}

**Genre & Style:**
- Genre: ${genre || "Not specified"}
- Script Format: ${templateId ? `${templateId} template` : "Standard Screenplay Format"}
- Stylistic References: ${(stylisticReferences && stylisticReferences.join(", ")) || "Not specified"}

**Story Elements & Structure:**
- Logline & Premise: ${logline || "Not specified"}
- Plot Outline & Structure: ${plotOutline || "Not specified"}
- Theme & Message: ${theme || "Not specified"}
- Use clear scene headings, detailed descriptions, and dynamic dialogue to convey the narrative.

**Characters & Dialogue:**
- Develop vivid, realistic characters and write engaging dialogue that reflects the desired tone and style.

**Technical & Formatting Requirements:**
- Use professional screenplay formatting in Markdown.
- Ensure the final output includes clear section headers, bullet lists for key points, and proper transitions.

Use the following outline as your guide:
${outline}

Return your output as a well-formatted Markdown text following the guidelines above.
    `.trim();

    const together = new Together({ apiKey: process.env.TOGETHER_AI_API_KEY });

    const stream = await together.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
      // Optionally: add stop sequences if needed, e.g. stop: ["## References", "## Appendix"]
    });

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
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: { 
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Content-Type-Options": "nosniff" 
      },
    });
    
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

