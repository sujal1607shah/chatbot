import express from 'express'
import cors from 'cors'
import authrouter from './routes/authroutes.js'
import chatrouter from './routes/chatroutes.js'


const app = express()
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))
app.use(express.json())

// & For the authRoutes & chatRoutes

app.use("/api/auth",authrouter);
app.use("/api/chat",chatrouter);

app.get("/",(req,res)=>{
    res.send("Chatbot is running....")
})
export {app}