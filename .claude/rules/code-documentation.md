## Rule 4 — Code Documentation

All code **must** be heavily documented. Documentation is not optional — it is a first-class deliverable alongside the code itself.

---

### 4.1 Module / File-Level Documentation

Every source file must begin with a **module-level docstring or comment block** containing:

| Element | Required? | Description |
|---------|-----------|-------------|
| **Purpose** | Yes | What this module does and why it exists. |
| **Key responsibilities** | Yes | Bulleted list of what this module owns. |
| **Dependencies** | If non-obvious | External services, libraries, or modules this file depends on. |
| **Usage example** | For libraries/utilities | Short code snippet showing typical usage. |
| **Author / Team** | Optional | Who owns this module (useful for large organizations). |

---

### 4.2 Class-Level Documentation

Every class must have a docstring containing:

| Element | Required? | Description |
|---------|-----------|-------------|
| **Purpose** | Yes | What this class represents or does. |
| **Responsibilities** | Yes | What this class owns and does *not* own. |
| **Usage example** | For public APIs | How to instantiate and use the class. |
| **Thread safety** | If applicable | Whether the class is thread-safe and under what conditions. |
| **Design pattern** | If applicable | Name the pattern (Singleton, Factory, Observer, etc.) to help readers understand intent. |

---

### 4.3 Function / Method-Level Documentation

Every public function and method must have a docstring containing:

| Element | Required? | Description |
|---------|-----------|-------------|
| **Summary** | Yes | One-line description of what the function does. |
| **Parameters** | Yes | Name, type, description, default value, and constraints for each parameter. |
| **Returns** | Yes | Type and description of the return value. |
| **Raises / Throws** | Yes (if applicable) | Every exception/error that can be raised, with conditions. |
| **Example** | For public APIs | Short usage example. |
| **Side effects** | If applicable | Any state changes, I/O operations, or external calls performed. |

Private/internal functions must be documented if their logic is non-trivial (more than 10 lines or involves complex algorithms).

---

### 4.4 Inline Comments

| # | Rule |
|---|------|
| 4.4.1 | Comment the **why**, not the *what*. The code itself shows what happens; comments explain intent, trade-offs, and context. |
| 4.4.2 | Every **non-obvious business rule** must have a comment explaining the rule and its source (e.g., "Per regulation XYZ..." or "Product decision from Q3 2024 planning"). |
| 4.4.3 | Every **workaround or hack** must have a `// HACK:` or `// WORKAROUND:` comment explaining why and linking to the issue tracker. |
| 4.4.4 | Every `TODO` must include an owner and a ticket/issue reference: `// TODO(username): Refactor once #1234 is resolved`. |
| 4.4.5 | **Magic numbers** must be replaced with named constants. If a constant is not self-explanatory, comment it. |
| 4.4.6 | Complex algorithms or regex patterns must have a **step-by-step explanation** in comments. |

---

### 4.5 API Documentation

| # | Rule |
|---|------|
| 4.5.1 | All REST/GraphQL/gRPC endpoints must have **OpenAPI/Swagger**, **GraphQL schema descriptions**, or **protobuf comments** respectively. |
| 4.5.2 | Every endpoint must document: HTTP method, path, description, request parameters, request body schema, response schema (success and error), authentication requirements, rate limits. |
| 4.5.3 | Every DTO / request / response model must have field-level descriptions. |
| 4.5.4 | API docs must include **example requests and responses** for every endpoint. |

---

### 4.6 Type Annotations

| # | Rule |
|---|------|
| 4.6.1 | All function signatures must include **complete type annotations** (parameters and return types). |
| 4.6.2 | Use **strict type checking** where the language supports it (`strict: true` in TypeScript, `mypy --strict` in Python). |
| 4.6.3 | Avoid `any`, `object`, or equivalent catch-all types. Use precise types or generics. |
| 4.6.4 | Complex types must be given **named type aliases** with documentation. |
