# Task: Plan the Development of Saving Worlds

You are acting as a senior software architect and technical project planner.

I want to build a production-ready iOS mobile application called **Saving Worlds**, using Claude Code for implementation.

Your job is to analyze the attached product document, design the technical architecture, break the project into manageable development phases, and create a structured documentation and prompt system that allows Claude Code to implement the application across multiple independent chat sessions.

**Important: Do not implement the application yet. Your task is planning, architecture, documentation, and preparing the development prompts.**

## 1. Product Context

Saving Worlds is a gamified savings goal tracking application.

Users create financial savings goals and progressively build beautiful visual worlds as they record their savings.

For example, a user saving €2,000 can build an island that gradually gains trees, paths, buildings, and decorations as the savings goal progresses.

The application does not hold or transfer real money. It only tracks savings entered by the user.

### Core requirements

- iOS-first application.
- React Native with Expo and TypeScript.
- No user accounts or backend for the initial release.
- Offline-first architecture using SQLite.
- Free version includes one active savings goal and the Island theme.
- Pro unlocks unlimited goals, the Garden theme, and additional functionality.
- Each theme contains 10 main progression stages.
- Cozy isometric 2.5D visual style.
- Users can record deposits and withdrawals.
- Savings progress must be calculated from transaction history.
- Optional savings deadline with automatic weekly/monthly calculations.
- Basic savings challenges included in the MVP.
- Local notifications and savings reminders.
- In-app purchases for Pro and future premium themes.
- No AI integration in the MVP.
- No subscriptions planned for the initial release.
- Pro pricing and future theme entitlements are not finalized.

The attached product document is the primary source of truth for product requirements.

If anything in this prompt conflicts with the attached document, identify the conflict and document it before making assumptions.

## 2. Project Location

Create the project structure on my Desktop:

`~/Desktop/SavingWorld/`

Inside this folder, create:

```text
SavingWorld/
├── docs/
│   ├── README.md
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── DATA_MODEL.md
│   ├── UI_UX_GUIDELINES.md
│   ├── DEVELOPMENT_ROADMAP.md
│   ├── DEVELOPMENT_RULES.md
│   ├── DECISIONS.md
│   ├── PROJECT_STATUS.md
│   ├── SESSION_HANDOFF.md
│   └── prompts/
│       ├── PHASE_01.md
│       ├── PHASE_02.md
│       └── ...
```

You may improve this structure if necessary, but keep it simple, clear, and maintainable.

## 3. Architecture and Technology Decisions

Analyze the attached product requirements and recommend a production-quality architecture.

My preferred technologies are:

- React Native
- Expo
- TypeScript
- Expo Router
- Zustand
- SQLite
- React Native Reanimated
- React Native Skia, if appropriate
- Lottie, if appropriate

You may recommend alternatives when there is a strong technical reason.

Consider:

- Modular and maintainable architecture.
- Separation of business logic and presentation.
- Local database schema and migrations.
- State management.
- Offline-first behavior.
- Savings transaction accuracy.
- Handling multiple currencies.
- Progression and achievement systems.
- Visual theme architecture.
- Asset management and animation performance.
- Local notifications.
- In-app purchases and entitlement management.
- Data backup and restoration.
- Error handling and testing.
- Accessibility.
- iOS App Store requirements.

Do not overengineer the application.

Explain the reasoning behind important architectural decisions.

## 4. Development Roadmap

Break the complete MVP into logical, independently manageable development phases.

Each phase should have:

1. Clear objectives.
2. Exact implementation scope.
3. Dependencies on previous phases.
4. Files and modules expected to be created or modified.
5. Technical requirements.
6. Acceptance criteria.
7. Tests and verification steps.
8. Definition of Done.
9. Explicit out-of-scope items.

Choose the number of phases based on the actual complexity of the application.

Do not force an arbitrary number.

Each phase should be small enough for Claude Code to complete in a focused development session without losing context.

Avoid phases that are so large that they require implementing multiple unrelated systems at once.

## 5. Claude Code Multi-Session Workflow

This is one of the most important requirements.

Claude Code will implement this application across multiple independent chat sessions.

Each session may start without any knowledge of previous conversations.

Therefore, the project must maintain its own persistent development context through documentation stored in the repository.

Create a reliable workflow where Claude Code can:

- Read the project documentation.
- Understand the current architecture.
- Identify completed and incomplete work.
- Continue from the latest verified project state.
- Avoid duplicating previous implementations.
- Follow established architectural decisions.
- Update documentation after finishing a phase.
- Prepare the next session for continuation.

### Required context files

**PROJECT_STATUS.md**

Must track:

- Current development phase.
- Completed phases.
- Work in progress.
- Known bugs and limitations.
- Verification results.
- Outstanding tasks.
- Next recommended actions.

**SESSION_HANDOFF.md**

Must track:

- What was completed in the latest session.
- Important implementation decisions.
- Files and modules changed.
- Tests performed and their results.
- Any unfinished work.
- Exact instructions for the next session.

**DECISIONS.md**

Must record significant architectural and product decisions, their rationale, and any tradeoffs.

**DEVELOPMENT_RULES.md**

Must define coding conventions, architecture rules, documentation requirements, testing expectations, and how Claude Code should finish each development session.

These files should be updated by Claude Code after every completed phase.

## 6. Phase Prompts

Create a separate prompt file for every development phase:

`docs/prompts/PHASE_01.md`

`docs/prompts/PHASE_02.md`

And so on.

Each prompt must be written as a complete, actionable instruction for Claude Code.

Every phase prompt must instruct Claude Code to:

1. Read `docs/README.md`.
2. Read the product requirements and relevant architecture documents.
3. Read `PROJECT_STATUS.md` and `SESSION_HANDOFF.md`.
4. Inspect the existing codebase before making changes.
5. Check the phase dependencies and acceptance criteria.
6. Implement only the requested phase.
7. Follow established project conventions.
8. Run relevant tests, linting, and TypeScript checks.
9. Update project documentation and handoff files.
10. Explain what was completed, what remains, and any blockers.

Claude Code must never assume that previous phases were successfully completed without verifying the actual repository state.

If a phase is partially complete, it should resume the missing work instead of duplicating the implementation.

Do not create phase prompts that depend on previous chat history.

All required context must come from the repository and documentation.

## 7. Continuation Between Claude Code Sessions

Design a simple process for moving between sessions.

My desired workflow:

**Session 1**

I open Claude Code in the SavingWorld project folder.

I paste the content of `PHASE_01.md`.

Claude Code reads the documentation, implements the first phase, verifies its work, and updates the status and handoff documents.

**Session 2**

I start a completely new Claude Code conversation.

I paste the content of `PHASE_02.md`.

Claude Code reads the latest project state, understands what was completed, and continues development.

Repeat this process until the MVP is finished.

The documentation should remain the source of truth, not the conversation history.

At the end of every phase, Claude Code should explicitly tell me which prompt file to use next.

If the current phase is incomplete, it must recommend continuing that phase instead of moving forward.

## 8. Important Product and Engineering Considerations

Pay particular attention to the visual progression system.

Saving Worlds is not just a financial tracker with decorative images.

The world-building experience is a central part of the product.

The architecture should support:

- Multiple visual themes.
- Ten progression stages per theme.
- Smooth transitions when stages unlock.
- Reusable progression logic across themes.
- Different visual assets for each theme.
- Future purchasable themes without major architectural changes.
- Correct behavior when users withdraw savings and their progress decreases.

For the MVP:

- Island is the free theme.
- Garden is included with Pro.
- Additional premium themes may be sold separately in the future.

Do not assume that Pro automatically includes all future premium themes.

Document any unresolved product decisions rather than inventing requirements.

## 9. Quality Expectations

The application should be designed as a real product intended for the App Store.

Prioritize:

- Clean, maintainable code.
- Consistent architecture.
- Good user experience.
- Smooth animations.
- Reliable local persistence.
- Correct financial calculations.
- Good performance on iPhones.
- Accessibility and appropriate localization foundations.
- Testability.
- Simple and predictable navigation.

Avoid unnecessary dependencies and abstractions.

Do not introduce a backend unless there is a clear requirement.

## 10. Your Deliverables

Create all planning and documentation files inside:

`~/Desktop/SavingWorld/docs/`

Produce:

- Complete product requirements.
- Technical architecture.
- Technology decisions.
- Database model.
- UI/UX guidelines.
- Development roadmap.
- Development rules.
- Project status template.
- Session handoff template.
- Architectural decision log.
- One implementation prompt per development phase.

Ensure all documents are consistent with each other.

Verify that all referenced files and directories exist.

Do not generate placeholder phase prompts. Every phase prompt must contain enough detail to be independently actionable.

Do not start implementing the application.

## 11. Final Response

After creating the documentation:

1. Summarize the recommended architecture.
2. List the development phases in order.
3. Explain how the multi-session workflow works.
4. Identify unresolved decisions requiring my input.
5. Confirm the exact project documentation location.
6. Tell me exactly how to start Phase 1 in Claude Code.

Remember: Your responsibility is to create a development system that allows multiple independent Claude Code sessions to work on the same application without losing context, duplicating work, or introducing architectural inconsistencies.