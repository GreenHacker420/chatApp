import { min } from "@splidejs/splide/src/js/utils";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    fullName: {
        type: String,
        required: true,
    },
    avatar: {
        type: String,
        default: "",
    },

},
{timestamps: true}
);

const User = mongoose.model("User", userSchema);

export default User;