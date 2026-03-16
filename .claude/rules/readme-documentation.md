## Rule 3 — README & Deployment Documentation

Every project **must** include a `README.md` at the repository root that is detailed enough for a deployment engineer — with no prior context about the project — to set up, configure, deploy, and verify the application.

---

### 3.1 Required README Sections

The README must contain **all** of the following sections, in order:

#### 3.1.1 Project Title & Description

- One-line summary of what the project does.
- A short paragraph (3–5 sentences) explaining the business problem solved, the target users, and the high-level approach.

#### 3.1.2 Table of Contents

- Auto-generated or manually maintained. Required for any README exceeding 100 lines.

#### 3.1.3 Architecture Overview

- High-level diagram (ASCII, Mermaid, or linked image) showing major components, data flow, and external integrations.
- List of services, databases, message queues, and third-party APIs involved.

#### 3.1.4 Technology Stack

- Language and version (e.g., Python 3.12, Node.js 20 LTS).
- Framework and version.
- Database(s) and version(s).
- Key libraries/dependencies with their purpose.
- Infrastructure requirements (Docker, Kubernetes, cloud provider services).

#### 3.1.5 Prerequisites

- Required software with minimum versions.
- Required accounts / access (cloud provider, third-party APIs).
- Required environment variables (list every variable with description, expected format, and example value — **never** include actual secrets).

#### 3.1.6 Local Development Setup

Step-by-step instructions:

```
1. Clone the repository
2. Install dependencies
3. Set up environment variables
4. Set up the database (migrations, seed data)
5. Run the application locally
6. Verify it works (health check URL, expected output)
```

#### 3.1.7 Testing

- How to run unit tests.
- How to run integration tests.
- How to run end-to-end tests.
- How to view test coverage reports.
- Minimum coverage thresholds.

#### 3.1.8 Deployment Guide

This section must be **comprehensive enough for a first-time deployer**:

| Sub-section                   | Contents                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| **Build**                     | Exact build commands, Docker build instructions, artifact output locations.          |
| **Environment Configuration** | All environment variables, secrets management, config files per environment.         |
| **Database Migrations**       | How to run migrations, rollback procedures, data seeding.                            |
| **Deployment Steps**          | Step-by-step deployment procedure for each target environment (staging, production). |
| **Infrastructure**            | Required infrastructure resources, IaC references (Terraform, CloudFormation, etc.). |
| **CI/CD Pipeline**            | Overview of the pipeline, trigger conditions, manual approval gates.                 |
| **Health Checks**             | Endpoints to verify successful deployment (`/health`, `/ready`).                     |
| **Rollback Procedure**        | Exact steps to revert to the previous version.                                       |
| **Monitoring & Alerts**       | Where to find logs, dashboards, and alert configurations.                            |

#### 3.1.9 API Documentation

- Link to API documentation (Swagger/OpenAPI, Postman collection).
- If no external docs exist, include endpoint summary table: method, path, description, auth required.

#### 3.1.10 Project Structure

- Directory tree with one-line descriptions for each top-level directory and key files.

#### 3.1.11 Contributing

- Branch naming convention.
- Commit message format.
- PR process and review requirements.
- Code style / linting configuration.

#### 3.1.12 Troubleshooting / FAQ

- Common setup issues and their solutions.
- Known limitations.

#### 3.1.13 License

- License type and link to `LICENSE` file.

---

### 3.2 README Quality Rules

| #     | Rule                                                                                                              |
| ----- | ----------------------------------------------------------------------------------------------------------------- |
| 3.2.1 | All commands must be **copy-pasteable**. No placeholder syntax without explanation.                               |
| 3.2.2 | Every environment variable must list: name, description, format, example, and whether it is required or optional. |
| 3.2.3 | Version numbers must be **specific** (e.g., `Node.js >= 20.11.0`), not vague (e.g., "latest").                    |
| 3.2.4 | The README must be kept **in sync** with the codebase. Outdated docs are worse than no docs.                      |
| 3.2.5 | Use code blocks with language identifiers for all commands and configuration examples.                            |
