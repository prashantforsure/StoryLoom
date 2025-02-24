// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth/next";
// import Together from "together-ai";
// import { authOptions } from "@/lib/auth/auth";

// // Maximum allowed input lengths
// const MAX_INPUT_LIMITS = {
//   TITLE: 100,
//   OUTLINE: 2000,
//   CONTEXT: 4000,
// };

// export async function POST(request: Request) {
//   const session = await getServerSession(authOptions);
//   if (!session?.user?.id) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   try {
//     const body = await request.json();
//     const { tone, style, templateId, outline, conversationContext, title } = body;

//     // Enhanced validation with input sanitization
//     const validationErrors: string[] = [];
//     if (!tone) validationErrors.push("tone");
//     if (!style) validationErrors.push("style");
//     if (!outline) validationErrors.push("outline");
//     if (validationErrors.length > 0) {
//       return NextResponse.json(
//         { error: `Missing required fields: ${validationErrors.join(", ")}` },
//         { status: 400 }
//       );
//     }

//     // Input length validation
//     if (title && title.length > MAX_INPUT_LIMITS.TITLE) {
//       validationErrors.push("Title exceeds maximum length");
//     }
//     if (outline.length > MAX_INPUT_LIMITS.OUTLINE) {
//       validationErrors.push("Outline exceeds maximum length");
//     }
//     if (conversationContext && conversationContext.length > MAX_INPUT_LIMITS.CONTEXT) {
//       validationErrors.push("Context exceeds maximum length");
//     }
//     if (validationErrors.length > 0) {
//       return NextResponse.json(
//         { error: `Validation failed: ${validationErrors.join(", ")}` },
//         { status: 400 }
//       );
//     }

//     // Structured prompt engineering with explicit Markdown instructions
//     const templateInstruction = templateId
//       ? `
// **Template Requirements:**
// - Follow the ${templateId} structure.
// - Use clear section headers and consistent formatting.
// `
//       : "";

//     const contextText = conversationContext
//       ? `
// **Previous Context:**
// ${conversationContext.slice(0, MAX_INPUT_LIMITS.CONTEXT)}
// `
//       : "";

//     const titleText = title
//       ? `**Title:** ${title}\n`
//       : "**Title:** Untitled Script\n";

//     const prompt = `
// Imagine you are an award-winning scriptwriter known for crafting engaging, visually rich screenplays. Your output must be in **Markdown** format with clear hierarchy.

// ${contextText}
// ${titleText}

// **Instructions:**
// - Write a script section in a **${tone.toLowerCase()}** tone and **${style.toLowerCase()}** style.
// - Follow the formatting and style guidelines provided${templateId ? " in the template." : "."}
// - Use **##** for main headings, **###** for subheadings.
// - Include bullet points, numbered lists, and clear section breaks where appropriate.
// - Format dialogues, scene descriptions, and transitions with proper Markdown syntax.
  
// **Outline:**
// ${outline.slice(0, MAX_INPUT_LIMITS.OUTLINE)}

// Return your output as well-formatted Markdown.
//     `.trim();

//     // Validate API configuration
//     if (!process.env.TOGETHER_AI_API_KEY) {
//       console.error("Missing Together API key");
//       return NextResponse.json(
//         { error: "Server configuration error" },
//         { status: 500 }
//       );
//     }

//     const together = new Together({ apiKey: process.env.TOGETHER_AI_API_KEY });

//     // Request streaming response from Together AI with optimized parameters
//     const stream = await together.chat.completions.create({
//       model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are a professional scriptwriter specialized in producing well-structured, visually engaging screenplays in Markdown format.",
//         },
//         { role: "user", content: prompt },
//       ],
//       stream: true,
//       temperature: 0.7,
//       max_tokens: 2000,
//     });

//     const encoder = new TextEncoder();
//     const readableStream = new ReadableStream({
//       async start(controller) {
//         try {
//           for await (const chunk of stream) {
//             const content = chunk.choices[0]?.delta?.content || "";
//             controller.enqueue(encoder.encode(content));
//           }
//         } catch (error) {
//           console.error("Streaming error:", error);
//           controller.error(error);
//         }
//         controller.close();
//       },
//     });

//     return new Response(readableStream, {
//       headers: {
//         "Content-Type": "text/markdown; charset=utf-8",
//         "X-Content-Type-Options": "nosniff",
//       },
//     });
//   } catch (error) {
//     console.error("API Error:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }


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
    const { tone, style, templateId, outline, conversationContext, title } = body;

    // Enhanced validation
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

    // Optimized prompt construction for professional scriptwriting
    const templateInstruction = templateId ? `Follow the formatting and style guidelines of the ${templateId} template. ` : "";
    const contextText = conversationContext ? `Previous Conversation Context:\n${conversationContext}\n\n` : "";
    const titleText = title ? `Title: ${title}\n\n` : "Title: Untitled Script\n\n";
    const prompt = `
Imagine you are an award-winning scriptwriter known for creating engaging and visually rich screenplays. 
${contextText}
${titleText}
Write a script section in a ${tone.toLowerCase()} tone and ${style.toLowerCase()} style. ${templateInstruction}
Use the following outline as your guide to craft an immersive narrative that includes:
- Clear scene headings,
- Detailed scene descriptions,
- Vivid character dialogues with proper formatting,
- Creative transitions and pacing that capture the audience’s attention.
Outline:
${outline}

Ensure that the final output adheres to professional screenplay formatting.
    `.trim();

    const together = new Together({ apiKey: process.env.TOGETHER_AI_API_KEY });

    const stream = await together.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000
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
        "Content-Type": "text/plain",
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
