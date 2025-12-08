# Better Auth and Multi-LLM Stack

This document explains the auth and AI choices for the backend in simple terms.

## 1. Authentication Stack

### Main Choice
- Better Auth for complete authentication and session management.

### What Better Auth Handles
- Sign up and login.
- Session cookies.
- Password reset.
- Email verification.
- OAuth sign-in.
- Organization membership and invitations.
- Role and access-related session context.

### Why We Use It
- Less custom auth code.
- Better security than hand-rolling sessions.
- Faster setup for a production SaaS.
- Good fit for PostgreSQL-backed apps.

### Auth Data We Need
- users
- sessions
- organizations
- members
- invitations
- oauth accounts
- password reset tokens
- email verification tokens

### Auth Rules
- Use server-side sessions or secure cookies.
- Do not trust client-side role claims.
- Keep auth state in the backend.
- Protect all tenant data with auth plus tenant checks.

## 2. Multi-LLM Stack

### Main Idea
We should not depend on only one model provider. We should build one AI gateway and connect several major providers behind it.

### Supported Providers
- OpenAI
- Anthropic
- Google Gemini
- Azure OpenAI

### Why This Matters
- Different models are better for different tasks.
- Some tasks need stronger reasoning.
- Some tasks need better vision or lower cost.
- We want fallback options if one vendor fails.

### Use Cases by AI Type
- Jobsite photo analysis: vision model.
- Insurance document extraction: vision + structured output.
- RFQ and email drafting: text generation.
- Budget variance narratives: text reasoning.
- Executive summaries: concise text generation.

### AI Gateway Responsibilities
- Route requests to the right provider.
- Keep a single internal API for all AI calls.
- Track provider, model, prompt version, latency, and token usage.
- Validate outputs before saving them.
- Retry or fail safely when a model response is bad.

### AI Safety Rules
- Never trust raw model text without validation.
- Store the prompt template version with every output.
- Keep human review for business-critical results.
- Log usage for billing and cost control.

## 3. Suggested Package Split

### `apps/api`
- auth routes and middleware
- AI service entry points
- business endpoints

### `apps/worker`
- background AI jobs
- retries and fallback jobs
- token refresh and sync jobs

### `packages/ai`
- provider adapters
- prompt registry
- model routing helpers
- response validation helpers

### `packages/domain`
- shared auth-related policy helpers
- shared AI business rules
- workflow logic

## 4. Recommended First Implementation Order
1. Add Better Auth with PostgreSQL.
2. Wire organization and invitation support.
3. Build the AI gateway package.
4. Add OpenAI first.
5. Add Anthropic and Gemini after the gateway works.
6. Add Azure OpenAI if enterprise demand requires it.
7. Add logging, usage tracking, and prompt versioning.

## 5. What This Gives Us
- Cleaner authentication.
- Safer sessions.
- Easy future mobile app support.
- Vendor flexibility for AI.
- Better long-term platform control.
