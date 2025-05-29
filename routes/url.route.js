import express from 'express'
import { handleGenerateNewShortURL, 
        handleGetUserUrl,
        handleGetStats, 
        handleGetUrlAnalytics,
        handleGetAnalytics,
        handleDeleteUrl,
        handleChangeStatus,
} from '../controllers/url.controler.js'
import { restrictToLogedinUserOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

//post routes
router.post("/", handleGenerateNewShortURL)

//get routes
router.get('/getuserurl' ,restrictToLogedinUserOnly, handleGetUserUrl)
router.get("/stats" , restrictToLogedinUserOnly , handleGetStats )
router.get("/analytics" , restrictToLogedinUserOnly , handleGetAnalytics )
router.get("/analytics/:shortId" , restrictToLogedinUserOnly , handleGetUrlAnalytics )

//delete routes
router.delete("/deleteurl/:id" , restrictToLogedinUserOnly , handleDeleteUrl)

//patch routes
router.patch("/changestatus/:id", restrictToLogedinUserOnly , handleChangeStatus)

export default router