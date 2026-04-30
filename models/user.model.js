import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim : true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim : true
    },
    password: {
        type: String,
        required: false,
        trim : true
    },
    avatar: {
        type: String,
        default: null,
        trim: true
    },
    authProvider: {
        type: String,
        enum: ["local", "google"],
        default: "local",
    },
    googleId: {
        type: String,
        default: null,
        index: true,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationOtpHash: {
        type: String,
        default: null,
        select: false,
    },
    emailVerificationOtpExpiresAt: {
        type: Date,
        default: null,
        select: false,
    },
    passwordResetTokenHash: {
        type: String,
        default: null,
        select: false,
    },
    passwordResetTokenExpiresAt: {
        type: Date,
        default: null,
        select: false,
    },
    statsEmailLastSentAt: {
        type: Date,
        default: null,
    },
    verificationEmailLastSentAt: {
        type: Date,
        default: null,
    },
    lastLoginAt: {
        type: Date,
        default: null,
    }
},{timestamps: true});

const User = mongoose.model('User', userSchema);
export default User;
