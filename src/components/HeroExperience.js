"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useReducedMotion } from "motion/react";

const Scene = dynamic(() => import("@/components/HeroScene"), { ssr: false, loading: () => null });

export default function HeroExperience() {
  const reduceMotion = useReducedMotion();
  return <div className="hero-art" aria-hidden="true">
    <Image className="hero-photo" src="/images/hero-market.png" alt="" fill priority sizes="(max-width: 760px) 100vw, 72vw" />
    <div className="hero-art-wash" />
    {!reduceMotion && <div className="hero-scene"><Scene /></div>}
    <div className="hero-stamp"><span>COUNTER<br />NO. 04</span><span>FRESH<br />TODAY</span></div>
  </div>;
}
