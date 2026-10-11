import "./viewport.css";
import type { Game } from "@clockwyrks/simple-2d";
import * as C from "./constants";
import { debug } from "./debug";
import { initialState } from "./world";
import { update } from "./update";
import { render } from "./render";

export const BACKGROUND = "#0b141b";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";

export type Mode = "solo" | "versus";

export type Side = "left" | "right";

export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}

export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}

export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}

export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
  readonly theta: number;
}

export interface CaromState {
  /** Transient cache derived from the engine’s pointer samples. */
  readonly menuPresses: readonly {
    readonly id: number;
    readonly index: number;
  }[];
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";

  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;

  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;

  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly obstacleClock: number;
  readonly obstacleClockRunning: boolean;

  readonly simTime: number;
  readonly muted: boolean;
}

export type CaromDebugApi = typeof debug;

export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api) {
    for (const name of C.ACTIONS)
      api.input.register(name, { keys: [...C.BINDINGS[name]] });
    api.audio.define(C.CUES.paddleHit, {
      wave: "triangle",
      freq: 640,
      freqTo: 310,
      durationMs: 75,
      gain: 0.22,
    });
    api.audio.define(C.CUES.wallBounce, {
      freq: 260,
      freqTo: 180,
      durationMs: 45,
      gain: 0.16,
    });
    api.audio.define(C.CUES.obstacleBounce, {
      wave: "sine",
      freq: 960,
      freqTo: 530,
      durationMs: 105,
      gain: 0.18,
    });
    api.audio.define(C.CUES.score, {
      wave: "triangle",
      freq: 220,
      freqTo: 740,
      durationMs: 260,
      gain: 0.23,
    });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("mode", (s) => s.mode);
    api.diagnostics.register("p1 score", (s) => s.score.p1);
    api.diagnostics.register("p2 score", (s) => s.score.p2);
    for (const field of ["x", "y", "vx", "vy", "spin"] as const) {
      api.diagnostics.register(
        `ball ${field}`,
        (s) => s.ball?.[field] ?? "absent",
      );
    }
    api.diagnostics.register("ball speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : "absent",
    );
    for (const side of ["left", "right"] as const) {
      api.diagnostics.register(`${side} cy`, (s) => s.paddles[side].cy);
      api.diagnostics.register(`${side} vy`, (s) => s.paddles[side].vy);
    }
    return [initialState(false), debug];
  },
  update,
  render,
};
