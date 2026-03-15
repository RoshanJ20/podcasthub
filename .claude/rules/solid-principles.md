## Rule 1 — SOLID Principles

All generated code **must** strictly adhere to the five SOLID principles of object-oriented design. These principles apply regardless of the primary paradigm (OOP, functional, procedural) — their spirit must be respected even when the language does not enforce classes.

---

### 1.1 Single Responsibility Principle (SRP)

> _A module, class, or function should have one — and only one — reason to change._

#### Sub-rules

| #     | Rule                                                                                                        | Rationale                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1.1.1 | Every function must do **exactly one thing**. If a function name requires the word "and", it must be split. | Keeps units testable and comprehensible.                           |
| 1.1.2 | Every class/module must own **one cohesive area of responsibility**.                                        | Prevents god-objects that become maintenance bottlenecks.          |
| 1.1.3 | Side effects (I/O, logging, metrics) must be **separated** from pure business logic.                        | Enables unit testing without mocking infrastructure.               |
| 1.1.4 | Configuration loading, validation, and usage must reside in **separate layers**.                            | Prevents environment-specific logic from leaking into domain code. |

#### Do's and Don'ts

- **Do:** Create a `UserValidator` that only validates user data and a `UserRepository` that only persists it.
- **Don't:** Create a `UserManager` that validates, persists, sends emails, and writes audit logs.

---

### 1.2 Open/Closed Principle (OCP)

> _Software entities should be open for extension but closed for modification._

#### Sub-rules

| #     | Rule                                                                                                                      | Rationale                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1.2.1 | Use **abstractions** (interfaces, abstract classes, protocols) to define extension points.                                | New behaviour is added by writing new code, not editing existing code. |
| 1.2.2 | Prefer **strategy/plugin patterns** over `if/else` or `switch` chains that grow with new cases.                           | Eliminates shotgun surgery when adding new variants.                   |
| 1.2.3 | Configuration-driven behaviour (feature flags, rule engines) must be preferred over hard-coded branches where applicable. | Reduces deployment risk when toggling features.                        |

#### Do's and Don'ts

- **Do:** Define a `PaymentProcessor` interface and add new processors (`StripeProcessor`, `PayPalProcessor`) as separate implementations.
- **Don't:** Add another `elif payment_type == "paypal"` inside a 500-line function.

---

### 1.3 Liskov Substitution Principle (LSP)

> _Subtypes must be substitutable for their base types without altering correctness._

#### Sub-rules

| #     | Rule                                                                                                 | Rationale                                                 |
| ----- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1.3.1 | Subclasses must **honour the contract** (preconditions, postconditions, invariants) of their parent. | Prevents runtime surprises when polymorphism is used.     |
| 1.3.2 | Never throw unexpected exceptions or return incompatible types in overridden methods.                | Callers relying on the base type contract must not break. |
| 1.3.3 | Prefer **composition over inheritance** when the "is-a" relationship is not semantically accurate.   | Avoids fragile base-class problems.                       |

#### Do's and Don'ts

- **Do:** Ensure `ReadOnlyRepository` does not inherit from `Repository` if `Repository` exposes `save()` and `delete()`.
- **Don't:** Override `save()` in `ReadOnlyRepository` to throw `NotImplementedError` — this violates the contract.

---

### 1.4 Interface Segregation Principle (ISP)

> _Clients should not be forced to depend on interfaces they do not use._

#### Sub-rules

| #     | Rule                                                                                                                              | Rationale                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1.4.1 | Interfaces must be **small and role-specific**.                                                                                   | Prevents "fat interfaces" that force dummy implementations. |
| 1.4.2 | If a class implements an interface but leaves methods as no-ops or raises `NotImplementedError`, the interface **must be split**. | A clear signal that ISP is being violated.                  |
| 1.4.3 | Favour multiple small interfaces over a single large one. A class may implement many interfaces.                                  | Keeps coupling low and intent explicit.                     |

#### Do's and Don'ts

- **Do:** Split `Printer`, `Scanner`, and `Faxer` into three interfaces.
- **Don't:** Create `IMultiFunctionDevice` with `print()`, `scan()`, and `fax()` when most devices only print.

---

### 1.5 Dependency Inversion Principle (DIP)

> _High-level modules must not depend on low-level modules. Both should depend on abstractions._

#### Sub-rules

| #     | Rule                                                                                                                                     | Rationale                                                           |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1.5.1 | All external dependencies (databases, APIs, file systems, message queues) must be accessed through **abstractions** (interfaces/ports).  | Enables swapping implementations and simplifies testing.            |
| 1.5.2 | Use **dependency injection** (constructor injection preferred) to provide concrete implementations.                                      | Makes dependencies explicit and testable.                           |
| 1.5.3 | Never instantiate infrastructure classes inside domain/business logic.                                                                   | Preserves the independence of the core domain.                      |
| 1.5.4 | A **composition root** (entry point, DI container, or factory) must be the only place where concrete implementations are wired together. | Single place to change wiring; the rest of the code stays abstract. |

#### Do's and Don'ts

- **Do:** Inject `EmailService` interface into `OrderProcessor`; wire `SmtpEmailService` at the composition root.
- **Don't:** Call `new SmtpEmailService()` inside `OrderProcessor.process()`.
