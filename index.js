import express, { urlencoded } from 'express'
import cookieParser from 'cookie-parser'
import { connectMongoDB } from './db/db.config.js'

import urlRoute from './routes/url.route.js'
import userRoute from './routes/user.route.js'
import cors from 'cors'
import { handleRedirect } from './controllers/url.controler.js'

const app = express()

await connectMongoDB()

app.set('trust proxy', true)
// middleware
app.use(express.json())
app.use(cookieParser())
app.use(
  cors({
    origin : ["http://localhost:3000", "https://shorturl-frontend-lac.vercel.app" , "https://shorturl.dharmendra.space"],
    credentials : true,
    methods : ["GET", "POST", "PUT", "DELETE", "OPTIONS" , "PATCH"]
  })
)

app.use("/api/v1/url", urlRoute)
app.use("/api/v1/user", userRoute)

app.get("/:shortId", handleRedirect)

const PORT = process.env.PORT

app.listen(PORT, (err, data) => console.log(`server is running at http://127.0.0.1:${PORT}...`))