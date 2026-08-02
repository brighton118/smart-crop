import { aiService } from './src/ai/ai.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load directly to ensure we have it for this script
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('AI Provider: Google Gemini');
console.log('Google API Key configured:', process.env.GOOGLE_API_KEY ? 'Yes (hidden)' : 'No');
console.log('Testing model: gemini-2.0-flash');

async function runTests() {
    console.log('\n--- 1. Testing Basic Knowledge ---');
    console.log('Q: How is cannabis grown?');
    const res1 = await aiService.chat('How is cannabis grown?');
    console.log('A:', res1);

    console.log('\n--- 2. Testing Specific Cannabis Knowledge ---');
    console.log('Q: What is VPD?');
    const res2 = await aiService.chat('What is VPD?');
    console.log('A:', res2);

    console.log('\n--- 3. Testing RAG (if applicable) ---');
    console.log('Q: What are the stages of cannabis growth?');
    const res3 = await aiService.chat('What are the stages of cannabis growth?');
    console.log('A:', res3);

    console.log('\n--- 4. Testing Function Calling (Sensors) ---');
    console.log('Q: Which sensors are offline?');
    const res4 = await aiService.chat('Which sensors are offline?');
    console.log('A:', res4);

    console.log('\n--- 5. Testing Combined Intelligence ---');
    console.log('Q: Is the humidity in my flowering room suitable?');
    const res5 = await aiService.chat('Is the humidity in my flowering room suitable?');
    console.log('A:', res5);
}

runTests().then(() => {
    console.log('\nAll tests complete.');
    process.exit(0);
}).catch(e => {
    console.error('Test script failed:', e);
    process.exit(1);
});
