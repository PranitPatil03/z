# Frontend Reference Intake Checklist

**Last Updated:** April 7, 2026

Use this document to provide the reference inputs before frontend implementation starts.

## 1. Why This Checklist Exists

We can move faster and avoid rework if references are explicit before coding.
This checklist converts your references into implementation-ready tasks.

## 2. Reference Inputs Required

### A) Product and Screen Scope

Provide:
- Full screen list for MVP.
- Priority order (P1, P2, P3).
- Must-have flows per screen.

Template:
- Screen name:
- User role(s):
- Priority:
- Primary actions:
- API dependencies:
- Success criteria:

### B) Visual and UX Direction

Provide:
- Design references (links, screenshots, style samples).
- Brand tokens if available (colors, typography, spacing, radii).
- Preferred interaction style (dense, balanced, spacious).

Template:
- Visual references:
- Preferred density:
- Color guidance:
- Typography guidance:
- Motion guidance:
- Accessibility requirements beyond baseline:

### C) Role and Permission Behavior

Provide:
- Role matrix for each module.
- View vs create vs edit vs approve permissions.
- Hidden vs disabled behavior expectations.

Template:
- Role:
- Module:
- Allowed actions:
- Forbidden actions:
- UX expectation for forbidden action:

### D) Data and API Behavior Expectations

Provide:
- Any endpoint usage assumptions.
- Any custom sorting/filtering/search rules for lists.
- Any special error-message expectations.

Template:
- Screen:
- Endpoint(s):
- Query/filter behavior:
- Empty-state behavior:
- Error behavior:

### E) Workflow and State Requirements

Provide:
- Required loading behavior per workflow.
- Required retry behavior for failures.
- Required confirmation dialogs for destructive actions.

Template:
- Workflow:
- Loading state:
- Error state:
- Retry policy:
- Confirmation requirements:

### F) Portal-Specific Requirements

Provide:
- Portal login and session expectations.
- Token lifetime and re-login UX requirements.
- Compliance/pay-app/daily-log workflow priorities.

Template:
- Portal flow:
- Required endpoints:
- UX rules:
- Access restrictions:

## 3. Optional But High-Value Inputs

1. Copy and tone guidance for labels and status messages.
2. Table and chart preferences for command center views.
3. Mobile behavior expectations for each major screen.
4. Performance priorities (first render vs interaction speed vs data density).
5. Accessibility and compliance constraints specific to your customers.

## 4. How We Will Use Your References

After you provide references, we will perform this translation workflow:

1. Convert references into a locked MVP route and feature list.
2. Map each feature to backend route groups and endpoint contracts.
3. Define UI components and page patterns required.
4. Define implementation tasks per phase from [11-frontend-execution-plan.md](11-frontend-execution-plan.md).
5. Confirm acceptance criteria before coding begins.

## 5. Approval Gate Before Coding

Frontend implementation starts only after:
- Scope is approved.
- Role matrix is approved.
- Visual direction is approved.
- MVP acceptance criteria are approved.

## 6. Related Docs

- [10-frontend-readiness-review.md](10-frontend-readiness-review.md)
- [11-frontend-execution-plan.md](11-frontend-execution-plan.md)
- [08-backend-frontend-build-handbook.md](08-backend-frontend-build-handbook.md)
- [09-api-integration-reference.md](09-api-integration-reference.md)
