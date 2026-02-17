require('dotenv').config();
const express = require('express');
const cors = require('cors');
const setUpAPI = require('./apis/api');
const { connectDB } = require('./db');
const port = process.env.PORT || 5000;
const app = express();

app.use(cors(
    {
        origin: [
            "http://localhost:5173",
            "https://niyor.web.app",
            "https://niyor.firebaseapp.com",
            "http://127.0.0.1:5173",
            "http://192.168.0.105:5173"
        ]
    }
));
app.use(express.json());

// server start
const startServer = async () => {
    try {
        await connectDB();
        setUpAPI(app);

        app.listen(port, "0.0.0.0", () => {
            console.log(`Niyor Server running on port: ${port}`);
        });
    } catch (error) {
        console.log("Failed to start server", error.message);
        process.exit(1);
    }
};

startServer();
