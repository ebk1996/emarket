// Import necessary modules


const express = require('express');
const admin = require('firebase-admin'); // Firebase Admin SDK for backend operations
const cors = require('cors'); // For handling Cross-Origin Resource Sharing

// Initialize Express app
const app = express();
const port = 3002; // Port for the Express server (different from Uber clone backend)

// Middleware
app.use(cors()); // Enable CORS for all routes, allowing your React app to connect
app.use(express.json()); // Enable JSON body parsing for incoming requests

// IMPORTANT: Initialize Firebase Admin SDK
// You need to replace 'path/to/your/serviceAccountKey.json' with the actual path
// to your Firebase service account key file.
// You can generate this file from your Firebase project settings -> Service accounts.
// Keep this file secure and do not expose it publicly.
try {
  // Ensure you have downloaded your service account key and placed it in the same directory
  const serviceAccount = require('./serviceAccountKey.json'); // Path to your service account key

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // You might need to specify your databaseURL if you're using Realtime Database
    // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com"
  });

  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK. Make sure serviceAccountKey.json is correctly configured and accessible.');
  console.error(error);
  process.exit(1); // Exit if Firebase initialization fails
}


const db = admin.firestore(); // Get a Firestore instance

// Define the App ID from your Canvas environment.
// In a real-world scenario, you might pass this as an environment variable.
// For this example, we'll use a placeholder.
const APP_ID = 'default-app-id'; // Replace with your actual __app_id from Canvas if known

// --- API Endpoints ---

// GET /api/products
// Fetches all products from Firestore
app.get('/api/products', async (req, res) => {
  try {
    // Reference to the public products collection
    const productsRef = db.collection(`artifacts/${APP_ID}/public/data/products`);
    // Fetch all documents in the collection
    const snapshot = await productsRef.get();

    if (snapshot.empty) {
      console.log('No products found.');
      return res.status(200).json([]);
    }

    const products = [];
    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort products by createdAt timestamp in descending order (latest first)
    products.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
      const timeB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
      return timeB - timeA;
    });

    console.log(`Fetched ${products.length} products.`);
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

// GET /api/products/seller/:userId
// Fetches products listed by a specific seller (user)
app.get('/api/products/seller/:userId', async (req, res) => {
  const sellerId = req.params.userId;

  try {
    const productsRef = db.collection(`artifacts/${APP_ID}/public/data/products`);
    const snapshot = await productsRef.where('sellerId', '==', sellerId).get();

    if (snapshot.empty) {
      console.log(`No products found for seller: ${sellerId}`);
      return res.status(200).json([]);
    }

    const products = [];
    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort products by createdAt timestamp in descending order (latest first)
    products.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
      const timeB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
      return timeB - timeA;
    });

    console.log(`Fetched ${products.length} products for seller ${sellerId}.`);
    res.status(200).json(products);
  } catch (error) {
    console.error(`Error fetching products for seller ${sellerId}:`, error);
    res.status(500).json({ error: 'Failed to fetch seller products', details: error.message });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Express backend for eMarket listening at http://localhost:${port}`);
  console.log('To run this server:');
  console.log('1. Ensure you have Node.js installed.');
  console.log('2. Create a new directory for this backend (e.g., "emarket-backend").');
  console.log('3. Save this code as "server.js" inside that directory.');
  console.log('4. Run `npm init -y` in your terminal within that directory.');
  console.log('5. Install dependencies: `npm install express firebase-admin cors`');
  console.log('6. Download your Firebase service account key (JSON file) from Firebase Console -> Project settings -> Service accounts.');
  console.log('7. Place the downloaded JSON file (e.g., "serviceAccountKey.json") in the same directory as "server.js".');
  console.log('8. Update the `require(\'./serviceAccountKey.json\')` path if your file name is different.');
  console.log('9. Run the server: `node server.js`');
  console.log('10. Ensure your Firebase project has Firestore enabled and the necessary security rules allow reads from `artifacts/{appId}/public/data/products`.');
});
