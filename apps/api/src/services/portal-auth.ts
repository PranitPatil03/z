import { and, eq, isNull } from "drizzle-orm";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { subcontractors, complianceItems } from "@foreman/db";
import { db } from "../database";
import { badRequest, unauthorized, notFound } from "../lib/errors";
import { env } from "../config/env";

export interface PortalSession {
  subcontractorId: string;
  organizationId: string;
  email: string;
  name: string;
}

export const portalAuthService = {
  async register(
    email: string,
    password: string,
    name: string,
    trade: string,
    phone: string | null,
    projectCode: string,
  ) {
    // Verify project exists by checking for any subcontractor with same org
    // In a real app, you'd look up the project by code
    const existingEmail = await db
      .select()
      .from(subcontractors)
      .where(and(eq(subcontractors.email, email), isNull(subcontractors.deletedAt)))
      .limit(1);

    if (existingEmail.length > 0) {
      throw badRequest("Email already registered");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Get organization ID from project code (simplified - in real app, look up project)
    // For now, we'll create with a placeholder org ID that must exist
    const [subcontractor] = await db
      .insert(subcontractors)
      .values({
        organizationId: "org-placeholder", // This should come from project lookup
        name,
        email,
        phone: phone ?? null,
        trade,
        status: "active",
        passwordHash,
        portalEnabled: true,
      })
      .returning();

    if (!subcontractor) {
      throw badRequest("Failed to create subcontractor account");
    }

    return {
      id: subcontractor.id,
      email: subcontractor.email,
      name: subcontractor.name,
      message: "Successfully registered. You can now login.",
    };
  },

  async login(email: string, password: string) {
    const [subcontractor] = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.email, email),
          eq(subcontractors.portalEnabled, true),
          isNull(subcontractors.deletedAt),
        ),
      )
      .limit(1);

    if (!subcontractor) {
      throw unauthorized("Invalid email or password");
    }

    if (!subcontractor.passwordHash) {
      throw unauthorized("Portal access not configured for this account");
    }

    const passwordMatch = await bcrypt.compare(password, subcontractor.passwordHash);
    if (!passwordMatch) {
      throw unauthorized("Invalid email or password");
    }

    // Update last login
    await db
      .update(subcontractors)
      .set({ lastPortalLoginAt: new Date() })
      .where(eq(subcontractors.id, subcontractor.id));

    // Generate JWT token
    const token = jwt.sign(
      {
        subcontractorId: subcontractor.id,
        organizationId: subcontractor.organizationId,
        email: subcontractor.email,
        name: subcontractor.name,
      },
      env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" },
    );

    return {
      token,
      subcontractor: {
        id: subcontractor.id,
        email: subcontractor.email,
        name: subcontractor.name,
        trade: subcontractor.trade,
      },
    };
  },

  async verifyToken(token: string): Promise<PortalSession> {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET || "dev-secret") as PortalSession;
      return payload;
    } catch (error) {
      throw unauthorized("Invalid or expired token");
    }
  },

  async getUserCompliance(subcontractorId: string) {
    const items = await db
      .select()
      .from(complianceItems)
      .where(
        and(
          eq(complianceItems.subcontractorId, subcontractorId),
          isNull(complianceItems.deletedAt),
        ),
      );

    return items;
  },

  async updateComplianceEvidence(
    subcontractorId: string,
    complianceItemId: string,
    evidence: string | null,
    notes: string | null,
  ) {
    // Verify the compliance item belongs to this subcontractor
    const [item] = await db
      .select()
      .from(complianceItems)
      .where(
        and(
          eq(complianceItems.id, complianceItemId),
          eq(complianceItems.subcontractorId, subcontractorId),
          isNull(complianceItems.deletedAt),
        ),
      )
      .limit(1);

    if (!item) {
      throw notFound("Compliance item not found");
    }

    const [updated] = await db
      .update(complianceItems)
      .set({
        evidence: evidence ?? item.evidence,
        notes: notes ?? item.notes,
        status: "submitted",
        updatedAt: new Date(),
      })
      .where(eq(complianceItems.id, complianceItemId))
      .returning();

    return updated;
  },
};
