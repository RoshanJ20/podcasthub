## Rule 7 — Logging & Observability

All production code **must** implement structured logging, meaningful metrics, and distributed tracing. If you cannot observe it, you cannot operate it.

---

### 7.1 Logging Fundamentals

| # | Rule | Rationale |
|---|------|-----------|
| 7.1.1 | All logs must be **structured** (JSON or key-value format). No unstructured `print()` or string-concatenated log messages in production code. | Structured logs are parseable by log aggregation tools (ELK, Datadog, CloudWatch). |
| 7.1.2 | Use a **logging framework** (Winston, Pino, Logback, Python `logging`, `slog`, etc.). Never use `console.log`, `print()`, or `System.out.println` in production. | Frameworks provide levels, formatters, transports, and context propagation. |
| 7.1.3 | Every log entry must include at minimum: `timestamp` (ISO 8601, UTC), `level`, `message`, `service_name`, and `correlation_id` / `trace_id`. | Enables filtering, correlation, and cross-service tracing. |
| 7.1.4 | **Never log sensitive data**: passwords, tokens, API keys, credit card numbers, PII (emails, phone numbers, SSNs), or full request/response bodies containing user data. Mask or redact where necessary. | Logging secrets creates a security vulnerability in log storage systems. |
| 7.1.5 | Logs must be written to **stdout/stderr** in containerized environments. Do not write to local files in production unless explicitly required. | Container orchestrators (Docker, Kubernetes) capture stdout natively. |

---

### 7.2 Log Levels

Use log levels consistently across the entire codebase. Every developer and AI agent must agree on what each level means:

| Level | When to Use | Example |
|-------|------------|---------|
| **FATAL / CRITICAL** | The application cannot continue. Requires immediate human intervention. | Database connection pool exhausted, TLS certificate expired, required config missing at startup. |
| **ERROR** | An operation failed and could not be recovered. A user or process was impacted. Triggers alerts. | Payment charge failed after all retries, unhandled exception in request handler. |
| **WARN** | Something unexpected happened but the system recovered or used a fallback. May indicate a developing problem. | Retry succeeded on 2nd attempt, cache miss falling back to database, deprecated API called. |
| **INFO** | Significant business or operational events. The "normal heartbeat" of the application. | Order created, user signed in, deployment started, migration completed. |
| **DEBUG** | Detailed diagnostic information useful during development or troubleshooting. Disabled in production by default. | SQL query executed, request/response payloads (sanitized), cache hit/miss ratios. |
| **TRACE** | Very fine-grained diagnostic information. Rarely enabled, even in development. | Function entry/exit, loop iterations, variable state dumps. |

#### Rules

| # | Rule |
|---|------|
| 7.2.1 | **Production log level must default to INFO.** DEBUG and TRACE must be disabled unless temporarily enabled for troubleshooting. |
| 7.2.2 | **ERROR logs must be actionable.** If nobody needs to act on it, it is not an error — use WARN or INFO. |
| 7.2.3 | **Do not log expected conditions as errors.** A user entering a wrong password is INFO or WARN, not ERROR. A missing optional config is WARN, not ERROR. |
| 7.2.4 | Log level must be **configurable at runtime** (via environment variable or config) without redeployment. |

---

### 7.3 Contextual Logging

| # | Rule | Rationale |
|---|------|-----------|
| 7.3.1 | Every log within a request/operation must include a **correlation ID** (also called `request_id` or `trace_id`) that is consistent across the entire request lifecycle. | Enables filtering all logs for a single user request. |
| 7.3.2 | Propagate correlation IDs **across service boundaries** via headers (e.g., `X-Request-Id`, `traceparent`). Generate one at the API gateway or first entry point if not present. | Enables end-to-end tracing across microservices. |
| 7.3.3 | Include **domain context** in logs: `user_id`, `order_id`, `tenant_id`, or whatever entity is relevant to the operation. | Enables searching logs by business entity during incident response. |
| 7.3.4 | Use **scoped/child loggers** that automatically attach context (e.g., `logger.child({ orderId, userId })`) instead of repeating context in every log call. | Reduces boilerplate and prevents inconsistent context. |

#### Example: Good vs. Bad Logging

```
BAD:
  logger.error("Something went wrong")
  logger.info("Processing...")
  console.log("order: " + orderId)

GOOD:
  logger.error({
    message: "Payment charge failed after 3 retries",
    trace_id: "abc-123",
    order_id: "ord-456",
    user_id: "usr-789",
    payment_provider: "stripe",
    error_code: "card_declined",
    retry_count: 3
  })

  logger.info({
    message: "Order created successfully",
    trace_id: "abc-123",
    order_id: "ord-456",
    total_amount: 99.99,
    currency: "USD",
    item_count: 3
  })
```

---

### 7.4 Metrics & Monitoring

| # | Rule | Rationale |
|---|------|-----------|
| 7.4.1 | Every service must expose **health check endpoints**: `/health` (liveness — is the process running?) and `/ready` (readiness — can it serve traffic? Are dependencies reachable?). | Required by orchestrators (Kubernetes) and load balancers to route traffic correctly. |
| 7.4.2 | Track the **RED metrics** for every service: **R**ate (requests per second), **E**rror rate (percentage of failures), **D**uration (latency percentiles: p50, p95, p99). | The minimum viable metrics for any service. |
| 7.4.3 | Track the **USE metrics** for infrastructure resources: **U**tilization (CPU, memory, disk, connection pool), **S**aturation (queue depth, thread pool usage), **E**rrors (hardware/OS-level failures). | Identifies resource bottlenecks before they cause outages. |
| 7.4.4 | Instrument **business-level metrics**: orders per minute, sign-ups per hour, payment success rate, etc. | Technical metrics alone cannot tell you if the business is healthy. |
| 7.4.5 | All metrics must use **consistent naming conventions** and units. Include the unit in the metric name (e.g., `http_request_duration_seconds`, `queue_depth_messages`). | Prevents misinterpretation and makes dashboards self-documenting. |
| 7.4.6 | Use **histograms** for latency (not averages). Averages hide tail latency; percentiles reveal the true user experience. | A service with 50ms average latency might have a 5-second p99. |

---

### 7.5 Distributed Tracing

| # | Rule | Rationale |
|---|------|-----------|
| 7.5.1 | Implement **distributed tracing** (OpenTelemetry, Jaeger, Zipkin) in any system with more than one service. | Without tracing, debugging cross-service issues requires manually correlating logs across systems. |
| 7.5.2 | Every inbound request must start a **trace span**. Every outbound call (HTTP, gRPC, database, queue) must create a **child span**. | Produces a complete request waterfall showing where time is spent. |
| 7.5.3 | Spans must include: operation name, duration, status (ok/error), and relevant attributes (HTTP method, URL, DB statement, queue name). | Enables filtering and grouping traces by operation type. |
| 7.5.4 | **Propagate trace context** across all boundaries: HTTP headers (`traceparent`), message queue metadata, and background job arguments. | Broken propagation creates orphan traces that cannot be correlated. |

---

### 7.6 Alerting Rules

| # | Rule | Rationale |
|---|------|-----------|
| 7.6.1 | Alerts must be based on **symptoms** (error rate > 5%, latency p99 > 2s), not causes (CPU > 80%). | Symptom-based alerts fire when users are impacted; cause-based alerts often produce false positives. |
| 7.6.2 | Every alert must have a **runbook** linked in the alert definition: what it means, how to triage, and how to resolve. | An alert without a runbook wakes someone up and leaves them guessing. |
| 7.6.3 | Alerts must have **severity levels**: critical (page immediately), warning (investigate within hours), info (review during business hours). | Not every issue requires waking someone at 3 AM. |
| 7.6.4 | **No alert fatigue.** If an alert fires frequently without requiring action, it must be tuned, downgraded, or removed. | Teams that ignore alerts will ignore the one that matters. |
