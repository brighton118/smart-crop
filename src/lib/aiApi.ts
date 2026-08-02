export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export const sendAiChatMessage = async (message: string, history: ChatMessage[] = []): Promise<string> => {
    try {
        const res = await fetch('http://localhost:5000/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, history }),
        });

        if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        return data.reply;
    } catch (error: any) {
        console.error('Failed to communicate with AI:', error);
        return 'Sorry, I am unable to connect to the smartCrop AI service at the moment.';
    }
};
