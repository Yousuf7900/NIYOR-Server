const jwt = require('jsonwebtoken');
const { getDB } = require('../db');
const verifyToken = require('../middlewares/verifyToken');
const setUpAPI = (app) => {
    const db = getDB();
    // all the collections
    const usersCollection = db.collection('users');
    const productsCollection = db.collection('products');
    const cartsCollection = db.collection('cart');
    const paymentCollection = db.collection('payment');
    const reviewCollection = db.collection('review');

    // test api
    app.get('/api/test', (req, res) => {
        res.send("Now server perfectly working YAAAY");
    })

    // jwt api
    app.post('/jwt', async (req, res) => {
        const userInfo = req.body;
        const token = jwt.sign(userInfo, process.env.SECRET_ACCESS_TOKEN, { expiresIn: '1h', issuer: 'Niyor' });
        res.send({ token });
    })


    // Users api here
    app.patch('/api/users', async (req, res) => {
        try {
            const userData = req.body;
            if (!userData?.email || !userData?.uid) {
                return res.status(400).send({ message: "Email & UID are required" });
            }
            const filter = { uid: userData.uid };
            const updateDoc = {
                $set: {
                    name: userData.name,
                    photoURL: userData.photoURL,
                    lastLoginAt: userData.lastLoginAt || new Date().toISOString(),
                    uid: userData.uid
                },
                $setOnInsert: {
                    role: 'customer',
                    createdAt: userData.createdAt || new Date().toISOString(),
                    email: userData.email,
                    status: 'active',
                    phone: userData.phone || null
                }
            };
            const result = await usersCollection.updateOne(filter, updateDoc, { upsert: true });
            res.send({ message: "User saved!", result });
        } catch (error) {
            res.status(500).send({ message: error.message });
        }
    })

    // logged in user data
    app.get('/api/users/:email', async (req, res) => {
        try {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email });
            if (!user) {
                return res.status(404).send({ message: "User not found" });
            }
            res.send(user);
        } catch (error) {
            res.send(500).send({ message: "Failed o fetch user" });
        }
    });

    // products api here
    app.get('/api/products', async (req, res) => {
        try {
            const products = await productsCollection.find({ isActive: true }).toArray();
            res.send(products);
        } catch (error) {
            return res.status(500).send({ message: error.message });
        }
    });


    // cart api here

    // payment api here

    // review api here
};

module.exports = setUpAPI;