import { v2 as cloudinary} from "cloudinary";
import fs from "fs"; //filesystem


import {v2 as cloudinary} from 'cloudinary';
import { response } from "express";
import { url } from "inspector";
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECURITY
});

const uploadOnCloudnary=async (localFilePath)=>{
    try{
        if(!localFilePath){
            return null;
        }
        else{
           const response= await cloudinary.uploader.upload(localFilePath,{
                resource_type: "auto"
            })
        }
        console.log("successful uploaded file", response.url);
        return response;
    }
    catch(error){
        fs.linkSync(localFilePath)
        return null;
    }
}

export {uploadOnCloudnary}


