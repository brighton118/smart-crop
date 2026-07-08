const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL || 'https://iyddixaifxxmkeourdve.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!key) {
    console.error("Missing VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

async function test() {
    try {
        // 1. Get a valid Zone ID
        const zoneRes = await fetch(url + '/rest/v1/Zone?select=id,name', {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        console.log("GET Zone status:", zoneRes.status);
        const zones = await zoneRes.json();
        console.log("Zones:", zones);

        if (zones.length === 0) {
            console.log("No zones found in DB to link CropRecord");
            return;
        }

        const zoneId = zones[0].id;
        console.log("Using Zone ID:", zoneId);

        // 2. Perform insert WITH updatedAt
        const postWithUpdated = await fetch(url + '/rest/v1/CropRecord', {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                batchName: "Test Batch With UpdatedAt",
                strain: "OG Kush",
                zoneId: zoneId,
                recordType: "SEED",
                plantedDate: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
        });
        console.log("POST with updatedAt status:", postWithUpdated.status);
        console.log("POST response with updatedAt:", await postWithUpdated.text());

        // 3. Perform insert WITHOUT updatedAt
        const postWithoutUpdated = await fetch(url + '/rest/v1/CropRecord', {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                batchName: "Test Batch Without UpdatedAt",
                strain: "OG Kush",
                zoneId: zoneId,
                recordType: "SEED",
                plantedDate: new Date().toISOString()
            })
        });
        console.log("POST without updatedAt status:", postWithoutUpdated.status);
        console.log("POST response without updatedAt:", await postWithoutUpdated.text());

    } catch (err) {
        console.error("Test failed:", err);
    }
}

test();
