## Rule 2 — Naming Conventions & Standards

All identifiers — files, directories, classes, functions, methods, variables, constants, database entities, API endpoints — **must** follow internationally recognized naming conventions. Consistency is non-negotiable.

---

### 2.1 General Principles

| # | Rule | Rationale |
|---|------|-----------|
| 2.1.1 | Names must be **descriptive and intention-revealing**. A reader should understand *what* and *why* without reading the implementation. | Reduces cognitive load and onboarding time. |
| 2.1.2 | Avoid **abbreviations** unless they are universally understood (`id`, `url`, `http`, `api`, `db`). | `usr`, `mgr`, `cnt` are ambiguous across teams. |
| 2.1.3 | Avoid **generic names** like `data`, `info`, `item`, `temp`, `result`, `value`, `obj` unless scope is trivially small (e.g., a lambda parameter). | Generic names convey no domain meaning. |
| 2.1.4 | Names must be in **English**. | English is the international standard for source code. |
| 2.1.5 | Avoid **Hungarian notation** and type prefixes/suffixes (`strName`, `iCount`). Modern editors and type systems make them redundant. | Reduces noise; types change more often than names. |
| 2.1.6 | Boolean variables/functions must read as **yes/no questions**: `is_active`, `has_permission`, `can_retry`, `should_validate`. | Makes conditionals read like natural language. |

---

### 2.2 Casing Conventions by Element

| Element | Convention | Example |
|---------|-----------|---------|
| **Classes / Types / Interfaces** | `PascalCase` | `OrderService`, `HttpClient`, `IPaymentGateway` |
| **Functions / Methods** | `camelCase` (JS/TS/Java/Go) or `snake_case` (Python/Ruby/Rust) | `calculateTotal()`, `calculate_total()` |
| **Variables / Parameters** | `camelCase` or `snake_case` (match language convention) | `orderCount`, `order_count` |
| **Constants** | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT_MS` |
| **Enums** | Type: `PascalCase`. Members: `UPPER_SNAKE_CASE` or `PascalCase` (match language convention) | `OrderStatus.PENDING` |
| **Files — Classes/Components** | `PascalCase` or `kebab-case` (match framework convention) | `OrderService.ts`, `order-service.ts` |
| **Files — Utilities/Helpers** | `kebab-case` or `snake_case` | `date-utils.ts`, `string_helpers.py` |
| **Directories** | `kebab-case` or `snake_case` | `order-processing/`, `order_processing/` |
| **Database Tables** | `snake_case`, plural | `user_accounts`, `order_items` |
| **Database Columns** | `snake_case` | `created_at`, `first_name` |
| **API Endpoints** | `kebab-case`, plural nouns, no verbs | `/api/v1/order-items` |
| **Environment Variables** | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `API_SECRET_KEY` |
| **CSS Classes** | `kebab-case` (or BEM: `block__element--modifier`) | `nav-bar`, `card__title--active` |

---

### 2.3 Naming Patterns

| Pattern | When to Use | Example |
|---------|------------|---------|
| `verbNoun` | Functions that perform actions | `createOrder()`, `validateEmail()` |
| `Noun` | Classes representing entities | `Invoice`, `UserProfile` |
| `NounVerber` / `NounService` | Classes performing operations | `PaymentProcessor`, `EmailService` |
| `INoun` or `NounInterface` | Interfaces (language-dependent) | `ILogger`, `RepositoryInterface` |
| `NounRepository` | Data access layer | `UserRepository`, `ProductRepository` |
| `NounController` | HTTP/API layer | `OrderController` |
| `NounMiddleware` | Cross-cutting concerns | `AuthMiddleware`, `RateLimitMiddleware` |
| `useNoun` | React hooks | `useAuth()`, `useOrderList()` |
| `NounFactory` | Object creation | `ConnectionFactory` |
| `NounDTO` / `NounSchema` | Data transfer / validation objects | `CreateOrderDTO`, `UserSchema` |

---

### 2.4 Anti-patterns to Avoid

- `doStuff()`, `handleIt()`, `processData()` — vague, untestable names.
- `MyClass`, `MyService` — placeholder names must never ship.
- Single-letter variables outside of loop indices or lambdas (`i`, `j`, `x` are acceptable in `for` loops).
- Misleading names (e.g., `accountList` for a variable that holds a `Map`).
- Inconsistent casing within the same project.
