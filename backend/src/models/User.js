import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true },
    password: { type: String }, // For application auth (if needed)
    profile: {
      firstName: String,
      lastName: String,
      profilePicture: String,
    },
    // Application-level settings
    settings: {
      theme: { type: String, default: 'light' },
      notifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
