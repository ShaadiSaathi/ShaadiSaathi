// lib/anthropometry/landmark-atlas.ts
// Manual Ch.2 §2.1.4 — five landmark categories (geometry role).

export type LandmarkCategory =
  | "max_projection"      // Type 1: most anterior (pronasale, pogonion, glabella)
  | "min_projection"      // Type 2: deepest concavity (subnasale, supramentale)
  | "boundary"            // Type 3: region intersection (stomion, chelion)
  | "curvature_transition"// Type 4: curvature change (nasion, rhinion)
  | "skeletal_estimate"   // Type 5: not directly visible (gonion, condylion)

export type FacialRegion =
  | "forehead"
  | "orbital"
  | "nose"
  | "upper_lip"
  | "lower_lip"
  | "chin"
  | "neck"
  | "jaw"

export type AtlasEntry = {
  id: string
  name: string
  category: LandmarkCategory
  region: FacialRegion
  /** Anatomical definition — anatomy only, never aesthetics */
  definition: string
  /** Detection stage in dependency tree (lower = earlier) */
  dependencyOrder: number
  /** Expected proportion of face height for outlier checks (lo-hi) */
  proportionRange?: { lo: number; hi: number; ref: string }
}

export const PROFILE_ATLAS: Record<string, AtlasEntry> = {
  glabella: {
    id: "glabella",
    name: "Glabella (G)",
    category: "max_projection",
    region: "forehead",
    definition: "Most prominent anterior point of the forehead in the midsagittal profile.",
    dependencyOrder: 1,
  },
  nasion: {
    id: "nasion",
    name: "Soft Tissue Nasion (N′)",
    category: "curvature_transition",
    region: "nose",
    definition: "Deepest depression at the root of the nose between the eyes on the profile contour.",
    dependencyOrder: 2,
  },
  pronasale: {
    id: "pronasale",
    name: "Pronasale (Prn)",
    category: "max_projection",
    region: "nose",
    definition: "Most anterior point on the soft-tissue nasal contour (not the visual center of the tip).",
    dependencyOrder: 4,
    proportionRange: { lo: 0.28, hi: 0.42, ref: "nasion→pronasale / face height" },
  },
  columella: {
    id: "columella",
    name: "Columella (Cm)",
    category: "boundary",
    region: "nose",
    definition: "Lowest point on the nasal septum profile just before the upper lip.",
    dependencyOrder: 5,
  },
  subnasale: {
    id: "subnasale",
    name: "Subnasale (Sn)",
    category: "min_projection",
    region: "nose",
    definition: "Deepest point at the junction of the nasal base and upper lip (columella–lip junction).",
    dependencyOrder: 6,
    proportionRange: { lo: 0.04, hi: 0.14, ref: "pronasale→subnasale / face height" },
  },
  upperLip: {
    id: "labrale_superius",
    name: "Labrale Superius (Ls)",
    category: "max_projection",
    region: "upper_lip",
    definition: "Most anterior point of the upper lip vermilion in profile.",
    dependencyOrder: 7,
    proportionRange: { lo: 0.03, hi: 0.12, ref: "subnasale→upper lip / face height" },
  },
  lowerLip: {
    id: "labrale_inferius",
    name: "Labrale Inferius (Li)",
    category: "max_projection",
    region: "lower_lip",
    definition: "Most anterior point of the lower lip vermilion in profile.",
    dependencyOrder: 8,
  },
  pogonion: {
    id: "pogonion",
    name: "Soft Tissue Pogonion (Pg′)",
    category: "max_projection",
    region: "chin",
    definition: "Most anterior point on the soft-tissue chin contour — not the lowest point.",
    dependencyOrder: 9,
  },
  menton: {
    id: "menton",
    name: "Soft Tissue Menton (Me′)",
    category: "curvature_transition",
    region: "chin",
    definition: "Lowest point on the soft-tissue chin contour in profile.",
    dependencyOrder: 10,
  },
  cervical: {
    id: "cervical",
    name: "Cervical Point (C)",
    category: "min_projection",
    region: "neck",
    definition: "Innermost point where submental tissue meets the neck.",
    dependencyOrder: 12,
  },
  gonion: {
    id: "gonion",
    name: "Gonion (Go′)",
    category: "skeletal_estimate",
    region: "jaw",
    definition: "Estimated angle of the mandible (ramus–body intersection) from visible jaw contour.",
    dependencyOrder: 11,
  },
  orbitale: {
    id: "orbitale",
    name: "Orbitale",
    category: "skeletal_estimate",
    region: "orbital",
    definition: "Lowest point on the orbital margin (lower eyelid) for Frankfort Horizontal.",
    dependencyOrder: 0,
  },
  porion: {
    id: "porion",
    name: "Porion / Tragus",
    category: "skeletal_estimate",
    region: "orbital",
    definition: "Superior margin of the external auditory meatus (tragus proxy) for FHP.",
    dependencyOrder: 0,
  },
  condylion: {
    id: "condylion",
    name: "Condylion",
    category: "skeletal_estimate",
    region: "jaw",
    definition: "Estimated mandibular condyle position for ramus angle (not directly visible).",
    dependencyOrder: 11,
  },
}

/** §2.1.17 dependency order for profile landmark placement */
export const LANDMARK_DEPENDENCY_ORDER = Object.values(PROFILE_ATLAS)
  .sort((a, b) => a.dependencyOrder - b.dependencyOrder)
  .map(e => e.id)
