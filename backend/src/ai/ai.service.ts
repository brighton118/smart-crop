import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { aiTools } from './ai.tools';
import { ragService } from './ai.rag';

const queryKnowledgeBaseTool = new DynamicStructuredTool({
    name: 'query_knowledge_base',
    description: 'Use this tool to search the smartCrop Firebase knowledge base for information related to cannabis cultivation, growth stages (Seeds, Clones, Transplanting, Vegetative Topping/Pruning, Discarded, Pre_Harvest, Post_Harvest, Storage & Packaging), environmental management, pests, and diseases.',
    schema: z.object({
        query: z.string().describe('The detailed search query for the cannabis knowledge base.'),
    }),
    func: async ({ query }) => {
        return await ragService.queryContext(query);
    },
});

const tools = [...aiTools, queryKnowledgeBaseTool];

const systemPrompt = `You are "smartCrop AI", an expert AI assistant for KindBuds Ltd. specializing in Cannabis Cultivation Intelligence and smartCrop System Management on Firebase.
You have access to two types of knowledge:
1. Live Firebase Firestore Data Tools (to check sensors, equipment, alerts, grow rooms / cultivation zones, and all Farm Data lifecycle records: Planting Seeds/Clones, Transplanting, Vegetative Topping/Pruning/Discarded, Pre_Harvest, Post_Harvest, and Storage & Packaging).
2. Cannabis Knowledge Base (via the 'query_knowledge_base' tool for domain queries like pests, climate requirements, drying, etc.).

CRITICAL RULES:
- Never invent sensor readings, database records, or hardware status.
- Use the knowledge base tool for cannabis cultivation questions.
- If live data is unavailable, clearly state it.
- Never directly expose API keys or passwords.
- Always provide a grounded response.`;

export class AiService {
    private static instance: AiService;

    private constructor() { }

    public static getInstance(): AiService {
        if (!AiService.instance) {
            AiService.instance = new AiService();
        }
        return AiService.instance;
    }

    private resolveProvider(): string {
        if (process.env.AI_PROVIDER) return process.env.AI_PROVIDER;
        if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) return 'google';
        if (process.env.OPENAI_API_KEY) return 'openai';
        return 'ollama';
    }

    public async chat(message: string, history: Array<{ role: string; content: string }> = []): Promise<string> {
        const provider = this.resolveProvider();
        try {
            let llm: any;

            if (provider === 'google') {
                const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
                if (!apiKey) throw new Error('GOOGLE_API_KEY is not configured.');
                llm = new ChatGoogleGenerativeAI({
                    apiKey,
                    model: process.env.GOOGLE_MODEL || 'gemini-2.0-flash',
                    temperature: 0.2,
                });
            } else if (provider === 'openai') {
                if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured.');
                llm = new ChatOpenAI({
                    modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    temperature: 0.2
                });
            } else if (provider === 'ollama') {
                llm = new ChatOllama({
                    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
                    model: process.env.OLLAMA_MODEL || 'llama3.1',
                    temperature: 0.2,
                });
            } else {
                throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
            }

            const agent = createReactAgent({ llm, tools, stateModifier: systemPrompt });

            const messages: any[] = history.map((msg) => [msg.role === 'user' ? 'human' : 'ai', msg.content]);
            messages.push(['human', message]);

            const result = await agent.invoke({
                messages,
            });

            const lastMessage = result.messages[result.messages.length - 1];
            return lastMessage.content as string;
        } catch (error: any) {
            console.error('Agent Execution Error:', error);

            if (provider === 'ollama' && (error.message?.includes('fetch') || error.message?.includes('ECONNREFUSED'))) {
                return `smartCrop AI is configured to use Ollama locally, which is unreachable in Firebase Cloud Functions. Set GOOGLE_API_KEY (with AI_PROVIDER=google) or OPENAI_API_KEY in your Firebase environment variables.`;
            }

            return `smartCrop AI could not connect to the configured ${provider} service. Details: ${error.message}`;
        }
    }
}

export const aiService = AiService.getInstance();
