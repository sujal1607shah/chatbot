import {asyncHandler} from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import { User } from '../models/Users.model.js'
import jwt from 'jsonwebtoken'

const generateAcessAndRefreshTokens = async (userId) => {
     try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Generate tokens using schema methods
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("REAL ERROR 👉", error); // 👈 THIS IS KEY
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  // 1️⃣ Validate input
  if (!fullName || !email || !username || !password) {
    throw new ApiError(400, "All fields are compulsory");
  }

  if (
    fullName.trim() === "" ||
    email.trim() === "" ||
    username.trim() === "" ||
    password.trim() === ""
  ) {
    throw new ApiError(400, "All fields are compulsory");
  }

  // 2️⃣ Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // 3️⃣ Create user
  const user = await User.create({
    fullName: fullName.trim(),
    email: email.trim(),
    username: username.trim().toLowerCase(),
    password
  });

  // 4️⃣ Remove sensitive fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "User registration failed");
  }

  // 5️⃣ Success response
  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully")
  );
});



const loginUser = asyncHandler(async (req, res) => {

    const { username, email, password } = req.body


    if (!username && !email) {
        throw new ApiError(400, "Username and email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })


    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    // & uper no je User che a moongoose no object che 
    // & for password aapde user je hamna declare karyo a use karisu 

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }
    const { accessToken, refreshToken } = await generateAcessAndRefreshTokens(user._id)


    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // & Now for the cookies

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
     .json(
            new ApiResponse(
                200,
                {
                    user:loggedInUser,accessToken,refreshToken
                },
                "User logged in successfully"
            )
        )
})

// * Now for the logout user

const logoutUser =asyncHandler(async(req,res)=>{
    await User.findByIDandUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1          // remove the user
            }
        },
        {
            new:true
        }
    )
      const options={
            httpOnly:true,
            secure:true
        }
    
        return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{},"User logged out"))
})

// * Refresh token check karva ane update karva 

const refreshAccessToken= asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorised request")
    }
    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user=await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh token")
        }
    
        if (incomingRefreshToken!==user?.refreshToken) {
            throw new ApiError(401,"Invalid referesh token")
        }
    
        const {accessToken,newrefreshToken}=await generateAcessAndRefreshTokens(user._id)
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        return res
        .status(200)
        .cookie("accesToken",accessToken,options)
        .cookie("refereshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newrefreshToken},
                "Access token refresh succesfully"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})
const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Old password")
    }
    user.password=newPassword

    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password change successfully"))
})


const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"User fetched succesfully")
})


const updateAcoountDetails=asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user=User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new:true}
    ).select("-password")


    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details successfully updated"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAcoountDetails,
}