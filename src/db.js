require('dotenv').config();

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_userName}:${process.env.DB_PASS}@${process.env.Cluster}-cluster.wgtvrlq.mongodb.net/NiyorDB?retryWrites=true&w=majority`;

let db;
const databaseName = process.env.DB_NAME;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const connectDB = async () => {
    try {
        await client.connect();
        db = client.db(databaseName);
        console.log(`MongoDB connected to database: ${databaseName}`);
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }

};

const getDB = () => {
    if (!db) {
        throw new Error("Database not connected yet!");
    }
    return db;
}

module.exports = { connectDB, getDB, client };
