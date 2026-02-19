
import { syncSectors } from "../sync/stocks";
import { prisma } from "../db";

async function main() {
    console.log("🚀 Starting manual sector sync...");
    await syncSectors();
    console.log("✅ Sync complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
