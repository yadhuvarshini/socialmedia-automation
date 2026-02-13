import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true },
    firebaseUid: { type: String, unique: true, sparse: true, index: true },
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
