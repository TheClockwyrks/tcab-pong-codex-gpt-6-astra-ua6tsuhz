import type { RenderApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import type { CaromState } from "./game";
import * as C from "./constants";
import { menuItemRect, menuItems } from "./menus";

const palette = {
  bg: "#0b141b",
  panel: "#101e27",
  line: "#263943",
  muted: "#8da2ab",
  white: "#edf5ee",
  mint: "#8af0ce",
  coral: "#ff897c",
  amber: "#f7c66b",
};
type Context = CanvasRenderingContext2D;
function text(
  ctx: Context,
  value: string,
  x: number,
  y: number,
  size = 16,
  color = palette.white,
  weight = 400,
  align: CanvasTextAlign = "left",
): void {
  ctx.font = `${weight} ${size}px ${size <= 15 ? '"Courier New", monospace' : "Arial, sans-serif"}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}
function line(
  ctx: Context,
  x: number,
  y: number,
  xx: number,
  yy: number,
  color = palette.line,
  width = 1,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(xx, yy);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function bar(
  ctx: Context,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  glow = 0,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(w, h) / 2);
  ctx.fill();
  ctx.restore();
}
function dot(
  ctx: Context,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function tag(
  ctx: Context,
  label: string,
  x: number,
  y: number,
  color = palette.muted,
): void {
  text(ctx, label, x, y, 12, color, 700);
}
function base(ctx: Context): void {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  // A restrained coordinate grid makes the dark court feel like a physical surface.
  ctx.fillStyle = "#1b2a32";
  for (let x = 32; x < C.FIELD_W; x += 32)
    for (let y = 32; y < C.FIELD_H; y += 32) ctx.fillRect(x, y, 1, 1);
}
function footer(ctx: Context, s: CaromState, menu = false): void {
  line(ctx, 100, 654, 1180, 654);
  tag(
    ctx,
    menu ? "W / S  OR  ↑ / ↓   SELECT     ENTER  PLAY" : "W / S   PLAYER 01",
    100,
    682,
  );
  tag(
    ctx,
    menu
      ? "A GAME OF ANGLES."
      : s.mode === "solo"
        ? "SOLO   /   HUMAN vs MACHINE"
        : "↑ / ↓   PLAYER 02",
    640,
    682,
  );
  text(
    ctx,
    `M  SOUND ${s.muted ? "OFF" : "ON"}`,
    1180,
    682,
    12,
    s.muted ? palette.coral : palette.muted,
    700,
    "right",
  );
}
function menu(ctx: Context, s: CaromState): void {
  menuItems(s).forEach((label, i) => {
    const r = menuItemRect(s, i)!;
    const selected = i === s.menuIndex;
    ctx.fillStyle = selected ? palette.mint : palette.panel;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 5);
    ctx.fill();
    if (!selected) {
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    text(
      ctx,
      `0${i + 1}`,
      r.x + 22,
      r.y + r.h / 2,
      12,
      selected ? "#28594c" : palette.muted,
      700,
    );
    text(
      ctx,
      label,
      r.x + 66,
      r.y + r.h / 2,
      17,
      selected ? palette.bg : palette.white,
      700,
    );
    text(
      ctx,
      selected ? "→" : "+",
      r.x + r.w - 26,
      r.y + r.h / 2,
      23,
      selected ? palette.bg : palette.muted,
      400,
      "center",
    );
  });
}

function title(ctx: Context, s: CaromState): void {
  tag(ctx, "C / 01", 100, 70, palette.mint);
  tag(ctx, "THE PADDLE DUEL, WITH A TWIST", 189, 70);
  text(
    ctx,
    "LOCAL ARCADE   /   1–2 PLAYERS",
    1180,
    70,
    12,
    palette.muted,
    700,
    "right",
  );
  line(ctx, 100, 100, 1180, 100);
  text(ctx, C.TITLE_TEXT, 92, 219, 119, palette.white, 900);
  bar(ctx, 102, 285, 38, 4, palette.mint);
  text(ctx, "Make every angle count.", 100, 322, 24, palette.muted);
  menu(ctx, s);
  tag(ctx, `FIRST TO ${C.WIN_SCORE}  /  WIN BY ${C.WIN_LEAD}`, 100, 607);

  // An original diagram of a bank shot: drawn geometry, no external artwork.
  const x = 660,
    y = 160,
    w = 520,
    h = 424;
  ctx.fillStyle = "#0e1b23";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  tag(ctx, "FIG. 01", x + 24, y + 28);
  text(
    ctx,
    "THE ART OF THE RETURN",
    x + w - 24,
    y + 28,
    11,
    palette.muted,
    700,
    "right",
  );
  ctx.save();
  ctx.setLineDash([4, 9]);
  line(ctx, 920, 217, 920, 528, palette.line);
  ctx.restore();
  ctx.save();
  ctx.translate(835, 280);
  ctx.rotate(-0.42);
  bar(ctx, -6, -49, 12, 98, palette.amber, 16);
  ctx.restore();
  ctx.save();
  ctx.translate(1015, 465);
  ctx.rotate(-0.42);
  bar(ctx, -6, -49, 12, 98, palette.amber, 16);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "#47695f";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.moveTo(706, 441);
  ctx.bezierCurveTo(780, 440, 830, 415, 893, 366);
  ctx.lineTo(1050, 234);
  ctx.lineTo(1140, 305);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = palette.mint;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(707, 440);
  ctx.bezierCurveTo(790, 440, 849, 400, 903, 358);
  ctx.stroke();
  ctx.restore();
  bar(ctx, 697, 398, 10, 79, palette.mint, 16);
  bar(ctx, 1140, 271, 10, 79, palette.coral, 16);
  dot(ctx, 907, 355, 9, palette.white);
  ctx.strokeStyle = "#729989";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(907, 355, 19, -1.4, 1.8);
  ctx.stroke();
  tag(ctx, "SPIN", 762, 481, palette.mint);
  tag(ctx, "BANK", 1037, 214, palette.amber);
  tag(ctx, "01", 692, 502, palette.mint);
  tag(ctx, "02", 1134, 376, palette.coral);
  text(
    ctx,
    "MOVE. CURVE. OUTPLAY.",
    920,
    558,
    12,
    palette.muted,
    700,
    "center",
  );
  footer(ctx, s, true);
}

function field(ctx: Context, s: CaromState): void {
  line(ctx, 0, 2, C.FIELD_W, 2, "#41545a", 3);
  line(ctx, 0, C.FIELD_H - 2, C.FIELD_W, C.FIELD_H - 2, "#41545a", 3);
  ctx.save();
  ctx.setLineDash([5, 13]);
  line(ctx, C.NET_X, 120, C.NET_X, C.FIELD_H - 54, "#30414a");
  ctx.restore();
  ctx.strokeStyle = "#24363f";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(C.FIELD_CX, C.FIELD_CY, 85, 0, Math.PI * 2);
  ctx.stroke();
  line(ctx, C.P1_X1 + 32, 130, C.P1_X1 + 32, 590, "#192d32");
  line(ctx, C.P2_X0 - 32, 130, C.P2_X0 - 32, 590, "#30292c");
  for (const o of s.obstacles) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate(o.theta);
    bar(
      ctx,
      -C.OBSTACLE_HW,
      -C.OBSTACLE_HH,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      palette.amber,
      13,
    );
    line(ctx, -3, -C.OBSTACLE_HH + 15, -3, C.OBSTACLE_HH - 15, "#ffdf9c", 2);
    dot(ctx, 0, 0, 3, "#9c7942");
    ctx.restore();
  }
  bar(
    ctx,
    C.P1_X0,
    s.paddles.left.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    palette.mint,
    17,
  );
  bar(
    ctx,
    C.P2_X0,
    s.paddles.right.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    palette.coral,
    17,
  );
  const b = s.ball;
  if (b) {
    // The latest sample freezes trail brightness and spin decoration during pause.
    const trailTime = b.trail[b.trail.length - 1]?.t ?? s.obstacleClock;
    for (let i = 1; i < b.trail.length; i++) {
      const prev = b.trail[i - 1],
        p = b.trail[i];
      const alpha = Math.max(0, 1 - (trailTime - p.t) / C.TRAIL_TIME);
      ctx.save();
      ctx.globalAlpha = alpha * 0.48;
      ctx.lineCap = "round";
      line(
        ctx,
        prev.x,
        prev.y,
        p.x,
        p.y,
        palette.mint,
        C.BALL_R * (0.4 + alpha),
      );
      ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = palette.white;
    ctx.shadowBlur = 20;
    dot(ctx, b.x, b.y, C.BALL_R, palette.white);
    ctx.restore();
    if (Math.abs(b.spin) > 25 && !b.held) {
      ctx.strokeStyle = palette.mint;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        b.x,
        b.y,
        C.BALL_R + 6,
        trailTime * 6,
        trailTime * 6 + Math.PI * Math.min(1.5, Math.abs(b.spin) / 350),
      );
      ctx.stroke();
    }
  }
  // Compact scoreboard leaves nearly the entire court unobstructed.
  text(ctx, C.TITLE_TEXT, 100, 45, 21, palette.white, 900);
  tag(ctx, s.mode === "solo" ? "SOLO / VS AI" : "LOCAL / VERSUS", 100, 74);
  text(ctx, "PLAYER 01", 515, 33, 11, palette.mint, 700, "center");
  text(
    ctx,
    s.mode === "solo" ? "MACHINE" : "PLAYER 02",
    765,
    33,
    11,
    palette.coral,
    700,
    "center",
  );
  text(
    ctx,
    String(s.score.p1).padStart(2, "0"),
    515,
    79,
    58,
    palette.mint,
    700,
    "center",
  );
  text(
    ctx,
    String(s.score.p2).padStart(2, "0"),
    765,
    79,
    58,
    palette.coral,
    700,
    "center",
  );
  text(ctx, "FIRST TO", C.FIELD_CX, 47, 10, palette.muted, 700, "center");
  text(
    ctx,
    String(C.WIN_SCORE),
    C.FIELD_CX,
    69,
    19,
    palette.white,
    700,
    "center",
  );
  text(ctx, "P / ESC  PAUSE", 1180, 45, 12, palette.muted, 700, "right");
  text(
    ctx,
    `M  SOUND ${s.muted ? "OFF" : "ON"}`,
    1180,
    72,
    12,
    palette.muted,
    700,
    "right",
  );
  tag(
    ctx,
    s.mode === "solo" ? "W / S  OR  ↑ / ↓" : "W / S",
    100,
    683,
    palette.mint,
  );
  text(
    ctx,
    "MOVE ON CONTACT TO ADD SPIN",
    C.FIELD_CX,
    683,
    11,
    palette.muted,
    700,
    "center",
  );
  text(
    ctx,
    s.mode === "solo" ? "AI OPPONENT" : "↑ / ↓",
    1180,
    683,
    12,
    palette.coral,
    700,
    "right",
  );
  if (s.screen === "countdown" && b) {
    text(
      ctx,
      "GET READY",
      C.FIELD_CX,
      C.FIELD_CY - 77,
      22,
      palette.white,
      700,
      "center",
    );
    text(
      ctx,
      s.receiver === "left"
        ? "←  SERVING TO PLAYER 01"
        : `SERVING TO ${s.mode === "solo" ? "MACHINE" : "PLAYER 02"}  →`,
      C.FIELD_CX,
      C.FIELD_CY + 58,
      12,
      palette.muted,
      700,
      "center",
    );
    ctx.strokeStyle = palette.mint;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      C.FIELD_CX,
      C.FIELD_CY,
      28,
      -Math.PI / 2,
      -Math.PI / 2 + 2 * Math.PI * Math.max(0, b.holdTimer / C.HOLD_TIME),
    );
    ctx.stroke();
  }
}
function howto(ctx: Context, s: CaromState): void {
  tag(ctx, "C / 01     THE FIELD GUIDE", 100, 70, palette.mint);
  line(ctx, 100, 100, 1180, 100);
  text(
    ctx,
    "A little motion. A different game.",
    100,
    163,
    44,
    palette.white,
    700,
  );
  text(
    ctx,
    `Send the ball past your opponent. First to ${C.WIN_SCORE}, with a ${C.WIN_LEAD}-point lead.`,
    100,
    218,
    20,
    palette.muted,
  );
  const cards = [
    {
      x: 100,
      n: "01",
      title: "TAKE YOUR SIDE",
      color: palette.mint,
      lines: [
        "Solo: W / S or ↑ / ↓ moves you.",
        "Versus: W / S left, ↑ / ↓ right.",
        "On touch, use the side sliders.",
      ],
    },
    {
      x: 470,
      n: "02",
      title: "PUT A CURVE ON IT",
      color: palette.coral,
      lines: [
        "Move as you strike to add spin.",
        "The ball curves after contact.",
        "Hit near an edge for a wider angle.",
      ],
    },
    {
      x: 840,
      n: "03",
      title: "PLAY THE ANGLES",
      color: palette.amber,
      lines: [
        "Amber obstacles sway and rotate.",
        "Bank a shot off their moving faces.",
        "Use the walls. Find the opening.",
      ],
    },
  ];
  for (const card of cards) {
    bar(ctx, card.x, 274, 340, 3, card.color);
    text(ctx, card.n, card.x, 313, 14, card.color, 700);
    text(ctx, card.title, card.x, 355, 20, palette.white, 700);
    card.lines.forEach((l, i) =>
      text(ctx, l, card.x, 408 + i * 29, 16, palette.muted),
    );
  }
  text(
    ctx,
    "P / ESC  PAUSE & RESUME     M  TOGGLE SOUND",
    C.FIELD_CX,
    547,
    13,
    palette.muted,
    700,
    "center",
  );
  menu(ctx, s);
}

export function render(s: DeepReadonly<CaromState>, api: RenderApi): void {
  const ctx = api.ctx;
  ctx.save();
  base(ctx);
  if (s.screen === "title") title(ctx, s);
  else if (s.screen === "howto") howto(ctx, s);
  else {
    field(ctx, s);
    if (s.screen === "paused" || s.screen === "matchover") {
      ctx.fillStyle = "rgba(6, 13, 19, 0.85)";
      ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
      ctx.fillStyle = palette.panel;
      ctx.beginPath();
      ctx.roundRect(370, 157, 540, 440, 12);
      ctx.fill();
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      ctx.stroke();
      text(
        ctx,
        s.screen === "paused" ? "TAKE A BREATHER" : "MATCH COMPLETE",
        C.FIELD_CX,
        197,
        12,
        palette.mint,
        700,
        "center",
      );
      text(
        ctx,
        s.screen === "paused"
          ? "PAUSED"
          : s.winner === "left"
            ? "PLAYER 01 WINS"
            : s.mode === "solo"
              ? "MACHINE WINS"
              : "PLAYER 02 WINS",
        C.FIELD_CX,
        259,
        s.screen === "paused" ? 57 : 37,
        palette.white,
        800,
        "center",
      );
      text(
        ctx,
        `${String(s.score.p1).padStart(2, "0")}   /   ${String(s.score.p2).padStart(2, "0")}`,
        C.FIELD_CX,
        318,
        25,
        palette.muted,
        700,
        "center",
      );
      menu(ctx, s);
      text(
        ctx,
        s.screen === "paused"
          ? "P / ESC  RETURN TO COURT"
          : "ANOTHER ROUND. A NEW ANGLE.",
        C.FIELD_CX,
        625,
        12,
        palette.muted,
        700,
        "center",
      );
    }
  }
  ctx.restore();
}
