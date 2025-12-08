export type SmartMailLinkedEntityType = "purchase_order" | "invoice" | "change_order" | "subcontractor";

export interface SmartMailEntityReference {
  id: string;
  ref: string;
}

export interface SmartMailLinkCandidate {
  linkedEntityType: SmartMailLinkedEntityType;
  linkedEntityId: string;
  confidenceBps: number;
  reason: string;
}

export interface SmartMailLinkInputs {
  purchaseOrders: SmartMailEntityReference[];
  invoices: SmartMailEntityReference[];
  changeOrders: SmartMailEntityReference[];
  subcontractors: SmartMailEntityReference[];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasReference(text: string, reference: string) {
  const value = reference.trim().toLowerCase();
  if (!value) {
    return false;
  }

  const exactPattern = new RegExp(`(^|\\b)${escapeRegExp(value)}(\\b|$)`, "i");
  return exactPattern.test(text);
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function detectDeterministicEntityLink(rawText: string, inputs: SmartMailLinkInputs): SmartMailLinkCandidate | null {
  const text = normalizeText(rawText);
  if (!text) {
    return null;
  }

  for (const po of inputs.purchaseOrders) {
    if (hasReference(text, po.ref)) {
      return {
        linkedEntityType: "purchase_order",
        linkedEntityId: po.id,
        confidenceBps: 9600,
        reason: `Matched purchase order reference ${po.ref}`,
      };
    }
  }

  for (const invoice of inputs.invoices) {
    if (hasReference(text, invoice.ref)) {
      return {
        linkedEntityType: "invoice",
        linkedEntityId: invoice.id,
        confidenceBps: 9400,
        reason: `Matched invoice reference ${invoice.ref}`,
      };
    }
  }

  for (const changeOrder of inputs.changeOrders) {
    const reference = changeOrder.ref.trim();
    if (reference.length >= 5 && hasReference(text, reference)) {
      return {
        linkedEntityType: "change_order",
        linkedEntityId: changeOrder.id,
        confidenceBps: 8600,
        reason: `Matched change order text ${reference}`,
      };
    }
  }

  for (const subcontractor of inputs.subcontractors) {
    if (hasReference(text, subcontractor.ref)) {
      return {
        linkedEntityType: "subcontractor",
        linkedEntityId: subcontractor.id,
        confidenceBps: 7600,
        reason: `Matched subcontractor reference ${subcontractor.ref}`,
      };
    }
  }

  return null;
}
