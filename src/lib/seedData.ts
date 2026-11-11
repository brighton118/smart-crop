import { supabase, DbSensor } from "./supabase";

function randomBetween(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

export async function seedDatabaseIfEmpty(zoneId: string) {
  try {
    // 1. Fetch Sensors for this Zone
    const { data: sensors, error: sensorErr } = await supabase
      .from("Sensor")
      .select("*")
      .eq("zoneId", zoneId);

    if (sensorErr || !sensors || sensors.length === 0) return;

    // 2. Check if we already have readings
    const sensorIds = sensors.map((s) => s.id);
    const { count, error: countErr } = await supabase
      .from("SensorReading")
      .select("*", { count: "exact", head: true })
      .in("sensorId", sensorIds);

    if (countErr) return;

    // If we have readings, assume we already seeded
    if (count && count > 0) return;

    console.log("Seeding Database with historical data...");

    // 3. Generate Historical Readings (Last 24 hours, every 3 hours)
    const readings = [];
    const now = new Date();

    for (const sensor of sensors as DbSensor[]) {
      let currentValue = randomBetween(sensor.minThreshold + 5, sensor.maxThreshold - 5);

      for (let i = 24; i >= 0; i -= 3) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);

        // Add some random walk to the value
        const spread = (sensor.maxThreshold - sensor.minThreshold) * 0.1;
        currentValue += randomBetween(-spread, spread);
        currentValue = Math.min(sensor.maxThreshold + 5, Math.max(sensor.minThreshold - 5, currentValue));

        readings.push({
          id: crypto.randomUUID(),
          sensorId: sensor.id,
          value: parseFloat(currentValue.toFixed(1)),
          timestamp: time.toISOString(),
        });
      }
    }

    // Insert Readings
    if (readings.length > 0) {
      await supabase.from("SensorReading").insert(readings);
    }

    // 4. Generate some mock Alerts based on the sensors
    const alerts = [];
    const alertTypes = ["WARNING", "CRITICAL", "INFO"];
    const alertStatuses = ["UNREAD", "READ"];

    for (let i = 0; i < 5; i++) {
      const randomSensor = sensors[Math.floor(Math.random() * sensors.length)];
      const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const status = alertStatuses[Math.floor(Math.random() * alertStatuses.length)];
      const time = new Date(now.getTime() - Math.floor(Math.random() * 24) * 60 * 60 * 1000);

      let message = "";
      if (randomSensor.type === "SOIL_MOISTURE") message = "Substrate VWC dropping below 45% threshold in Flowering Room A.";
      else if (randomSensor.type === "TEMPERATURE") message = "Canopy temperature spike detected. Vapor Pressure Deficit (VPD) is outside optimal vegetative range.";
      else if (randomSensor.type === "HUMIDITY") message = "Relative humidity exceeds 65% in flowering chamber, increasing risk of botrytis (bud rot).";
      else if (randomSensor.type === "LIGHT") message = "PAR levels are below target PPFD for active flower room photoperiod.";
      else message = `Abnormal reading detected for sensor ${randomSensor.name}.`;

      alerts.push({
        id: crypto.randomUUID(),
        sensorId: randomSensor.id,
        type: type,
        message: message,
        status: status,
        createdAt: time.toISOString(),
      });
    }

    // Insert Alerts
    if (alerts.length > 0) {
      await supabase.from("Alert").insert(alerts);
    }

    // 5. Generate some mock Crop Batches and Planting Records
    const batch1Id = crypto.randomUUID();
    const batch2Id = crypto.randomUUID();

    const cropBatches = [
      {
        id: batch1Id,
        batchName: "Batch A1",
        zoneId: zoneId,
        status: "FLOWERING",
        updatedAt: new Date().toISOString()
      },
      {
        id: batch2Id,
        batchName: "Batch B2",
        zoneId: zoneId,
        status: "VEGETATIVE",
        updatedAt: new Date().toISOString()
      }
    ];

    const plantingRecords = [
      {
        id: crypto.randomUUID(),
        batchId: batch1Id,
        strain: "OG Kush",
        seedType: "Clone",
        plantingDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        plantsCount: 120,
        expectedHarvestDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Healthy growth, transition to flower successful.",
        responsiblePerson: "System",
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        batchId: batch2Id,
        strain: "Sour Diesel",
        seedType: "Seed",
        plantingDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        plantsCount: 80,
        expectedHarvestDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Rapid vegetative growth observed.",
        responsiblePerson: "System",
        updatedAt: new Date().toISOString()
      }
    ];

    try {
      await supabase.from("CropBatch").insert(cropBatches);
      await supabase.from("PlantingRecord").insert(plantingRecords);

      // Seed Plants & Mother Lineage with Fixed QRs if empty
      const { data: existingPlants } = await supabase.from("Plant").select("id").limit(1);
      if (!existingPlants || existingPlants.length === 0) {
        const motherId1 = crypto.randomUUID();
        const motherTag1 = "KB-MOM-OGK-01";
        const mother1 = {
          id: motherId1,
          tag: motherTag1,
          qrCode: motherTag1,
          type: "MOTHER",
          variety: "OG Kush",
          field: "Mother Room 1",
          stage: "VEGETATIVE",
          plantingDate: "2026-01-15",
          notes: "Primary OG Kush mother stock, high vigor.",
          history: [{
            timestamp: new Date().toISOString(),
            event: "REGISTERED_MOTHER",
            details: "Master Mother Plant registered with permanent QR"
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const clone1 = {
          id: crypto.randomUUID(),
          tag: "KB-MOM-OGK-01-C01",
          qrCode: "KB-MOM-OGK-01-C01",
          type: "CLONE",
          variety: "OG Kush",
          motherPlantId: motherId1,
          motherTag: motherTag1,
          cloneIndex: 1,
          field: "Vegetative Room A",
          stage: "VEGETATIVE",
          plantingDate: "2026-02-01",
          toppingDate: "2026-02-18",
          notes: "Sub-clone cutting #1 from Mother KB-MOM-OGK-01",
          history: [{
            timestamp: new Date().toISOString(),
            event: "CUTTING_PROPAGATED",
            details: "Sub-QR cutting #1 from Mother KB-MOM-OGK-01"
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const clone2 = {
          id: crypto.randomUUID(),
          tag: "KB-MOM-OGK-01-C02",
          qrCode: "KB-MOM-OGK-01-C02",
          type: "CLONE",
          variety: "OG Kush",
          motherPlantId: motherId1,
          motherTag: motherTag1,
          cloneIndex: 2,
          field: "Vegetative Room A",
          stage: "VEGETATIVE",
          plantingDate: "2026-02-01",
          notes: "Sub-clone cutting #2 from Mother KB-MOM-OGK-01",
          history: [{
            timestamp: new Date().toISOString(),
            event: "CUTTING_PROPAGATED",
            details: "Sub-QR cutting #2 from Mother KB-MOM-OGK-01"
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await supabase.from("Plant").insert([mother1, clone1, clone2]);
      }
    } catch (e) {
      console.warn("Could not insert seed batches/planting:", e);
    }

    console.log("Database seeded successfully.");

  } catch (err) {
    console.error("Failed to seed db:", err);
  }
}
