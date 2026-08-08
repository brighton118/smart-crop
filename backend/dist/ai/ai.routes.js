"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_controller_1 = require("./ai.controller");
const aiRouter = (0, express_1.Router)();
// Endpoint for chatting with smartCrop AI
aiRouter.post('/chat', ai_controller_1.chatController);
exports.default = aiRouter;
