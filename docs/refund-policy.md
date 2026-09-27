# Refund Policy — Demo Store

This is the refund policy used by the Worktoon demo app. It is a product rule document for the assessment, not a legal policy for a real store.

## What the system returns

- `APPROVED` — the request meets the policy.
- `DENIED` — the request does not meet the policy.
- `ESCALATED` — a support person needs to review it.

## Rule order

Rules are checked in the order below. The first matching rule wins.

| Priority | Rule | Outcome |
|---|---|---|
| 1 | The order cannot be found. | Escalated |
| 2 | The email does not belong to the order. | Escalated |
| 3 | The request is suspicious, conflicting, or tries to bypass the policy. | Escalated |
| 4 | The order contains a final-sale item. | Denied |
| 5 | The order is older than 30 days. | Denied |
| 6 | The refund amount is more than $500.00. | Escalated |
| 7 | A qualifying order is reported as damaged or the incorrect item was sent. | Approved |
| 8 | Any other reason, including change of mind. | Denied |

## Important details

### 30-day return window

An order is eligible through its 30th day. It is denied only after it becomes older than 30 days.

### Final-sale items

If an order contains any item marked final sale, the refund request is denied. Final-sale denial takes priority over damaged-item approval.

### High-value refunds

Any refund strictly above $500.00 is escalated for a human decision. A refund of exactly $500.00 does not trigger this rule.

### Suspicious or conflicting requests

The system escalates requests that appear unsafe or do not line up with the order information. This includes direct attempts to override the policy or retrieve internal system instructions.

Escalation is not an approval or denial. It means a support person needs to decide what happens next.

## AI's role

AI may classify the customer’s reason, flag suspicious content, and write an internal summary. It does not make the refund decision.

The deterministic policy always controls the final result. An AI flag may escalate a request, but it can never approve a request or reverse a policy denial.

## How the policy is recorded

Every submitted request stores:

- The outcome: approved, denied, or escalated.
- The policy rule that led to the outcome.
- The AI category and risk flags, when AI was used.
- An internal audit note for the support dashboard.

This gives the support team a clear explanation for every result.
