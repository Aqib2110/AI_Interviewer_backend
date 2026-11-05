import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authMiddlware } from '../middleware/auth.middleware.js';

export const auth = Router();


auth.post("/login", authController.login);

auth.post("/logout",authMiddlware,authController.logout)

auth.post("/refresh",authController.refresh);