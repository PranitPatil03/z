# Frontend UAT and Go-Live Checklist

**Last Updated:** April 11, 2026

## 1. Purpose

This checklist is the execution guide to validate frontend behavior against the live backend contracts before release.

## 2. Automated Validation (Run First)

From repo root:

```bash
pnpm --filter @foreman/web lint
pnpm --filter @foreman/web typecheck
pnpm --filter @foreman/web test
```

Expected result:
- All commands exit successfully.
- Smoke tests and module tests pass for billing, portal, smartmail, integrations, and shared UI reliability checks.

## 3. Role-Based UAT Scenarios

### Owner/Admin Scenarios

1. Billing records workflow
- Open `/app/billing`.
- Create a billing record with required fields.
- Select the record and update status/amount/date fields.
- Archive a record and confirm it no longer appears in active list.

2. Subscription and plan workflow
- Review usage summary card values.
- Change subscription plan and confirm status message appears.
- Verify plan defaults update correctly.

3. Stripe operations workflow
- Create payment intent with billing record ID + Stripe customer ID.
- Create subscription with billing record ID + Stripe customer ID + price ID.
- Confirm action status messages and record stripe IDs update after refresh.

4. Webhook operations workflow
- Filter webhook events by status.
- Retry a failed event and verify status updates after refresh.

5. SmartMail + Integrations workflow
- Connect Gmail/Outlook via OAuth.
- Verify callback redirects to `/app/smartmail` with successful status.
- Validate thread list/detail, compose, draft generation, manual link override.
- Validate integrations list/create/update/disconnect.

### Member Scenario

1. Read-only billing behavior
- Open `/app/billing` as non owner/admin role.
- Confirm list/usage visibility remains available.
- Confirm mutation actions are disabled and role guidance message is visible.

### Portal User Scenario

1. Portal auth/session continuity
- Login on `/portal/login`.
- Validate overview/profile/compliance/pay-applications/daily-logs workflows.
- Verify expired token handling redirects to portal auth flow.

## 4. Responsive and Accessibility Checks

1. Desktop and mobile
- Validate key screens at desktop width and narrow/mobile width:
  - `/app/billing`
  - `/app/smartmail`
  - `/app/integrations`
  - `/portal/*`

2. Keyboard
- Confirm row keyboard activation in list tables using Enter/Space.
- Confirm form controls are reachable and usable by keyboard.

## 5. Error Observability Diagnostics

Frontend diagnostics emit to `window` event channel and console:
- Event name: `foreman:frontend-diagnostic`
- Types:
  - `window-error`
  - `window-unhandledrejection`
  - `api-request-error`

Validation steps:
1. Trigger an API error (invalid payload or restricted role).
2. Confirm console warning/error includes `[Foreman][Diagnostic]` details.
3. Confirm UI displays a clear error message via toast/status area.

## 6. Go-Live Readiness Checklist

- [ ] Frontend CI checks passing (lint/typecheck/test)
- [ ] Role-based UAT scenarios completed and signed off
- [ ] Billing and SmartMail critical paths validated in target environment
- [ ] OAuth callback and Stripe workflows validated with env credentials
- [ ] Feature flags/config values reviewed for production
- [ ] Monitoring/alerting dashboards linked in release notes

## 7. Rollback Notes

If production regression is detected:

1. Revert frontend deployment to previous stable artifact.
2. Disable high-risk entry points temporarily:
- Billing action controls
- Stripe retry controls
- OAuth connect controls
3. Verify API health and session/auth stability.
4. Re-run smoke checks and restore feature access incrementally.

## 8. Sign-Off

- UAT Owner:
- Date:
- Scope Signed Off:
- Follow-up Issues:
