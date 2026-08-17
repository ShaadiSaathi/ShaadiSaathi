"use client"

import {
  motion,
  useTransform,
  type MotionValue,
} from "framer-motion"
import Image from "next/image"

const WIDE = "/test-landing-v2/palace-wide.webp"
const GATES = "/test-landing-v2/palace-gates.webp"
const ENTRANCE = "/test-landing-v2/palace-entrance.webp"

interface PalaceScrollBackgroundProps {
  progress: MotionValue<number>
}

export default function PalaceScrollBackground({ progress }: PalaceScrollBackgroundProps) {
  const scale = useTransform(progress, [0, 1], [1, 2.35])
  const y = useTransform(progress, [0, 1], ["0%", "-5%"])

  const wideOpacity = useTransform(progress, [0, 0.2, 0.32], [1, 1, 0])
  const gatesOpacity = useTransform(progress, [0.22, 0.34, 0.52, 0.58], [0, 1, 1, 0])
  const entranceOpacity = useTransform(progress, [0.48, 0.58, 0.78, 0.88], [0, 1, 1, 0])

  const overlayOpacity = useTransform(progress, [0, 0.5, 0.75, 1], [0.42, 0.52, 0.75, 0.94])
  const blurPx = useTransform(progress, [0.55, 0.85], [0, 10])
  const backdropBlur = useTransform(blurPx, (v) => `blur(${v}px)`)

  return (
    <div className="absolute inset-0 overflow-hidden bg-maroon-dark">
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ scale, y, transformOrigin: "center center" }}
      >
        <motion.div className="absolute inset-0" style={{ opacity: wideOpacity }}>
          <Image
            src={WIDE}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </motion.div>
        <motion.div className="absolute inset-0" style={{ opacity: gatesOpacity }}>
          <Image
            src={GATES}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </motion.div>
        <motion.div className="absolute inset-0" style={{ opacity: entranceOpacity }}>
          <Image
            src={ENTRANCE}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </motion.div>
      </motion.div>

      {/* Legibility gradient — maroon tint */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-maroon/55 via-maroon/35 to-maroon/90"
        style={{ opacity: overlayOpacity }}
        aria-hidden
      />

      {/* Soft blur as we move "inside" */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: overlayOpacity,
          backdropFilter: backdropBlur,
          WebkitBackdropFilter: backdropBlur,
        }}
        aria-hidden
      />
    </div>
  )
}
