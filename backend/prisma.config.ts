// Prisma v7 configuration — connection URLs live here, not in schema.prisma
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Supabase PostgreSQL — direct connection for Prisma CLI operations
    url: env("DATABASE_URL"),
  },
});
