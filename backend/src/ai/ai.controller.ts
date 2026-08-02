import { Request, Response } from 'express';
import { aiService } from './ai.service';

export const chatController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { message, history } = req.body;

        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const responseText = await aiService.chat(message, history || []);

        res.json({ reply: responseText });
    } catch (error: any) {
        console.error('Chat Controller Error:', error);
        res.status(500).json({ error: 'Internal server error processing AI text' });
    }
};
