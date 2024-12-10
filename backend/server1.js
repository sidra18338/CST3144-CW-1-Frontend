const express = require('express'); // Import Express library
const { MongoClient, ObjectId } = require('mongodb'); // Import MongoDB client and ObjectID
const cors = require("cors");
const path = require('path');
 

// Create an Express.js instance
const app = express();
const PORT = 8080; // Define the port to run the server
app.use(cors());


// Configure Express.js
app.use(express.json()); // Parse incoming JSON request bodies
app.set('port', PORT); // Set the application port

// Serve static files for images from the 'Assets' directory
app.use('/images', express.static(path.join(__dirname, 'Assets')));
app.use(express.static(path.join(__dirname, 'frontend')));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Static file middleware to handle requests for image file that does not exist
app.use('/images', (req, res) => {
    res.status(404).json({message: 'Image not found'});
    
});

// Logger middleware 
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} request to ${req.url}`);
    next();
});

// Connect to MongoDB
let db; // Initialize a variable to hold the database connection
MongoClient.connect(
    //"mongodb+srv://sidratahir145:wednesday@cluster0.1pssr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    'mongodb+srv://sidratahir145:wednesday@cluster0.1pssr.mongodb.net/',
    
    { useUnifiedTopology: true }, // Use the new MongoDB driver topology engine
    (err, client) => {
        if (err) {
            console.error('Failed to connect to MongoDB:', err);
            process.exit(1); // Exit the application if the connection fails
        }
        console.log('Connected to MongoDB');
        db = client.db('Webstore'); // Set the database to 'webstore'
    }
);



// Display a message for the root path to show that the API is working
app.get('/', (req, res) => {
    res.send('Select a collection, e.g., /collection/messages');
});

// Middleware to retrieve the collection name
app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName); // Attach the collection to the request object
    return next(); // Proceed to the next middleware or route handler
});

// Retrieve all objects from a collection
app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((err, results) => {
        if (err) return next(err); // Pass the error to the error handler
        res.send(results); // Send the retrieved documents as the response
        //return next()
    });
});

// Retrieve all objects from a collection
app.get('/lessons', (req, res, next) => {
    const lessons = db.collection('lessons');
    lessons.find({}).toArray((err, results) => {
        if (err) return next(err); // Pass the error to the error handler
        res.send(results); // Send the retrieved documents as the response
        //return next()
    });
});

// Add a new document to a collection
app.post('/collection/:collectionName', (req, res, next) => {
    req.collection.insertOne(req.body, (err, result) => {
        if (err) return next(err); // Pass the error to the error handler
        res.send(result.ops[0]); // Send the inserted document as the response
    });
});

// Retrieve a specific document by its ObjectID
app.get('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.findOne({ _id: new ObjectId(req.params.id) }, (err, result) => {
        if (err) return next(err); // Pass the error to the error handler
        res.send(result); // Send the retrieved document as the response
    });
});


app.get('/search', async (req, res) => {
    const searchQuery = req.query.q;
    if (!searchQuery) {
        return res.status(400).json({error: 'Search query is required'});

    }
    try {
        const lessons = db.collection('lessons');
        const results = await lessons.find({
            $or: [
                { subject: { $regex: searchQuery, $options:'i'}},
                { Location: { $regex: searchQuery, $options:'i'}},
                { price: { $regex: searchQuery, $options:'i'}},
                { availableInventory: { $regex: searchQuery, $options:'i'}}
            ]
        }).toArray();
        res.json(results);
    } catch (err) {
        console.error('Error fetching search results', err);
        res.status(500).json({ error: 'Internal server error'});
    }
    
});

//Update a document by its ObjectID

app.put('/collection/:lessons/:id', (req, res, next) => {
    const lessonId = new ObjectId(req.params.id);
    const updateData = req.body;

    req.collection.updateOne(
        { _id: lessonId }, // Filter by ID
        { $set: updateData }, // Update the specified fields
        (err, result) => {
            if (err) return next(err); // Pass the error to the error handler
            res.send(result.matchedCount === 1 ? { msg: 'success' } : { msg: 'error' }); // Send success or error message
        }
    );
});

// Delete a document by its ObjectID
app.delete('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.deleteOne(
        { _id: new ObjectId(req.params.id) }, // Filter by ID
        (err, result) => {
            if (err) return next(err); // Pass the error to the error handler
            res.send(result.deletedCount === 1 ? { msg: 'success' } : { msg: 'error' }); // Send success or error message
        }
    );
});

// Add a new route to add an order to orders collection
app.post('/collection/orders', async (req, res) => {
    const order = req.body; //retrieve order data from request body

    try {
        const orders = db.collection('orders');
        //create the order into the orders collection
        const result = await orders.insertOne(order);
        //respond with a successful message and order
        res.status(201).json({message: 'Order successful', orderId:result.insertedId});

    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({message:'Order failed', error: error.message});
    }
});



// Start the server and listen on the specified port
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
