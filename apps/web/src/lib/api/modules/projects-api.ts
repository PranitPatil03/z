import { requestData, requestDataWithInit, toQueryString } from "./_shared";

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  status: "active" | "completed" | "archived";
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateProjectInput {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    count: number;
  };
}

export interface ProjectMember {
  id: string;
  organizationId: string;
  projectId: string;
  userId: string;
  role: "pm" | "field_supervisor" | "viewer";
  departmentIds: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export const projectsApi = {
  list: (params?: { cursor?: string; limit?: number }) => {
    const qs = toQueryString(params);
    return requestData<Project[]>(`/projects${qs}`);
  },

  get: (id: string) => requestData<Project>(`/projects/${id}`),

  create: (body: CreateProjectInput) =>
    requestDataWithInit<Project>("/projects", { method: "POST", body }),

  update: (id: string, body: UpdateProjectInput) =>
    requestDataWithInit<Project>(`/projects/${id}`, { method: "PATCH", body }),

  archive: (id: string) =>
    requestDataWithInit<Project>(`/projects/${id}`, { method: "DELETE" }),

  listMembers: (projectId: string) =>
    requestData<ProjectMember[]>(`/projects/${projectId}/members`),

  addMember: (
    projectId: string,
    body: {
      userId: string;
      role: ProjectMember["role"];
      departmentIds?: string[];
    },
  ) =>
    requestDataWithInit<ProjectMember>(`/projects/${projectId}/members`, {
      method: "POST",
      body: {
        ...body,
        departmentIds: body.departmentIds ?? [],
      },
    }),

  updateMember: (
    projectId: string,
    userId: string,
    body: {
      role?: ProjectMember["role"];
      departmentIds?: string[];
    },
  ) =>
    requestDataWithInit<ProjectMember>(
      `/projects/${projectId}/members/${userId}`,
      {
        method: "PATCH",
        body,
      },
    ),

  removeMember: (projectId: string, userId: string) =>
    requestDataWithInit<ProjectMember>(
      `/projects/${projectId}/members/${userId}`,
      {
        method: "DELETE",
      },
    ),
};
