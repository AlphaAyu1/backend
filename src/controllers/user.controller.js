import { asyncHandeler } from "../utils/asyncHandeler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary , deleteFromCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


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

    if (!incRefToken) {
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

const changeCurrentPassword=asyncHandeler(async(req,res)=>{
    const{oldPassword, newPassword}=req.body
    
    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"invalid password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave})

    return res.status(200).json(new ApiResponse(200,{},"Password changed"))
})

const getCurrentUser=asyncHandeler(async(req,res)=>{
return res.status(200).json(new ApiResponse(200, req.user, "current user fetched"))
})

const updateAccountDetails=asyncHandeler(async(req, res)=>{
    const {fullname, email}=req.body

    if(!fullname || !email){
        throw new ApiError(400,"all feilds req")
    }

    const user=await User.findByIdAndUpdate(req.user?._id, {
        $set:{
            fullname: fullname, email: email
        }
    },{new:true})
    .select("-password")

    return res.status(200).json(new ApiResponse(200,user,"account details successfully updated"))
})

const updateUserAvatar= asyncHandeler(async(req,res)=>{
    const oldUser = await User.findById(req.user?._id)
    const oldAvatar=oldUser.avatar
    
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar is missing")
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"error while uploading avatar")
    }

    const user =await User.findByIdAndUpdate(req.user?._id,{$set:{
        avatar: avatar.url
    }},{new: true} ).select("-password")

    if (oldAvatar) {
        await deleteFromCloudinary(oldAvatar)
    }

    return res.status(200).json(new ApiResponse(200,user,"successfully avatar updated"))
})

const getUserChannelProfile=asyncHandeler(async(req,res)=>{
    const {username}=req.params

    if(!username?.trim){
        throw new ApiError(400,"Username Missing")
    }

    const channel = await User.aggregate([{
        $match: {
            username: username?.toLowerCase()
        }
    },{
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },{
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
        }
    },{
        $addFields:{
            subsCount:{$size: "$subscribers"},
            subsTo:{$size: "$subscribedTo"},
            isSubscribed:{
                $cond:{
                    if: {$in:[req.user?._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                }
            }
        }
    },{
        $project:{
            fullname:1,
            username:1,
            subsCount:1,
            subsTo:1,
            isSubscribed:1,
            avatar:1
        }
    }
])
    if (!channel?.length) {
        throw new ApiError(400, "no channel found")
    }

    return res.status(200).json(new ApiResponse(200,channel[0],"User channel fetched"))

})

const getWatchistory=asyncHandeler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{_id: new mongoose.Types.ObjectId(req.user._id)}
        }
        ,{
            $lookup:{from:"videos",local:"watchHistory", foreignField:"_id",as:"watchHistory",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",localField:"owner",foreignField:"_id",as:"owner",
                                pipeline:[{
                                    $project:{
                                        fullname:1, username:1, avatar:1
                                    }
                                }]
                            }
                        },{
                            $addFields:{
                                owner:{
                                    $first:"$owner"
                                }
                            }
                        }
                    ]
        }
        },
        {

        }
    ])

    return res.status(200).json(new ApiResponse(200, user[0].watcHistory, "Watch history fetched succesfully"))

})

export {registerUser, loginUser, logOutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails,updateUserAvatar,getUserChannelProfile, getWatchistory}