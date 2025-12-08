import { Router } from "express";
import {
  portalRegisterController,
  portalLoginController,
  portalGetComplianceController,
  portalUpdateComplianceController,
  portalGetProfileController,
} from "../controllers/portal";
import { asyncHandler } from "../lib/async-handler";
import { validateBody } from "../lib/validate";
import { requirePortalAuth } from "../middleware/require-portal-auth";
import {
  portalRegisterSchema,
  portalLoginSchema,
  portalComplianceUploadSchema,
} from "../schemas/portal.schema";

export const portalRouter = Router();

// Public routes - no auth required
portalRouter.post("/register", validateBody(portalRegisterSchema), asyncHandler(portalRegisterController));
portalRouter.post("/login", validateBody(portalLoginSchema), asyncHandler(portalLoginController));

// Protected routes - portal auth required
portalRouter.use(asyncHandler(requirePortalAuth));

portalRouter.get("/profile", asyncHandler(portalGetProfileController));
portalRouter.get("/compliance", asyncHandler(portalGetComplianceController));
portalRouter.patch(
  "/compliance",
  validateBody(portalComplianceUploadSchema),
  asyncHandler(portalUpdateComplianceController),
);

export default portalRouter;
