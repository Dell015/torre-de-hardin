import type { CSSProperties, ImgHTMLAttributes } from "react";
import { imgSet } from "@/lib/images";

type Props = {
  name: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
  pos?: string;
  id?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt" | "sizes" | "className" | "style" | "id">;

/** Plain <img> with responsive srcset and a dominant-colour placeholder. */
export default function Img({ name, alt, sizes = "100vw", priority, className, style, pos, id, ...rest }: Props) {
  const { m, srcSet, src } = imgSet(name);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      id={id}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      width={m.w}
      height={m.h}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
      className={className}
      style={{ backgroundColor: m.color, objectPosition: pos, ...style }}
    />
  );
}
