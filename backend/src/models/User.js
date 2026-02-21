import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, sparse: true },
    firebaseUid: { type: String, unique: true, sparse: true, index: true },
    password: { type: String },
    timezone: { type: String, default: 'UTC' },
    profileCompletion: { type: Number, default: 0, min: 0, max: 100 },
    onboardingStep: { type: Number, default: 1, min: 1, max: 5 },
    profile: {
      firstName: String,
      lastName: String,
      profilePicture: String,
    },
    settings: {
      theme: { type: String, default: 'light' },
      notifications: { type: Boolean, default: true },
      emailContentSuggestions: { type: Boolean, default: false },
      notificationEmail: { type: String },
      inboxAutoReply: { type: Boolean, default: false },
    },
    // AI custom instructions (ChatGPT-style)
    aiInstructions: {
      global: { type: String, default: '' },
      useGlobalForAll: { type: Boolean, default: true },
      platforms: {
        linkedin: String,
        twitter: String,
        instagram: String,
        facebook: String,
        threads: String,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
