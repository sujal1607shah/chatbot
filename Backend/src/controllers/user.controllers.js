import asyncHandler from '../src/utils/asyncHandler'
import ApiError from '../src/utils/ApiError'
import { User } from '../src/models/Users.model'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const generateAcessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefresh();

        user.refreshToken = refreshToken
        await user.save({ validateBdeoreSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while genearating access and refresh tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // *    Get the user details from frontend
    // *    Validation -> not empty
    // *    Check if the user already exist -> Username and Email
    // *    Check for the images and avtar
    // *    If images/avtar present upload in cloudinary
    // *    Create user Object-create entry in DB
    // *    Remove password and refresh tokens from the response
    // *    Check for user creation
    // *    Return response

    const { fullName, email, username, password } = req.body
    console.log("email:", email);

    // * In this we can do manually but make it optimise

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are compulsory")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User already exist")
    }

    // * Now create the databse 

    const user = await User.create({
        fullName,
        email,
        password,
        username: username.toLowerCase(),
    })

    // * Now check the user created succesfully or not 

    const createdUser = await User.findById(user._id).select(
        // & In this selct that item which u not have to show 
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User register succesfully")
    )

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