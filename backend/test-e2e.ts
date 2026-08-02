import { aiService } from './src/ai/ai.service';
import { prisma } from './src/db';
import { ragService } from './src/ai/ai.rag';

async function runTests() {
    console.log("--- STARTING END-TO-END VERIFICATION ---");

    // 1. Verify Prisma
    try {
        await prisma.$queryRawUnsafe('SELECT 1');
        console.log("Prisma: PASS");
    } catch (e) {
        console.log("Prisma: FAIL", e);
    }

    // 2. Verify AI Service Mock Fallback
    try {
        const testNoKey = await aiService.chat("How is cannabis grown?");
        if (testNoKey.includes("Mock Mode") || testNoKey.includes("not configured")) {
            console.log("AI Missing Key Fallback: PASS");
        } else {
            console.log("AI Missing Key Fallback: FAIL ->", testNoKey);
        }
    } catch (e) {
        console.log("AI Missing Key Fallback: FAIL", e);
    }

    // 3. Verify Offline Sensor Auto-Routing
    try {
        const testOffline = await aiService.chat("Which sensors are offline?");
        if (testOffline.includes("Mock Mode Auto-Routing") && testOffline.includes("OFFLINE")) {
            console.log("AI Offline Sensor DB Tool bypass: PASS");
        } else {
            console.log("AI Offline Sensor DB Tool bypass: FAIL ->", testOffline);
        }
    } catch (e) {
        console.log("AI Offline Sensor DB Tool bypass: FAIL", e);
    }

    console.log("--- TESTS COMPLETE ---");
}

runTests().then(() => process.exit(0));
