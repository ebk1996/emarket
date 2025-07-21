import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore'; // Added collection, addDoc, query, orderBy, serverTimestamp
import { Container, Box, TextField, Button, Typography, AppBar, Toolbar, IconButton, CircularProgress, Paper, Grid, Card, CardContent, CardMedia, CardActions, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { ShoppingBag, Search, UserCircle, PlusCircle } from 'lucide-react'; // Using lucide-react for icons

// Theme for Material-UI
const theme = createTheme({
  typography: {
    fontFamily: 'Inter, sans-serif',
  },
  palette: {
    primary: {
      main: '#3366FF', // eBay Blue
    },
    secondary: {
      main: '#FFCC00', // eBay Yellow
    },
    background: {
      default: '#f0f2f5',
      paper: '#ffffff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          padding: '10px 20px',
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0px 6px 15px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.03)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

// Firebase Context
const FirebaseContext = createContext(null);

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Initialize Firebase and set up auth listener
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

    try {
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);

      setAuth(authInstance);
      setDb(dbInstance);
      setFirebaseInitialized(true);

      const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setUserId(currentUser.uid);
        } else {
          // If no user is logged in, try to sign in anonymously
          try {
            if (typeof __initial_auth_token !== 'undefined') {
              await signInWithCustomToken(authInstance, __initial_auth_token);
            } else {
              await signInAnonymously(authInstance);
            }
            // After anonymous sign-in, onAuthStateChanged will be triggered again with the anonymous user
          } catch (error) {
            console.error("Error signing in anonymously:", error);
            // Fallback: If anonymous sign-in fails, set user to null and stop loading
            setUser(null);
            setUserId(null);
            setLoading(false);
          }
        }
        setLoading(false); // Set loading to false once auth state is determined
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      setLoading(false);
    }
  }, []); // Run only once on component mount

  if (loading || !firebaseInitialized) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>Loading App...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <FirebaseContext.Provider value={{ db, auth, userId }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
          <AppBar position="static" color="primary" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0' }}>
            <Toolbar sx={{ justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ShoppingBag size={32} color="#fff" />
                <Typography variant="h5" component="div" sx={{ flexGrow: 1, ml: 1, fontWeight: 'bold', color: '#fff' }}>
                  eMarket
                </Typography>
              </Box>
              {user && (
                <Button color="inherit" onClick={() => signOut(auth)} sx={{ color: '#fff' }}>
                  Logout
                </Button>
              )}
            </Toolbar>
          </AppBar>

          <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
            {!user ? <AuthScreen /> : <Dashboard />}
          </Container>
        </Box>
      </FirebaseContext.Provider>
    </ThemeProvider>
  );
}

// AuthScreen Component
function AuthScreen() {
  const { auth, db } = useContext(FirebaseContext);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Save user profile to Firestore
        await setDoc(doc(db, `artifacts/${__app_id}/users/${userCredential.user.uid}/profile`, 'data'), {
          email: userCredential.user.email,
          createdAt: new Date(),
          // Add other initial user data here
        });
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        {isLogin ? 'Welcome Back!' : 'Join eMarket'}
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 400 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          sx={{ mb: 2 }}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 3 }}
        />
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          sx={{ mb: 2 }}
          disabled={authLoading}
        >
          {authLoading ? <CircularProgress size={24} color="inherit" /> : (isLogin ? 'Sign In' : 'Sign Up')}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          onClick={() => setIsLogin(!isLogin)}
          disabled={authLoading}
        >
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
        </Button>
      </Box>
    </Paper>
  );
}

// Product Listing Card Component
const ProductCard = ({ product }) => {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleBuyNow = () => {
    setSnackbarMessage(`You bought "${product.name}" for $${product.price.toFixed(2)}! (Simulated)`);
    setSnackbarSeverity('success');
    setOpenSnackbar(true);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="180"
        image={product.imageUrl || `https://placehold.co/400x180/E0E0E0/666666?text=${product.name.replace(/\s/g, '+')}`}
        alt={product.name}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {product.description}
        </Typography>
        <Typography variant="h5" color="primary" sx={{ mt: 2, fontWeight: 'bold' }}>
          ${product.price.toFixed(2)}
        </Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
        <Button size="small" variant="contained" color="primary" onClick={handleBuyNow}>
          Buy Now
        </Button>
      </CardActions>
      <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Card>
  );
};

// Add New Product Dialog
function AddProductDialog({ open, onClose }) {
  const { db, userId } = useContext(FirebaseContext);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddProduct = async () => {
    setError('');
    if (!name || !description || !price) {
      setError('Please fill in all required fields.');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Price must be a positive number.');
      return;
    }

    setLoading(true);
    try {
      // Add product to a public collection for all users to see
      await addDoc(collection(db, `artifacts/${__app_id}/public/data/products`), {
        name,
        description,
        price: parsedPrice,
        imageUrl: imageUrl || '', // Allow empty image URL
        sellerId: userId,
        createdAt: serverTimestamp(), // Use server timestamp for consistency
      });
      setName('');
      setDescription('');
      setPrice('');
      setImageUrl('');
      onClose(); // Close dialog on success
    } catch (err) {
      console.error("Error adding product:", err);
      setError(`Failed to add product: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Product</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Product Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          id="description"
          label="Description"
          type="text"
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          id="price"
          label="Price"
          type="number"
          fullWidth
          variant="outlined"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputProps={{ step: "0.01" }}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          id="imageUrl"
          label="Image URL (Optional)"
          type="url"
          fullWidth
          variant="outlined"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          sx={{ mb: 2 }}
        />
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleAddProduct} color="primary" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Add Product'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Dashboard Component
function Dashboard() {
  const { db, userId } = useContext(FirebaseContext);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [openAddProductDialog, setOpenAddProductDialog] = useState(false);

  useEffect(() => {
    if (!db || !userId) return;

    // Listen for real-time updates to the user's profile
    const profileDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/profile`, 'data');
    const unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      } else {
        console.log("No user profile found!");
        setUserProfile(null); // Clear profile if it doesn't exist
      }
      setProfileLoading(false);
    }, (error) => {
      console.error("Error fetching user profile:", error);
      setProfileLoading(false);
    });

    // Listen for real-time updates to products
    // Note: orderBy is used here, but for production, you might need Firestore indexes.
    // If you encounter errors, remove orderBy and sort in client-side JS.
    const productsCollectionRef = collection(db, `artifacts/${__app_id}/public/data/products`);
    const q = query(productsCollectionRef); // Removed orderBy to prevent potential index issues

    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      const fetchedProducts = [];
      snapshot.forEach(doc => {
        fetchedProducts.push({ id: doc.id, ...doc.data() });
      });
      // Client-side sorting if orderBy is removed from query
      fetchedProducts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setProducts(fetchedProducts);
      setProductsLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setProductsLoading(false);
    });


    return () => {
      unsubscribeProfile();
      unsubscribeProducts();
    }; // Cleanup listeners on unmount
  }, [db, userId]);

  const handleOpenAddProductDialog = () => {
    setOpenAddProductDialog(true);
  };

  const handleCloseAddProductDialog = () => {
    setOpenAddProductDialog(false);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Welcome to eMarket, {userProfile?.email || 'User'}!
        <Typography variant="body2" color="text.secondary">
          Your User ID: <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{userId || 'N/A'}</span>
        </Typography>
      </Typography>

      {profileLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading profile...</Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          <Grid item xs={12} md={9}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <Search size={24} style={{ marginRight: 8 }} />
                Latest Listings
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlusCircle />}
                onClick={handleOpenAddProductDialog}
              >
                Add New Product
              </Button>
            </Box>

            {productsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading products...</Typography>
              </Box>
            ) : products.length === 0 ? (
              <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">No products listed yet. Be the first to add one!</Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {products.map((product) => (
                  <Grid item key={product.id} xs={12} sm={6} md={4}>
                    <ProductCard product={product} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>

          <Grid item xs={12} md={3}>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <UserCircle size={24} style={{ marginRight: 8 }} />
                Your Account
              </Typography>
              <Typography variant="body1">
                <strong>Email:</strong> {userProfile?.email || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Joined: {userProfile?.createdAt ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
              </Typography>
              <Button variant="outlined" size="small" sx={{ mt: 2 }}>View My Listings</Button>
            </Paper>

            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                eMarket Spinoffs
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                - My Bids & Offers
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                - Selling Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                - Watchlist
              </Typography>
              <Typography variant="body2" color="text.secondary">
                - Customer Support
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}
      <AddProductDialog open={openAddProductDialog} onClose={handleCloseAddProductDialog} />
    </Box>
  );
}

export default App;
