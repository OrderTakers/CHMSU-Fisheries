import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 50 
    },
    lastName: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 50 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'] 
    },
    schoolID: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    schoolYear: { 
      type: String, 
      required: function() {
        return this.role === 'student';
      }, 
      trim: true,
      default: "" // Add default value
    },
    section: { 
      type: String, 
      required: function() {
        return this.role === 'student';
      }, 
      trim: true,
      default: "" // Add default value
    },
    password: { 
      type: String, 
      required: true,
      select: false
    },
    profileImage: { 
      type: String, 
      default: "" 
    },
    role: { 
      type: String, 
      enum: ["admin", "student", "faculty"], 
      default: "student" 
    },
    status: { 
      type: String, 
      enum: ["active", "inactive", "suspended"], 
      default: "inactive" 
    },
    lastLogin: { 
      type: Date, 
      default: null 
    },
    loginCount: { 
      type: Number, 
      default: 0 
    },
    emailVerified: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true 
  }
);

// Create index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ schoolID: 1 });
userSchema.index({ role: 1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;