import { toNodeHandler } from "better-auth/node";
import { Router } from "express";
import { auth } from "../auth";

const authHandler = toNodeHandler(auth);

export const authRouter: import("express").Router = Router();

authRouter.use(async (req, res) => {
  await authHandler(req, res);
});

