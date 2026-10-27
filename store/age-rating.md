# Age rating answers (App Store Connect › App Information › Age Rating)

Checked 27 October 2026 against Apple's current questionnaire ("Age ratings values and definitions", the system in force since 31 January 2026) and the shipped release candidate. Expected result: **4+** in every region.

| Section | Question | Answer | Why (observed behavior) |
| --- | --- | --- | --- |
| In-App Controls | Parental Controls | No | The app has no parental-control feature. |
| In-App Controls | Age Assurance | No | No age check; the app has no account. |
| Capabilities | Unrestricted Web Access | No | No web view or browser. The only links (Privacy Policy, Support, iOS Settings) open outside the app. |
| Capabilities | User-Generated Content | No | Goal names and notes are private, stored on the device and never shown to anyone else. |
| Capabilities | Social Media | No | None. |
| Capabilities | Messaging and Chat | No | None. |
| Capabilities | Advertising | No | No ads or ad SDK. |
| Mature Themes | Profanity or Crude Humor | None | |
| Mature Themes | Horror/Fear Themes | None | |
| Mature Themes | Alcohol, Tobacco, or Drug Use or References | None | |
| Medical or Wellness | Medical or Treatment Information | None | |
| Medical or Wellness | Health or Wellness Topics | None | Savings only. |
| Sexuality or Nudity | all three questions | None | |
| Violence | all four questions | None | Cozy island and garden scenes only. |
| Chance-Based Activities | Gambling | No | |
| Chance-Based Activities | Simulated Gambling | None | |
| Chance-Based Activities | Contests | None | The three quests are personal savings steps with no prizes, rankings or other players. |
| Chance-Based Activities | Loot Boxes | No | No random rewards; every milestone unlocks at a fixed percentage. |

Not "Made for Kids": the app is a general-audience savings tracker (PRIVACY.md "Children").

The answers must be re-checked if a later version adds web content, sharing, ads or any random reward.
