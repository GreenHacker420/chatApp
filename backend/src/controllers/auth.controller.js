import e from "express";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateToken } from "../lib/utils.js";

export const signup = async (req, res) => {
    const {email, password, fullName} = req.body;
    try {
        if (!email || !password || !fullName) {
            return res.status(400).json({message: "All fields are required"});
        }
        if (password.length < 6) {
            return res.status(400).json({message: "Password must be at least 6 characters long"});
        }

        const user = await User.findOne({email});
        
        if (user) return res.status(400).json({message: "Email already exists"});

        const salt  = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,

        });

        if (newUser) {

            const token = generateToken(newUser._id, res);
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                avatar: newUser.avatar,
                token,
            });

        }else {
            res.status(400).json({message: "Invalid user data"});
        }

    }catch (error) {
        console.log("Error in signup controller: ", error.message);
        res.status(500).json({message: "Internal server error"});
    }
};

export const login = async (req, res) => {
    res.send("login route");
}


export const logout = async (req, res) => {
    res.send("logout route");
}