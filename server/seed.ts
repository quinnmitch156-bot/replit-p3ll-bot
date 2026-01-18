import { storage } from "./storage";

async function seed() {
  console.log("Seeding database...");

  // check if keys exist
  const existingStats = await storage.getStats();
  if (existingStats.activeSubs === 0 && existingStats.totalUsers === 0) {
      console.log("Creating initial keys...");
      await storage.createKey({ key: "SCOUT-LIFETIME-ADMIN", type: "lifetime", status: "active" });
      await storage.createKey({ key: "SCOUT-MONTHLY-TEST", type: "monthly", status: "active" });
      console.log("Keys created: SCOUT-LIFETIME-ADMIN, SCOUT-MONTHLY-TEST");
  } else {
      console.log("Database already has data, skipping seed.");
  }
  
  process.exit(0);
}

seed().catch(console.error);
