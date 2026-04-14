export const DEFAULT_MODEL = "gpt-4o"; // OpenAI model

export async function chatCompletion(
  messages: any[],
  model: string = DEFAULT_MODEL,
  options: any = {},
): Promise<any> {
  const requestBody: any = {
    model: model,
    messages: messages,
    temperature: options.temperature,
    top_p: options.top_p,
    stream: options.stream,
  };

  const maxTokens = options.max_tokens || options.config?.maxOutputTokens;
  if (maxTokens) {
    requestBody.max_tokens = maxTokens;
  }

  if (options.response_format) {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch(
    "/api/ai/chat",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData?.error?.message || response.statusText || "Unknown error";
    throw new Error(
      `OpenAI API error: ${response.status} - ${errorMessage}`,
    );
  }

  if (options.stream) {
    return (async function* () {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) return;

      let buffer = "";
      while (true) {
        try {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                yield data;
              } catch (e) {
                console.error("Error parsing stream chunk", e);
              }
            }
          }
        } catch (e) {
          console.error("Error reading stream chunk", e);
          break;
        }
      }
    })();
  } else {
    return await response.json();
  }
}
