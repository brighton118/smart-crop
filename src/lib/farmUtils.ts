import { supabase, DbFarm, DbZone } from "./supabase";

export async function getOrCreateDefaultFarm(userId: string, farmName: string = "My Smart Farm"): Promise<{ farm: DbFarm, zone: DbZone } | null> {
  try {
    // 1. Check if user already has a farm
    const { data: existingFarms, error: farmErr } = await supabase
      .from("Farm")
      .select("*")
      .eq("userId", userId)
      .limit(1);

    if (farmErr) throw farmErr;

    let farm = existingFarms?.[0] as DbFarm;

    // 2. If no farm exists, create one
    if (!farm) {
      const { data: newFarm, error: createFarmErr } = await supabase
        .from("Farm")
        .insert([{ name: farmName, userId: userId }])
        .select()
        .single();

      if (createFarmErr) throw createFarmErr;
      farm = newFarm as DbFarm;
    }

    // 3. Check if this farm has any zones
    const { data: existingZones, error: zoneErr } = await supabase
      .from("Zone")
      .select("*")
      .eq("farmId", farm.id)
      .limit(1);

    if (zoneErr) throw zoneErr;

    let zone = existingZones?.[0] as DbZone;

    // 4. If no zones exist, create a default "Main Field" zone
    if (!zone) {
      const { data: newZone, error: createZoneErr } = await supabase
        .from("Zone")
        .insert([{ name: "Main Field", farmId: farm.id }])
        .select()
        .single();

      if (createZoneErr) throw createZoneErr;
      zone = newZone as DbZone;
    }

    return { farm, zone };
  } catch (error) {
    console.error("Error setting up default farm/zone:", error);
    return null;
  }
}
