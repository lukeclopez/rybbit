import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config();

// DATABASE_URL required
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
const dbCredentials = { url: process.env.DATABASE_URL };

export default defineConfig({
  schema: "./src/db/postgres/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials,
  verbose: true,
  schemaFilter: ["public"],
  tablesFilter: ["!pg_*"],
});
