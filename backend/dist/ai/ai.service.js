"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AiService = void 0;
const google_genai_1 = require("@langchain/google-genai");
const ollama_1 = require("@langchain/ollama");
const openai_1 = require("@langchain/openai");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const ai_tools_1 = require("./ai.tools");
const ai_rag_1 = require("./ai.rag");
const queryKnowledgeBaseTool = new tools_1.DynamicStructuredTool({
    name: 'query_knowledge_base',
    description: 'Use this tool to search the smartCrop knowledge base for information related to cannabis cultivation, growth stages, environmental management, pests, diseases, etc. Always use this when answering domain-specific cannabis questions.',
    schema: zod_1.z.object({
        query: zod_1.z.string().describe('The detailed search query for the cannabis vector database.'),
    }),
    func: async ({ query }) => {
        return await ai_rag_1.ragService.queryContext(query);
    },
});
const tools = [...ai_tools_1.aiTools, queryKnowledgeBaseTool];
const systemPrompt = `You are "smartCrop AI", an expert AI assistant specializing in Cannabis Cultivation Intelligence and smartCrop System Management.
You have access to two types of knowledge:
1. Live System Data Tools (to check sensors, equipment, alerts, and farm status).
2. Cannabis Knowledge Base (via the 'query_knowledge_base' tool for domain queries like pests, climate requirements, drying, etc.).

CRITICAL RULES:
- Never invent sensor readings, database records, or hardware status.
- Use the knowledge base tool for generic cannabis cultivation questions.
- If live data is unavailable, clearly state it.
- Never directly expose API keys or passwords.
- Always provide a grounded response.
- Combine insights: if a user asks about an alert, use tools to get the alert and use the knowledge base to explain the context of why it's a problem for cannabis setup.`;
class AiService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!AiService.instance) {
            AiService.instance = new AiService();
        }
        return AiService.instance;
    }
    async chat(message, history = []) {
        try {
            const provider = process.env.AI_PROVIDER || 'ollama';
            let llm;
            if (provider === 'ollama') {
                llm = new ollama_1.ChatOllama({
                    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
                    model: process.env.OLLAMA_MODEL || 'llama3.1',
                    temperature: 0.2,
                });
            }
            else if (provider === 'google') {
                if (!process.env.GOOGLE_API_KEY)
                    throw new Error('GOOGLE_API_KEY is not configured.');
                llm = new google_genai_1.ChatGoogleGenerativeAI({
                    model: process.env.GOOGLE_MODEL || 'gemini-2.0-flash',
                    temperature: 0.2,
                });
            }
            else if (provider === 'openai') {
                if (!process.env.OPENAI_API_KEY)
                    throw new Error('OPENAI_API_KEY is not configured.');
                llm = new openai_1.ChatOpenAI({
                    modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    temperature: 0.2
                });
            }
            else {
                throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
            }
            const agent = (0, prebuilt_1.createReactAgent)({ llm, tools, stateModifier: systemPrompt });
            const messages = history.map((msg) => [msg.role === 'user' ? 'human' : 'ai', msg.content]);
            messages.push(['human', message]);
            const result = await agent.invoke({
                messages,
            });
            const lastMessage = result.messages[result.messages.length - 1];
            return lastMessage.content;
        }
        catch (error) {
            console.error('Agent Execution Error:', error);
            const provider = process.env.AI_PROVIDER || 'ollama';
            if (provider === 'ollama') {
                if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
                    return `Local smartCrop AI is currently unavailable. Please ensure Ollama is running on your machine (http://localhost:11434).`;
                }
                return `Ollama execution error: ${error.message}`;
            }
            return `smartCrop AI could not connect to the configured ${provider} service. Please check your API configuration. Details: ${error.message}`;
        }
    }
}
exports.AiService = AiService;
exports.aiService = AiService.getInstance();
