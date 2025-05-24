import express from 'express'
import { handleGenerateNewShortURL, 
        handleRedirect ,
        handleGetAnalytics,
} from '../controllers/url.controler.js'
import { restrictToLogedinUserOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post("/", handleGenerateNewShortURL)
router.get("/:shortId" , handleRedirect)
router.get("/analytics/:shortId" , restrictToLogedinUserOnly , handleGetAnalytics )

export default router