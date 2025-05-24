import mongoose from "mongoose";

export async function connectMongoDB() {
  try {
    const connettionInstances = await mongoose.connect(`${process.env.MONGODB_URI}`)
    console.log(`\nMongoDB connected !! DB HOST: ${connettionInstances.connection.host}`)
  } catch(err) {
    console.log('MongoDb connection failed : ',err)
  }
}
