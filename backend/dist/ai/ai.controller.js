"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatController = void 0;
const ai_service_1 = require("./ai.service");
const chatController = async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }
        const responseText = await ai_service_1.aiService.chat(message, history || []);
        res.json({ reply: responseText });
    }
    catch (error) {
        console.error('Chat Controller Error:', error);
        res.status(500).json({ error: 'Internal server error processing AI text' });
    }
};
exports.chatController = chatController;
