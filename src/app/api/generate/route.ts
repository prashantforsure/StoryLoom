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
      scriptFormat, // Added support for scriptFormat
      templateId, 
      outline, 
      conversationContext, 
      title,
      targetAudience,
      distributionPlatform,
      genre,
      stylisticReferences,
      logline,
      plotOutline,
      theme,
      overallTone,
    } = body;

    // Define styleOrFormat to handle both field names
    const styleOrFormat = style || scriptFormat || "Not specified";

    // Enhanced validation: Require tone, style/scriptFormat, and outline.
    const missingFields: string[] = [];
    if (!tone) missingFields.push("tone");
    if (!(style || scriptFormat)) missingFields.push("style/scriptFormat"); // Accept either field
    if (!outline) missingFields.push("outline");
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Build extended context strings if available, with fallbacks.
    const contextText = conversationContext
      ? `Previous Conversation Context:\n${conversationContext}\n\n`
      : "";
    const titleText = title ? `Title: ${title}\n\n` : "Title: Untitled Script\n\n";
    const targetAudienceText = targetAudience ? `Target Audience: ${targetAudience}\n` : "Target Audience: Not specified\n";
    const distributionText = distributionPlatform ? `Distribution Platform: ${distributionPlatform}\n` : "Distribution Platform: Not specified\n";
    const genreText = genre ? `Genre: ${genre}\n` : "Genre: Not specified\n";
    // Ensure stylisticReferences is a string (join if it's an array)
    const stylisticText = stylisticReferences
      ? (Array.isArray(stylisticReferences)
          ? `Stylistic References: ${stylisticReferences.join(", ")}\n`
          : `Stylistic References: ${stylisticReferences}\n`)
      : "Stylistic References: Not specified\n";
    const loglineText = logline ? `Logline: ${logline}\n` : "Logline: Not specified\n";
    const plotOutlineText = plotOutline ? `Plot Outline: ${plotOutline}\n` : "Plot Outline: Not specified\n";
    const themeText = theme ? `Theme: ${theme}\n` : "Theme: Not specified\n";
    const overallToneText = overallTone ? `Overall Tone: ${overallTone}\n` : "";
    
    // Template instructions if provided
    const templateInstruction = templateId
      ? `Follow the formatting and style guidelines of the ${templateId} template.\n`
      : "";

    // Construct the comprehensive prompt
   // Construct the comprehensive prompt
const prompt = `
You are a professional scriptwriter tasked with creating a clean, well-formatted script. Your output should ONLY contain the script itself with no explanations, notes, or additional commentary.

${titleText}
${overallToneText}${targetAudienceText}${distributionText}${genreText}${stylisticText}${loglineText}${plotOutlineText}${themeText}

Follow these specific formatting rules:
1. Use standard screenplay format with clear scene headings (INT./EXT. LOCATION - TIME)
2. Format character names in ALL CAPS before their dialogue
3. Make narrator or voice-over lines **bold** using markdown syntax
4. Keep action/description paragraphs concise and visual
5. Use proper screenplay transitions (CUT TO:, FADE TO:, etc.) sparingly
6. Indent dialogue properly
7. Include only essential parentheticals for acting direction

The script should be in ${styleOrFormat} format.

Based on this outline:
${outline}

IMPORTANT: Your response should ONLY contain the properly formatted script. Do not include any explanations, introductions, or notes about the script.
`.trim();

    console.log("Prompt sent to Together AI:", prompt);

    const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });
    const stream = await together.chat.completions.create({
      model: "deepseek-ai/DeepSeek-R1",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      temperature: 0.7,
      max_tokens: 30000,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let hasData = false;
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) hasData = true;
            controller.enqueue(encoder.encode(content));
          }
          if (!hasData) {
            controller.enqueue(encoder.encode("\n*No content generated.*"));
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}