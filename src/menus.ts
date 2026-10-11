import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { CaromState } from "./game";
import * as C from "./constants";
import { returnToTitle, startMatch } from "./world";

export interface MenuRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export function menuItems(s: CaromState): readonly string[] {
  switch (s.screen) {
    case "title":
      return C.TITLE_ITEMS;
    case "paused":
      return C.PAUSE_ITEMS;
    case "matchover":
      return C.MATCHOVER_ITEMS;
    case "howto":
      return ["BACK TO MENU"];
    default:
      return [];
  }
}
export function menuItemRect(s: CaromState, index: number): MenuRect | null {
  if (!Number.isInteger(index) || index < 0 || index >= menuItems(s).length)
    return null;
  return {
    x: s.screen === "title" ? 100 : 430,
    y:
      (s.screen === "howto" ? 595 : s.screen === "title" ? 380 : 367) +
      index * 66,
    w: 420,
    h: 54,
  };
}
function at(s: CaromState, x: number, y: number): number {
  return menuItems(s).findIndex((_, i) => {
    const r = menuItemRect(s, i)!;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  });
}
function confirm(s: CaromState): CaromState {
  switch (s.screen) {
    case "title": {
      const selected = { ...s, titleIndex: s.menuIndex };
      return s.menuIndex === 2
        ? { ...selected, screen: "howto", menuIndex: 0 }
        : startMatch(selected, s.menuIndex === 0 ? "solo" : "versus");
    }
    case "howto":
      return returnToTitle(s);
    case "paused":
      return s.menuIndex === 0
        ? { ...s, screen: s.resumeScreen }
        : s.menuIndex === 1
          ? startMatch(s, s.mode)
          : returnToTitle(s);
    case "matchover":
      return s.menuIndex === 0 ? startMatch(s, s.mode) : returnToTitle(s);
    default:
      return s;
  }
}

/** Input is resolved against the screen at entry, never a screen reached mid-read. */
export function readInput(s: CaromState, api: UpdateApi): CaromState {
  const edges = Object.fromEntries(
    C.ACTIONS.map((a) => [a, api.input.pressed(a)]),
  ) as Record<C.ActionName, boolean>;
  const samples = api.input.pointerSamples();
  api.input.pointerContacts();
  api.audio.setMuted(edges.mute ? !s.muted : s.muted);
  s = { ...s, muted: api.audio.muted() };
  if (s.screen === "playing" || s.screen === "countdown") {
    return edges.pause
      ? {
          ...s,
          resumeScreen: s.screen,
          screen: "paused",
          menuIndex: 0,
          menuPresses: [],
        }
      : s;
  }
  if (s.screen === "paused" && (edges.pause || edges.back))
    return { ...s, screen: s.resumeScreen, menuPresses: [] };
  if ((s.screen === "howto" || s.screen === "matchover") && edges.back)
    return returnToTitle(s);
  const count = menuItems(s).length;
  const up = edges["p1-up"] || edges["p2-up"];
  const down = edges["p1-down"] || edges["p2-down"];
  let keyboardConfirm = false;
  if (up) s = { ...s, menuIndex: (s.menuIndex + count - 1) % count };
  else if (down) s = { ...s, menuIndex: (s.menuIndex + 1) % count };
  else keyboardConfirm = edges.confirm;
  // The input cache belongs to the state, so replaying a transition has no hidden gesture history.
  let presses = [...s.menuPresses];
  let pointerConfirm = false;
  let selection = s.menuIndex;
  for (const p of samples) {
    const index = at(s, p.x, p.y);
    if (index >= 0) selection = index;
    if (p.type === "down" && p.button === "primary") {
      presses = [...presses.filter((q) => q.id !== p.id), { id: p.id, index }];
    }
    if (p.type === "up") {
      if (index >= 0 && presses.some((q) => q.id === p.id && q.index === index))
        pointerConfirm = true;
      presses = presses.filter((q) => q.id !== p.id);
    }
  }
  if (keyboardConfirm) return { ...confirm(s), menuPresses: [] };
  s = { ...s, menuIndex: selection, menuPresses: presses };
  return pointerConfirm ? { ...confirm(s), menuPresses: [] } : s;
}
