import { requestData, requestDataWithInit } from "./_shared";

export type IntegrationStatus = "connected" | "disconnected" | "error";

export interface Integration {
  id: string;
  organizationId: string;
  provider: string;
  name: string;
  status: IntegrationStatus;
  config?: Record<string, unknown> | null;
  lastSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationInput {
  provider: string;
  name: string;
  config?: Record<string, unknown>;
}

export interface UpdateIntegrationInput {
  provider?: string;
  name?: string;
  status?: IntegrationStatus;
  config?: Record<string, unknown>;
  lastSyncAt?: string;
}

export const integrationsApi = {
  list: () => requestData<Integration[]>("/integrations"),

  create: (body: CreateIntegrationInput) =>
    requestDataWithInit<Integration>("/integrations", {
      method: "POST",
      body,
    }),

  get: (integrationId: string) =>
    requestData<Integration>(`/integrations/${integrationId}`),

  update: (integrationId: string, body: UpdateIntegrationInput) =>
    requestDataWithInit<Integration>(`/integrations/${integrationId}`, {
      method: "PATCH",
      body,
    }),

  disconnect: (integrationId: string) =>
    requestDataWithInit<Integration>(
      `/integrations/${integrationId}/disconnect`,
      {
        method: "POST",
      },
    ),
};
