# Maestro Studio --- Optional AI Feature TODO

**Status:** Optional feature track\
**Scope:** Separate from the Maestro Studio Major Feature TODO\
**Purpose:** Add provider-agnostic AI capabilities, starting with
functional AI Chat, then a dedicated chat-first Orchestration mode.

> This roadmap does not replace, renumber, or change the status of the
> existing Major Feature TODO. All items below are new and unchecked.

## Product Direction

Implementation order: 1. Provider and context foundation. 2. Functional
AI Chat. 3. Chat context and controlled editing. 4. Tool Registry and
permission model. 5. Interactive Orchestration mode. 6. Custom roles,
role coverage, workflow templates, integrations. 7. Evaluation and
optional fine-tuning.

Principles: - \[ \] AI remains optional; the editor works without an AI
provider. - \[ \] Support provider/model choice through adapters, not
vendor-specific core logic. - \[ \] Chat and Orchestration are distinct
modes with explicit capability boundaries. - \[ \] User validates
requirements, plans, meaningful edits, risky actions, and final
results. - \[ \] Context is visible and configurable; never send the
whole workspace by default. - \[ \] Agent identity does not grant
permission. - \[ \] Use official APIs, authorized endpoints, and models
whose licenses permit intended use. - \[ \] Do not use personal
subscription credentials, private endpoints, or access-control
workarounds. - \[ \] Do not train on workspace code or conversations
without explicit informed opt-in.

## Priority Legend

-   **P0 --- Foundation:** Required for safe, functional Chat.
-   **P1 --- Chat usability:** Everyday coding assistant capabilities.
-   **P2 --- Orchestration MVP:** Interactive planning and execution.
-   **P3 --- Advanced / optional:** Templates, integrations, evaluation,
    fine-tuning.

# Phase A --- AI Foundation

## A1. Provider Gateway and Model Registry --- P0

-   [x] Define provider-neutral request/response contracts.
-   [x] Implement provider adapter interface and lifecycle.
-   [x] Support streaming responses and cancellation.
-   [x] Normalize provider errors.
-   [x] Handle timeout, rate limits, retries, and transient errors.
-   [x] Add provider configuration UI and connection test.
-   [x] Support custom endpoints where appropriate.
-   [x] Add model selection per AI feature.
-   [x] Support different models for Chat and Orchestration.
-   [x] Track model capabilities: streaming, tool calling, structured
    output, context window, vision, code completion/FIM.
-   [x] Detect unsupported capabilities and explain limitations.
-   [x] Document supported providers, API compatibility, and
    limitations.

## A2. Credentials, Privacy, and Data Controls --- P0

-   [x] Store credentials using appropriate OS secure storage.
-   [x] Keep secrets out of Renderer state, workspace settings, logs,
    and crash reports.
-   [x] Provide add, replace, test, and remove credential actions.
-   [x] Explain what data is sent to each configured provider.
-   [x] Add workspace-level AI enable/disable setting.
-   [x] Add file/folder exclusions and secret detection/redaction.
-   [x] Allow users to inspect context before sending.
-   [x] Add conversation retention and clear-history controls.
-   [x] Support local-only configuration for compatible local inference
    endpoints.
-   [x] Document that provider retention and training policies vary.
-   [x] AI degrades gracefully when no provider is configured.

## A3. AI Context Engine --- P0

-   [x] Define normalized context item schema.
-   [x] Support explicitly attached files, selected code, current file,
    and cursor location.
-   [x] Support workspace search and relevant symbols where available.
-   [x] Support LSP diagnostics, Git status/diff, and selected terminal
    output as optional sources.
-   [x] Display context sources attached to a request.
-   [x] Allow removing individual context items.
-   [x] Enforce context limits and relevance prioritization.
-   [x] Avoid sending entire workspace contents by default.
-   [x] Add transparent truncation/compression behavior.
-   [x] Test exclusions, secret filtering, context limits, and source
    attribution.

# Phase B --- Functional AI Chat

## B1. Chat UI and Conversation Lifecycle --- P0

-   [x] Add AI Chat panel/workspace view.
-   [x] Add new conversation and streaming response.
-   [x] Add stop generation, retry, copy response, and copy code.
-   [x] Render Markdown and syntax-highlighted code blocks.
-   [x] Add conversation history, rename, archive, delete, and search.
-   [x] Associate conversations with a workspace optionally.
-   [x] Persist conversation state safely across restarts.
-   [x] Display provider/model used.
-   [x] Show loading, error, cancellation, and empty-response states.
-   [x] Keep Chat usable without editor focus.

## B2. Context-aware Developer Assistance --- P1

-   [x] Add context selectors: `@file`, `@folder`, `@workspace`,
    `@selection`, `@symbol`, `@problems`, `@terminal`, `@git`.
-   [x] Add explain-code and explain-error actions.
-   [x] Add debugging assistance, code review, test generation,
    documentation, and refactoring prompt actions.
-   [x] Add editable prompt templates.
-   [x] Make attached context visible and removable before sending.
-   [x] Add per-conversation context reset.
-   [x] Support optional project instructions.
-   [x] Distinguish project facts and evidence from model assumptions.

## B3. Chat Edit Workflow --- P1

-   [x] Add Ask mode that cannot modify files.
-   [x] Add Edit mode for proposed workspace changes.
-   [x] Define structured change proposal format.
-   [x] Show diffs before applying.
-   [x] Support accept/reject per file and, where feasible, per hunk.
-   [x] Preserve unrelated user edits.
-   [x] Revalidate files before applying proposals.
-   [x] Handle stale proposals after external changes.
-   [x] Create recovery/checkpoint before substantial multi-file edits.
-   [x] Report changed and unchanged files.
-   [x] Never claim edits were applied unless confirmed by the
    application.

## B4. Chat Quality and Resource Controls --- P1

-   [x] Show token/context usage when available.
-   [x] Add configurable request limits and optional cost estimates.
-   [x] Add model fallback configuration.
-   [x] Add keyboard shortcuts and accessibility checks.
-   [x] Add conversation export.
-   [x] Add privacy-safe provider diagnostics.
-   [x] Test streaming, cancellation, history, context, and edit review.

# Phase C --- Tools and Controlled Actions

## C1. Tool Registry --- P1

-   [x] Define tool schema: name, description, input/output schema, risk
    level.
-   [x] Implement registration and discovery.
-   [x] Validate tool inputs and outputs.
-   [x] Execute tools in trusted process/service, not directly in
    Renderer.
-   [x] Enforce permission checks for every invocation.
-   [x] Display tool-call status and results in Chat.
-   [x] Add cancellation, timeout, and audit records.
-   [x] Add allowlist/denylist.
-   [x] Enforce workspace boundaries.
-   [x] Treat file, terminal, and external tool content as untrusted
    input.

## C2. Initial Maestro Tools --- P1

-   [x] Workspace read file and list files.
-   [x] Workspace search.
-   [x] LSP diagnostics retrieval.
-   [x] Git status and diff retrieval.
-   [x] Selected terminal output retrieval.
-   [x] Test result retrieval.
-   [x] Project Management task retrieval when enabled.
-   [x] Add write/patch tools only with explicit permission policy.
-   [x] Add terminal execution only with command review and risk
    controls.

## C3. Tool Permission and Safety --- P1

-   [x] Define read-only, workspace-write, and system-execution tiers.
-   [x] Permit read-only actions automatically only under configured
    policy.
-   [x] Require approval for workspace modifications by default.
-   [x] Require explicit confirmation for risky commands, package
    installation, deletion, and external side effects.
-   [x] Show exact action/command before approval.
-   [x] Do not treat one approval as blanket approval for unrelated
    actions.
-   [x] Add workspace trust checks.
-   [x] Test path traversal and symlink boundaries.
-   [x] Protect against prompt injection from repository content and
    tool output.
-   [x] Explain denied actions.

# Phase D --- Orchestration Mode MVP

## D1. Chat-first Orchestration Mode --- P2

-   [x] Add distinct Orchestration mode in the Chat interface.
-   [x] Keep conversation as the primary user interaction.
-   [x] Introduce a main Project Orchestrator identity.
-   [x] Allow clarifying questions before acting.
-   [x] Distinguish Chat and Orchestration capabilities in UI.
-   [x] Show current state/stage.
-   [x] Support pause, resume, cancel, and safe restart.
-   [x] Persist orchestration progress across application restarts.
-   [x] Allow the user to redirect or revise requests during execution.

## D2. Requirement Discovery and Planning --- P2

-   [x] Analyze request and workspace context.
-   [x] Detect ambiguity and ask focused questions.
-   [x] Identify scope, constraints, dependencies, and acceptance
    criteria.
-   [x] Generate structured requirement summary.
-   [x] Generate implementation plan and dependency-aware task
    breakdown.
-   [x] Identify likely affected files without claiming certainty.
-   [x] Present plan for review and support edits/regeneration.
-   [x] Require user approval before implementation by default.
-   [x] Record approved plan version and decision.

## D3. Agent Identity and Role Profiles --- P2

-   [x] Define Agent Profile schema.
-   [x] Support identity name, title, avatar, description.
-   [x] Support role responsibilities, expertise, instructions, and
    communication style.
-   [x] Support limitations, prohibited actions, output format, and
    response contract.
-   [x] Configure allowed/denied tools.
-   [x] Assign provider/model per profile.
-   [x] Support global and workspace profile scopes.
-   [x] Support create, edit, duplicate, enable/disable, import/export.
-   [x] Validate and version profiles.
-   [x] Ensure identity or seniority never grants permissions.

## D4. Built-in Software House Role Templates --- P2

-   [x] Project Owner / Product Owner.
-   [x] Project Manager.
-   [x] Business Analyst.
-   [x] Product Analyst.
-   [x] Software Architect.
-   [x] Backend Developer.
-   [x] Frontend Developer.
-   [x] Fullstack Developer.
-   [x] Mobile Developer.
-   [x] Database Engineer.
-   [x] Integration Engineer.
-   [x] QA Engineer.
-   [x] Test Automation Engineer.
-   [x] Code Reviewer.
-   [x] Security Engineer.
-   [x] Performance Engineer.
-   [x] DevOps Engineer.
-   [x] Site Reliability Engineer.
-   [x] UX/UI Designer.
-   [x] Technical Writer.
-   [x] Include role description, responsibilities, limitations, tool
    suggestions, and expected outputs.
-   [x] Let users customize/duplicate templates without changing
    originals.

## D5. Role Coverage Analysis and User Confirmation --- P2

-   [x] Infer likely roles from request and approved plan.
-   [x] Mark roles required, recommended, or optional.
-   [x] Compare requirements with active profiles.
-   [x] Detect missing roles before execution.
-   [x] Ask user how to handle missing required roles.
-   [x] Offer add-from-template, create-custom, substitute, merge
    responsibilities, or omit.
-   [x] Explain consequences when a role is omitted.
-   [x] Record team composition decision.
-   [x] Re-evaluate role coverage if scope changes.
-   [x] Never silently imply that missing QA/Security review occurred.
-   [x] Label merged responsibilities and lack of independent review.
-   [x] Support workspace policy for mandatory roles.

## D6. Orchestration Runtime --- P2

-   [x] Define orchestration session/state schema.
-   [x] Implement planner, dispatcher, executor, and state manager.
-   [x] Implement task graph and dependency tracking.
-   [x] Assign tasks to role profiles.
-   [x] Support sequential execution.
-   [x] Support parallel execution only for independent tasks.
-   [x] Implement structured handoff and shared approved
    context/artifact references.
-   [x] Track agent/task/stage status.
-   [x] Handle timeout, cancellation, retry, and failure.
-   [x] Detect blocked tasks and request user input.
-   [x] Detect conflicting outputs and route for resolution.
-   [x] Enforce iteration, token, cost, and concurrency limits.
-   [x] Provide inspectable execution trace.
-   [x] Ensure Orchestrator cannot bypass tool permissions.

## D7. User Approval and Validation Gates --- P2

-   [x] Requirement approval.
-   [x] Team/role composition approval.
-   [x] Implementation plan approval.
-   [x] Approval for major technical decisions.
-   [x] File modification approval.
-   [x] Command execution and dependency installation approval.
-   [x] Confirmation for destructive/external side-effect operations.
-   [x] QA result review.
-   [x] Final user acceptance.
-   [x] Support user-requested changes and return to earlier stages.
-   [x] Record approval/rejection and rationale.
-   [x] Do not mark workflow complete solely because the model claims
    completion.

## D8. Orchestration Artifacts --- P2

-   [x] Requirement brief.
-   [x] Team composition summary.
-   [x] Implementation plan.
-   [x] Task breakdown/dependency graph.
-   [x] Architecture proposal / ADR.
-   [x] Proposed code diff.
-   [x] Test plan and test report.
-   [x] Code review report.
-   [x] Security review report when assigned.
-   [x] Final walkthrough and outstanding risks.
-   [x] Make artifacts viewable, revisable, and linked to session.
-   [x] Export artifacts to workspace only after user approval.

# Phase E --- Templates and Integrations

## E1. Workflow Template Library --- P3

-   [x] Product Planning.
-   [x] Architecture Design.
-   [x] Feature Development.
-   [x] Bug Investigation.
-   [x] Refactoring.
-   [x] Test Planning.
-   [x] Release Preparation.
-   [x] Documentation.
-   [x] Security Review.
-   [x] Allow add/remove/reorder/replace roles.
-   [x] Support optional/conditional stages and dependency-based
    parallelism.
-   [x] Configure approval gates.
-   [x] Create, import/export, and version custom workflows.
-   [x] Validate workflow templates.

## E2. Agent Manager UI --- P3

-   [x] Add Team view.
-   [x] Add Workflow/task graph view.
-   [x] Add Artifacts view.
-   [x] Add execution trace and tool-call history.
-   [x] Show states: idle, planning, running, awaiting approval,
    blocked, completed, failed.
-   [x] Open specialist task context.
-   [x] Keep main Orchestrator conversation primary.
-   [x] Filter by role, task, status, and artifact.
-   [x] Show useful progress summaries without exposing hidden
    reasoning.

## E3. Project Management Integration --- P3

-   [x] Read tasks and acceptance criteria.
-   [x] Link orchestration session to existing task.
-   [x] Propose task creation from approved plan.
-   [x] Require approval before creating/changing tasks by default.
-   [x] Link tasks to files, branches, diffs, and artifacts.
-   [x] Propose status updates based on verified progress.
-   [x] Record test evidence and completion summary.
-   [x] Support task-specific AI conversations and context restoration.
-   [x] Avoid duplicating existing PM features.

## E4. Git, Testing, and Workspace Integration --- P3

-   [x] Create checkpoint before substantial agent changes.
-   [x] Show Git diff during implementation/review.
-   [x] Offer branch-per-task as optional policy.
-   [x] Link commits to task IDs when configured.
-   [x] Run tests/lint through existing Task Runner.
-   [x] Read structured test results where available.
-   [x] Distinguish tests not run, failed, passed, and inconclusive.
-   [x] Do not claim QA approval without evidence or explicit reviewer
    result.
-   [x] Provide recovery guidance for failed multi-file work.
-   [x] Respect existing Git/workspace safety controls.

## E5. MCP and Extension Integration --- P3

-   [x] Add optional MCP client.
-   [x] Discover tools from configured MCP servers.
-   [x] Require explicit configuration for external MCP servers.
-   [x] Apply Maestro permissions to MCP tools.
-   [x] Display tool origin and requested capabilities.
-   [x] Allow disabling/removing MCP servers.
-   [x] Add extension API for AI tools and context providers.
-   [x] Validate extension permissions and isolate untrusted extensions.
-   [x] Document compatibility.

# Phase F --- Evaluation and Optional Fine-tuning

## F1. Evaluation Before Fine-tuning --- P3

-   [ ] Define benchmarks for Chat, edits, planning, handoff, and tool
    use.
-   [ ] Use licensed, synthetic, or explicitly authorized evaluation
    data.
-   [ ] Measure correctness, instruction adherence, tool-call validity,
    and safety.
-   [ ] Measure latency, token use, and cost.
-   [ ] Establish baselines for supported models.
-   [ ] Add regression evaluation for prompt/workflow changes.
-   [ ] Keep evaluation data separate from user workspace content absent
    opt-in.

## F2. Fine-tuning Infrastructure --- P3

-   [ ] Document providers/models supporting intended fine-tuning.
-   [ ] Define training data provenance and licensing requirements.
-   [ ] Require explicit opt-in for user-contributed data.
-   [ ] Add dataset validation/versioning.
-   [ ] Add training configuration/job tracking where supported.
-   [ ] Track model version and evaluation metadata.
-   [ ] Compare fine-tuned model against baseline.
-   [ ] Support rollback to previous model.
-   [ ] Keep role profiles/workflows independent from model weights.
-   [ ] Avoid requiring a separate fine-tuned model for every role.
-   [ ] Document provider-specific limits and portability.

# Phase G --- Security, Reliability, and Release

## G1. Security and Privacy Tests --- P0

-   [ ] Test secret filtering and context exclusions.
-   [ ] Test workspace boundaries, path traversal, and symlink handling.
-   [ ] Test malicious instructions in repository files and
    terminal/tool output.
-   [ ] Test unauthorized tool calls and approval bypass attempts.
-   [ ] Test credential exposure in logs/errors.
-   [ ] Test untrusted MCP/extension tool descriptions.
-   [ ] Document threat model and trust boundaries.

## G2. Reliability and UX Tests --- P1

-   [ ] Test provider disconnect/recovery, rate limits, and timeouts.
-   [ ] Test cancellation during streaming and tool execution.
-   [ ] Test application restart during Chat and Orchestration.
-   [ ] Test stale/corrupt session state.
-   [ ] Test capability mismatch.
-   [ ] Test profile/workflow validation.
-   [ ] Test parallel task failure and dependency blocking.
-   [ ] Test scope changes during execution.
-   [ ] Test keyboard accessibility and screen-reader labels.

## G3. Release Checklist --- P1

-   [ ] AI remains optional and does not block startup.
-   [ ] Provider setup/privacy explanations are clear.
-   [ ] Chat works with at least one supported provider.
-   [ ] Context can be inspected and removed.
-   [ ] Proposed edits are reviewable.
-   [ ] Tool permissions are enforced outside the model.
-   [ ] Orchestration can pause, resume, and cancel.
-   [ ] Missing roles trigger confirmation.
-   [ ] Approval decisions are recorded.
-   [ ] Reports distinguish verified results from assumptions.
-   [ ] Provider compatibility, limitations, and costs are documented.

# Suggested Milestones

  -----------------------------------------------------------------------
  Milestone               Scope                   Exit target
  ----------------------- ----------------------- -----------------------
  AI-M0                   Provider, model         One provider configured
                          registry, secure        and tested
                          credentials, context    
                          foundation              

  AI-M1                   Functional AI Chat      Streaming, history,
                                                  context attachments,
                                                  cancellation

  AI-M2                   Chat developer UX       Context selectors,
                                                  prompt actions, project
                                                  instructions

  AI-M3                   Chat Edit Mode          Reviewable diff,
                                                  accept/reject, recovery

  AI-M4                   Tool Registry           Read tools,
                                                  permissions, tool
                                                  result UI

  AI-M5                   Orchestration Planning  Orchestrator,
                                                  clarification, role
                                                  coverage, approved plan

  AI-M6                   Orchestration Execution Task graph, profiles,
                                                  handoff, persistence

  AI-M7                   Validation and          Approval gates,
                          Artifacts               reports, final
                                                  acceptance

  AI-M8                   Templates and           Role/workflow library,
                          Integrations            PM, MCP

  AI-M9                   Evaluation and          Benchmarks, data
                          Fine-tuning             governance, optional
                                                  training path
  -----------------------------------------------------------------------

## Recommended First Implementation Batch

-   [x] Provider gateway with one official API integration.
-   [x] Secure API credential storage.
-   [x] Basic model selection.
-   [x] Streaming AI Chat.
-   [x] Conversation history.
-   [x] Attach current file or selected code.
-   [x] Context preview.
-   [x] Stop and retry response.
-   [x] Clear provider-data/privacy notice.
-   [x] Tests for credential handling, streaming, cancellation, and
    context filtering.

**Do not begin with multi-agent orchestration or fine-tuning.** First
prove Chat is dependable, context handling is safe, and the provider
abstraction is stable. Orchestration should reuse these foundations
rather than becoming a disconnected subsystem.
