import { supabase, DbFarm, DbZone } from "./supabase";

export async function getOrCreateDefaultFarm(userId: string, farmName: string = "KindBuds Facility 1"): Promise<{ farm: DbFarm, zone: DbZone, zones: DbZone[] } | null> {
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
      // FIX: Ensure the user exists in the public.User table to satisfy the foreign key constraint
      const { data: existingUser } = await supabase.from("User").select("id").eq("id", userId);

      if (!existingUser || existingUser.length === 0) {
        // Fetch real user details from Auth
        const { data: authData } = await supabase.auth.getUser();
        const email = authData?.user?.email || `user_${userId}@kindbudsltd.com`;
        const name = authData?.user?.user_metadata?.name || "Farmer";

        await supabase.from("User").insert([{
          id: userId,
          email: email,
          name: name,
          password: "MANAGED_BY_SUPABASE_AUTH",
          updatedAt: new Date().toISOString()
        }]);
      }

      const { data: newFarm, error: createFarmErr } = await supabase
        .from("Farm")
        .insert([{ id: crypto.randomUUID(), name: farmName, userId: userId, updatedAt: new Date().toISOString() }])
        .select()
        .single();

      if (createFarmErr) throw createFarmErr;
      farm = newFarm as DbFarm;
    }

    // 3. Ensure required zones exist
    const { data: existingZones, error: zoneErr } = await supabase
      .from("Zone")
      .select("*")
      .eq("farmId", farm.id);

    if (zoneErr) throw zoneErr;

    const requiredZoneNames = ["Zone 1", "Zone 2", "Greenhouse"];
    const existingZoneNames = existingZones?.map(z => z.name) || [];
    const missingZones = requiredZoneNames.filter(name => !existingZoneNames.includes(name));

    if (missingZones.length > 0) {
      const now = new Date().toISOString();
      const insertData = missingZones.map(name => ({
        id: crypto.randomUUID(),
        name: name,
        farmId: farm.id,
        updatedAt: now
      }));

      await supabase.from("Zone").insert(insertData);
    }

    // Fetch them all again to return a valid zone for chaining
    const { data: finalZones } = await supabase.from("Zone").select("*").eq("farmId", farm.id);
    let zone = finalZones?.[0] as DbZone || (existingZones?.[0] as DbZone);

    return { farm, zone, zones: finalZones as DbZone[] || (existingZones as DbZone[]) };
  } catch (error) {
    console.error("Error setting up default farm/zone:", error);
    return null;
  }
}
