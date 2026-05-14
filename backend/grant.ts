import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("Granting permissions to anon and authenticated roles...");
  
  const tables = ['User', 'Farm', 'Zone', 'Sensor', 'SensorReading', 'Alert'];
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON TABLE "${table}" TO anon, authenticated, service_role;`);
      console.log(`Granted privileges on "${table}"`);
    } catch (err) {
      console.error(`Error granting on ${table}:`, err);
    }
  }

  console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
