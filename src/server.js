require('dotenv').config();
const express = require('express');
const cors = require('cors');
const setUpAPI = require('./apis/api');
const { connectDB } = require('./db');
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

// server start
const startServer = async () => {
    try {
        await connectDB();
        setUpAPI(app);

        app.listen(port, () => {
            console.log(`Niyor Server running on port: ${port}`);
        });
    } catch (error) {
        console.log("Failed to start server", error.message);
        process.exit(1);
    }
};

startServer();
