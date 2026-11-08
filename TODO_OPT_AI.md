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

-   [ ] Define provider-neutral request/response contracts.
-   [ ] Implement provider adapter interface and lifecycle.
-   [ ] Support streaming responses and cancellation.
-   [ ] Normalize provider errors.
-   [ ] Handle timeout, rate limits, retries, and transient errors.
-   [ ] Add provider configuration UI and connection test.
-   [ ] Support custom endpoints where appropriate.
-   [ ] Add model selection per AI feature.
-   [ ] Support different models for Chat and Orchestration.
-   [ ] Track model capabilities: streaming, tool calling, structured
    output, context window, vision, code completion/FIM.
-   [ ] Detect unsupported capabilities and explain limitations.
-   [ ] Document supported providers, API compatibility, and
    limitations.

## A2. Credentials, Privacy, and Data Controls --- P0

-   [ ] Store credentials using appropriate OS secure storage.
-   [ ] Keep secrets out of Renderer state, workspace settings, logs,
    and crash reports.
-   [ ] Provide add, replace, test, and remove credential actions.
-   [ ] Explain what data is sent to each configured provider.
-   [ ] Add workspace-level AI enable/disable setting.
-   [ ] Add file/folder exclusions and secret detection/redaction.
-   [ ] Allow users to inspect context before sending.
-   [ ] Add conversation retention and clear-history controls.
-   [ ] Support local-only configuration for compatible local inference
    endpoints.
-   [ ] Document that provider retention and training policies vary.
-   [ ] AI degrades gracefully when no provider is configured.

## A3. AI Context Engine --- P0

-   [ ] Define normalized context item schema.
-   [ ] Support explicitly attached files, selected code, current file,
    and cursor location.
-   [ ] Support workspace search and relevant symbols where available.
-   [ ] Support LSP diagnostics, Git status/diff, and selected terminal
    output as optional sources.
-   [ ] Display context sources attached to a request.
-   [ ] Allow removing individual context items.
-   [ ] Enforce context limits and relevance prioritization.
-   [ ] Avoid sending entire workspace contents by default.
-   [ ] Add transparent truncation/compression behavior.
-   [ ] Test exclusions, secret filtering, context limits, and source
    attribution.

# Phase B --- Functional AI Chat

## B1. Chat UI and Conversation Lifecycle --- P0

-   [ ] Add AI Chat panel/workspace view.
-   [ ] Add new conversation and streaming response.
-   [ ] Add stop generation, retry, copy response, and copy code.
-   [ ] Render Markdown and syntax-highlighted code blocks.
-   [ ] Add conversation history, rename, archive, delete, and search.
-   [ ] Associate conversations with a workspace optionally.
-   [ ] Persist conversation state safely across restarts.
-   [ ] Display provider/model used.
-   [ ] Show loading, error, cancellation, and empty-response states.
-   [ ] Keep Chat usable without editor focus.

## B2. Context-aware Developer Assistance --- P1

-   [ ] Add context selectors: `@file`, `@folder`, `@workspace`,
    `@selection`, `@symbol`, `@problems`, `@terminal`, `@git`.
-   [ ] Add explain-code and explain-error actions.
-   [ ] Add debugging assistance, code review, test generation,
    documentation, and refactoring prompt actions.
-   [ ] Add editable prompt templates.
-   [ ] Make attached context visible and removable before sending.
-   [ ] Add per-conversation context reset.
-   [ ] Support optional project instructions.
-   [ ] Distinguish project facts and evidence from model assumptions.

## B3. Chat Edit Workflow --- P1

-   [ ] Add Ask mode that cannot modify files.
-   [ ] Add Edit mode for proposed workspace changes.
-   [ ] Define structured change proposal format.
-   [ ] Show diffs before applying.
-   [ ] Support accept/reject per file and, where feasible, per hunk.
-   [ ] Preserve unrelated user edits.
-   [ ] Revalidate files before applying proposals.
-   [ ] Handle stale proposals after external changes.
-   [ ] Create recovery/checkpoint before substantial multi-file edits.
-   [ ] Report changed and unchanged files.
-   [ ] Never claim edits were applied unless confirmed by the
    application.

## B4. Chat Quality and Resource Controls --- P1

-   [ ] Show token/context usage when available.
-   [ ] Add configurable request limits and optional cost estimates.
-   [ ] Add model fallback configuration.
-   [ ] Add keyboard shortcuts and accessibility checks.
-   [ ] Add conversation export.
-   [ ] Add privacy-safe provider diagnostics.
-   [ ] Test streaming, cancellation, history, context, and edit review.

# Phase C --- Tools and Controlled Actions

## C1. Tool Registry --- P1

-   [ ] Define tool schema: name, description, input/output schema, risk
    level.
-   [ ] Implement registration and discovery.
-   [ ] Validate tool inputs and outputs.
-   [ ] Execute tools in trusted process/service, not directly in
    Renderer.
-   [ ] Enforce permission checks for every invocation.
-   [ ] Display tool-call status and results in Chat.
-   [ ] Add cancellation, timeout, and audit records.
-   [ ] Add allowlist/denylist.
-   [ ] Enforce workspace boundaries.
-   [ ] Treat file, terminal, and external tool content as untrusted
    input.

## C2. Initial Maestro Tools --- P1

-   [ ] Workspace read file and list files.
-   [ ] Workspace search.
-   [ ] LSP diagnostics retrieval.
-   [ ] Git status and diff retrieval.
-   [ ] Selected terminal output retrieval.
-   [ ] Test result retrieval.
-   [ ] Project Management task retrieval when enabled.
-   [ ] Add write/patch tools only with explicit permission policy.
-   [ ] Add terminal execution only with command review and risk
    controls.

## C3. Tool Permission and Safety --- P1

-   [ ] Define read-only, workspace-write, and system-execution tiers.
-   [ ] Permit read-only actions automatically only under configured
    policy.
-   [ ] Require approval for workspace modifications by default.
-   [ ] Require explicit confirmation for risky commands, package
    installation, deletion, and external side effects.
-   [ ] Show exact action/command before approval.
-   [ ] Do not treat one approval as blanket approval for unrelated
    actions.
-   [ ] Add workspace trust checks.
-   [ ] Test path traversal and symlink boundaries.
-   [ ] Protect against prompt injection from repository content and
    tool output.
-   [ ] Explain denied actions.

# Phase D --- Orchestration Mode MVP

## D1. Chat-first Orchestration Mode --- P2

-   [ ] Add distinct Orchestration mode in the Chat interface.
-   [ ] Keep conversation as the primary user interaction.
-   [ ] Introduce a main Project Orchestrator identity.
-   [ ] Allow clarifying questions before acting.
-   [ ] Distinguish Chat and Orchestration capabilities in UI.
-   [ ] Show current state/stage.
-   [ ] Support pause, resume, cancel, and safe restart.
-   [ ] Persist orchestration progress across application restarts.
-   [ ] Allow the user to redirect or revise requests during execution.

## D2. Requirement Discovery and Planning --- P2

-   [ ] Analyze request and workspace context.
-   [ ] Detect ambiguity and ask focused questions.
-   [ ] Identify scope, constraints, dependencies, and acceptance
    criteria.
-   [ ] Generate structured requirement summary.
-   [ ] Generate implementation plan and dependency-aware task
    breakdown.
-   [ ] Identify likely affected files without claiming certainty.
-   [ ] Present plan for review and support edits/regeneration.
-   [ ] Require user approval before implementation by default.
-   [ ] Record approved plan version and decision.

## D3. Agent Identity and Role Profiles --- P2

-   [ ] Define Agent Profile schema.
-   [ ] Support identity name, title, avatar, description.
-   [ ] Support role responsibilities, expertise, instructions, and
    communication style.
-   [ ] Support limitations, prohibited actions, output format, and
    response contract.
-   [ ] Configure allowed/denied tools.
-   [ ] Assign provider/model per profile.
-   [ ] Support global and workspace profile scopes.
-   [ ] Support create, edit, duplicate, enable/disable, import/export.
-   [ ] Validate and version profiles.
-   [ ] Ensure identity or seniority never grants permissions.

## D4. Built-in Software House Role Templates --- P2

-   [ ] Project Owner / Product Owner.
-   [ ] Project Manager.
-   [ ] Business Analyst.
-   [ ] Product Analyst.
-   [ ] Software Architect.
-   [ ] Backend Developer.
-   [ ] Frontend Developer.
-   [ ] Fullstack Developer.
-   [ ] Mobile Developer.
-   [ ] Database Engineer.
-   [ ] Integration Engineer.
-   [ ] QA Engineer.
-   [ ] Test Automation Engineer.
-   [ ] Code Reviewer.
-   [ ] Security Engineer.
-   [ ] Performance Engineer.
-   [ ] DevOps Engineer.
-   [ ] Site Reliability Engineer.
-   [ ] UX/UI Designer.
-   [ ] Technical Writer.
-   [ ] Include role description, responsibilities, limitations, tool
    suggestions, and expected outputs.
-   [ ] Let users customize/duplicate templates without changing
    originals.

## D5. Role Coverage Analysis and User Confirmation --- P2

-   [ ] Infer likely roles from request and approved plan.
-   [ ] Mark roles required, recommended, or optional.
-   [ ] Compare requirements with active profiles.
-   [ ] Detect missing roles before execution.
-   [ ] Ask user how to handle missing required roles.
-   [ ] Offer add-from-template, create-custom, substitute, merge
    responsibilities, or omit.
-   [ ] Explain consequences when a role is omitted.
-   [ ] Record team composition decision.
-   [ ] Re-evaluate role coverage if scope changes.
-   [ ] Never silently imply that missing QA/Security review occurred.
-   [ ] Label merged responsibilities and lack of independent review.
-   [ ] Support workspace policy for mandatory roles.

## D6. Orchestration Runtime --- P2

-   [ ] Define orchestration session/state schema.
-   [ ] Implement planner, dispatcher, executor, and state manager.
-   [ ] Implement task graph and dependency tracking.
-   [ ] Assign tasks to role profiles.
-   [ ] Support sequential execution.
-   [ ] Support parallel execution only for independent tasks.
-   [ ] Implement structured handoff and shared approved
    context/artifact references.
-   [ ] Track agent/task/stage status.
-   [ ] Handle timeout, cancellation, retry, and failure.
-   [ ] Detect blocked tasks and request user input.
-   [ ] Detect conflicting outputs and route for resolution.
-   [ ] Enforce iteration, token, cost, and concurrency limits.
-   [ ] Provide inspectable execution trace.
-   [ ] Ensure Orchestrator cannot bypass tool permissions.

## D7. User Approval and Validation Gates --- P2

-   [ ] Requirement approval.
-   [ ] Team/role composition approval.
-   [ ] Implementation plan approval.
-   [ ] Approval for major technical decisions.
-   [ ] File modification approval.
-   [ ] Command execution and dependency installation approval.
-   [ ] Confirmation for destructive/external side-effect operations.
-   [ ] QA result review.
-   [ ] Final user acceptance.
-   [ ] Support user-requested changes and return to earlier stages.
-   [ ] Record approval/rejection and rationale.
-   [ ] Do not mark workflow complete solely because the model claims
    completion.

## D8. Orchestration Artifacts --- P2

-   [ ] Requirement brief.
-   [ ] Team composition summary.
-   [ ] Implementation plan.
-   [ ] Task breakdown/dependency graph.
-   [ ] Architecture proposal / ADR.
-   [ ] Proposed code diff.
-   [ ] Test plan and test report.
-   [ ] Code review report.
-   [ ] Security review report when assigned.
-   [ ] Final walkthrough and outstanding risks.
-   [ ] Make artifacts viewable, revisable, and linked to session.
-   [ ] Export artifacts to workspace only after user approval.

# Phase E --- Templates and Integrations

## E1. Workflow Template Library --- P3

-   [ ] Product Planning.
-   [ ] Architecture Design.
-   [ ] Feature Development.
-   [ ] Bug Investigation.
-   [ ] Refactoring.
-   [ ] Test Planning.
-   [ ] Release Preparation.
-   [ ] Documentation.
-   [ ] Security Review.
-   [ ] Allow add/remove/reorder/replace roles.
-   [ ] Support optional/conditional stages and dependency-based
    parallelism.
-   [ ] Configure approval gates.
-   [ ] Create, import/export, and version custom workflows.
-   [ ] Validate workflow templates.

## E2. Agent Manager UI --- P3

-   [ ] Add Team view.
-   [ ] Add Workflow/task graph view.
-   [ ] Add Artifacts view.
-   [ ] Add execution trace and tool-call history.
-   [ ] Show states: idle, planning, running, awaiting approval,
    blocked, completed, failed.
-   [ ] Open specialist task context.
-   [ ] Keep main Orchestrator conversation primary.
-   [ ] Filter by role, task, status, and artifact.
-   [ ] Show useful progress summaries without exposing hidden
    reasoning.

## E3. Project Management Integration --- P3

-   [ ] Read tasks and acceptance criteria.
-   [ ] Link orchestration session to existing task.
-   [ ] Propose task creation from approved plan.
-   [ ] Require approval before creating/changing tasks by default.
-   [ ] Link tasks to files, branches, diffs, and artifacts.
-   [ ] Propose status updates based on verified progress.
-   [ ] Record test evidence and completion summary.
-   [ ] Support task-specific AI conversations and context restoration.
-   [ ] Avoid duplicating existing PM features.

## E4. Git, Testing, and Workspace Integration --- P3

-   [ ] Create checkpoint before substantial agent changes.
-   [ ] Show Git diff during implementation/review.
-   [ ] Offer branch-per-task as optional policy.
-   [ ] Link commits to task IDs when configured.
-   [ ] Run tests/lint through existing Task Runner.
-   [ ] Read structured test results where available.
-   [ ] Distinguish tests not run, failed, passed, and inconclusive.
-   [ ] Do not claim QA approval without evidence or explicit reviewer
    result.
-   [ ] Provide recovery guidance for failed multi-file work.
-   [ ] Respect existing Git/workspace safety controls.

## E5. MCP and Extension Integration --- P3

-   [ ] Add optional MCP client.
-   [ ] Discover tools from configured MCP servers.
-   [ ] Require explicit configuration for external MCP servers.
-   [ ] Apply Maestro permissions to MCP tools.
-   [ ] Display tool origin and requested capabilities.
-   [ ] Allow disabling/removing MCP servers.
-   [ ] Add extension API for AI tools and context providers.
-   [ ] Validate extension permissions and isolate untrusted extensions.
-   [ ] Document compatibility.

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

-   [ ] Provider gateway with one official API integration.
-   [ ] Secure API credential storage.
-   [ ] Basic model selection.
-   [ ] Streaming AI Chat.
-   [ ] Conversation history.
-   [ ] Attach current file or selected code.
-   [ ] Context preview.
-   [ ] Stop and retry response.
-   [ ] Clear provider-data/privacy notice.
-   [ ] Tests for credential handling, streaming, cancellation, and
    context filtering.

**Do not begin with multi-agent orchestration or fine-tuning.** First
prove Chat is dependable, context handling is safe, and the provider
abstraction is stable. Orchestration should reuse these foundations
rather than becoming a disconnected subsystem.
