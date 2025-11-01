import mongoose from "mongoose";

const chatSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },

        messages:[
            {
                sender:{
                    type:String,
                    enum:["user","bot"],
                    required:true,
                },
                message:{
                    type:String,
                    required:true
                },
                time:{
                    type:Date,
                    default:Date.now
                }
            }
        ]
    },
    { timestamps: true }
);

export const Chat = mongoose.model("Chat",chatSchema)