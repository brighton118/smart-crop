import { ChromaClient } from 'chromadb';

export class RagService {
    private static instance: RagService;
    private client: ChromaClient;
    private extractor: any = null;
    private isInitializing = false;

    private constructor() {
        this.client = new ChromaClient({ path: 'http://localhost:8000' });
    }

    public static getInstance(): RagService {
        if (!RagService.instance) {
            RagService.instance = new RagService();
        }
        return RagService.instance;
    }

    private async initializeExtractor() {
        if (this.extractor) return;
        if (this.isInitializing) {
            while (this.isInitializing) {
                await new Promise(r => setTimeout(r, 100));
            }
            return;
        }
        this.isInitializing = true;
        const { pipeline } = await import('@xenova/transformers');
        this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        this.isInitializing = false;
    }

    /**
     * Queries the ChromaDB using Xenova embeddings for the given text.
     * Returns a markdown formatted string of top context documents.
     */
    public async queryContext(query: string): Promise<string> {
        try {
            await this.initializeExtractor();

            const output = await this.extractor!(query, { pooling: 'mean', normalize: true });
            const queryEmbedding = Array.from(output.data) as number[];

            await this.client.heartbeat();

            const collection = await this.client.getCollection({ name: 'agrisense_kb' }).catch(() => null);
            if (!collection) {
                return 'No knowledge base found (agrisense_kb collection does not exist).';
            }

            const results = await collection.query({
                queryEmbeddings: [queryEmbedding], // type requires array of number arrays
                nResults: 3,
            });

            if (!results.documents[0] || results.documents[0].length === 0) {
                return 'No related knowledge base documents found for this query.';
            }

            const contextLines: string[] = [];
            results.documents[0].forEach((doc, idx) => {
                const meta = results.metadatas[0][idx];
                contextLines.push(`Source: ${meta?.source || 'Unknown'}\n---\n${doc}\n---`);
            });

            return contextLines.join('\n\n');
        } catch (e: any) {
            console.error('RAG Error:', e);
            return `Failed to query RAG internal knowledge base: ${e.message}`;
        }
    }
}

export const ragService = RagService.getInstance();
