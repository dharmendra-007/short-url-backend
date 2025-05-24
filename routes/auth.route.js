import express from 'express';
import {handleUserSignUp , handleUserLogin, getCurrentUser, handleLogout} from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/', handleUserSignUp);
router.post('/login', handleUserLogin);
router.get('/me', getCurrentUser)
router.get('/logout' , handleLogout)

export default router;