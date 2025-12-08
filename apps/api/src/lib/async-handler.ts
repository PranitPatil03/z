import type { NextFunction, Request, Response } from "express";

export type AsyncRouteHandler = (request: Request, response: Response, next: NextFunction) => Promise<void>;

type WrappedAsyncRouteHandler = ((request: Request, response: Response, next: NextFunction) => void) & {
  __wrappedHandlerName?: string;
};

export function asyncHandler(handler: AsyncRouteHandler) {
  const wrapped: WrappedAsyncRouteHandler = (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };

  wrapped.__wrappedHandlerName = handler.name;

  return wrapped;
}
