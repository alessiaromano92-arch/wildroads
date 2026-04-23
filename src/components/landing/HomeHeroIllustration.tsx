"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Scroll multiplier: illustration moves down gently as you scroll (lags the page). */
const PARALLAX_RATE = 0.09;
const PARALLAX_MAX_PX = 40;

export function HomeHeroIllustration() {
  const [shiftY, setShiftY] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setShiftY(0);
          return;
        }
        const y = Math.min(window.scrollY * PARALLAX_RATE, PARALLAX_MAX_PX);
        setShiftY(y);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="relative mb-6 w-full overflow-hidden rounded-[0.65rem] border-[3px] border-[var(--cartoon-ink)] shadow-[3px_3px_0_rgba(51,84,76,0.2)] sm:mb-8 sm:rounded-[0.85rem]">
      <div className="relative aspect-[21/9] w-full sm:aspect-[3/1] md:aspect-[10/3]">
        <div
          className="absolute inset-x-0 will-change-transform"
          style={{
            top: "-11%",
            height: "122%",
            transform: `translate3d(0, ${shiftY}px, 0)`,
          }}
        >
          <div className="relative h-full w-full">
            <Image
              src="/images/wild-roads-journal-hero.png"
              alt="Moonlit pine forest, vintage camper on a dirt road, and a hand-painted Wild Roads Journal sign"
              fill
              className="object-cover object-[center_48%]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 56rem"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
