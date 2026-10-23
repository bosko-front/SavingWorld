# Verification evidence

[PLANNING_CHECKS](PLANNING_CHECKS.md) records current v1.2 documentation-only validation above explicitly historical 22 October results. Product authority is [MVP plan v1.2](../Saving_Worlds_MVP_Plan_v1_2.docx); historical PASS results cannot override it. No app implementation phase has run. There are intentionally no pre-filled PHASE_01 through PHASE_22 evidence records.

During implementation create `docs/evidence/PHASE_NN.md` for the current phase. Record session date, phase state, inspected dependency evidence, branch/commit or working-tree description if available, app build/runtime/update/schema version and applicable EAS project/profile/channel/environment/artifact IDs, device/OS/toolchain, actual files/modules changed, significant decisions and applicable TEST_PLAN IDs.

Use a verification table with: check/command, environment, PASS/FAIL/NOT RUN, exit code or observed result, and evidence/remaining action. Keep meaningful failure history followed by the fixing result. Include manual native/art/accessibility checks separately from mocks. For screenshots or native logs, save small redacted local artifacts only when useful; link actual existing files.

Close with incomplete work, concrete blockers, accepted limitations, and the exact same or next phase prompt. PROJECT_STATUS keeps a compact pointer; SESSION_HANDOFF explains what the next independent session should do first. Do not assert a phase complete because its evidence file exists.
