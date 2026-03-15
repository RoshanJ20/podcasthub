## Rule 5 — Project Structure & Anti-Monolithic Design

Code must be **well-structured, modular, and anti-monolithic**. Every project must enforce separation of concerns through deliberate architectural layering and directory organization.

---

### 5.1 Architectural Layering

All projects must implement a **layered or modular architecture**. The exact pattern depends on project complexity, but the following layers must be clearly separated:

| Layer | Responsibility | Allowed Dependencies |
|-------|---------------|---------------------|
| **Presentation / API** | HTTP controllers, WebSocket handlers, CLI entry points, serialization/deserialization. | Application layer only. |
| **Application / Use Cases** | Orchestration of business operations, transaction boundaries, input validation. | Domain layer and port interfaces. |
| **Domain / Core** | Business entities, value objects, domain events, business rules. | No external dependencies. Pure logic only. |
| **Infrastructure / Adapters** | Database access, external API clients, file system, message queues, email. | Implements port interfaces defined by Application/Domain layers. |
| **Configuration / Bootstrap** | Dependency injection wiring, environment config, application startup. | All layers (this is the composition root). |

#### Rules

| # | Rule |
|---|------|
| 5.1.1 | **No layer may depend on a layer above it.** Dependencies flow inward/downward only. |
| 5.1.2 | The **domain layer must have zero infrastructure imports**. No ORM decorators, no HTTP libraries, no framework annotations in domain entities. |
| 5.1.3 | Cross-cutting concerns (logging, authentication, caching, metrics) must be implemented as **middleware, decorators, or interceptors** — not scattered throughout business logic. |

---

### 5.2 Project Directory Structure

Below are reference structures. Adapt to the project's language and framework, but maintain the principle of **separation by concern, not by file type**.

#### Backend (General)

```
project-root/
├── src/
│   ├── config/              # Environment config, DI container setup
│   │   ├── environment.ts
│   │   └── container.ts
│   ├── modules/             # Feature modules (bounded contexts)
│   │   ├── orders/
│   │   │   ├── domain/          # Entities, value objects, domain services
│   │   │   │   ├── entities/
│   │   │   │   ├── value-objects/
│   │   │   │   └── services/
│   │   │   ├── application/     # Use cases, DTOs, port interfaces
│   │   │   │   ├── use-cases/
│   │   │   │   ├── dtos/
│   │   │   │   └── ports/
│   │   │   ├── infrastructure/  # Repositories, external clients, adapters
│   │   │   │   ├── repositories/
│   │   │   │   └── adapters/
│   │   │   └── presentation/    # Controllers, routes, request/response models
│   │   │       ├── controllers/
│   │   │       └── routes/
│   │   └── users/
│   │       └── ...              # Same structure as orders
│   ├── shared/              # Shared kernel (cross-module utilities)
│   │   ├── domain/          # Base entity, value object, domain event classes
│   │   ├── infrastructure/  # Shared middleware, guards, filters
│   │   └── utils/           # Pure utility functions
│   └── main.ts             # Application entry point
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                    # Additional documentation
├── scripts/                 # Build, deploy, migration scripts
├── .env.example
├── README.md
└── package.json / pyproject.toml / go.mod
```

#### Frontend (React/Vue/Angular)

```
project-root/
├── src/
│   ├── app/                 # App-level setup (routing, providers, layout)
│   ├── features/            # Feature modules
│   │   ├── orders/
│   │   │   ├── components/      # UI components scoped to this feature
│   │   │   ├── hooks/           # Custom hooks for this feature
│   │   │   ├── services/        # API calls, business logic
│   │   │   ├── stores/          # State management (Zustand, Redux slice, etc.)
│   │   │   ├── types/           # TypeScript types and interfaces
│   │   │   └── index.ts         # Public API of the feature module
│   │   └── users/
│   │       └── ...
│   ├── shared/
│   │   ├── components/      # Reusable UI components (buttons, modals, etc.)
│   │   ├── hooks/           # Shared custom hooks
│   │   ├── services/        # Shared API client, auth service
│   │   ├── utils/           # Pure utility functions
│   │   └── types/           # Shared TypeScript types
│   └── main.tsx
├── tests/
├── public/
└── README.md
```

---

### 5.3 Modularity Rules

| # | Rule | Rationale |
|---|------|-----------|
| 5.3.1 | Each **feature/module must be self-contained** with its own domain, application, infrastructure, and presentation layers. | Enables independent development, testing, and potential extraction to microservices. |
| 5.3.2 | Modules must communicate through **well-defined interfaces** (public API surface, events, or shared contracts) — never by reaching into another module's internals. | Prevents hidden coupling. |
| 5.3.3 | Each module must expose a **public API** (barrel file / index) that explicitly lists what is available to other modules. Everything else is private. | Controls coupling surface and makes refactoring safe. |
| 5.3.4 | **Shared code** must live in a `shared/` or `common/` directory. Code must not be shared by importing from another feature's internals. | Prevents circular dependencies and implicit coupling. |
| 5.3.5 | Circular dependencies between modules are **strictly forbidden**. Use events, mediators, or extract shared logic. | Circular deps make code untestable and un-extractable. |

---

### 5.4 File Organization Rules

| # | Rule |
|---|------|
| 5.4.1 | **One class/component per file** (exceptions: tightly coupled small types like DTOs may share a file). |
| 5.4.2 | **No file should exceed 300 lines.** If it does, it likely violates SRP and must be split. |
| 5.4.3 | **No function should exceed 50 lines.** Extract sub-functions for clarity. |
| 5.4.4 | Group files by **feature**, not by type. `modules/orders/controllers/` is better than `controllers/orders/`. |
| 5.4.5 | Test files must **mirror the source structure** (e.g., `src/modules/orders/` → `tests/unit/modules/orders/`). |
| 5.4.6 | Keep the **root directory clean**. Only config files (`.env.example`, `package.json`, `tsconfig.json`, `Dockerfile`, `README.md`) belong at the root. |

---

### 5.5 Dependency Management

| # | Rule |
|---|------|
| 5.5.1 | Use a **lock file** (`package-lock.json`, `poetry.lock`, `go.sum`) and commit it to version control. |
| 5.5.2 | Pin **exact versions** for production dependencies. Use ranges only for libraries intended for reuse. |
| 5.5.3 | Audit dependencies regularly. Do not introduce dependencies for trivial operations (e.g., `is-odd`, `left-pad`). |
| 5.5.4 | Separate **production** and **development** dependencies explicitly. |
