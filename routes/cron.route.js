import express from "express"
import { handleSendDailyStats } from "../controllers/cron.controller.js"

const router = express.Router()

router.get("/daily-stats", handleSendDailyStats)

export default router

