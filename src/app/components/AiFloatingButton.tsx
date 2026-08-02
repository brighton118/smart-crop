import React, { useState } from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';
import { AiChatPanel } from './AiChatPanel';

export const AiFloatingButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [contextPrompt, setContextPrompt] = useState<string | undefined>();

    // Attach a global event listener so other components can trigger the AI chat
    React.useEffect(() => {
        const handleAskAi = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail?.prompt) {
                setContextPrompt(customEvent.detail.prompt);
            }
            setIsOpen(true);
        };

        window.addEventListener('openAiChatContext', handleAskAi);
        return () => window.removeEventListener('openAiChatContext', handleAskAi);
    }, []);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/40 text-white rounded-full flex items-center justify-center z-[50] transition-transform hover:scale-105 active:scale-95"
                style={{ display: isOpen ? 'none' : 'flex' }}
                title="Consult smartCrop AI"
            >
                <Sparkles className="w-6 h-6 absolute animate-pulse text-emerald-200" />
                <MessageCircle className="w-6 h-6" />
            </button>

            <AiChatPanel
                isOpen={isOpen}
                onClose={() => {
                    setIsOpen(false);
                    setContextPrompt(undefined);
                }}
                initialContextPrompt={contextPrompt}
            />
        </>
    );
};
