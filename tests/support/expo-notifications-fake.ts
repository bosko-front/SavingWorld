// Jest stand-in for expo-notifications (mapped in package.json `moduleNameMapper`). It keeps an
// in-memory notification center that answers like iOS does for the calls our adapter makes: a
// weekly trigger comes back as a repeating `calendar` trigger with weekday/hour/minute and no time
// zone, and scheduling an identifier that already exists replaces it. Tests set the permission
// answer, seed orphan requests, make one call fail and emit taps. Real scheduling, delivery and
// taps are device/simulator checks (docs/evidence/PHASE_14.md), never proven here.

export enum IosAuthorizationStatus {
  NOT_DETERMINED = 0,
  DENIED = 1,
  AUTHORIZED = 2,
  PROVISIONAL = 3,
  EPHEMERAL = 4,
}

export enum SchedulableTriggerInputTypes {
  CALENDAR = 'calendar',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  DATE = 'date',
  TIME_INTERVAL = 'timeInterval',
}

export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT';

type FakeRequest = {
  identifier: string;
  content: { title: string | null; body: string | null; data: Record<string, unknown>; sound: unknown };
  trigger: unknown;
};

type FakeResponse = {
  actionIdentifier: string;
  notification: { request: FakeRequest; date: number };
};

type FakeCall = 'getPermissionsAsync' | 'requestPermissionsAsync' | 'getAllScheduledNotificationsAsync' | 'scheduleNotificationAsync' | 'cancelScheduledNotificationAsync';

let permission = IosAuthorizationStatus.NOT_DETERMINED;
// The answer the iOS dialog gives when it is shown.
let dialogAnswer = IosAuthorizationStatus.AUTHORIZED;
let dialogsShown = 0;
let requests: FakeRequest[] = [];
let failing = new Set<FakeCall>();
let calls: FakeCall[] = [];
let lastResponse: FakeResponse | null = null;
let responseListeners: ((response: FakeResponse) => void)[] = [];
let handler: unknown = null;

function record(call: FakeCall): void {
  calls = [...calls, call];
  if (failing.has(call)) {
    failing.delete(call);
    throw new Error(`fake ${call} failure`);
  }
}

function permissionResponse() {
  const granted = permission === IosAuthorizationStatus.AUTHORIZED || permission === IosAuthorizationStatus.PROVISIONAL || permission === IosAuthorizationStatus.EPHEMERAL;
  return {
    status: permission === IosAuthorizationStatus.NOT_DETERMINED ? 'undetermined' : granted ? 'granted' : 'denied',
    granted,
    canAskAgain: permission === IosAuthorizationStatus.NOT_DETERMINED,
    expires: 'never',
    ios: { status: permission },
  };
}

export async function getPermissionsAsync() {
  record('getPermissionsAsync');
  return permissionResponse();
}

export async function requestPermissionsAsync() {
  record('requestPermissionsAsync');
  if (permission === IosAuthorizationStatus.NOT_DETERMINED) {
    dialogsShown += 1;
    permission = dialogAnswer;
  }
  return permissionResponse();
}

export async function getAllScheduledNotificationsAsync() {
  record('getAllScheduledNotificationsAsync');
  return requests.map((request) => structuredClone(request));
}

function toIosTrigger(trigger: Record<string, unknown>): unknown {
  if (trigger.type === SchedulableTriggerInputTypes.WEEKLY) {
    return {
      type: 'calendar',
      repeats: true,
      dateComponents: { weekday: trigger.weekday, hour: trigger.hour, minute: trigger.minute, timeZone: null, calendar: null, isLeapMonth: false },
    };
  }
  return { type: 'timeInterval', repeats: false, seconds: trigger.seconds ?? 1 };
}

export async function scheduleNotificationAsync(input: {
  identifier?: string;
  content: { title?: string; body?: string; data?: Record<string, unknown>; sound?: unknown };
  trigger: Record<string, unknown>;
}) {
  record('scheduleNotificationAsync');
  const identifier = input.identifier ?? `fake-${requests.length + 1}`;
  const request: FakeRequest = {
    identifier,
    content: { title: input.content.title ?? null, body: input.content.body ?? null, data: input.content.data ?? {}, sound: input.content.sound ?? null },
    trigger: toIosTrigger(input.trigger),
  };
  requests = [...requests.filter((existing) => existing.identifier !== identifier), request];
  return identifier;
}

export async function cancelScheduledNotificationAsync(identifier: string) {
  record('cancelScheduledNotificationAsync');
  requests = requests.filter((request) => request.identifier !== identifier);
}

export function setNotificationHandler(next: unknown): void {
  handler = next;
}

export function getLastNotificationResponse(): FakeResponse | null {
  return lastResponse;
}

export function clearLastNotificationResponse(): void {
  lastResponse = null;
}

export function addNotificationResponseReceivedListener(listener: (response: FakeResponse) => void) {
  responseListeners = [...responseListeners, listener];
  return {
    remove: () => {
      responseListeners = responseListeners.filter((existing) => existing !== listener);
    },
  };
}

// Test helpers.
export function setFakePermission(status: IosAuthorizationStatus): void {
  permission = status;
}

export function setFakeDialogAnswer(status: IosAuthorizationStatus): void {
  dialogAnswer = status;
}

export function fakeDialogsShown(): number {
  return dialogsShown;
}

export function fakeScheduledRequests(): FakeRequest[] {
  return requests;
}

// Puts a request straight into the notification center, as an earlier app version or an
// interrupted reconciliation might have left it.
export function seedFakeRequest(request: FakeRequest): void {
  requests = [...requests.filter((existing) => existing.identifier !== request.identifier), request];
}

export function failNextFakeCall(call: FakeCall): void {
  failing.add(call);
}

export function fakeNotificationCalls(): FakeCall[] {
  return calls;
}

export function fakeNotificationHandler(): unknown {
  return handler;
}

function responseFor(identifier: string, data: Record<string, unknown>): FakeResponse {
  return {
    actionIdentifier: DEFAULT_ACTION_IDENTIFIER,
    notification: {
      request: { identifier, content: { title: null, body: 'reminder', data, sound: null }, trigger: null },
      date: 0,
    },
  };
}

// A tap that launched the app from the terminated state.
export function setFakeLaunchTap(identifier: string, data: Record<string, unknown> = {}): void {
  lastResponse = responseFor(identifier, data);
}

// A tap while the app is running.
export function emitFakeTap(identifier: string, data: Record<string, unknown> = {}): void {
  const response = responseFor(identifier, data);
  lastResponse = response;
  responseListeners.forEach((listener) => listener(response));
}

export function resetFakeNotifications(): void {
  permission = IosAuthorizationStatus.NOT_DETERMINED;
  dialogAnswer = IosAuthorizationStatus.AUTHORIZED;
  dialogsShown = 0;
  requests = [];
  failing = new Set();
  calls = [];
  lastResponse = null;
  handler = null;
}
