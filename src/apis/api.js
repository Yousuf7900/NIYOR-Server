const jwt = require('jsonwebtoken');
const { getDB } = require('../db');
const verifyToken = require('../middlewares/verifyToken');
const { ObjectId } = require('mongodb');
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

    // all users for Admin manage
    app.get('/api/users', async (req, res) => {
        const users = await usersCollection.find().toArray();
        res.send(users);
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

    // add product
    app.post('/api/products', async (req, res) => {
        try {
            const productData = req.body;

            // required field validation
            const requiredFields = ["name", "slug", "description", "category", "price", "stockQty", "images"];
            const missing = requiredFields.filter(f => productData?.[f] === undefined || productData?.[f] === null || productData?.[f] === "");
            if (missing.length) {
                return res.status(400).send({ message: `Missing required fields: ${missing.join(", ")}` })
            }

            // checking image
            if (!Array.isArray(productData.images) || productData.images.length < 1) {
                return res.status(400).send({ message: "At least 1 image is required" });
            }

            // data
            const doc = {
                name: String(productData.name).trim(),
                slug: String(productData.slug).trim().toLowerCase(),
                sku: productData.sku ? String(productData.sku).trim() : null,
                description: String(productData.description).trim(),
                fabric: productData.fabric ? String(productData.fabric).trim() : null,
                category: String(productData.category).trim(),
                price: Number(productData.price),
                discountPrice: productData.discountPrice === null || productData.discountPrice === undefined || productData.discountPrice === "" ? null : Number(productData.discountPrice),
                sizes: Array.isArray(productData.sizes) ? productData.sizes : [],
                colors: Array.isArray(productData.colors) ? productData.colors : [],
                images: productData.images,
                stockQty: Number(productData.stockQty),
                soldQty: productData.soldQty ? Number(productData.soldQty) : 0,
                inStock: typeof productData.inStock === "boolean" ? productData.inStock : Number(productData.stockQty) > 0,
                isFeatured: typeof productData.isFeatured === "boolean" ? productData.isFeatured : false,
                isActive: typeof productData.isActive === "boolean" ? productData.isActive : true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            // ---- validate numbers ----
            if (Number.isNaN(doc.price) || doc.price <= 0) {
                return res.status(400).send({ success: false, message: "Price must be a valid number > 0" });
            }
            if (Number.isNaN(doc.stockQty) || doc.stockQty < 0) {
                return res.status(400).send({ success: false, message: "Stock Qty must be a valid number >= 0" });
            }
            if (doc.discountPrice !== null && (Number.isNaN(doc.discountPrice) || doc.discountPrice >= doc.price)) {
                return res.status(400).send({ success: false, message: "Discount price must be a valid number and less than price" });
            }

            if (!doc.slug) {
                return res.status(400).send({ success: false, message: "Slug cannot be empty" });
            }

            // ---- unique slug check ----
            const existing = await productsCollection.findOne({ slug: doc.slug });
            if (existing) {
                return res.status(409).send({
                    success: false,
                    message: "Slug already exists. Please use a unique slug.",
                });
            }

            // insert on db
            const result = await productsCollection.insertOne(doc);
            res.status(201).send({
                success: true,
                insertedId: result.insertedId,
                message: "Product created successfully"
            });
        } catch (error) {
            console.log("Failed to add product", error);
            res.status(500).send({
                success: false,
                message: "Server error while creating product"
            })
        }
    });

    // product details: admin
    app.get('/api/products/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ message: "Invalid product id" });
            }

            const product = await productsCollection.findOne({
                _id: new ObjectId(id),
            });

            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }

            res.status(200).json(product);

        } catch (error) {
            console.error("GET /api/products/:id error:", error);
            res.status(500).json({ message: "Server error" });
        }
    });

    // delete product (admin)
    app.delete("/api/products/:id", async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ message: "Invalid product id" });
            }

            const result = await productsCollection.deleteOne({
                _id: new ObjectId(id),
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: "Product not found" });
            }

            res.status(200).json({ message: "Product deleted", deletedCount: result.deletedCount });
        } catch (error) {
            console.error("DELETE /api/products/:id error:", error);
            res.status(500).json({ message: "Server error" });
        }
    });

    // update product (admin)
    app.put("/api/products/:id", async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ message: "Invalid product id" });
            }

            const updatedDoc = req.body || {};

            delete updatedDoc._id;

            const toNumber = (v) => (v === "" || v === null || v === undefined ? v : Number(v));

            if (updatedDoc.price !== undefined) updatedDoc.price = toNumber(updatedDoc.price);
            if (updatedDoc.discountPrice !== undefined) updatedDoc.discountPrice = toNumber(updatedDoc.discountPrice);
            if (updatedDoc.stockQty !== undefined) updatedDoc.stockQty = toNumber(updatedDoc.stockQty);
            if (updatedDoc.soldQty !== undefined) updatedDoc.soldQty = toNumber(updatedDoc.soldQty);

            if (updatedDoc.stockQty !== undefined) {
                updatedDoc.inStock = Number(updatedDoc.stockQty) > 0;
            }

            updatedDoc.updatedAt = new Date();

            const result = await productsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedDoc }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: "Product not found" });
            }

            res.status(200).json({
                message: "Product updated",
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
            });
        } catch (error) {
            console.error("PUT /api/products/:id error:", error);
            res.status(500).json({ message: "Server error" });
        }
    });





    // cart api here

    // payment api here

    // review api here
};

module.exports = setUpAPI;