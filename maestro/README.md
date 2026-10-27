# Maestro iOS journeys (Phase 21)

Critical user journeys on an iOS simulator against an installed **release-mode** build (an EAS
`preview-simulator` build). Run them with:

```sh
node scripts/test-e2e.mjs --device <simulator udid> --app <path/to/SavingWorlds.app> --report docs/evidence/phase-21/e2e.xml
```

`scripts/test-e2e.mjs` is the `test:e2e` check of DEVELOPMENT_RULES. It is not an npm script because
@expo/fingerprint hashes package.json "scripts" and runtime 1.0.0 is shared. It turns Reduce Motion on
(Maestro waits for a still screen, and the Living Island never stops moving otherwise), and every
journey starts from a cleared app: **use a throwaway simulator**, never one holding data you want.

| Journey | Covers | Test plan |
| --- | --- | --- |
| `journeys/01-free-ledger-restart.yaml` | Onboarding, one goal, 50 − 20 = 30, withdrawal 31 refused with the draft kept, correction 50 → 60 = 40, cold restart | T06, T19, R03, R06 |
| `journeys/02-quest-from-challenges.yaml` | First step started on Challenges, savings added from the quest card, counted once | T12, R14-R16 |
| `journeys/03-souvenir-finish-reopen.yaml` | First 100%, Finish, Collection, Reopen at 100% | T07, T09, R13 |
| `journeys/04-delete-and-start-over.yaml` | Free second goal → "Build another world", confirmed deletion, new goal | T07, R04, R05, D74 |
| `journeys/05-currency-lock-and-reminder.yaml` | Currency change offered only without transactions; reminder permission after opt-in | T27, T13, R07, R17 |

Amounts are matched without a currency symbol, so the journeys work with any two-decimal currency the
simulator's region proposes in onboarding.

Not covered here, and why: Pro purchase, Restore, confirmed loss, Garden switching and the four
statistics need a real StoreKit right (simulator release builds have no StoreKit configuration); they
are covered by Jest over the real billing path and by the owner's device checks in
`docs/evidence/PHASE_21.md`. Notification delivery, VoiceOver, haptics and frame/energy measurements are
physical-iPhone checks.

`perf/` holds the measurement flows used with the 10,000-entry fixture (`tests/integration/performance-fixture.test.ts`,
seeded by `node scripts/ota-drill.mjs seed`); their step durations include Maestro's own waits and are
only coarse.
