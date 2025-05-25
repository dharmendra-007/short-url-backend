import express from 'express'
import { handleGenerateNewShortURL, 
        handleGetUserUrl,
        handleGetStats, 
        handleGetAnalytics,
        handleDeleteUrl,
} from '../controllers/url.controler.js'
import { restrictToLogedinUserOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post("/", handleGenerateNewShortURL)
router.get('/getuserurl' ,restrictToLogedinUserOnly, handleGetUserUrl)
router.get("/stats" , restrictToLogedinUserOnly , handleGetStats )
router.delete("/deleteurl/:id" , restrictToLogedinUserOnly , handleDeleteUrl )
router.get("/analytics/:shortId" , restrictToLogedinUserOnly , handleGetAnalytics )

export default router