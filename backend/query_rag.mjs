import { pipeline } from '@xenova/transformers';
import { ChromaClient } from 'chromadb';

async function queryRAG(query) {
    console.log("==========================================");
    console.log(" AgriSense AI RAG Query Tool");
    console.log("==========================================");
    console.log(`Querying for: "${query}"\n`);

    try {
        console.log("Generating query embedding locally...");
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        const output = await extractor(query, { pooling: 'mean', normalize: true });
        const queryEmbedding = Array.from(output.data);

        console.log("Connecting to ChromaDB (http://localhost:8000)...");
        const client = new ChromaClient({ path: "http://localhost:8000" });

        // Ping database out of caution
        await client.heartbeat();

        const collection = await client.getCollection({ name: "agrisense_kb" });

        const results = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: 3,
        });

        console.log("\n--- Top Retrieved Context Documents ---\n");

        if (!results.documents[0] || results.documents[0].length === 0) {
            console.log("No documents found in knowledge base.");
            return;
        }

        results.documents[0].forEach((doc, idx) => {
            const meta = results.metadatas[0][idx];
            const dist = results.distances ? results.distances[0][idx] : 'N/A';
            console.log(`[Source: ${meta.source} | ID: ${results.ids[0][idx]} | Distance: ${dist}]`);
            console.log(doc);
            console.log("--------------------------------------------------\n");
        });
    } catch (error) {
        console.error("\n[!] Error during querying. Did you start ChromaDB `chroma run`?");
        console.error(error.message);
    }
}

const userQuery = process.argv[2] || "What are the common pests affecting maize and bananas in Uganda?";
queryRAG(userQuery).catch(console.error);
