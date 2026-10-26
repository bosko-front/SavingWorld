import SwiftUI

// Minimal host app for the Xcode StoreKit tests (Phase 15). StoreKit only sells to an app bundle
// with a window scene, so the hosted unit tests run inside this process. It has its own bundle ID
// and is never shipped; it only gives the tests an app around OpenIAP.
@main
struct HostApp: App {
    var body: some Scene {
        WindowGroup {
            Text("Saving Worlds StoreKit test host")
        }
    }
}
