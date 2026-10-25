// Jest only. With Jest's non-native worklets build loaded (Reanimated's resolver), Gesture Handler
// would ask worklets for the native UI runtime, which only exists in the app, and throw.
export function installUIRuntimeBindings(): void {}
