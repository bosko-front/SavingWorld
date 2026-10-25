import { useSyncExternalStore } from 'react';

import type { AmbientKind } from './manifest';

// Switches for the Living Island's ambient motion (Phase 10.5, D90): drifting clouds, the water
// sparkle and swaying trees. This is the one place to turn the effect off. Phase 21 measures energy,
// memory and smoothness with it on and off on a physical iPhone; if it costs too much, simplify the
// water first (`water: false`), then ship a still Island (`enabled: false`). With everything off the
// scene is exactly the approved picture: clouds rest where they are, the water layers are not drawn.
export type AmbientSwitches = { enabled: boolean; clouds: boolean; water: boolean; trees: boolean };

export const AMBIENT_RELEASE_SWITCHES: AmbientSwitches = { enabled: true, clouds: true, water: true, trees: true };

const EFFECT: Record<AmbientKind, keyof Omit<AmbientSwitches, 'enabled'>> = { cloud: 'clouds', water: 'water', sway: 'trees' };

// Whether layers of this kind may move with these switches.
export function ambientKindOn(switches: AmbientSwitches, kind: AmbientKind): boolean {
  return switches.enabled && switches[EFFECT[kind]];
}

// Development tools only (World inspector, Phase 21 comparison builds): a temporary in-memory
// override of the release switches. Nothing is stored; a relaunch uses the release switches again.
let current = AMBIENT_RELEASE_SWITCHES;
const listeners = new Set<() => void>();

export function setAmbientSwitches(next: AmbientSwitches): void {
  current = next;
  listeners.forEach((listener) => listener());
}

export function resetAmbientSwitches(): void {
  setAmbientSwitches(AMBIENT_RELEASE_SWITCHES);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): AmbientSwitches {
  return current;
}

export function useAmbientSwitches(): AmbientSwitches {
  return useSyncExternalStore(subscribe, snapshot);
}
