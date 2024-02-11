import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECURITY
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new Error("Local file path is missing.");
        } else {
            const response = await cloudinary.uploader.upload(localFilePath, {
                resource_type: "auto"
            });
            return response;
        }
    } catch (error) {
        console.error("Error uploading file:", error.message);
        return null;
    }
};

const deleteFromCloudinary= async(localFilePath)=>{
    try {
        if(!localFilePath){
            throw new ApiError(400, "no previous avatar")
        }
        else{
            const response= await cloudinary.uploader.destroy(localFilePath)
            return response;
        }
    } catch (error) {
        console.error("Error deleting previos file:", error.message);
        return null;
    }
}

export { uploadOnCloudinary , deleteFromCloudinary};
