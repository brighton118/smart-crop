import { Router } from 'express';
import { chatController } from './ai.controller';

const aiRouter = Router();

// Endpoint for chatting with smartCrop AI
aiRouter.post('/chat', chatController);

export default aiRouter;
