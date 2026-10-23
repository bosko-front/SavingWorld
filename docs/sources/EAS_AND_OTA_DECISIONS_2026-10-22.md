# Owner EAS and OTA decision

Additional instruction received 22 October 2026, after the setup/layout clarification: use EAS and OTA updates in the application plan and place them in the appropriate development phases.

This plan makes EAS Build the primary build service and EAS Update the OTA delivery service. Local Xcode remains useful for native diagnostics and simulator/StoreKit work. EAS Submit may be used for an explicitly authorized store-upload step; automatic public submission or production OTA publishing is not implied.

Apply this with the earlier feature and setup/layout decisions. It changes delivery tooling, not the app's no-login/no-custom-backend, offline savings-data architecture. This message requests a planning update; it does not start application implementation, create an Expo project, launch a cloud build or publish an update now.
