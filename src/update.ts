import type { DeepReadonly } from "ts-essentials";
import type { UpdateApi } from "@clockwyrks/simple-2d";
import * as C from "./constants";
import type { CaromState, PaddleState, Side } from "./game";
import { clamp, obstaclePose, parkedBall } from "./world";
import { readInput } from "./menus";
import { fly } from "./physics";

function movePaddle(
  s: CaromState,
  side: Side,
  api: UpdateApi,
  dt: number,
): PaddleState {
  const paddle = s.paddles[side];
  let vy = 0;
  if (paddle.driven) vy = paddle.drivenVy;
  else if (side === "right" && s.mode === "solo") {
    if (s.ai.movement) {
      const defending =
        s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0;
      const target =
        defending && s.ball ? s.ball.y - s.ball.vy * C.AI_REACT : C.AI_HOME_Y;
      const diff = target - paddle.cy;
      if (Math.abs(diff) > (defending ? C.AI_DEADZONE : C.AI_HOME_DEADZONE))
        vy =
          Math.sign(diff) *
          Math.min(C.AI_SPEED, dt > 0 ? Math.abs(diff) / dt : C.AI_SPEED);
    }
  } else {
    const prefix = side === "left" ? "p1" : "p2";
    const up =
      api.input.value(`${prefix}-up`) > 0 ||
      (s.mode === "solo" && api.input.value("p2-up") > 0);
    const down =
      api.input.value(`${prefix}-down`) > 0 ||
      (s.mode === "solo" && api.input.value("p2-down") > 0);
    vy = (Number(down) - Number(up)) * C.PADDLE_SPEED;
  }
  const raw = paddle.cy + vy * dt;
  const cy = clamp(raw, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  if (cy !== raw && dt > 0) vy = (cy - paddle.cy) / dt;
  return { ...paddle, cy, vy };
}

export function update(
  state: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState {
  let s = readInput(state, api);
  s = { ...s, simTime: state.simTime + dt };
  if (s.screen !== "playing" && s.screen !== "countdown") return s;
  s = {
    ...s,
    paddles: {
      left: movePaddle(s, "left", api, dt),
      right: movePaddle(s, "right", api, dt),
    },
  };
  const cues = new Set<C.CueName>();
  let b = s.ball;
  if (b) {
    if (s.screen === "countdown" || b.held) {
      const holdTimer = Math.max(0, b.holdTimer - dt);
      b = { ...b, holdTimer };
      if (holdTimer <= 0) {
        b = {
          ...b,
          held: false,
          trail: [],
          vx:
            (s.receiver === "left" ? -1 : 1) *
            C.SERVE_SPEED *
            Math.cos(C.SERVE_ANGLE),
          vy: b.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
        };
        s = { ...s, screen: "playing" };
      }
    } else b = fly(b, s, dt, cues);
    b = {
      ...b,
      trail: [
        ...b.trail.filter((p) => s.simTime - p.t <= C.TRAIL_TIME),
        { x: b.x, y: b.y, t: s.simTime },
      ],
    };
    s = { ...s, ball: b };
    if (!b.held && (b.x - C.BALL_R > C.FIELD_W || b.x + C.BALL_R < 0)) {
      const left = b.x > C.FIELD_W;
      const score = {
        p1: s.score.p1 + Number(left),
        p2: s.score.p2 + Number(!left),
      };
      cues.add(C.CUES.score);
      const won =
        Math.max(score.p1, score.p2) >= C.WIN_SCORE &&
        Math.abs(score.p1 - score.p2) >= C.WIN_LEAD;
      s = won
        ? {
            ...s,
            score,
            winner: left ? "left" : "right",
            screen: "matchover",
            menuIndex: 0,
          }
        : {
            ...s,
            score,
            receiver: left ? "right" : "left",
            screen: "countdown",
            ball: parkedBall(),
          };
    }
  }
  const obstacleClock = s.obstacleClock + (s.obstacleClockRunning ? dt : 0);
  s = {
    ...s,
    obstacleClock,
    obstacles: s.obstacles.map((o) => obstaclePose(o.index, obstacleClock)),
  };
  for (const cue of cues) api.audio.play(cue);
  return s;
}
