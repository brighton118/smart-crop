import { firebaseDb as supabase, DbPlant, PlantType, PlantStage, PlantHistoryEntry } from "./firebaseDb";

/**
 * Creates a clean uppercase 3-letter strain code
 * e.g., "OG Kush" -> "OGK", "Gorilla Glue" -> "GGL", "Purple Haze" -> "PRP"
 */
export function getStrainCode(variety: string): string {
  const words = variety.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1].substring(0, 2)).toUpperCase();
  }
  const clean = variety.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return clean.substring(0, 3) || "KB";
}

export function padNumber(num: number, digits: number = 2): string {
  return String(num).padStart(digits, "0");
}

/**
 * Formats a fixed, permanent Mother Tag:
 * e.g. KB-MOM-OGK-01
 */
export function formatMotherTag(variety: string, index: number): string {
  const code = getStrainCode(variety);
  return `KB-MOM-${code}-${padNumber(index, 2)}`;
}

/**
 * Formats a fixed, permanent Sub-QR Clone Tag linked directly to Mother Tag:
 * e.g. KB-MOM-OGK-01-C01
 */
export function formatCloneTag(motherTag: string, cloneIndex: number): string {
  return `${motherTag}-C${padNumber(cloneIndex, 2)}`;
}

/**
 * Formats a fixed, permanent Seedling Tag:
 * e.g. KB-SEED-OGK-01
 */
export function formatSeedlingTag(variety: string, index: number): string {
  const code = getStrainCode(variety);
  return `KB-SEED-${code}-${padNumber(index, 2)}`;
}

/**
 * Normalizes scanned QR string or entered Tag to extract the core Plant Tag
 */
export function extractPlantTag(scannedValue: string): string {
  let val = scannedValue.trim();
  // If it's a URL like https://.../plants/KB-MOM-OGK-01 or kindbuds:plant:KB-MOM-OGK-01
  if (val.includes("/plants/")) {
    const parts = val.split("/plants/");
    val = parts[parts.length - 1];
  } else if (val.startsWith("kindbuds:plant:")) {
    val = val.replace("kindbuds:plant:", "");
  }
  return val.trim().toUpperCase();
}

/**
 * Create a new Mother Plant with permanent Master QR Tag
 */
export async function createMotherPlant(params: {
  variety: string;
  field: string;
  plantingDate?: string;
  notes?: string;
}): Promise<{ data: DbPlant | null; error: any }> {
  const now = new Date().toISOString();
  const plantingDate = params.plantingDate || now.split("T")[0];

  // Count existing mother plants of this variety to set sequence index
  const { data: existingMothers } = await supabase
    .from("Plant")
    .select("id, tag")
    .eq("type", "MOTHER")
    .eq("variety", params.variety);

  const nextIndex = (existingMothers?.length || 0) + 1;
  const tag = formatMotherTag(params.variety, nextIndex);

  const newPlant: Omit<DbPlant, "id"> = {
    tag,
    qrCode: tag,
    type: "MOTHER",
    variety: params.variety,
    field: params.field,
    stage: "VEGETATIVE",
    plantingDate,
    notes: params.notes || "Master Mother Plant registered for clone propagation.",
    history: [
      {
        timestamp: now,
        event: "REGISTERED_MOTHER",
        details: `Mother Plant registered with Master QR ${tag} in ${params.field}`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabase.from("Plant").insert(newPlant);
  return { data: (data as any) || null, error };
}

/**
 * Take cuttings from a Mother Plant and generate Sub-QR Codes
 */
export async function createClonesFromMother(params: {
  mother: DbPlant;
  count: number;
  field: string;
  cuttingDate?: string;
  notes?: string;
}): Promise<{ data: DbPlant[]; error: any }> {
  const now = new Date().toISOString();
  const cuttingDate = params.cuttingDate || now.split("T")[0];

  // Find existing clones from this mother to ensure cloneIndex sequence continues
  const { data: existingClones } = await supabase
    .from("Plant")
    .select("id, cloneIndex, tag")
    .eq("motherPlantId", params.mother.id);

  let highestIndex = 0;
  if (existingClones && existingClones.length > 0) {
    existingClones.forEach((c: any) => {
      if (c.cloneIndex && c.cloneIndex > highestIndex) {
        highestIndex = c.cloneIndex;
      }
    });
  }

  const newClones: DbPlant[] = [];

  for (let i = 1; i <= params.count; i++) {
    const cloneIndex = highestIndex + i;
    const tag = formatCloneTag(params.mother.tag, cloneIndex);

    const cloneData: Omit<DbPlant, "id"> = {
      tag,
      qrCode: tag,
      type: "CLONE",
      variety: params.mother.variety,
      motherPlantId: params.mother.id,
      motherTag: params.mother.tag,
      cloneIndex,
      field: params.field,
      stage: "PLANTING",
      plantingDate: cuttingDate,
      notes: params.notes || `Cutting #${cloneIndex} propagated from Mother ${params.mother.tag}`,
      history: [
        {
          timestamp: now,
          event: "CUTTING_PROPAGATED",
          details: `Propagated clone #${cloneIndex} from Mother ${params.mother.tag} with Sub-QR ${tag}`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const { data } = await supabase.from("Plant").insert(cloneData);
    if (data) {
      newClones.push(data as DbPlant);
    }
  }

  // Update Mother plant audit history
  const updatedMotherHistory: PlantHistoryEntry[] = [
    ...(params.mother.history || []),
    {
      timestamp: now,
      event: "CUTTINGS_TAKEN",
      details: `Took ${params.count} cuttings (Sub-QRs C${padNumber(highestIndex + 1)}-C${padNumber(highestIndex + params.count)})`,
    },
  ];

  await supabase
    .from("Plant")
    .update({ history: updatedMotherHistory, updatedAt: now })
    .eq("id", params.mother.id);

  return { data: newClones, error: null };
}

/**
 * Register a Seedling Plant with a fixed QR tag
 */
export async function createSeedlingPlant(params: {
  variety: string;
  field: string;
  plantingDate?: string;
  notes?: string;
}): Promise<{ data: DbPlant | null; error: any }> {
  const now = new Date().toISOString();
  const plantingDate = params.plantingDate || now.split("T")[0];

  const { data: existingSeedlings } = await supabase
    .from("Plant")
    .select("id, tag")
    .eq("type", "SEEDLING")
    .eq("variety", params.variety);

  const nextIndex = (existingSeedlings?.length || 0) + 1;
  const tag = formatSeedlingTag(params.variety, nextIndex);

  const newPlant: Omit<DbPlant, "id"> = {
    tag,
    qrCode: tag,
    type: "SEEDLING",
    variety: params.variety,
    field: params.field,
    stage: "PLANTING",
    plantingDate,
    notes: params.notes || "Seedling germinated and registered with permanent QR.",
    history: [
      {
        timestamp: now,
        event: "REGISTERED_SEEDLING",
        details: `Seedling registered with QR ${tag} in ${params.field}`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabase.from("Plant").insert(newPlant);
  return { data: (data as any) || null, error };
}

/**
 * Fetch a plant by its Tag or QR payload
 */
export async function getPlantByTagOrQr(identifier: string): Promise<DbPlant | null> {
  const cleanTag = extractPlantTag(identifier);
  if (!cleanTag) return null;

  // Search by tag
  const { data: byTag } = await supabase
    .from("Plant")
    .select("*")
    .eq("tag", cleanTag)
    .single();

  if (byTag) return byTag as DbPlant;

  // Fallback search by id
  const { data: byId } = await supabase
    .from("Plant")
    .select("*")
    .eq("id", cleanTag)
    .single();

  return (byId as DbPlant) || null;
}

/**
 * Fetch all sub-clones for a given Mother Plant
 */
export async function getMotherClones(motherId: string): Promise<DbPlant[]> {
  const { data } = await supabase
    .from("Plant")
    .select("*")
    .eq("motherPlantId", motherId)
    .order("cloneIndex", { ascending: true });

  return (data as DbPlant[]) || [];
}

/**
 * Log Topping event for a plant
 */
export async function logPlantTopping(plant: DbPlant, toppingDate: string) {
  const now = new Date().toISOString();
  const history = [
    ...(plant.history || []),
    {
      timestamp: now,
      event: "TOPPING_RECORDED",
      details: `Topping performed on ${toppingDate}`,
    },
  ];

  return await supabase
    .from("Plant")
    .update({
      toppingDate,
      stage: "VEGETATIVE",
      history,
      updatedAt: now,
    })
    .eq("id", plant.id);
}

/**
 * Log Pruning event for a plant
 */
export async function logPlantPruning(plant: DbPlant, pruningDate: string) {
  const now = new Date().toISOString();
  const history = [
    ...(plant.history || []),
    {
      timestamp: now,
      event: "PRUNING_RECORDED",
      details: `Pruning performed on ${pruningDate}`,
    },
  ];

  return await supabase
    .from("Plant")
    .update({
      pruningDate,
      stage: "VEGETATIVE",
      history,
      updatedAt: now,
    })
    .eq("id", plant.id);
}

/**
 * Log Discarded plant event
 */
export async function logPlantDiscarded(
  plant: DbPlant,
  discardedDate: string,
  reason: string,
  field: string
) {
  const now = new Date().toISOString();
  const history = [
    ...(plant.history || []),
    {
      timestamp: now,
      event: "PLANT_DISCARDED",
      details: `Discarded on ${discardedDate} in ${field}. Reason: ${reason}`,
    },
  ];

  return await supabase
    .from("Plant")
    .update({
      stage: "DISCARDED",
      discardedDate,
      discardedReason: reason,
      field,
      history,
      updatedAt: now,
    })
    .eq("id", plant.id);
}

/**
 * Log Pre-Harvest Fresh Weight
 */
export async function logPlantHarvest(
  plant: DbPlant,
  harvestDate: string,
  freshWeight: number,
  field?: string
) {
  const now = new Date().toISOString();
  const history = [
    ...(plant.history || []),
    {
      timestamp: now,
      event: "HARVEST_RECORDED",
      details: `Harvested on ${harvestDate}. Fresh weight: ${freshWeight}g`,
    },
  ];

  return await supabase
    .from("Plant")
    .update({
      stage: "PRE_HARVEST",
      harvestDate,
      freshWeight,
      field: field || plant.field,
      history,
      updatedAt: now,
    })
    .eq("id", plant.id);
}

/**
 * Log Post-Harvest Trimming Weights
 */
export async function logPlantPostHarvest(
  plant: DbPlant,
  dryWeightBeforeTrimming: number,
  dryWeightAfterTrimming: number
) {
  const now = new Date().toISOString();
  const history = [
    ...(plant.history || []),
    {
      timestamp: now,
      event: "POST_HARVEST_TRIMMED",
      details: `Dry before trim: ${dryWeightBeforeTrimming}g, Dry after trim: ${dryWeightAfterTrimming}g`,
    },
  ];

  return await supabase
    .from("Plant")
    .update({
      stage: "POST_HARVEST",
      dryWeightBeforeTrimming,
      dryWeightAfterTrimming,
      history,
      updatedAt: now,
    })
    .eq("id", plant.id);
}

