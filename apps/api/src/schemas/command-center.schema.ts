import { z } from "zod";

export const commandCenterOverviewQuerySchema = z.object({
  projectId: z.string().min(1),
});
