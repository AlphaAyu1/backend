import { asyncHandeler } from "../utils/asyncHandeler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens=async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=await user.generateAccessTokens()
        const refreshToken=await user.generateRefreshTokens()
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong in generating tokens")
    }
}

const registerUser=asyncHandeler(async (req,res)=>{
    //get user detail
    const {fullname, email, username, password}=req.body
    console.log(`email: ${email}, fullname: ${fullname}`)

    //validation
    if(
        [fullname,username,password, email].some((field)=>field?.trim()==="")
        ){
            throw new ApiError(400,"all feilds req.")
        }

    //already existing user or not-uname, email
    const existUser= await User.findOne({
        $or: [{username},{email}]
    })
    if(existUser){
        throw new ApiError(409, "user already exists")
    }

    //check for image, check for avatar
    const avatarLocalPath=req.files.avatar[0].path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    //upload on cloudinary, avatar
    const avatar= await uploadOnCloudinary(avatarLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    //create user objects-create entry on DB
    const user= await User.create({
        fullname,
        avatar: avatar.url,
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken") //remove password and refresh token from response

    //check for usser creation
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering")
    }

    
    //return response
    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"))
})

const loginUser= asyncHandeler(async (req,res)=>{
    console.log("trying to login")
    //get user detail=> username, password
    const { username, password, email } = req.body;
    console.log(username);

    // Check for the presence of at least one of username or email
    if (!username && !email) {
        throw new ApiError(405, "username or email is required");
    }


    //find user
    const user= await User.findOne({$or:[{username},{email}]})
    //validation
    if(!user){
        throw new ApiError(408,"no such user found")
    }
    const isPassValid=await user.isPasswordCorrect(password)

    if(!isPassValid){
        throw new ApiError(408,"pass wrong")
    }

    //access & ref token 
    const {accessToken, refreshToken}=await generateAccessAndRefreshTokens(user._id)
    const logedInUser=await User.findById(user._id).select("-password -refreshToken")



    //semd cookies
    const options={
        httpOnly:true,
        secure:true
    }
    console.log(accessToken)

    return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(new ApiResponse(200,{user:logedInUser,accessToken,refreshToken},"User logged in success"))
})

const logOutUser= asyncHandeler(async (req,res)=>{
    console.log("entry")
    await User.findByIdAndUpdate(req.user._id,{

        $set:{
            refreshToken: undefined
        }
    },{
        new :true
    })

    const options={
        httpOnly:true,
        secure:true
    }
    console.log("user logged out")
    return res.status(200).clearCookie("accessToken",options).json(new ApiResponse(200,{},"user logged out"))
})

const refreshAccessToken=asyncHandeler(async(req,res)=>{
    const incRefToken=req.cookies.refreshToken || req.body.refreshToken

    if (incRefToken) {
        throw new ApiError(401,"unauth req")
    }

    try {
        const decodedToken=jwt.verify(incRefToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401,"invalid ref token")
        }
    
        if(incRefToken!== user?.refreshToken){
            throw new ApiError(401,"ref token expired")
        }
    
        const{accessToken, newrefreshToken}=await generateAccessAndRefreshTokens(user._id)
    
        const options={
            httpOnly: true,
            secure: true
        }
    
        return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",newrefreshToken,options).json(new ApiResponse(200,{accessToken,refreshToken:newrefreshToken},"acces token ref success"))
    
    } catch (error) {
        throw new ApiError(401,error?.message||"invalid ref token")
    }})


export {registerUser, loginUser, logOutUser, refreshAccessToken}