import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@xenova/transformers';
import { ChromaClient } from 'chromadb';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KNOWLEDGE_BASE_DIR = path.resolve(__dirname, '../knowledge_base');

async function ingest() {
    console.log("==========================================");
    console.log(" AgriSense AI RAG Ingestion Pipeline");
    console.log("==========================================");
    console.log(`Loading documents from: ${KNOWLEDGE_BASE_DIR}`);

    if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
        console.error("[!] Error: knowledge_base directory not found.");
        return;
    }

    const files = fs.readdirSync(KNOWLEDGE_BASE_DIR).filter(f => f.endsWith('.md'));
    if (files.length === 0) {
        console.log("No markdown documents found in knowledge base.");
        return;
    }

    // 1. Chunk documents using LangChain
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 150,
    });

    const docs = [];
    const metadatas = [];
    const ids = [];
    let idCounter = 1;

    for (const file of files) {
        const text = fs.readFileSync(path.join(KNOWLEDGE_BASE_DIR, file), 'utf-8');
        const chunks = await splitter.createDocuments([text]);
        for (const chunk of chunks) {
            docs.push(chunk.pageContent);
            metadatas.push({ source: file });
            ids.push(`doc_${idCounter++}`);
        }
    }

    console.log(`Generated ${docs.length} semantic chunks. Loading local embedding model...`);

    // 2. Load Xenova Transformers local embedding model (runs completely offline in JS)
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    console.log("Extracting embeddings (this may take a moment)...");
    const embeddings = [];
    for (let i = 0; i < docs.length; i++) {
        const output = await extractor(docs[i], { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(output.data));
        if ((i + 1) % 10 === 0) {
            console.log(`Embedded ${i + 1}/${docs.length} chunks`);
        }
    }

    // 3. Connect to ChromaDB
    console.log("\nConnecting to local ChromaDB server (http://localhost:8000)...");
    try {
        const client = new ChromaClient({ path: "http://localhost:8000" });
        await client.heartbeat();

        console.log("Connected to ChromaDB! Upserting to collection 'agrisense_kb'...");

        const collection = await client.getOrCreateCollection({
            name: "agrisense_kb",
        });

        await collection.upsert({
            ids: ids,
            embeddings: embeddings,
            metadatas: metadatas,
            documents: docs,
        });

        console.log("\n[SUCCESS] RAG Ingestion Complete!");
        console.log(`Indexed ${docs.length} chunks across ${files.length} documents.`);

    } catch (error) {
        console.error("\n[!] FATAL: Could not connect to ChromaDB at http://localhost:8000.");
        console.error("Please ensure you are running the ChromaDB server (e.g. via `chroma run`).");
        console.error("Local embedding extraction was successful, but persistent storage failed.");
    }
}

ingest().catch(console.error);
