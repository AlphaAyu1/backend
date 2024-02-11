import { Router } from "express";
import { loginUser, registerUser ,logOutUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, getUserChannelProfile, getWatchistory} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import multer from "multer";


const router=Router();

router.route("/register").post(
    upload.fields([{name:"avatar",maxCount:1},{name:"cover Image", maxCount:1}]),
    registerUser)

router.route("/login").post(
    loginUser
)

//secured Routes
router.route("/logout").post(verifyJWT , logOutUser)
router.route("/refToken").post(refreshAccessToken)
router.route("/changePassword").post(verifyJWT, changeCurrentPassword)
router.route("/currentUser").get(verifyJWT, getCurrentUser)
router.route("/updateAccountDetails").patch(verifyJWT, updateAccountDetails)
router.route("/updateAvatar").patch(verifyJWT, upload.single("avatar"),updateUserAvatar)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchistory)


export default router;