import express, { urlencoded } from 'express'
import cookieParser from 'cookie-parser'
import { connectMongoDB } from './db/db.config.js'

import urlRoute from './routes/url.route.js'
import userRoute from './routes/user.route.js'

const app = express()

await connectMongoDB()

app.use(express.json())
app.use(cookieParser())

app.use("/", urlRoute)
app.use("/user", userRoute)

const PORT = process.env.PORT

app.listen(PORT , (err , data) => console.log(`server is running at http:/127.0.0.1:${PORT}...`))