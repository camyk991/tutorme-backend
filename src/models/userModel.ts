import mongoose from "mongoose";

let userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
    },
    subjects: {
      type: [],
    },
    points: {
      type: Number,
    },
    theme: {
      type: String,
    },
    plannedLessons: {
      type: [],
    },
    friends: {
      type: []
    }
  },
  { collection: "users" }
);

const User = mongoose.model("User", userSchema, "user");

export default User;
