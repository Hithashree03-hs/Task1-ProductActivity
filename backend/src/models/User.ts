import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  themePreference: 'system' | 'light' | 'dark';
  favoriteCategories: string[];
  notificationPreferences: Record<string, boolean>;
  expoPushTokens: Array<{ hash: string; encryptedToken: string }>;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    themePreference: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    favoriteCategories: { type: [String], default: [] },
    notificationPreferences: {
      type: Map,
      of: Boolean,
      default: () => ({ order: true, payment: true, shipping: true, wishlist: true, promotions: true, cart: true }),
    },
    expoPushTokens: { type: [{ hash: { type: String, required: true }, encryptedToken: { type: String, required: true } }], default: [] },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving the user
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
