import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://nrmqswewnllrfqbszofm.supabase.co"; // Replace if needed, reading from .env
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // I'll load .env properly

const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase
        .from('Zone')
        .select('*, devices(*), cropBatches(*), fans(*), coolers(*)');

    console.log("Error:", error);
    if (!error) console.log("Data length:", data?.length);
}

test();
