import Foundation
import OpenIAP
import StoreKit
import StoreKitTest
import XCTest

// Native StoreKit evidence for the Phase 15 store adapter (docs/evidence/PHASE_15.md). Each test
// talks to OpenIapModule.shared exactly as expo-iap's ExpoIapModule does, under an SKTestSession
// loaded from storekit/SavingWorlds.storekit. Purchases are made with SKTestSession.buyProduct (a
// purchase StoreKit delivers through Transaction.updates, like one from another device or an Ask to
// Buy approval): the in-app purchase sheet needs an app window and is exercised in the app itself.

private let productId = "com.bosko123.savingworlds.pro.lifetime"

// Collects purchase updates delivered on OpenIAP's listener (StoreKit Transaction.updates).
private final class Updates: @unchecked Sendable {
    private let lock = NSLock()
    private var purchases: [PurchaseIOS] = []
    private var waiters: [(String, XCTestExpectation)] = []

    func record(_ purchase: Purchase) {
        guard case .purchaseIos(let ios) = purchase else { return }
        lock.lock()
        purchases.append(ios)
        let ready = waiters.filter { $0.0 == ios.id }
        lock.unlock()
        ready.forEach { $0.1.fulfill() }
    }

    func expectation(for id: String, in test: XCTestCase) -> XCTestExpectation {
        let expectation = test.expectation(description: "update \(id)")
        lock.lock()
        let seen = purchases.contains { $0.id == id }
        if !seen { waiters.append((id, expectation)) }
        lock.unlock()
        if seen { expectation.fulfill() }
        return expectation
    }

    func all() -> [PurchaseIOS] {
        lock.lock()
        defer { lock.unlock() }
        return purchases
    }
}

private func ios(_ purchases: [Purchase]) -> [PurchaseIOS] {
    purchases.compactMap { purchase in
        if case .purchaseIos(let value) = purchase { return value }
        return nil
    }
}

@MainActor
final class ProStoreKitTests: XCTestCase {
    private var session: SKTestSession!
    private let iap = OpenIapModule.shared
    private var updates = Updates()
    private var subscription: OpenIAP.Subscription?

    override func setUp() async throws {
        guard let path = ProcessInfo.processInfo.environment["STOREKIT_CONFIG"] else {
            throw XCTSkip("STOREKIT_CONFIG is not set; run through npm run test:storekit")
        }
        session = try SKTestSession(contentsOf: URL(fileURLWithPath: path))
        session.resetToDefaultState()
        session.disableDialogs = true
        session.clearTransactions()
        updates = Updates()
        let collector = updates
        subscription = iap.purchaseUpdatedListener { collector.record($0) }
        let connected = try await iap.initConnection()
        XCTAssertTrue(connected)
    }

    override func tearDown() async throws {
        if let subscription { iap.removeListener(subscription) }
        _ = try? await iap.endConnection()
        session?.clearTransactions()
    }

    private func active() async throws -> [PurchaseIOS] {
        ios(try await iap.getAvailablePurchases(PurchaseOptions(alsoPublishToEventListenerIOS: false, onlyIncludeActiveItemsIOS: true)))
            .filter { $0.productId == productId }
    }

    private func history() async throws -> [PurchaseIOS] {
        ios(try await iap.getAvailablePurchases(PurchaseOptions(alsoPublishToEventListenerIOS: false, onlyIncludeActiveItemsIOS: false)))
            .filter { $0.productId == productId }
    }

    private func purchaseRequest() -> RequestPurchaseProps {
        RequestPurchaseProps(request: .purchase(RequestPurchasePropsByPlatforms(apple: RequestPurchaseIosProps(sku: productId))), type: .inApp)
    }

    private func pending() async throws -> [PurchaseIOS] {
        try await iap.getPendingTransactionsIOS().filter { $0.productId == productId }
    }

    private func assertIds(
        _ read: () async throws -> [PurchaseIOS],
        _ expected: [String],
        _ message: String = "",
        file: StaticString = #filePath,
        line: UInt = #line
    ) async throws {
        let ids = try await read().map(\.id)
        XCTAssertEqual(ids, expected, message, file: file, line: line)
    }

    // K01: localized metadata comes from the storefront (here the local configuration).
    func test01ProductLoadsWithStorefrontMetadata() async throws {
        let result = try await iap.fetchProducts(ProductRequest(skus: [productId], type: .inApp))
        guard case .products(let products?) = result, case .productIos(let product)? = products.first else {
            return XCTFail("product not loaded: \(result)")
        }
        XCTAssertEqual(product.id, productId)
        XCTAssertEqual(product.displayNameIOS, "Saving Worlds Pro")
        XCTAssertEqual(product.description, "Unlimited goals, Garden and Pro statistics")
        XCTAssertFalse(product.displayPrice.isEmpty)
        XCTAssertEqual(product.typeIOS, .nonConsumable)
    }

    // K02: a verified purchase is delivered once, stays unfinished until the app finishes it, and is a
    // current entitlement before and after finishing.
    func test02VerifiedPurchaseIsDeliveredUnfinishedAndEntitled() async throws {
        let transaction = try await session.buyProduct(identifier: productId)
        let id = String(transaction.id)
        await fulfillment(of: [updates.expectation(for: id, in: self)], timeout: 15)
        let delivered = try XCTUnwrap(updates.all().first { $0.id == id })
        XCTAssertEqual(delivered.purchaseState, .purchased)
        XCTAssertNil(delivered.revocationDateIOS)
        XCTAssertEqual(updates.all().filter { $0.id == id }.count, 1, "delivered once per connection")

        try await assertIds(pending, [id], "not finished automatically")
        try await assertIds(active, [id], "current entitlement before finishing")

        try await iap.finishTransaction(purchase: .purchaseIos(delivered), isConsumable: false)
        try await assertIds(pending, [], "finished")
        try await assertIds(active, [id], "still entitled after finishing")
    }

    // K03: an interrupted finish (the app stopped before finishing) leaves the transaction in
    // Transaction.unfinished, which the app reads at its next launch; it stays there, read after
    // read, until the app finishes it. (Ending and restarting the OpenIAP connection inside one XCTest
    // process crashes XCTest's async runner, so the cross-launch replay is checked in the app.)
    func test03UnfinishedTransactionStaysUntilFinished() async throws {
        let transaction = try await session.buyProduct(identifier: productId)
        let id = String(transaction.id)
        await fulfillment(of: [updates.expectation(for: id, in: self)], timeout: 15)
        for _ in 0..<3 {
            try await assertIds(pending, [id])
        }
        let replay = try await pending()
        try await iap.finishTransaction(purchase: .purchaseIos(try XCTUnwrap(replay.first)), isConsumable: false)
        try await assertIds(pending, [])
        try await assertIds(active, [id])
    }

    // K04: a refund removes the current entitlement; the history keeps the transaction with its
    // revocation date (how the app tells a verified loss from "nothing found").
    func test04RefundRemovesEntitlementAndKeepsRevokedHistory() async throws {
        let transaction = try await session.buyProduct(identifier: productId)
        await transaction.finish()
        let id = String(transaction.id)
        try await assertIds(active, [id])

        try session.refundTransaction(identifier: UInt(transaction.id))
        try await Task.sleep(nanoseconds: 1_000_000_000)

        try await assertIds(active, [], "refunded purchase is not a current entitlement")
        let all = try await history()
        let revoked = try XCTUnwrap(all.first { $0.id == id })
        XCTAssertNotNil(revoked.revocationDateIOS, "history carries the revocation date")
    }

    // K05: Ask to Buy through the in-app purchase call is pending (deferred-payment, no entitlement,
    // no verified transaction) until approved; the approval arrives as a verified update.
    func test05AskToBuyIsPendingUntilApproved() async throws {
        session.askToBuyEnabled = true
        do {
            _ = try await iap.requestPurchase(purchaseRequest())
            XCTFail("Ask to Buy must not complete the purchase")
        } catch let error as PurchaseError {
            XCTAssertEqual(error.code, .deferredPayment)
        }
        let waiting = try XCTUnwrap(session.allTransactions().first { $0.pendingAskToBuyConfirmation })
        try await assertIds(active, [], "pending grants nothing")
        try await assertIds(pending, [], "no verified transaction yet")

        try session.approveAskToBuyTransaction(identifier: waiting.identifier)
        let deadline = Date().addingTimeInterval(15)
        var approved: PurchaseIOS?
        while approved == nil && Date() < deadline {
            try await Task.sleep(nanoseconds: 200_000_000)
            approved = updates.all().first { $0.productId == productId }
        }
        let delivered = try XCTUnwrap(approved, "approval delivered as a verified update")
        try await assertIds(active, [delivered.id])
    }

    // K08: the in-app purchase call returns a verified purchase that stays unfinished until the app
    // finishes it.
    func test08InAppPurchaseReturnsVerifiedUnfinishedTransaction() async throws {
        let result = try await iap.requestPurchase(purchaseRequest())
        guard case .purchase(.purchaseIos(let purchase)?)? = result else {
            return XCTFail("no purchase returned: \(String(describing: result))")
        }
        XCTAssertEqual(purchase.productId, productId)
        XCTAssertEqual(purchase.purchaseState, .purchased)
        try await assertIds(pending, [purchase.id], "not finished automatically")
        try await assertIds(active, [purchase.id])
        try await iap.finishTransaction(purchase: .purchaseIos(purchase), isConsumable: false)
        try await assertIds(pending, [])
    }

    // K09: a failed in-app purchase grants nothing and leaves no transaction.
    func test09FailedPurchaseGrantsNothing() async throws {
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .purchase)
        defer { Task { try? await self.session.setSimulatedError(nil, forAPI: .purchase) } }
        do {
            _ = try await iap.requestPurchase(purchaseRequest())
            XCTFail("purchase should fail")
        } catch let error as PurchaseError {
            XCTAssertNotEqual(error.code, .deferredPayment)
        }
        try await assertIds(active, [])
        try await assertIds(pending, [])
    }

    // K06: an unverified transaction never reaches the app as a purchase; the query fails instead of
    // answering "not owned".
    func test06UnverifiedTransactionNeverReachesTheApp() async throws {
        try await session.setSimulatedError(.verification(.invalidSignature), forAPI: .verification)
        let transaction = try? await session.buyProduct(identifier: productId)
        try await Task.sleep(nanoseconds: 500_000_000)
        if let transaction {
            XCTAssertFalse(updates.all().contains { $0.id == String(transaction.id) }, "an unverified update is not delivered")
        }
        defer { Task { try? await self.session.setSimulatedError(nil, forAPI: .verification) } }
        do {
            let entitlements = try await active()
            XCTFail("an unverified entitlement must not be returned: \(entitlements.map(\.id))")
        } catch let error as PurchaseError {
            XCTAssertEqual(error.code, .transactionValidationFailed)
        }
    }

    // K07: without the network the product cannot load, but the current entitlement still reads from
    // StoreKit's local signed cache (offline startup keeps verified rights readable).
    func test07ProductLoadFailsOfflineWhileEntitlementStaysReadable() async throws {
        let transaction = try await session.buyProduct(identifier: productId)
        await transaction.finish()
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .loadProducts)
        defer { Task { try? await self.session.setSimulatedError(nil, forAPI: .loadProducts) } }
        do {
            _ = try await iap.fetchProducts(ProductRequest(skus: [productId], type: .inApp))
            XCTFail("product load should fail offline")
        } catch let error as PurchaseError {
            XCTAssertNotEqual(error.code, .transactionValidationFailed)
        }
        try await assertIds(active, [String(transaction.id)])
    }
}
