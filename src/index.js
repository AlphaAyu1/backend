import dotenv from "dotenv";
import connectDB from './db/ind.js';
import { app } from "./app.js";

dotenv.config({
    path:'./env'
})

connectDB()
.then(()=>{app.on("error",(error)=>{
    console.log("error", error)
    throw error
})

    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running at : ${process.env.PORT}`)
    })
})

.catch((error)=>{
    console.log("MongoDB connect failed", error)
})

