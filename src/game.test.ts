import { afterEach, describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import {
  ConstantClock,
  createEngine,
  type Engine,
} from "@clockwyrks/simple-2d";
import { game, type CaromState, type CaromDebugApi } from "./game";
import * as C from "./constants";

const engines: Engine<CaromState, CaromDebugApi>[] = [];
afterEach(() => {
  for (const e of engines) e.destroy();
  engines.length = 0;
});
async function setup(ms = 8) {
  const target = new EventTarget();
  const canvas = createCanvas(C.FIELD_W, C.FIELD_H);
  const e = createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: C.FIELD_W,
    height: C.FIELD_H,
    game,
    layout: C.LAYOUT,
    clock: new ConstantClock(ms),
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => target,
    },
  });
  engines.push(e);
  await e.initialize();
  const key = (code: string, down = true) =>
    target.dispatchEvent(
      Object.assign(new Event(down ? "keydown" : "keyup"), {
        code,
        repeat: false,
      }),
    );
  const press = async (code: string) => {
    key(code);
    await e.advance(1);
    key(code, false);
  };
  const pointer = (
    type: string,
    x: number,
    y: number,
    id = 1,
    device = "mouse",
  ) =>
    target.dispatchEvent(
      Object.assign(new Event(`pointer${type}`), {
        clientX: x,
        clientY: y,
        pointerId: id,
        pointerType: device,
        isPrimary: true,
        button: 0,
        buttons: type === "up" ? 0 : 1,
      }),
    );
  const pose = (fn: (s: CaromState, d: CaromDebugApi) => CaromState) =>
    e.apply((s) => fn(s, e.debug));
  const flight = (x: number, y: number, vx: number, vy: number) =>
    pose((s, d) =>
      d.setBallVelocity(
        d.setBallPosition(
          d.setBallHeld(
            d.spawnBall(d.clearWorld(d.setScreen(s, "playing"))),
            false,
          ),
          x,
          y,
        ),
        vx,
        vy,
      ),
    );
  return { e, key, press, pointer, pose, flight, canvas };
}

describe("screens and input", () => {
  it("initializes the complete title, registers diagnostics, and serves without moving on release", async () => {
    const { e, press } = await setup(10);
    expect(e.debug.snapshot(e.state)).toMatchObject({
      version: C.CAROM_DEBUG_VERSION,
      screen: "title",
      score: { p1: 0, p2: 0 },
      ball: { held: true, speed: 0 },
      obstacleClock: 0,
    });
    expect(e.diagnostics().length).toBeGreaterThanOrEqual(14);
    const before = e.state;
    await press("Enter");
    expect(before.screen).toBe("title");
    expect(e.state.screen).toBe("countdown");
    await e.advance(99);
    expect(e.state.screen).toBe("playing");
    expect(e.state.ball?.x).toBe(C.FIELD_CX);
    expect(Math.hypot(e.state.ball!.vx, e.state.ball!.vy)).toBeCloseTo(
      C.SERVE_SPEED,
    );
    await e.advance(1);
    expect(e.state.ball!.x).toBeLessThan(C.FIELD_CX);
  });
  it("prioritizes up over down and movement over confirm; remembers title choice", async () => {
    const { e, key, press } = await setup();
    key("KeyW");
    key("KeyS");
    key("Enter");
    await e.advance(1);
    expect(e.state.menuIndex).toBe(2);
    expect(e.state.screen).toBe("title");
    key("KeyW", false);
    key("KeyS", false);
    key("Enter", false);
    await press("Enter");
    expect(e.state.screen).toBe("howto");
    await press("Escape");
    expect(e.state.screen).toBe("title");
    expect(e.state.menuIndex).toBe(2);
    await press("ArrowUp");
    await press("Enter");
    expect(e.state.mode).toBe("versus");
    expect(e.state.titleIndex).toBe(1);
  });
  it("Escape pauses once, freezes all match values, then resumes once", async () => {
    const { e, press, canvas } = await setup();
    await press("Enter");
    await e.advance(130);
    await press("Escape");
    const paused = e.state;
    const pausedPixels = canvas.toBuffer("image/png");
    expect(paused.screen).toBe("paused");
    await e.advance(12);
    expect(canvas.toBuffer("image/png").equals(pausedPixels)).toBe(true);
    expect(e.state.ball).toEqual(paused.ball);
    expect(e.state.paddles).toEqual(paused.paddles);
    expect(e.state.obstacleClock).toBe(paused.obstacleClock);
    expect(e.state.simTime).toBeGreaterThan(paused.simTime);
    await press("Escape");
    expect(e.state.screen).toBe("playing");
  });
  it("restarts and quits from pause, restoring title fields and remembered selection", async () => {
    const { e, press, pose } = await setup();
    await press("ArrowDown");
    await press("Enter");
    await press("KeyP");
    pose((s, d) => d.setScore(s, 5, 8));
    await press("KeyS");
    await press("Enter");
    expect(e.state.score).toEqual({ p1: 0, p2: 0 });
    expect(e.state.mode).toBe("versus");
    await press("KeyP");
    await press("KeyW");
    await press("Enter");
    expect(e.state.screen).toBe("title");
    expect(e.state.menuIndex).toBe(1);
    expect(e.state.mode).toBe("solo");
  });
  it("pointer and touch require landing and release in the same region across frames", async () => {
    const { e, pointer } = await setup();
    const a = e.debug.menuItemRect(e.state, 0)!;
    const b = e.debug.menuItemRect(e.state, 1)!;
    pointer("down", a.x + 10, a.y + 10);
    await e.advance(1);
    pointer("up", b.x + 10, b.y + 10);
    await e.advance(1);
    expect(e.state.screen).toBe("title");
    expect(e.state.menuIndex).toBe(1);
    pointer("down", b.x + 10, b.y + 10, 2, "touch");
    await e.advance(1);
    pointer("up", b.x + 10, b.y + 10, 2, "touch");
    await e.advance(1);
    expect(e.state.screen).toBe("countdown");
    expect(e.state.mode).toBe("versus");
    expect(e.debug.menuItemRect(e.state, 0)).toBeNull();
  });
  it("confirms both pointer edges in one frame and gives keyboard confirm priority", async () => {
    const { e, key, pointer } = await setup();
    const r = e.debug.menuItemRect(e.state, 2)!;
    key("Enter");
    pointer("down", r.x + 10, r.y + 10);
    pointer("up", r.x + 10, r.y + 10);
    await e.advance(1);
    expect(e.state.screen).toBe("countdown");
    expect(e.state.mode).toBe("solo");
  });
});

describe("paddles and AI", () => {
  it("merges Solo controls, separates Versus controls, and clamps actual velocity", async () => {
    const { e, key, pose } = await setup(10);
    pose((s, d) => d.setScreen(d.clearWorld(s), "playing"));
    key("ArrowDown");
    await e.advance(1);
    expect(e.state.paddles.left.cy).toBeCloseTo(
      C.FIELD_CY + C.PADDLE_SPEED * 0.01,
    );
    pose((s, d) => d.setMode(s, "versus"));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(C.PADDLE_SPEED);
    pose((s, d) => d.setPaddleCy(s, "right", C.PADDLE_MAX_CY - 2));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBeCloseTo(200);
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(0);
  });
  it("keeps driver intent separate from actual velocity and preserves it through restart", async () => {
    const { e, pose, press } = await setup(10);
    pose((s, d) => d.setPaddleVy(s, "left", 100));
    expect(e.state.paddles.left.vy).toBe(0);
    pose((s, d) => d.setPaddleDriven(s, "left", true));
    await press("Enter");
    expect(e.state.paddles.left.cy).toBe(C.FIELD_CY + 1);
    expect(e.state.paddles.left.drivenVy).toBe(100);
    pose((s, d) => d.setPaddleDriven(s, "left", false));
    await e.advance(1);
    expect(e.state.paddles.left.vy).toBe(0);
  });
  it("gates AI sensing and movement independently, with a finite zero-delta response", async () => {
    const { e, pose, flight } = await setup(10);
    flight(800, 550, 400, 0);
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(C.AI_SPEED);
    pose((s, d) => d.setAiMovement(s, false));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(0);
    pose((s, d) =>
      d.setAiTracking(
        d.setAiMovement(d.setPaddleCy(s, "right", 500), true),
        false,
      ),
    );
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(-C.AI_SPEED);
    e.setClock({ delta: () => 0 });
    await e.advance(1);
    expect(Number.isFinite(e.state.paddles.right.cy)).toBe(true);
  });
});

describe("ball physics", () => {
  it("reflects walls and paddle end caps without increasing speed", async () => {
    const { e, flight, pose } = await setup();
    flight(200, C.BALL_R + 1, 0, -500);
    await e.advance(1);
    expect(e.state.ball!.vy).toBe(500);
    flight(200, C.FIELD_H - C.BALL_R - 1, 0, 500);
    await e.advance(1);
    expect(e.state.ball!.vy).toBe(-500);
    flight(
      C.P1_X0 + C.PADDLE_W / 2,
      C.FIELD_CY - C.PADDLE_HALF - C.BALL_R - 1,
      0,
      500,
    );
    pose((s, d) => d.setBallSpin(s, 0));
    await e.advance(1);
    expect(e.state.ball!.vy).toBe(-500);
    expect(e.state.ball!.spin).toBe(0);
  });
  it("accelerates front-face hits, applies contact angle and adds moving-paddle spin", async () => {
    const { e, flight, pose } = await setup(4);
    flight(C.P1_X1 + C.BALL_R + 1, C.FIELD_CY, -500, 0);
    pose((s, d) =>
      d.setPaddleVy(d.setPaddleDriven(s, "left", true), "left", 100),
    );
    await e.advance(1);
    expect(e.state.ball!.vx).toBeGreaterThan(0);
    expect(Math.hypot(e.state.ball!.vx, e.state.ball!.vy)).toBeCloseTo(
      500 * C.SPEED_MULT,
    );
    expect(e.state.ball!.spin).toBeCloseTo(100 * C.SPIN_FROM_PADDLE);
    flight(C.P2_X0 - C.BALL_R - 1, C.FIELD_CY, C.SPEED_CAP, 0);
    pose((s, d) => d.setPaddleDriven(s, "right", true));
    await e.advance(1);
    expect(e.state.ball!.vx).toBeLessThan(0);
    expect(Math.hypot(e.state.ball!.vx, e.state.ball!.vy)).toBeCloseTo(
      C.SPEED_CAP,
    );
  });
  it("curves without changing speed, decays spin by time, and bounds trail age", async () => {
    const { e, flight, pose } = await setup(8);
    flight(200, 250, 400, 0);
    pose((s, d) => d.setBallSpin(s, 200));
    await e.advance(100);
    expect(e.state.ball!.spin).toBeCloseTo(100, 8);
    expect(e.state.ball!.vy).toBeGreaterThan(0);
    expect(Math.hypot(e.state.ball!.vx, e.state.ball!.vy)).toBeCloseTo(400);
    expect(
      e.state.ball!.trail.every((p) => e.state.simTime - p.t <= C.TRAIL_TIME),
    ).toBe(true);
  });
  it("reflects upright and rotated obstacles with preserved speed and spin", async () => {
    const { e, flight, pose } = await setup(4);
    flight(466, 220, 500, 0);
    pose((s, d) => d.setObstacleClockRunning(d.spawnObstacle(s, 0), false));
    await e.advance(2);
    expect(e.state.ball!.vx).toBe(-500);
    const t = Math.PI / 4 / C.OBSTACLE_SPIN_RATE;
    pose((s, d) => d.setObstacleClock(s, t));
    const o = e.state.obstacles[0];
    pose((s, d) =>
      d.setBallVelocity(
        d.setBallPosition(
          s,
          o.cx - 22 * Math.cos(o.theta),
          o.cy - 22 * Math.sin(o.theta),
        ),
        500,
        0,
      ),
    );
    await e.advance(2);
    expect(e.state.ball!.vy).toBeLessThan(-490);
    expect(Math.hypot(e.state.ball!.vx, e.state.ball!.vy)).toBeCloseTo(500);
  });
  it("pushes an embedded ball out of an obstacle even when velocity points away", async () => {
    const { e, flight, pose } = await setup();
    flight(490, 220, 0, 0);
    pose((s, d) => d.setObstacleClockRunning(d.spawnObstacle(s, 0), false));
    await e.advance(1);
    expect(e.state.ball!.x).toBe(490 + C.OBSTACLE_HW + C.BALL_R);
  });
  it("agrees across 2 ms and 16 ms frame lengths in a spinning wall rally", async () => {
    const results = [];
    for (const ms of [2, 16]) {
      const { e, flight, pose } = await setup(ms);
      flight(250, 65, 350, -200);
      pose((s, d) => d.setBallSpin(s, 150));
      await e.advance(800 / ms);
      results.push(e.debug.snapshot(e.state).ball!);
    }
    expect(results[0].speed).toBeCloseTo(results[1].speed, 6);
    expect(Math.sign(results[0].vy)).toBe(Math.sign(results[1].vy));
    expect(Math.abs(results[0].y - results[1].y)).toBeLessThan(8);
  });
});

describe("points, audio and debug poses", () => {
  it("parks after a point, then enforces win by two at deuce and permits play again", async () => {
    const { e, flight, pose, press } = await setup();
    pose((s, d) => d.setScore(s, 10, 10));
    flight(C.FIELD_W + C.BALL_R + 1, 100, 100, 0);
    await e.advance(1);
    expect(e.state.score.p1).toBe(11);
    expect(e.state.screen).toBe("countdown");
    expect(e.state.receiver).toBe("right");
    flight(C.FIELD_W + C.BALL_R + 1, 100, 100, 0);
    await e.advance(1);
    expect(e.state.winner).toBe("left");
    expect(e.state.screen).toBe("matchover");
    await press("Enter");
    expect(e.state.score.p1).toBe(0);
    expect(e.state.screen).toBe("countdown");
    pose((s, d) => d.setScore(s, 0, 10));
    flight(-C.BALL_R - 1, 100, -100, 0);
    await e.advance(1);
    expect(e.state.winner).toBe("right");
    await press("Escape");
    expect(e.state.screen).toBe("title");
  });
  it("plays each event cue once per frame and mutes without changing physics", async () => {
    const { e, flight, pose, press } = await setup(16);
    const cues: { cue: string; gain: number }[] = [];
    e.events.on("cue:played", (v) => cues.push(v));
    pose((s, d) => d.setMuted(s, true));
    flight(300, 12, 0, -C.SPEED_CAP);
    await e.advance(1);
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ cue: C.CUES.wallBounce, gain: 0 });
    await press("KeyM");
    expect(e.state.muted).toBe(false);
    flight(-20, 100, -100, 0);
    await e.advance(1);
    expect(cues[cues.length - 1]?.cue).toBe(C.CUES.score);
  });
  it("poses every state component immutably, rejects absent targets, and reconciles idempotently", async () => {
    const { e, pose } = await setup();
    const before = e.state;
    pose((s, d) =>
      d.setResumeScreen(
        d.setWinner(
          d.setReceiver(d.setTitleIndex(d.setMenuIndex(s, 2), 1), "right"),
          "right",
        ),
        "countdown",
      ),
    );
    expect(before.titleIndex).toBe(0);
    pose((s, d) => d.setObstacleClock(s, 1.2));
    const posed = e.state;
    pose((s, d) => d.reconcile(s));
    pose((s, d) => d.reconcile(s));
    expect(e.state).toEqual(posed);
    pose((s, d) => d.setBallServeSign(d.setBallHoldTimer(s, 0.2), -1));
    expect(e.state.ball!.serveSign).toBe(-1);
    pose((s, d) => d.drawBallServeSign(s));
    expect([-1, 1]).toContain(e.state.ball!.serveSign);
    expect(e.debug.menuItemRect(e.state, 99)).toBeNull();
    pose((s, d) => d.clearWorld(s));
    await e.advance(1);
    expect(e.state.ball).toBeNull();
    expect(() => e.debug.setBallSpin(e.state, 20)).toThrow();
    expect(() => e.debug.drawBallServeSign(e.state)).toThrow();
    expect(() => e.debug.spawnObstacle(e.state, 2)).toThrow();
    pose((s, d) => d.spawnObstacle(d.spawnObstacle(d.spawnBall(s), 1), 0));
    expect(e.state.obstacles.map((o) => o.index)).toEqual([0, 1]);
    pose((s, d) => d.reset(d.setMuted(s, true)));
    expect(e.state.muted).toBe(true);
    expect(e.state.simTime).toBe(0);
    expect(e.state.screen).toBe("title");
  });
});
