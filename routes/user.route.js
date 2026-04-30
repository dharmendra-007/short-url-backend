import express from 'express';
import {
  handleUserSignUp,
  handleUserLogin,
  getCurrentUser,
  handleLogout,
  handleResendVerificationEmail,
  handleVerifyEmail,
  handleRequestPasswordReset,
  handleResetPassword,
  handleGoogleAuth,
  handleUpdateVerificationEmail,
} from '../controllers/user.controller.js';
import { restrictToLogedinUserOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', handleUserSignUp);
router.post('/login', handleUserLogin);
router.get('/me', getCurrentUser)
router.post('/logout' , restrictToLogedinUserOnly , handleLogout)
router.post('/verify-email', restrictToLogedinUserOnly, handleVerifyEmail)
router.post('/resend-verification', restrictToLogedinUserOnly, handleResendVerificationEmail)
router.post('/update-verification-email', restrictToLogedinUserOnly, handleUpdateVerificationEmail)
router.post('/forgot-password', handleRequestPasswordReset)
router.post('/reset-password', handleResetPassword)
router.post('/google', handleGoogleAuth)

export default router;
