import { asyncHandeler } from "../utils/asyncHandeler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudnary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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
    const existUser= User.findOne({
        $or: [{username},{email}]
    })
    if(existUser){
        throw new ApiError(409, "user already exists")
    }

    //check for image, check for avatar
    const avatarLocalPath=req.files?.avatar[0]?.path
    const covImgLP=req.files?.avatar[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    //upload on cloudinary, avatar
    const avatar= await uploadOnCloudnary(avatarLocalPath)
    const covImg= await uploadOnCloudnary(avatarLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    //create user objects-create entry on DB
    const user= await User.create({
        fullname,
        avatar: avatar.url,
        covImg: covImg?.url || "",
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

export {registerUser}