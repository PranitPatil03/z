export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function badRequest(message: string, details?: unknown) {
  return new AppError(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "Unauthorized") {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden") {
  return new AppError(403, "FORBIDDEN", message);
}

export function notFound(message = "Not found") {
  return new AppError(404, "NOT_FOUND", message);
}
