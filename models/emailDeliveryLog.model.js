import mongoose from "mongoose"

const emailDeliveryLogSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },
  emailType: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["sent", "failed", "skipped"],
    required: true,
    index: true,
  },
  errorMessage: {
    type: String,
    default: null,
  },
  meta: {
    type: Object,
    default: {},
  },
}, { timestamps: true })

const EmailDeliveryLog = mongoose.model("EmailDeliveryLog", emailDeliveryLogSchema)

export default EmailDeliveryLog

