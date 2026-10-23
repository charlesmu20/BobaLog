import type { BadgeDefinition } from "@/lib/badges";
import { Glyph, type Tone } from "./glyphs";

// Direction A「輪廓款」:tier家族共用一個圓形,但輪廓隨等級變化(平滑圓盤→花邊圓→星芒+緞帶);
// 獨立勳章則各自用不同的外型(盾牌、六角形、菱形、轉角方塊)做區分。

const CX = 40;
const CY = 38;

function burst(n: number, outer: number, inner: number) {
  return Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / n) * i - Math.PI / 2;
    return `${(CX + r * Math.cos(a)).toFixed(2)},${(CY + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

const BURST = burst(14, 35, 29);

const SCALLOPS = Array.from({ length: 12 }, (_, i) => {
  const a = (Math.PI / 6) * i;
  return { x: CX + 26 * Math.cos(a), y: CY + 26 * Math.sin(a) };
});

function TierFrame({ tier }: { tier: 1 | 2 | 3 }) {
  if (tier === 1) {
    return <circle cx={CX} cy={CY} r={31} className="fill-[#E3D8C6] stroke-[#3C332B]" strokeWidth={3} />;
  }

  if (tier === 2) {
    return (
      <g>
        <g className="fill-[#3C332B] stroke-[#3C332B]" strokeWidth={6} strokeLinejoin="round">
          <circle cx={CX} cy={CY} r={26} />
          {SCALLOPS.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={6.5} />
          ))}
        </g>
        <g className="fill-[#A6C285]">
          <circle cx={CX} cy={CY} r={26} />
          {SCALLOPS.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={6.5} />
          ))}
        </g>
      </g>
    );
  }

  return (
    <g strokeLinejoin="round" className="stroke-[#3C332B]" strokeWidth={3}>
      <path d="M26 58 L19 77 L29 72 L34 79 L40 60 Z" className="fill-[#A6C285]" />
      <path d="M54 58 L61 77 L51 72 L46 79 L40 60 Z" className="fill-[#A6C285]" />
      <polygon points={BURST} className="fill-[#C9732F]" />
    </g>
  );
}

const silhouettes: Record<
  string,
  { shape: React.ReactNode; fill: string; glyphTone: Tone; size: number; y: number }
> = {
  "favorite-brands-5": {
    shape: <path d="M40 7 L66 15 V40 C66 56 54 66 40 73 C26 66 14 56 14 40 V15 Z" />,
    fill: "fill-[#A6C285]",
    glyphTone: "orange",
    size: 36,
    y: 20,
  },
  "favorite-drinks-5": {
    shape: <path d="M40 6 L68 22 V58 L40 74 L12 58 V22 Z" />,
    fill: "fill-[#C9732F]",
    glyphTone: "orange",
    size: 40,
    y: 20,
  },
  "ratings-5": {
    shape: <path d="M40 6 L74 40 L40 74 L6 40 Z" />,
    fill: "fill-[#E3D8C6]",
    glyphTone: "orange",
    size: 34,
    y: 22,
  },
  "comments-5": {
    shape: <rect x="10" y="10" width="60" height="60" rx="20" transform="rotate(-7 40 40)" />,
    fill: "fill-[#A6C285]",
    glyphTone: "cream",
    size: 38,
    y: 21,
  },
};

export function MedalA({ badge }: { badge: BadgeDefinition }) {
  if (badge.family === "tier" && badge.tier) {
    const isCup = badge.glyph === "cup";
    return (
      <svg viewBox="0 0 80 80" className="size-full" aria-hidden>
        <TierFrame tier={badge.tier} />
        <circle cx={CX} cy={CY} r={21} className="fill-[#F6F2EA] stroke-[#3C332B]" strokeWidth={3} />
        <Glyph
          name={badge.glyph}
          x={CX - 17}
          y={CY - 17}
          width={34}
          height={34}
          tone="orange"
          {...(isCup ? { tea: badge.tier === 2 ? "orange" : "matcha", level: badge.tier } : {})}
        />
      </svg>
    );
  }

  const s = silhouettes[badge.id];
  return (
    <svg viewBox="0 0 80 80" className="size-full" aria-hidden>
      <g className={`${s.fill} stroke-[#3C332B]`} strokeWidth={3} strokeLinejoin="round">
        {s.shape}
      </g>
      <Glyph
        name={badge.glyph}
        x={40 - s.size / 2}
        y={s.y}
        width={s.size}
        height={s.size}
        tone={s.glyphTone}
      />
    </svg>
  );
}
