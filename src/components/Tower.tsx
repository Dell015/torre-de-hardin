/** Hand-built line illustration of the Torre de Jardin tower. Strokes can be drawn on with GSAP. */
export default function TowerLine({ className = "", stroke = "currentColor" }: { className?: string; stroke?: string }) {
  const ribs = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12; // 0..1 across the crown
    const x = 20 + t * 160;
    const lift = 18 + Math.sin(t * Math.PI) * 52;
    return { x, y: 118 - lift, cx: 100 + (x - 100) * 0.35 };
  });
  return (
    <svg
      className={className}
      viewBox="0 0 200 330"
      fill="none"
      stroke={stroke}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* crown ribs */}
      {ribs.map((r, i) => (
        <path key={i} className="tl" d={`M100 120 C ${r.cx} 112, ${r.x} 96, ${r.x} ${r.y}`} />
      ))}
      {/* crown rim */}
      <path className="tl" d="M18 70 C 50 98, 150 98, 182 70" />
      <path className="tl" d="M30 58 C 60 82, 140 82, 170 58" />
      {/* secondary branching */}
      {ribs.filter((_, i) => i % 2 === 0).map((r, i) => (
        <path key={"b" + i} className="tl" d={`M${r.x} ${r.y} l ${i % 2 ? 6 : -6} -12 M${r.x} ${r.y} l ${i % 2 ? -5 : 5} -9`} />
      ))}
      {/* collar */}
      <ellipse className="tl" cx="100" cy="126" rx="22" ry="5" />
      {/* trunk */}
      <path className="tl" d="M82 130 C 88 170, 88 190, 86 218 L 80 306" />
      <path className="tl" d="M118 130 C 112 170, 112 190, 114 218 L 120 306" />
      <path className="tl" d="M100 131 L 100 306" />
      {/* observation ring */}
      <ellipse className="tl" cx="100" cy="196" rx="38" ry="6" />
      <ellipse className="tl" cx="100" cy="196" rx="26" ry="3.5" />
      {/* rungs */}
      {[226, 248, 270, 290].map((y, i) => (
        <path key={y} className="tl" d={`M${86 - i * 1.3} ${y} H ${114 + i * 1.3}`} />
      ))}
      {/* base */}
      <ellipse className="tl" cx="100" cy="310" rx="30" ry="5" />
    </svg>
  );
}
