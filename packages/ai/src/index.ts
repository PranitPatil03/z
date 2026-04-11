export type LlmProviderName =
  | "openai"
  | "anthropic"
  | "gemini"
  | "azure-openai";

export interface AiRequest {
  provider?: LlmProviderName;
  model: string;
  prompt: string;
  context?: Record<string, unknown>;
}

export interface AiResponse {
  provider: LlmProviderName;
  model: string;
  output: string;
}

export interface AiProviderCredentials {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  azureOpenAiApiKey?: string;
  azureOpenAiEndpoint?: string;
}

export interface EstimateBriefInput {
  projectName: string;
  scope: string;
  budgetCents?: number;
  constraints: string[];
}

const providerStyles: Record<LlmProviderName, string> = {
  openai: "concise and structured",
  anthropic: "detailed with risk framing",
  gemini: "checklist-oriented",
  "azure-openai": "enterprise-compliance aware",
};

export function listSupportedProviders(): LlmProviderName[] {
  return ["openai", "anthropic", "gemini", "azure-openai"];
}

export function buildEstimateBrief(input: EstimateBriefInput) {
  const budget = input.budgetCents
    ? `$${(input.budgetCents / 100).toFixed(2)}`
    : "not provided";
  const constraints =
    input.constraints.length > 0 ? input.constraints.join(", ") : "none";

  return [
    `Project: ${input.projectName}`,
    `Scope: ${input.scope}`,
    `Budget: ${budget}`,
    `Constraints: ${constraints}`,
    "Output format:",
    "1. scope summary",
    "2. budget split",
    "3. risks",
    "4. assumptions",
  ].join("\n");
}

export function routeAiRequest(request: AiRequest): AiResponse {
  const provider = request.provider ?? "openai";
  const style = providerStyles[provider];
  const contextKeys = request.context ? Object.keys(request.context) : [];
  const contextLine =
    contextKeys.length > 0
      ? `Context keys: ${contextKeys.join(", ")}.`
      : "No context provided.";
  const output = [
    `Provider style: ${style}.`,
    contextLine,
    `Response to prompt: ${request.prompt}`,
  ].join(" ");

  return {
    provider,
    model: request.model,
    output,
  };
}

async function parseOpenAiResponse(response: Response) {
  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content as string | undefined;
}

async function parseAnthropicResponse(response: Response) {
  const payload = await response.json();
  const textNode = Array.isArray(payload?.content)
    ? payload.content.find(
        (item: { type?: string; text?: string }) => item?.type === "text",
      )
    : null;
  return textNode?.text as string | undefined;
}

async function parseGeminiResponse(response: Response) {
  const payload = await response.json();
  return payload?.candidates?.[0]?.content?.parts?.[0]?.text as
    | string
    | undefined;
}

export async function generateAiCompletion(
  request: AiRequest,
  credentials: AiProviderCredentials,
): Promise<AiResponse> {
  const provider = request.provider ?? "openai";
  const fallback = routeAiRequest(request);

  if (provider === "openai" && credentials.openaiApiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: "user", content: request.prompt }],
      }),
    });

    if (response.ok) {
      const output = await parseOpenAiResponse(response);
      if (output) {
        return { provider, model: request.model, output };
      }
    }

    return fallback;
  }

  if (provider === "anthropic" && credentials.anthropicApiKey) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": credentials.anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: request.prompt }],
      }),
    });

    if (response.ok) {
      const output = await parseAnthropicResponse(response);
      if (output) {
        return { provider, model: request.model, output };
      }
    }

    return fallback;
  }

  if (provider === "gemini" && credentials.geminiApiKey) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent?key=${encodeURIComponent(credentials.geminiApiKey)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: request.prompt }] }],
      }),
    });

    if (response.ok) {
      const output = await parseGeminiResponse(response);
      if (output) {
        return { provider, model: request.model, output };
      }
    }

    return fallback;
  }

  if (
    provider === "azure-openai" &&
    credentials.azureOpenAiApiKey &&
    credentials.azureOpenAiEndpoint
  ) {
    const endpoint = `${credentials.azureOpenAiEndpoint.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(request.model)}/chat/completions?api-version=2024-10-21`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "api-key": credentials.azureOpenAiApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: request.prompt }],
      }),
    });

    if (response.ok) {
      const output = await parseOpenAiResponse(response);
      if (output) {
        return { provider, model: request.model, output };
      }
    }

    return fallback;
  }

  return fallback;
}
