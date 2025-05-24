import express from 'express'
import { handleGenerateNewShortURL, 
        handleGetAnalytics,
} from '../controllers/url.controler.js'
import { restrictToLogedinUserOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post("/", handleGenerateNewShortURL)
router.get("/:shortId/analytics" , restrictToLogedinUserOnly , handleGetAnalytics )

export default router