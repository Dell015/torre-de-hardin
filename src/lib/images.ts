import data from "@/data/images.json";

export type ImgMeta = { w: number; h: number; color: string; srcs: { f: string; w: number }[] };
export const IMG = data as unknown as Record<string, ImgMeta>;

export function imgSet(name: string) {
  const m = IMG[name];
  if (!m) throw new Error("Unknown image: " + name);
  const srcSet = m.srcs.map((s) => `/img/${s.f} ${s.w}w`).join(", ");
  const mid = m.srcs[Math.min(1, m.srcs.length - 1)];
  return { m, srcSet, src: `/img/${mid.f}` };
}
