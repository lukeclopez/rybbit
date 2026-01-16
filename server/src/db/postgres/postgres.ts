import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

dotenv.config();

// Create postgres connection - DATABASE_URL required
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
const client = postgres(process.env.DATABASE_URL, {
  onnotice: () => {},
  max: 20,
});

// Create drizzle ORM instance
export const db = drizzle(client, { schema });

// For compatibility with raw SQL if needed
export const sql = client;
