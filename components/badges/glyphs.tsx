import type { SVGProps } from "react";
import type { GlyphName } from "@/lib/badges";

// 勳章圖示要用的顏色調,對應專案既有的色票
export type Tone = "matcha" | "orange" | "cream" | "sand";

export const toneFill: Record<Tone, string> = {
  matcha: "fill-[#A6C285]",
  orange: "fill-[#C9732F]",
  cream: "fill-[#F6F2EA]",
  sand: "fill-[#E3D8C6]",
};

export interface GlyphProps extends SVGProps<SVGSVGElement> {
  tone?: Tone; // 蓋子/愛心/星星/留言泡泡的顏色
  tea?: Tone; // 杯子圖示裡「茶」的顏色
  level?: 0 | 1 | 2 | 3; // 0=空杯,1-3=杯子裝多滿(給里程碑家族用)
}

const svgBase = {
  viewBox: "0 0 48 48",
  fill: "none",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const leftEdge = (y: number) => 12 + (3 * (y - 18)) / 24;
const rightEdge = (y: number) => 48 - leftEdge(y);

const TEA_TOP = { 1: 34, 2: 27, 3: 21 } as const;

const PEARLS: Record<1 | 2 | 3, [number, number][]> = {
  1: [
    [19, 37.5],
    [24, 37.5],
    [29, 37.5],
  ],
  2: [
    [19, 37.5],
    [24, 37.5],
    [29, 37.5],
    [21.5, 32.5],
    [26.5, 32.5],
  ],
  3: [
    [19, 37.5],
    [24, 37.5],
    [29, 37.5],
    [21.5, 32.5],
    [26.5, 32.5],
    [19, 27.5],
    [24, 27.5],
    [29, 27.5],
  ],
};

export function CupGlyph({
  tone = "orange",
  tea = "matcha",
  level = 3,
  heart = false,
  className = "",
  ...props
}: GlyphProps & { heart?: boolean }) {
  const filled = level === 0 ? null : level;
  const teaTop = filled ? TEA_TOP[filled] : 0;
  return (
    <svg {...svgBase} {...props} className={`stroke-[#3C332B] ${className}`}>
      <path d="M30 14 L34 4" strokeWidth={4} />
      <path d="M12 18 L15 42 H33 L36 18 Z" className="fill-[#F6F2EA]" />
      {filled && (
        <polygon
          points={`${leftEdge(teaTop) + 1.5},${teaTop} ${rightEdge(teaTop) - 1.5},${teaTop} 32.4,40.5 15.6,40.5`}
          className={toneFill[tea]}
          stroke="none"
        />
      )}
      {filled &&
        PEARLS[filled].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.3} className="fill-[#3C332B]" stroke="none" />
        ))}
      <rect x="9" y="12" width="30" height="7" rx="3.5" className={toneFill[tone]} />
      {heart && (
        <path
          d="M24 39 C13 32 15 22 21 23.5 C22.8 24 24 25.8 24 25.8 C24 25.8 25.2 24 27 23.5 C33 22 35 32 24 39 Z"
          className={toneFill[tone]}
          strokeWidth={2.5}
        />
      )}
    </svg>
  );
}

export function BrandGlyph({ tone = "orange", className = "", ...props }: GlyphProps) {
  return (
    <svg {...svgBase} {...props} className={`stroke-[#3C332B] ${className}`}>
      <rect x="10" y="20" width="28" height="21" className="fill-[#F6F2EA]" />
      <rect x="19" y="28" width="10" height="13" rx="1" className={toneFill[tone]} />
      <path d="M7 21 L11 7 H37 L41 21 Z" className={toneFill[tone]} />
      <path d="M17 7 L15 21 M24 7 V21 M31 7 L33 21" strokeWidth={2.5} />
    </svg>
  );
}

function starPoints(cx: number, cy: number, outer: number, inner: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

const STAR = starPoints(24, 25, 19, 8.5);

export function StarGlyph({ tone = "orange", className = "", ...props }: GlyphProps) {
  return (
    <svg {...svgBase} {...props} className={`stroke-[#3C332B] ${className}`}>
      <polygon points={STAR} className={toneFill[tone]} />
    </svg>
  );
}

export function CommentGlyph({ tone = "cream", className = "", ...props }: GlyphProps) {
  return (
    <svg {...svgBase} {...props} className={`stroke-[#3C332B] ${className}`}>
      <path
        d="M14 8 H34 A8 8 0 0 1 42 16 V24 A8 8 0 0 1 34 32 H27 L19 41 V32 H14 A8 8 0 0 1 6 24 V16 A8 8 0 0 1 14 8 Z"
        className={toneFill[tone]}
      />
      <circle cx="16" cy="20" r="2.4" className="fill-[#3C332B]" stroke="none" />
      <circle cx="24" cy="20" r="2.4" className="fill-[#3C332B]" stroke="none" />
      <circle cx="32" cy="20" r="2.4" className="fill-[#3C332B]" stroke="none" />
    </svg>
  );
}

export function Glyph({ name, ...props }: GlyphProps & { name: GlyphName }) {
  switch (name) {
    case "cup":
      return <CupGlyph {...props} />;
    case "drink-heart":
      return <CupGlyph {...props} level={0} heart />;
    case "brand":
      return <BrandGlyph {...props} />;
    case "star":
      return <StarGlyph {...props} />;
    case "comment":
      return <CommentGlyph {...props} />;
  }
}
