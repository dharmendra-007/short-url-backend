import mongoose from "mongoose"

const urlSchema = new mongoose.Schema({
  shortId: {
    type: String,
    required: true,
    unique: true,
    trim : true
  },
  redirectUrl: {
    type: String,
    required: true,
    trim : true
  },
  visitHistory: [{ 
    timestamp: { type: Number },
    ip : { type : String},
    deviceType : {type : String},
    source : {type : String} 
  }],
  isActive : {
    type : Boolean,
    default : true
  },
  createdBy:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    default : null
  }
}, { timestamps: true })

const URL = mongoose.model("url" , urlSchema)

export default URL