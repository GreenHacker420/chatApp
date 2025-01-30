import express from "express";
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
        if (password.length < 8) {
            return res.status(400).json({message: "Password must be at least 8 characters long"});
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
    const {email, password} = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({message: "All fields are required"});
        }
        const user = await User.findOne({email});

        if (!user) return res.status(400).json({message: "Invalid credentials"});
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({message: "Invalid credentials"});
        const token = generateToken(user._id, res);
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            avatar: user.avatar,
            token,
        });
    } catch (error) {
        console.log("Error in login controller: ", error.message);
        res.status(500).json({message: "Internal server error"});
    }
}


export const logout = async (req, res) => {
    try {
        res.clearCookie("jwt");
        res.status(200).json({message: "Logged out successfully"});
    } catch (error) {
        console.log("Error in logout controller: ", error.message);
        res.status(500).json({message: "Internal server error"});
    }
}