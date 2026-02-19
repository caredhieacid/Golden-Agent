
// Explicitly import from relative paths to avoid ts-node alias issues
import { syncSectors } from "../sync/stocks";
import { prisma } from "../db";

async function main() {
    console.log("🚀 Starting manual sector sync (Top 8 Data)...");
    try {
        await syncSectors();
        console.log("✅ Sync complete!");
    } catch (error) {
        console.error("❌ Sync failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
