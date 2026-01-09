# Project: Agent Interface

## Context
Extend the `runAmberEmailAgent` function to accept and pass attachment information to the Python agent.

## Tasks
- [x] Add `EmailAttachment` interface type
- [x] Extend function signature with `attachments` parameter
- [x] Add `attachments` to `agentInput` JSON passed to Python

## Completion Criteria
- [x] Function accepts attachments parameter
- [x] Python agent receives attachments in input JSON

## Notes
**File:** `sms-bot/agents/amber-email/index.ts`

**New interface:**
```typescript
export interface EmailAttachment {
  name: string;
  url: string;
  size: number;
}
```

**Updated signature:**
```typescript
export async function runAmberEmailAgent(
  task: string,
  senderEmail: string,
  subject: string,
  isApprovedRequest: boolean = false,
  thinkhard: boolean = false,
  attachments: EmailAttachment[] = []
): Promise<AmberEmailResult>
```

**Updated agentInput (around line 45):**
```typescript
const agentInput = {
  task,
  sender_email: senderEmail,
  subject,
  is_approved_request: isApprovedRequest,
  thinkhard,
  skip_deploy_wait: true,
  attachments,  // NEW
};
```
