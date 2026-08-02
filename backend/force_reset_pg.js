const pg = require('pg');
const { Client } = pg;

async function forceReset() {
    const connectionString = "postgresql://postgres:Kato0788945330@db.bwdvbbmjcmouogqdwshi.supabase.co:5432/postgres";
    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        console.log("Connected to Supabase PostgreSQL database directly.");

        // Check if the user exists
        const res = await client.query("SELECT id, email FROM auth.users WHERE email = 'brightonkato317@gmail.com'");
        if (res.rows.length === 0) {
            console.log("Error: User brightonkato317@gmail.com does not exist in auth.users.");
        } else {
            console.log("User found. Updating password directly via pgcrypto...");
            const updateRes = await client.query("UPDATE auth.users SET encrypted_password = crypt('password123', gen_salt('bf')) WHERE email = 'brightonkato317@gmail.com'");
            console.log(`Update successful! Row count: ${updateRes.rowCount}`);
        }
    } catch (err) {
        console.error("Database connection or query error:", err);
    } finally {
        await client.end();
    }
}

forceReset();
