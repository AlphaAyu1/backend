const asyncHandeler= (fun)=>{
return (req,res,next)=>{
    Promise.resolve(fun(req,res,next)).catch((error)=>next(error))
}
}

export {asyncHandeler}

/*
const asyncHandeler2=(fun)=>async (req, res,next)=>{
    try{
        await fun(req,res,next)
    }
    catch(error){
        res.status(error.code || 500).json({
            success:false,
            message:error.message
        })
    }
}
*/