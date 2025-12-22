import { requestData, requestDataWithInit } from "./_shared";

export type AiProvider = "openai" | "anthropic" | "gemini" | "azure-openai";

export interface AiGenerateInput {
  provider?: AiProvider;
  model: string;
  prompt: string;
  mode?: "sync" | "async";
  context?: Record<string, unknown>;
}

export interface AiUsage {
  units: number;
  aiCreditsIncluded: number;
  aiCreditsUsed: number;
}

export interface AiGenerateSyncResult {
  mode: "sync";
  provider: string;
  model: string;
  output: string;
  usage?: AiUsage;
}

export interface AiGenerateAsyncResult {
  mode: "async";
  jobId: string;
  usage?: AiUsage;
}

export interface AiJobStatus {
  jobId: string;
  state: string;
  result: unknown;
  failedReason: string | null;
}

export const aiApi = {
  generate: (body: AiGenerateInput) =>
    requestDataWithInit<AiGenerateSyncResult | AiGenerateAsyncResult>(
      "/ai/generate",
      {
        method: "POST",
        body,
      },
    ),

  getJobStatus: (jobId: string) =>
    requestData<AiJobStatus>(`/ai/jobs/${jobId}`),
};
