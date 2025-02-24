// lib/ai.ts

export interface TogetherAIResponse {
  generated_text: string;
  // include any other properties returned by the API if needed
}

export async function generateText(prompt: string): Promise<string> {
  const endpoint = process.env.TOGETHER_API_ENDPOINT;
  const apiKey = process.env.TOGETHER_API_KEY;

  if (!endpoint || !apiKey) {
    throw new Error("Together AI API endpoint or key is not set in environment variables.");
  }

  // Prepare the request payload
  const payload = {
    prompt, // prompt to send to the model
    // You can add additional parameters here if Together AI supports them
    max_tokens: 300, // example parameter, adjust as needed
    temperature: 0.7,
  };

  // Make the API call
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Together AI API error: ${errorText}`);
  }

  const data = (await response.json()) as TogetherAIResponse;

  // Return the generated text from the response
  return data.generated_text;
}
