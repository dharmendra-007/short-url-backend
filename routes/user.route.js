import express from 'express';
import {handleUserSignUp , handleUserLogin} from '../controllers/user.controller.js';

const router = express.Router();

router.post('/', handleUserSignUp);
router.post('/login', handleUserLogin);

export default router;