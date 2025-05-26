import express from 'express';
import {handleUserSignUp , handleUserLogin, getCurrentUser, handleLogout} from '../controllers/user.controller.js';
import { restrictToLogedinUserOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', handleUserSignUp);
router.post('/login', handleUserLogin);
router.get('/me', getCurrentUser)
router.post('/logout' , restrictToLogedinUserOnly , handleLogout)

export default router;