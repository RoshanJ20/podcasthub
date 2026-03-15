## Rule 6 — Error Handling & Resilience

All code **must** handle errors explicitly, predictably, and gracefully. Silent failures, swallowed exceptions, and unhandled edge cases are production incidents waiting to happen.

---

### 6.1 General Error Handling Principles

| # | Rule | Rationale |
|---|------|-----------|
| 6.1.1 | **Never swallow exceptions silently.** Every `catch` / `except` block must either handle the error meaningfully, re-throw it, or log it with full context. Empty catch blocks are forbidden. | Silent failures are the hardest bugs to diagnose. |
| 6.1.2 | **Fail fast, fail loud.** Detect invalid state as early as possible (at system boundaries) and reject it immediately with a clear error message. | Prevents corrupt data from propagating through the system. |
| 6.1.3 | **Use specific exception types**, not generic ones. Throw `OrderNotFoundException`, not `Exception("not found")`. | Enables callers to handle different failures differently. |
| 6.1.4 | **Never use exceptions for control flow.** Exceptions are for exceptional conditions, not expected branches like "user not found" in a lookup. Use result types, optionals, or return codes for expected outcomes. | Exceptions are expensive and obscure the normal code path. |
| 6.1.5 | **Distinguish between recoverable and unrecoverable errors.** Recoverable errors (invalid input, network timeout) should be handled. Unrecoverable errors (out of memory, corrupted state) should crash the process cleanly. | Trying to recover from unrecoverable errors causes unpredictable behaviour. |

---

### 6.2 Error Propagation

| # | Rule | Rationale |
|---|------|-----------|
| 6.2.1 | **Catch at the right level.** Handle errors at the layer that has enough context to respond meaningfully. If a layer cannot handle the error, let it propagate. | Catching too early leads to incomplete handling; catching too late loses context. |
| 6.2.2 | **Wrap and re-throw with context.** When re-throwing, wrap the original error with additional context (what operation failed, with what inputs). Never discard the original stack trace. | Preserves the full causal chain for debugging. |
| 6.2.3 | **Define error boundaries.** Each architectural layer (presentation, application, infrastructure) must have a top-level error handler that catches unhandled exceptions, logs them, and returns an appropriate response. | Prevents raw stack traces from leaking to end users. |
| 6.2.4 | **Map infrastructure errors to domain errors** at the adapter boundary. Callers should never see database-specific or HTTP-specific exceptions in business logic. | Keeps the domain layer independent of infrastructure. |

#### Do's and Don'ts

- **Do:** Catch `SqlException` in the repository layer and throw `PersistenceException("Failed to save order #123", cause=e)`.
- **Don't:** Let `SqlException` bubble up to the controller, or catch it and log "something went wrong".

---

### 6.3 Error Response Standards

| # | Rule | Rationale |
|---|------|-----------|
| 6.3.1 | All API error responses must follow a **consistent schema** across the entire application. | Clients need a predictable format to parse errors programmatically. |
| 6.3.2 | Error responses must include: `status` (HTTP code), `error_code` (machine-readable string), `message` (human-readable), and `details` (optional, field-level errors). | Covers both programmatic and human consumption. |
| 6.3.3 | **Never expose internal details** (stack traces, SQL queries, file paths, server names) in production error responses. | Prevents information leakage that aids attackers. |
| 6.3.4 | Use **correct HTTP status codes**: `400` for bad input, `401` for unauthenticated, `403` for unauthorized, `404` for not found, `409` for conflicts, `422` for validation, `429` for rate limits, `500` for unexpected server errors. | Enables clients and monitoring tools to categorize errors correctly. |

#### Standard Error Response Schema

```json
{
  "status": 422,
  "error_code": "VALIDATION_FAILED",
  "message": "The request contains invalid fields.",
  "details": [
    {
      "field": "email",
      "message": "Must be a valid email address.",
      "rejected_value": "not-an-email"
    }
  ],
  "trace_id": "abc-123-def-456"
}
```

---

### 6.4 Resilience Patterns

| # | Rule | Rationale |
|---|------|-----------|
| 6.4.1 | All calls to **external services** (APIs, databases, message queues) must have **timeouts** configured. No call may wait indefinitely. | A hanging dependency should not take down the entire application. |
| 6.4.2 | Implement **retries with exponential backoff and jitter** for transient failures (network blips, 503 responses). Define a maximum retry count. Never retry non-idempotent operations without safeguards. | Avoids thundering herd problems while recovering from transient issues. |
| 6.4.3 | Use the **circuit breaker pattern** for dependencies that may become unavailable. After a threshold of failures, stop calling the dependency and fail fast for a cooldown period. | Prevents cascading failures and gives the downstream service time to recover. |
| 6.4.4 | Define **fallback behaviour** for non-critical dependencies. If a recommendation service is down, show default results — don't fail the entire page. | Graceful degradation preserves core functionality. |
| 6.4.5 | All operations that modify state must be **idempotent** or protected by idempotency keys. Retried requests must not create duplicate records or double-charge users. | Network failures can cause duplicate requests; idempotency makes retries safe. |
| 6.4.6 | Implement **graceful shutdown**. On `SIGTERM`, stop accepting new requests, finish in-flight work (with a deadline), release resources (DB connections, file handles), then exit. | Prevents data corruption and dropped requests during deployments. |

#### Do's and Don'ts

- **Do:** Set a 5-second timeout on payment gateway calls, retry up to 3 times with backoff, and use an idempotency key.
- **Don't:** Call a third-party API with no timeout inside a synchronous request handler.

---

### 6.5 Input Validation

| # | Rule | Rationale |
|---|------|-----------|
| 6.5.1 | **Validate all external input** at the system boundary (API controllers, message consumers, CLI handlers). Never trust data from users, external APIs, or message queues. | The system boundary is the last line of defence before data enters business logic. |
| 6.5.2 | Use **schema validation** (JSON Schema, Zod, Pydantic, class-validator) to validate structure, types, and constraints declaratively. Avoid hand-written validation chains. | Declarative schemas are self-documenting and less error-prone. |
| 6.5.3 | Return **all validation errors at once**, not one at a time. | Users should not have to submit a form repeatedly to discover each error. |
| 6.5.4 | **Sanitize inputs** to prevent injection attacks (SQL injection, XSS, command injection). Use parameterized queries, output encoding, and allowlists — never blocklists. | OWASP Top 10 vulnerabilities are preventable with proper input handling. |

---

### 6.6 Resource Management

| # | Rule | Rationale |
|---|------|-----------|
| 6.6.1 | All resources (database connections, file handles, network sockets, streams) must be **explicitly closed** in a `finally` block, `using` statement, `with` context manager, or equivalent. | Resource leaks cause memory exhaustion and connection pool starvation. |
| 6.6.2 | Use **connection pooling** for databases and HTTP clients. Never open a new connection per request. | Unbounded connections exhaust server and database resources. |
| 6.6.3 | Set **pool size limits** and monitor pool exhaustion. | An unbounded pool is effectively no pool at all. |
