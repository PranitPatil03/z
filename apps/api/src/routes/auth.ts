import { toNodeHandler } from "better-auth/node";
import { Router } from "express";
import { auth } from "../auth";

const authHandler = toNodeHandler(auth);

export const authRouter: import("express").Router = Router();

authRouter.use((req, res) => {
  // better-call (underlying Better Auth) already reconstructs the full path
  // using req.baseUrl + req.url, which Express sets correctly when using
  // app.use("/auth", router). No manual URL manipulation needed.
  authHandler(req, res);
});
