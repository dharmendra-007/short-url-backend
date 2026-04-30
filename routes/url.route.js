import express from 'express'
import { handleGenerateNewShortURL, 
        handleGetUserUrl,
        handleGetStats, 
        handleGetUrlAnalytics,
        handleGetAnalytics,
        handleDeleteUrl,
        handleChangeStatus,
} from '../controllers/url.controler.js'
import { restrictToLogedinUserOnly, restrictToVerifiedUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

//post routes
router.post("/", restrictToVerifiedUser, handleGenerateNewShortURL)

//get routes
router.get('/getuserurl' ,restrictToVerifiedUser, handleGetUserUrl)
router.get("/stats" , restrictToVerifiedUser , handleGetStats )
router.get("/analytics" , restrictToVerifiedUser , handleGetAnalytics )
router.get("/analytics/:shortId" , restrictToVerifiedUser , handleGetUrlAnalytics )

//delete routes
router.delete("/deleteurl/:id" , restrictToVerifiedUser , handleDeleteUrl)

//patch routes
router.patch("/changestatus/:id", restrictToVerifiedUser , handleChangeStatus)

export default router
