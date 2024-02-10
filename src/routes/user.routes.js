import { Router } from "express";
import { loginUser, registerUser ,logOutUser,refreshAccessToken} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


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

export default router;