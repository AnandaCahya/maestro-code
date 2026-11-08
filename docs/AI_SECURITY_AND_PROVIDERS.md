# Maestro Studio --- AI Security, Providers, and Trust Boundaries

## 1. Overview and Design Principles

Maestro Studio integrates optional AI capabilities with strict privacy, security, and developer control at the forefront:
- **Optional & Non-Blocking**: The editor runs with 100% functionality even when no AI provider is configured.
- **Provider-Neutral**: Supports OpenAI, Anthropic, Google Gemini, Ollama (Local), and custom OpenAI-compatible endpoints.
- **Local-First Option**: Complete local operation via Ollama (`http://localhost:11434`) with zero cloud transmissions.
- **Explicit Consent**: Context is never sent automatically in its entirety; only user-attached files, selected code, and diagnostics are packaged.

---

## 2. Threat Model and Trust Boundaries

| Boundary | Mechanism | Guarantee |
|---|---|---|
| **OS Secure Storage** | Electron `safeStorage` (DPAPI on Windows, Keychain on macOS, Secret Service on Linux) with encrypted AES-256 fallback | API Keys are never stored in plaintext, never exposed in renderer logs, and masked as `sk-...1234`. |
| **Context Redaction** | `AiContextEngine.redactSecrets()` | Automatically detects and replaces OpenAI/Anthropic/AWS/GitHub tokens and Bearer credentials with `[REDACTED_*]`. |
| **Workspace Boundaries** | `AiToolRegistry.validateAndResolvePath()` | Prevents path traversal (`../`) and null-byte injection; access is strictly confined within the workspace root. |
| **Untrusted Content** | Strict separation of System Prompts vs Repository Context | Code files and tool outputs are tagged as untrusted input to defend against prompt injection. |

---

## 3. Tool Permission Tiers

Maestro AI enforces a 3-tier safety model:

1. **Tier 1: Read-Only (`read-only`)**
   - *Tools*: `workspace_list_files`, `workspace_read_file`, `workspace_search`, `lsp_get_diagnostics`, `git_get_status_and_diff`, `project_get_tasks`.
   - *Policy*: Auto-approved under workspace safety policy or prompted per user preference.
2. **Tier 2: Workspace Write (`workspace-write`)**
   - *Tools*: `workspace_write_file`, proposed diff patches.
   - *Policy*: **Requires explicit user approval** before any file is created or modified.
3. **Tier 3: System Execution (`system-execution`)**
   - *Tools*: Terminal command executions, package installations.
   - *Policy*: **Requires explicit confirmation** displaying the exact command, working directory, and risk rationale. Blanket approvals are prohibited.

---

## 4. Supported Providers & Compatibility

| Provider | Type | Streaming | Tool Calling | Vision | Context Window |
|---|---|---|---|---|---|
| **OpenAI** (`gpt-4o`, `gpt-4o-mini`, `o3-mini`) | Cloud API | Yes (SSE) | Yes | Yes | 128k - 200k tokens |
| **Anthropic** (`claude-3-7-sonnet`, `claude-3-5-sonnet`) | Cloud API | Yes (SSE) | Yes | Yes | 200k tokens |
| **Google Gemini** (`gemini-2.0-flash`, `gemini-1.5-pro`) | Cloud API | Yes (SSE) | Yes | Yes | 1M - 2M tokens |
| **Ollama** (`qwen2.5-coder`, `llama3.1`, `deepseek-r1`) | Local / Offline | Yes (NDJSON) | Yes (model-dependent) | Optional | 32k - 128k tokens |
| **Custom** (LM Studio, vLLM, LocalAI) | OpenAI-Compatible | Yes (SSE) | Yes | Optional | Configurable |

---

## 5. Evaluation and Fine-Tuning Governance

- **Evaluation Benchmarks**: Synthetic test cases evaluate chat adherence, diff syntax validity, role assignment, and safety under adversarial inputs.
- **Data Governance**: User workspace code and chat histories are **strictly excluded** from fine-tuning datasets unless the user explicitly opts in with an approved permissive license (e.g. MIT, Apache-2.0).
