/**
 * Firestore document shapes and enum labels. The enum names must stay identical to the Android
 * app's Kotlin enums (domain/model/Enums.kt, Haircut.kt), since both read the same documents.
 */

export const HAIR_LENGTHS = ["SHORT", "MEDIUM", "LONG"] as const;
export const HAIR_TEXTURES = ["STRAIGHT", "WAVY", "CURLY"] as const;
export const FACE_SHAPES = ["OVAL", "ROUND", "SQUARE", "HEART", "DIAMOND"] as const;
export const GENDER_STYLES = ["MASCULINE", "FEMININE", "UNISEX"] as const;
export const TREATMENTS = ["NONE", "REBOND", "PERM"] as const;
export const AR_TYPES = ["AUTO", "DEEPAR", "GLB", "NONE"] as const;

export type HairLength = (typeof HAIR_LENGTHS)[number];
export type HairTexture = (typeof HAIR_TEXTURES)[number];
export type FaceShape = (typeof FACE_SHAPES)[number];
export type GenderStyle = (typeof GENDER_STYLES)[number];
export type Treatment = (typeof TREATMENTS)[number];
export type ArType = (typeof AR_TYPES)[number];

export const LABELS: Record<string, string> = {
  BALD: "Bald",
  SHORT: "Short",
  MEDIUM: "Medium",
  LONG: "Long",
  STRAIGHT: "Straight",
  WAVY: "Wavy",
  CURLY: "Curly",
  OVAL: "Oval",
  ROUND: "Round",
  SQUARE: "Square",
  HEART: "Heart",
  DIAMOND: "Diamond",
  MASCULINE: "Masculine",
  FEMININE: "Feminine",
  UNISEX: "Unisex",
  NONE: "None",
  REBOND: "Rebonding",
  PERM: "Perming",
  MALE: "Male",
  FEMALE: "Female",
  NON_BINARY: "Non-binary",
  PREFER_NOT_TO_SAY: "Prefer not to say",
  FACE_SCAN: "Face scan",
  IMAGE_UPLOAD: "Photo upload",
  BLACK: "Black",
  BROWN: "Brown",
  BLONDE: "Blonde",
  RED: "Red",
  GRAY: "Gray",
  OTHER: "Other",
};

export const AR_TYPE_LABELS: Record<ArType, string> = {
  AUTO: "Bundled in app",
  DEEPAR: "DeepAR effect",
  GLB: "3D model (GLB)",
  NONE: "No try-on",
};

export const label = (value: string | null | undefined) => (value ? LABELS[value] ?? value : "—");

export type GlbFit = {
  scaleMul: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  yawOffset: number;
};

/** Mirrors GlbFit() defaults in the app's Haircut.kt. */
export const DEFAULT_GLB_FIT: GlbFit = { scaleMul: 0.7, offsetX: 0, offsetY: -0.03, offsetZ: 0.02, yawOffset: 0 };

export type Haircut = {
  id: string;
  name: string;
  description: string;
  /** What the app displays: android.resource://… for bundled thumbs, or a Storage URL. */
  imageUrl: string;
  /** Storage copy for the dashboard (and the app once a thumbnail is uploaded here). */
  thumbnailUrl?: string | null;
  thumbnailPath?: string | null;
  length: HairLength;
  texture: HairTexture;
  recommendedFaceShapes: FaceShape[];
  genderStyle: GenderStyle;
  treatment: Treatment;
  arType?: ArType;
  arAssetUrl?: string | null;
  arAssetPath?: string | null;
  /** Which kind of file arAssetUrl points at, so a type switch can't mismatch the asset. */
  arAssetKind?: "DEEPAR" | "GLB" | null;
  arAssetVersion?: number;
  glbFit?: GlbFit;
  isActive?: boolean;
  sortOrder?: number;
  updatedBy?: string;
};

/** True once a document has every field the security rules require for admin writes. */
export function isUpgraded(h: Haircut): boolean {
  return typeof h.isActive === "boolean" && typeof h.sortOrder === "number" && typeof h.arType === "string";
}

export function displayThumbnail(h: Pick<Haircut, "thumbnailUrl" | "imageUrl">): string | null {
  if (h.thumbnailUrl) return h.thumbnailUrl;
  return h.imageUrl?.startsWith("http") ? h.imageUrl : null;
}

export type UserProfile = {
  id: string;
  email?: string;
  username?: string;
  gender?: string;
  birthdayEpochDay?: number;
  photoUrl?: string | null;
  createdAtEpochMillis?: number;
  lastActiveAtEpochMillis?: number;
  preferredHairLength?: string | null;
  preferredHairTexture?: string | null;
  preferredTreatment?: string | null;
  disabled?: boolean;
};

export type Consultation = {
  id: string;
  userId: string;
  source?: string;
  faceShape?: string;
  hairLength?: string;
  hairTexture?: string;
  hairColor?: string;
  selectedHaircutId?: string | null;
  sourceImageUrl?: string | null;
  resultImageUrl?: string | null;
  isFavorite?: boolean;
  createdAtEpochMillis?: number;
  faceShapeConfidence?: number;
  hairLengthConfidence?: number;
  hairTextureConfidence?: number;
  verifierFaceShape?: string | null;
  sourcesAgreed?: boolean;
  appVersion?: string;
  deviceModel?: string;
};

export type Feedback = {
  id: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAtEpochMillis?: number;
};

type Counts = Record<string, number>;

/** stats/global, maintained by the Cloud Functions triggers (functions/src/stats.ts). */
export type GlobalStats = {
  users?: { total?: number; byGender?: Counts };
  consultations?: {
    total?: number;
    bySource?: Counts;
    byFaceShape?: Counts;
    byHairLength?: Counts;
    byHairTexture?: Counts;
    byHaircut?: Counts;
    favorites?: number;
    favoritesByHaircut?: Counts;
    quality?: {
      analysed?: number;
      faceShapeConfidenceSum?: number;
      hairLengthConfidenceSum?: number;
      hairTextureConfidenceSum?: number;
      sourcesAgreed?: number;
    };
  };
  feedback?: { total?: number; ratingSum?: number; byRating?: Counts };
  ai?: { requests?: number; byModel?: Counts };
};

export type DailyStats = {
  date: string;
  consultations?: number;
  newUsers?: number;
  feedback?: number;
  ratingSum?: number;
  aiRequests?: number;
};
