import { supabase, DbFarm, DbZone } from "./supabase";

export async function getOrCreateDefaultFarm(userId: string, farmName: string = "KindBuds Facility 1"): Promise<{ farm: DbFarm, zone: DbZone } | null> {
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
          password: "MANAGED_BY_SUPABASE_AUTH" 
        }]);
      }

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

    // 4. If no zones exist, create a default "Flowering Room A" zone
    if (!zone) {
      const { data: newZone, error: createZoneErr } = await supabase
        .from("Zone")
        .insert([{ name: "Flowering Room A", farmId: farm.id }])
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
