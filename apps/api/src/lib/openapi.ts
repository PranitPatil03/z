import type { Router } from "express";
import type { OpenAPIV3 } from "openapi-types";
import { type ZodTypeAny, toJSONSchema } from "zod";
import type { ValidationAwareMiddleware } from "./validate";

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

type ExpressRouteLayer = {
  route?: {
    path?: string | string[];
    methods?: Record<string, boolean>;
    stack?: Array<{
      name?: string;
      handle?: ValidationAwareMiddleware & {
        __wrappedHandlerName?: string;
      };
    }>;
  };
  name?: string;
  handle?: {
    name?: string;
    __wrappedHandlerName?: string;
  };
};

export interface ApiRouterMount {
  path: string;
  router: Router;
  tag: string;
  description?: string;
}

export interface OpenApiBuildOptions {
  title: string;
  version: string;
  description?: string;
  mounts: ApiRouterMount[];
}

function normalizePath(path: string) {
  if (!path) {
    return "/";
  }

  let value = path.trim();
  if (!value.startsWith("/")) {
    value = `/${value}`;
  }

  value = value.replace(/\/+/g, "/");
  if (value.length > 1 && value.endsWith("/")) {
    value = value.slice(0, -1);
  }

  return value;
}

function joinPaths(basePath: string, routePath: string) {
  const normalizedBase = normalizePath(basePath);

  if (routePath === "/" || routePath.length === 0) {
    return normalizedBase;
  }

  const childPath = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return normalizePath(`${normalizedBase}${childPath}`);
}

function toOpenApiPath(path: string) {
  return normalizePath(path).replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function toOperationId(method: string, openApiPath: string) {
  const cleaned = openApiPath
    .replace(/^\//, "")
    .replace(/\{([^}]+)\}/g, "by-$1")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = cleaned
    .split("-")
    .filter(Boolean)
    .map((segment, index) => {
      if (index === 0) {
        return segment.toLowerCase();
      }
      return `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`;
    })
    .join("");

  return suffix.length > 0
    ? `${method.toLowerCase()}${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`
    : method;
}

function toHandlerName(layer: {
  name?: string;
  handle?: {
    name?: string;
    __wrappedHandlerName?: string;
  };
}) {
  if (
    typeof layer.handle?.__wrappedHandlerName === "string" &&
    layer.handle.__wrappedHandlerName.length > 0
  ) {
    return layer.handle.__wrappedHandlerName;
  }

  if (typeof layer.handle?.name === "string" && layer.handle.name.length > 0) {
    return layer.handle.name;
  }

  if (typeof layer.name === "string" && layer.name.length > 0) {
    return layer.name;
  }

  return "anonymous";
}

function normalizeSchema(value: unknown): OpenAPIV3.SchemaObject {
  if (typeof value === "boolean") {
    return value ? {} : { not: {} };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { type: "object", additionalProperties: true };
  }

  const schema = { ...(value as Record<string, unknown>) };
  schema.$schema = undefined;

  return schema as OpenAPIV3.SchemaObject;
}

function zodToOpenApiSchema(schema: ZodTypeAny): OpenAPIV3.SchemaObject {
  try {
    return normalizeSchema(toJSONSchema(schema));
  } catch {
    return {
      type: "object",
      additionalProperties: true,
    };
  }
}

function extractObjectProperties(schema: ZodTypeAny) {
  const schemaObject = zodToOpenApiSchema(schema);

  if (!schemaObject.properties || typeof schemaObject.properties !== "object") {
    return null;
  }

  const required = new Set(
    Array.isArray(schemaObject.required)
      ? schemaObject.required.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  );

  const properties: Record<string, OpenAPIV3.SchemaObject> = {};
  for (const [key, propertySchema] of Object.entries(schemaObject.properties)) {
    properties[key] = normalizeSchema(propertySchema);
  }

  return {
    properties,
    required,
  };
}

function buildParameters(
  location: "params" | "query",
  schema: ZodTypeAny,
): OpenAPIV3.ParameterObject[] {
  const objectSchema = extractObjectProperties(schema);
  if (!objectSchema) {
    return [];
  }

  return Object.entries(objectSchema.properties).map(
    ([name, propertySchema]) => {
      const required =
        location === "params" ? true : objectSchema.required.has(name);

      return {
        name,
        in: location === "params" ? "path" : "query",
        required,
        schema: propertySchema,
      } satisfies OpenAPIV3.ParameterObject;
    },
  );
}

function resolveSecurity(
  middlewareNames: string[],
): OpenAPIV3.SecurityRequirementObject[] | undefined {
  const normalizedNames = middlewareNames.map((name) => name.toLowerCase());

  if (normalizedNames.includes("requireportalauth")) {
    return [{ portalBearerAuth: [] }];
  }

  if (
    normalizedNames.includes("requireauth") ||
    normalizedNames.includes("requireorgrole") ||
    normalizedNames.includes("orgroleguard")
  ) {
    return [{ bearerAuth: [] }];
  }

  return undefined;
}

function buildResponses(method: HttpMethod): OpenAPIV3.ResponsesObject {
  const successResponse: OpenAPIV3.ResponseObject = {
    description: "Successful response",
    content: {
      "application/json": {
        schema: {
          type: "object",
          additionalProperties: true,
        },
      },
    },
  };

  const responses: OpenAPIV3.ResponsesObject = {
    "200": successResponse,
    "400": {
      description: "Validation or bad request error",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
        },
      },
    },
    "401": {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
        },
      },
    },
    "403": {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
        },
      },
    },
    "404": {
      description: "Not found",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
        },
      },
    },
    "500": {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
        },
      },
    },
  };

  if (method === "post") {
    responses["201"] = successResponse;
  }

  return responses;
}

function addAuthPassthroughPath(paths: OpenAPIV3.PathsObject) {
  const openApiPath = "/auth/{authPath}";
  const pathItem: OpenAPIV3.PathItemObject = {
    parameters: [
      {
        name: "authPath",
        in: "path",
        required: true,
        schema: {
          type: "string",
        },
        description: "Better Auth dynamic route segment",
      },
    ],
    get: {
      tags: ["Auth"],
      operationId: "getAuthDynamic",
      summary: "Better Auth dynamic GET endpoint",
      description:
        "Proxy endpoint managed by Better Auth. See Better Auth docs for concrete route contracts.",
      responses: buildResponses("get"),
    },
    post: {
      tags: ["Auth"],
      operationId: "postAuthDynamic",
      summary: "Better Auth dynamic POST endpoint",
      description:
        "Proxy endpoint managed by Better Auth. See Better Auth docs for concrete route contracts.",
      responses: buildResponses("post"),
    },
  };

  paths[openApiPath] = pathItem;
}

function routePathArray(path: string | string[] | undefined) {
  if (!path) {
    return [];
  }

  return Array.isArray(path) ? path : [path];
}

export function buildOpenApiDocument(
  options: OpenApiBuildOptions,
): OpenAPIV3.Document {
  const paths: OpenAPIV3.PathsObject = {};

  for (const mount of options.mounts) {
    const stack = ((mount.router as unknown as { stack?: ExpressRouteLayer[] })
      .stack ?? []) as ExpressRouteLayer[];
    const activeMiddlewareNames: string[] = [];
    let operationsRegisteredForMount = 0;

    for (const layer of stack) {
      if (!layer.route) {
        activeMiddlewareNames.push(toHandlerName(layer));
        continue;
      }

      const methods = Object.entries(layer.route.methods ?? {})
        .filter(([, enabled]) => enabled)
        .map(([method]) => method.toLowerCase())
        .filter((method): method is HttpMethod =>
          (HTTP_METHODS as readonly string[]).includes(method),
        );

      if (methods.length === 0) {
        continue;
      }

      const routeMiddleware = layer.route.stack ?? [];
      const operationMiddlewareNames = [
        ...activeMiddlewareNames,
        ...routeMiddleware.map((middlewareLayer) =>
          toHandlerName(middlewareLayer),
        ),
      ];

      const bodyValidation = routeMiddleware
        .map((middlewareLayer) => middlewareLayer.handle?.__validation)
        .find((metadata) => metadata?.location === "body");

      const queryValidation = routeMiddleware
        .map((middlewareLayer) => middlewareLayer.handle?.__validation)
        .find((metadata) => metadata?.location === "query");

      const paramsValidation = routeMiddleware
        .map((middlewareLayer) => middlewareLayer.handle?.__validation)
        .find((metadata) => metadata?.location === "params");

      for (const routePath of routePathArray(layer.route.path)) {
        const fullPath = toOpenApiPath(joinPaths(mount.path, routePath));
        let pathItem = paths[fullPath];
        if (!pathItem || "$ref" in pathItem) {
          pathItem = {};
          paths[fullPath] = pathItem;
        }
        operationsRegisteredForMount += methods.length;

        for (const method of methods) {
          const parameters: OpenAPIV3.ParameterObject[] = [];

          if (paramsValidation?.schema) {
            parameters.push(
              ...buildParameters("params", paramsValidation.schema),
            );
          }

          if (queryValidation?.schema) {
            parameters.push(
              ...buildParameters("query", queryValidation.schema),
            );
          }

          const security = resolveSecurity(operationMiddlewareNames);

          const operation: OpenAPIV3.OperationObject = {
            tags: [mount.tag],
            operationId: toOperationId(method, fullPath),
            summary: `${method.toUpperCase()} ${fullPath}`,
            responses: buildResponses(method),
          };

          if (mount.description) {
            operation.description = mount.description;
          }

          if (parameters.length > 0) {
            operation.parameters = parameters;
          }

          if (bodyValidation?.schema) {
            operation.requestBody = {
              required: true,
              content: {
                "application/json": {
                  schema: zodToOpenApiSchema(bodyValidation.schema),
                },
              },
            };
          }

          if (security) {
            operation.security = security;
          }

          (pathItem as Record<string, OpenAPIV3.OperationObject>)[method] =
            operation;
        }
      }
    }

    if (operationsRegisteredForMount === 0 && mount.path === "/auth") {
      addAuthPassthroughPath(paths);
    }
  }

  paths["/"] = {
    get: {
      tags: ["System"],
      operationId: "getRootStatus",
      summary: "API service status",
      responses: {
        "200": {
          description: "Service status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  status: { type: "string" },
                },
                required: ["name", "status"],
              },
            },
          },
        },
      },
    },
  };

  return {
    openapi: "3.0.3",
    info: {
      title: options.title,
      version: options.version,
      description:
        options.description ??
        "Autogenerated from Express routes and Zod validators. Use this contract for frontend integration.",
    },
    servers: [
      {
        url: "/",
      },
    ],
    tags: Array.from(new Set(options.mounts.map((mount) => mount.tag))).map(
      (name) => ({ name }),
    ),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        portalBearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: {
                  nullable: true,
                },
              },
              required: ["code", "message"],
            },
          },
          required: ["error"],
        },
      },
    },
  };
}

export function renderOpenApiHtml(specUrl: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Foreman API Docs</title>
    <style>
      body {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <redoc spec-url="${specUrl}"></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@2.2.0/bundles/redoc.standalone.js"></script>
  </body>
</html>`;
}
