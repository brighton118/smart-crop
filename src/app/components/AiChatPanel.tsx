import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { ChatMessage, sendAiChatMessage } from '../../lib/aiApi';

interface AiChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    initialContextPrompt?: string;
}

const DEFAULT_SUGGESTIONS = [
    "What is the current status of my cultivation rooms?",
    "Which sensors are offline?",
    "Show me today's active alerts.",
    "What is the optimal humidity for early flowering stage?"
];

export const AiChatPanel: React.FC<AiChatPanelProps> = ({ isOpen, onClose, initialContextPrompt }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([{
        role: 'assistant',
        content: 'Hello! I am smartCrop AI. I can help you monitor your cultivation environment or provide expert guidance on cannabis growing. How can I help you today?'
    }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialContextPrompt && isOpen) {
            handleSend(initialContextPrompt);
        }
    }, [initialContextPrompt, isOpen]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await sendAiChatMessage(text, messages);
            const aiMsg: ChatMessage = { role: 'assistant', content: response };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[400px] max-w-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col z-[10000] text-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
                <div className="flex items-center gap-2 font-semibold text-emerald-400">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    smartCrop AI
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-md transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                            {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                        </div>
                        <div className={`px-4 py-2 rounded-2xl max-w-[80%] whitespace-pre-wrap text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-600">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-slate-800 rounded-tl-none border border-slate-700 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                            <span className="text-sm text-slate-400">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {messages.length === 1 && (
                <div className="px-4 pb-2">
                    <p className="text-xs text-slate-400 mb-2 font-medium">Suggested queries:</p>
                    <div className="flex flex-col gap-2">
                        {DEFAULT_SUGGESTIONS.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(s)}
                                className="text-left text-xs p-2 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-emerald-300 transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="p-4 bg-slate-800 border-t border-slate-700">
                <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend(input);
                    }}
                >
                    <input
                        type="text"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="Ask about cultivation or system status..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg px-4 flex items-center justify-center transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
};
