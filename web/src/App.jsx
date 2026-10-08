import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

import './App.css';



const API_BASE_URL =
'http://localhost:5000/api';




const RECENT_STORAGE_KEY =

  'shopEasyRecentlyViewed';



/* =========================================================

   API HELPERS

========================================================= */



async function readJson(response) {

  const data = await response.json().catch(() => ({}));



  if (!response.ok) {

    const error = new Error(

      data.message ||

        `Request failed (${response.status}).`

    );



    error.status = response.status;

    throw error;

  }



  return data;

}



function authHeaders(token) {

  return {

    'Content-Type': 'application/json',

    Authorization: `Bearer ${token}`,

  };

}



/* =========================================================

   RECENTLY VIEWED HELPERS

========================================================= */



function normalizeRecentlyViewed(items) {

  if (!Array.isArray(items)) {

    return [];

  }



  return items

    .map((item) => {

      const product = item?.product || item?.productId || item;



      if (!product?._id) {

        return null;

      }



      return {

        product,

        viewedAt:

          item?.viewedAt ||

          new Date().toISOString(),

      };

    })

    .filter(Boolean)

    .sort(

      (a, b) =>

        new Date(b.viewedAt).getTime() -

        new Date(a.viewedAt).getTime()

    )

    .slice(0, 20);

}



function getStoredRecentlyViewed() {

  try {

    const stored = localStorage.getItem(

      RECENT_STORAGE_KEY

    );



    if (!stored) {

      return [];

    }



    return normalizeRecentlyViewed(

      JSON.parse(stored)

    );

  } catch {

    return [];

  }

}



function saveStoredRecentlyViewed(items) {

  try {

    localStorage.setItem(

      RECENT_STORAGE_KEY,

      JSON.stringify(items.slice(0, 20))

    );

  } catch {

    // Ignore localStorage errors.

  }

}



function putProductAtTop(

  product,

  existing = []

) {

  const now = new Date().toISOString();



  const filtered = existing.filter(

    (item) =>

      item?.product?._id !== product?._id

  );



  return [

    {

      product,

      viewedAt: now,

    },

    ...filtered,

  ].slice(0, 20);

}



/* =========================================================

   APP

========================================================= */



function slugify(value = '') {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getColorImage(product, color) {
  const imageEntries = Object.entries(product?.colorImages || {});
  const matchingImage = imageEntries.find(
    ([variantColor]) => variantColor.toLowerCase() === color?.toLowerCase()
  );

  return matchingImage?.[1] ||
    `/product-variants/${slugify(product?.name)}-${slugify(color)}.jpg`;
}

function ProductColorImage({ product, color }) {
  const variantUrl = getColorImage(product, color);
  const [imageUrl, setImageUrl] = useState(variantUrl);

  useEffect(() => {
    setImageUrl(variantUrl);
  }, [variantUrl]);

  return (
    <img
      className="detail-product-image"
      src={imageUrl}
      alt={`${product.name} in ${color || 'selected'} color`}
      onError={() => {
        if (imageUrl !== product.image) setImageUrl(product.image);
      }}
    />
  );
}

function App() {

  const [products, setProducts] = useState([]);



  const [token, setToken] = useState(

    localStorage.getItem('shopEasyToken') || ''

  );



  const [user, setUser] = useState(() => {

    try {

      return JSON.parse(

        localStorage.getItem('shopEasyUser') ||

          'null'

      );

    } catch {

      return null;

    }

  });



  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');



  const [recentlyViewed, setRecentlyViewed] =

    useState(() =>

      getStoredRecentlyViewed()

    );



  const [continueShopping, setContinueShopping] =

    useState([]);



  const [cartItems, setCartItems] = useState([]);
  const [cartRefreshing, setCartRefreshing] = useState(false);



  const [wishlistItems, setWishlistItems] =

    useState([]);



  const [selectedProduct, setSelectedProduct] =

    useState(null);



  const [selectedSize, setSelectedSize] =

    useState('');



  const [selectedColor, setSelectedColor] =

    useState('');



  const [activePanel, setActivePanel] =

    useState(null);



  const [showLogin, setShowLogin] =

    useState(false);



  const [showRegister, setShowRegister] =

  useState(false);



const [registerName, setRegisterName] =

  useState('');



const [registerEmail, setRegisterEmail] =

  useState('');



const [registerPassword, setRegisterPassword] =

  useState('');



const [registerLoading, setRegisterLoading] =

  useState(false);



const [registerError, setRegisterError] =

  useState('');







  const [showOrderSuccess, setShowOrderSuccess] =

    useState(false);



  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');



  const [loginLoading, setLoginLoading] =

    useState(false);



  const [loginError, setLoginError] =

    useState('');



  const [actionMessage, setActionMessage] =

    useState('');



  const [actionLoading, setActionLoading] =

    useState(false);



  const activeCartItems = cartItems.filter(
    (item) => !item?.savedForLater
  );

  const savedItems = cartItems.filter(
    (item) => item?.savedForLater
  );



  const formatPrice = (price) =>

    new Intl.NumberFormat('en-IN').format(

      Number(price || 0)

    );



  /* =======================================================

     PRODUCTS

  ======================================================= */



  const refreshCartManually = async () => {
    setCartRefreshing(true);
    try {
      await loadCart();
    } finally {
      setCartRefreshing(false);
    }
  };

  useEffect(() => {

    let cancelled = false;



    const loadProducts = async () => {

      try {

        setLoading(true);

        setError('');



        const response = await fetch(

          `${API_BASE_URL}/products?limit=20`

        );



        const result = await readJson(response);



        const items =

          result.data?.items ||

          result.data?.products ||

          result.items ||

          result.products ||

          [];



        if (!cancelled) {

          setProducts(items);

        }

      } catch (err) {

        console.error(

          'Products error:',

          err

        );



        if (!cancelled) {

          setError(

            err.message ||

              'Unable to load products.'

          );

        }

      } finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    };



    loadProducts();



    return () => {

      cancelled = true;

    };

  }, []);



  /* =======================================================

     AUTHENTICATED DATA

  ======================================================= */



  useEffect(() => {

    if (!token) {

      setCartItems([]);

      setWishlistItems([]);

      setContinueShopping([]);



      setRecentlyViewed(

        getStoredRecentlyViewed()

      );



      return;

    }



    loadAllUserData();

  }, [token]);



  /* =======================================================

     RECENTLY VIEWED

  ======================================================= */



  const loadRecentlyViewed = async (

    optimisticProduct = null

  ) => {

    if (!token) {

      const localItems =

        getStoredRecentlyViewed();



      setRecentlyViewed(localItems);



      return localItems;

    }



    try {

      /*

       * IMPORTANT:

       * This is GET only.

       *

       * POST /recently-viewed/view is used

       * only when a product is actually opened.

       */



      const response = await fetch(

        `${API_BASE_URL}/recently-viewed`,

        {

          method: 'GET',

          headers: authHeaders(token),

        }

      );



      const result = await readJson(response);



      const serverItems =

        result.products ||

        result.data?.products ||

        result.data?.items ||

        result.items ||

        [];



      let normalized =

        normalizeRecentlyViewed(

          serverItems

        );



      /*

       * If we just viewed a product,

       * make sure it remains at the top.

       */



      if (optimisticProduct?._id) {

        normalized = putProductAtTop(

          optimisticProduct,

          normalized

        );

      }



      setRecentlyViewed(normalized);



      saveStoredRecentlyViewed(

        normalized

      );



      return normalized;

    } catch (err) {

      console.error(

        'Recently viewed error:',

        err

      );



      /*

       * Keep the current UI if the server

       * temporarily fails.

       */

      return recentlyViewed;

    }

  };



  /* =======================================================

     CONTINUE SHOPPING

  ======================================================= */



  const loadContinueShopping = async (

    optimisticProduct = null

  ) => {

    if (!token) {

      setContinueShopping([]);

      return [];

    }



    try {

      const response = await fetch(

        `${API_BASE_URL}/continue-shopping`,

        {

          method: 'GET',

          headers: authHeaders(token),

        }

      );



      const result = await readJson(response);



      let items =

        result.products ||

        result.data?.products ||

        result.data?.items ||

        result.items ||

        [];



      items = normalizeRecentlyViewed(

        items

      );



      /*

       * Make the newly viewed product appear

       * immediately at the top.

       */



      if (optimisticProduct?._id) {

        items = [

          {

            product: optimisticProduct,

            viewedAt:

              new Date().toISOString(),

          },

          ...items.filter(

            (item) =>

              item.product?._id !==

              optimisticProduct._id

          ),

        ].slice(0, 20);

      }



      setContinueShopping(items);



      return items;

    } catch (err) {

      console.error(

        'Continue shopping error:',

        err

      );



      return continueShopping;

    }

  };



  /* =======================================================

     CART - LOAD

  ======================================================= */



  const loadCart = async () => {

    if (!token) {

      setCartItems([]);

      return [];

    }



    try {

      const response = await fetch(

        `${API_BASE_URL}/cart`,

        {

          method: 'GET',

          headers: authHeaders(token),

        }

      );



      const result = await readJson(response);



      const items =

        result.cart?.items ||

        result.data?.cart?.items ||

        [];



      setCartItems(items);



      return items;

    } catch (err) {

      console.error(

        'Cart error:',

        err

      );



      setCartItems([]);



      return [];

    }

  };

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socketUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    const refreshCart = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/cart`, {
          method: 'GET',
          headers: authHeaders(token),
        });
        const result = await readJson(response);
        setCartItems(result.cart?.items || result.data?.cart?.items || []);
      } catch (err) {
        console.error('Cart sync error:', err);
      }
    };

    socket.on('cartUpdated', refreshCart);

    return () => {
      socket.off('cartUpdated', refreshCart);
      socket.disconnect();
    };
  }, [token]);



  /* =======================================================

     WISHLIST - LOAD

  ======================================================= */



  const loadWishlist = async () => {

    if (!token) {

      setWishlistItems([]);

      return [];

    }



    try {

      const response = await fetch(

        `${API_BASE_URL}/wishlist`,

        {

          method: 'GET',

          headers: authHeaders(token),

        }

      );



      const result = await readJson(response);



      const items =

        result.products ||

        result.data?.products ||

        [];



      setWishlistItems(items);



      return items;

    } catch (err) {

      console.error(

        'Wishlist error:',

        err

      );



      setWishlistItems([]);



      return [];

    }

  };



  /* =======================================================

     LOAD ALL USER DATA

  ======================================================= */



  const loadAllUserData = async () => {

    if (!token) {

      return;

    }



    await Promise.all([

      loadRecentlyViewed(),

      loadContinueShopping(),

      loadCart(),

      loadWishlist(),

    ]);

  };



  /* =======================================================

     AUTOMATIC RECENT / CONTINUE REFRESH

  ======================================================= */



  useEffect(() => {

    if (!token) {

      return;

    }



    if (

      activePanel !== 'recent' &&

      activePanel !== 'continue'

    ) {

      return;

    }



    const refresh = () => {

      if (activePanel === 'recent') {

        loadRecentlyViewed();

      }



      if (activePanel === 'continue') {

        loadContinueShopping();

      }

    };



    const interval = setInterval(

      refresh,

      2000

    );



    window.addEventListener(

      'focus',

      refresh

    );



    document.addEventListener(

      'visibilitychange',

      refresh

    );



    return () => {

      clearInterval(interval);



      window.removeEventListener(

        'focus',

        refresh

      );



      document.removeEventListener(

        'visibilitychange',

        refresh

      );

    };

  }, [token, activePanel]);



  /* =======================================================

     PRODUCT VIEW

  ======================================================= */



  const handleProductClick = async (

    product

  ) => {

    if (!product?._id) {

      return;

    }



    setSelectedSize(product.sizes?.length ? product.sizes[0] : '');

    setSelectedColor(product.colors?.length ? product.colors[0] : '');

    setSelectedProduct(product);

    setActivePanel(null);

    setActionMessage('');



    /*

     * =====================================================

     * FIRST: UPDATE UI IMMEDIATELY

     * =====================================================

     */



    const optimisticRecent =

      putProductAtTop(

        product,

        recentlyViewed

      );



    setRecentlyViewed(

      optimisticRecent

    );



    saveStoredRecentlyViewed(

      optimisticRecent

    );



    const optimisticContinue = [

      {

        product,

        viewedAt:

          new Date().toISOString(),

      },

      ...continueShopping.filter(

        (item) =>

          item.product?._id !==

          product._id

      ),

    ].slice(0, 20);



    setContinueShopping(

      optimisticContinue

    );



    /*

     * =====================================================

     * GUEST USER

     * =====================================================

     */



    if (!token) {

      return;

    }



    /*

     * =====================================================

     * LOGGED-IN USER

     *

     * THIS is where POST /recently-viewed/view

     * belongs.

     * =====================================================

     */



    try {

      const response = await fetch(

        `${API_BASE_URL}/recently-viewed/view`,

        {

          method: 'POST',

          headers: authHeaders(token),

          body: JSON.stringify({

            productId: product._id,

          }),

        }

      );



      await readJson(response);



      /*

       * Refresh both sections after the

       * backend records the view.

       */



      await Promise.all([

        loadRecentlyViewed(product),

        loadContinueShopping(product),

      ]);

    } catch (err) {

      console.error(

        'Failed to record product view:',

        err

      );



      /*

       * Optimistic UI remains visible.

       */

    }

  };



  /* =======================================================

     LOGIN

  ======================================================= */



  const handleLogin = async (event) => {

    event.preventDefault();



    if (

      !email.trim() ||

      !password

    ) {

      setLoginError(

        'Please enter your email and password.'

      );



      return;

    }



    try {

      setLoginLoading(true);

      setLoginError('');



      const response = await fetch(

        `${API_BASE_URL}/auth/login`,

        {

          method: 'POST',

          headers: {

            'Content-Type':

              'application/json',

          },

          body: JSON.stringify({

            email: email.trim(),

            password,

          }),

        }

      );



      const result =

        await readJson(response);



      const newToken =

        result.data?.token ||

        result.token;



      const newUser =

        result.data?.user ||

        result.user;



      if (!newToken) {

        throw new Error(

          'Login succeeded but no token was returned.'

        );

      }



      /*

       * Preserve local Recently Viewed.

       */



      const localHistory =

        getStoredRecentlyViewed();



      localStorage.setItem(

        'shopEasyToken',

        newToken

      );



      if (newUser) {

        localStorage.setItem(

          'shopEasyUser',

          JSON.stringify(newUser)

        );

      }



      setToken(newToken);

      setUser(newUser || null);



      setEmail('');

      setPassword('');

      setLoginError('');

      setShowLogin(false);



      /*

       * Merge anonymous history into

       * logged-in account.

       */



      setTimeout(async () => {

        try {

          if (localHistory.length > 0) {

            try {

              await fetch(

                `${API_BASE_URL}/recently-viewed/merge`,

                {

                  method: 'POST',

                  headers:

                    authHeaders(newToken),

                  body: JSON.stringify({

                    localHistory:

                      localHistory.map(

                        (item) => ({

                          productId:

                            item.product

                              ._id,

                          viewedAt:

                            item.viewedAt,

                        })

                      ),

                  }),

                }

              );



              localStorage.removeItem(

                RECENT_STORAGE_KEY

              );

            } catch (mergeError) {

              console.warn(

                'Recently Viewed merge skipped:',

                mergeError

              );

            }

          }



          await loadAllUserData();

        } catch (loadError) {

          console.error(

            'Post-login data loading error:',

            loadError

          );

        }

      }, 0);

    } catch (err) {

      console.error(

        'Login error:',

        err

      );



      setLoginError(

        err.message ||

          'Login failed. Please try again.'

      );

    } finally {

      setLoginLoading(false);

    }

  };



  const handleRegister = async (event) => {

  event.preventDefault();



  if (

    !registerName.trim() ||

    !registerEmail.trim() ||

    !registerPassword

  ) {

    setRegisterError(

      'Please enter your name, email and password.'

    );

    return;

  }



  if (registerPassword.length < 6) {

    setRegisterError(

      'Password must be at least 6 characters.'

    );

    return;

  }



  try {

    setRegisterLoading(true);

    setRegisterError('');



    const response = await fetch(

      `${API_BASE_URL}/auth/register`,

      {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          name: registerName.trim(),

          email: registerEmail.trim(),

          password: registerPassword,

        }),

      }

    );



    const result = await readJson(response);



    const newToken =

      result.data?.token ||

      result.token;



    const newUser =

      result.data?.user ||

      result.user;



    if (!newToken) {

      throw new Error(

        'Registration succeeded but no token was returned.'

      );

    }



    localStorage.setItem(

      'shopEasyToken',

      newToken

    );



    if (newUser) {

      localStorage.setItem(

        'shopEasyUser',

        JSON.stringify(newUser)

      );

    }



    setToken(newToken);

    setUser(newUser || null);



    setRegisterName('');

    setRegisterEmail('');

    setRegisterPassword('');

    setRegisterError('');

    setShowRegister(false);



    // Load the newly registered user's data

    setTimeout(async () => {

      try {

        await loadAllUserData();

      } catch (error) {

        console.error(

          'Post-registration data loading error:',

          error

        );

      }

    }, 0);

  } catch (err) {

    console.error(

      'Registration error:',

      err

    );



    setRegisterError(

      err.message ||

        'Registration failed. Please try again.'

    );

  } finally {

    setRegisterLoading(false);

  }

};



  /* =======================================================

     LOGOUT

  ======================================================= */



  const handleLogout = () => {

    localStorage.removeItem(

      'shopEasyToken'

    );



    localStorage.removeItem(

      'shopEasyUser'

    );



    setToken('');

    setUser(null);



    setCartItems([]);

    setWishlistItems([]);

    setContinueShopping([]);



    setRecentlyViewed(

      getStoredRecentlyViewed()

    );



    setSelectedProduct(null);

    setSelectedSize('');

    setSelectedColor('');

    setActivePanel(null);

    setShowOrderSuccess(false);

  };



  /* =======================================================

     CART - ADD

  ======================================================= */



  const addToCart = async (product) => {
    if (!token) { setSelectedProduct(null); setShowLogin(true); return; }
    if (product.sizes?.length > 0 && !selectedSize) { setActionMessage('Please select a size.'); return; }
    if (product.colors?.length > 0 && !selectedColor) { setActionMessage('Please select a color.'); return; }
    try {
      setActionLoading(true); setActionMessage('');
      const response = await fetch(`${API_BASE_URL}/cart/add`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ productId: product._id, quantity: 1, ...(selectedSize ? { size: selectedSize } : {}), ...(selectedColor ? { color: selectedColor } : {}) }) });
      await readJson(response); await loadCart(); setActionMessage('Added to cart.');
    } catch (err) { console.error('Add to cart error:', err); setActionMessage(err.message || 'Failed to add to cart.'); } finally { setActionLoading(false); }
  };

  const updateCartQuantity = async (productId, quantity, itemId = null, size, color) => {
    if (!token) { setShowLogin(true); return; }
    if (quantity < 0) return;
    try {
      setActionLoading(true); setActionMessage('');
      const response = await fetch(`${API_BASE_URL}/cart/${productId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ quantity, ...(itemId ? { itemId } : {}), ...(size ? { size } : {}), ...(color ? { color } : {}) }) });
      await readJson(response); await loadCart();
    } catch (err) { console.error('Update cart quantity error:', err); setActionMessage(err.message || 'Failed to update cart quantity.'); } finally { setActionLoading(false); }
  };

  const updateCartVariant = async (item, size, color) => {
    const product = item?.productId;
    if (!token || !product?._id || !item?._id) return;
    try {
      setActionLoading(true); setActionMessage('');
      const response = await fetch(`${API_BASE_URL}/cart/${product._id}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ quantity: Number(item.quantity || 1), itemId: item._id, size, color, updateVariant: true }),
      });
      await readJson(response); await loadCart();
    } catch (err) {
      console.error('Update cart variant error:', err);
      setActionMessage(err.message || 'Failed to update item options.');
    } finally { setActionLoading(false); }
  };

  const removeFromCart = async (productId, itemId, size, color) => {
    if (!token) { setShowLogin(true); return; }
    try {
      setActionLoading(true); setActionMessage('');
      const response = await fetch(`${API_BASE_URL}/cart/${productId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ quantity: 0, ...(itemId ? { itemId } : {}), ...(size ? { size } : {}), ...(color ? { color } : {}) }) });
      await readJson(response); await loadCart();
    } catch (err) { console.error('Remove cart error:', err); setActionMessage(err.message || 'Failed to remove item from cart.'); } finally { setActionLoading(false); }
  };

  const saveItemForLater = async (itemId) => {
    if (!token) { setShowLogin(true); return; }
    try {
      setActionLoading(true); setActionMessage('');
      const response = await fetch(`${API_BASE_URL}/cart/save-for-later/${itemId}`, { method: 'PATCH', headers: authHeaders(token) });
      await readJson(response); await loadCart(); setActionMessage('Item saved for later.');
    } catch (err) { console.error('Save for later error:', err); setActionMessage(err.message || 'Failed to save item for later.'); } finally { setActionLoading(false); }
  };

  const moveSavedItemToCart = async (itemId) => {
    if (!token) { setShowLogin(true); return; }
    try {
      setActionLoading(true); setActionMessage('');
      const response = await fetch(`${API_BASE_URL}/cart/move-to-cart/${itemId}`, { method: 'PATCH', headers: authHeaders(token) });
      await readJson(response); await loadCart(); setActionMessage('Item moved to cart.');
    } catch (err) { console.error('Move to cart error:', err); setActionMessage(err.message || 'Failed to move item to cart.'); } finally { setActionLoading(false); }
  };

  const removeSavedItem = async (itemId) => {
    if (!token) { setShowLogin(true); return; }
    try {
      setActionLoading(true); setActionMessage('');
      const response = await fetch(`${API_BASE_URL}/cart/saved/${itemId}`, { method: 'DELETE', headers: authHeaders(token) });
      await readJson(response); await loadCart(); setActionMessage('Saved item removed.');
    } catch (err) { console.error('Remove saved item error:', err); setActionMessage(err.message || 'Failed to remove saved item.'); } finally { setActionLoading(false); }
  };

  const addToWishlist = async (

    product

  ) => {

    if (!token) {

      setSelectedProduct(null);

      setShowLogin(true);

      return;

    }



    try {

      setActionLoading(true);

      setActionMessage('');



      const response = await fetch(

        `${API_BASE_URL}/wishlist/add`,

        {

          method: 'POST',

          headers: authHeaders(token),

          body: JSON.stringify({

            productId: product._id,

          }),

        }

      );



      await readJson(response);



      await loadWishlist();



      setActionMessage(

        'Added to wishlist.'

      );

    } catch (err) {

      console.error(

        'Add to wishlist error:',

        err

      );



      setActionMessage(

        err.message ||

          'Failed to add to wishlist.'

      );

    } finally {

      setActionLoading(false);

    }

  };



  /* =======================================================

     WISHLIST - REMOVE

  ======================================================= */



  const removeFromWishlist = async (

    productId

  ) => {

    if (!token) {

      setShowLogin(true);

      return;

    }



    try {

      setActionLoading(true);

      setActionMessage('');



      const response = await fetch(

        `${API_BASE_URL}/wishlist/remove`,

        {

          method: 'DELETE',

          headers: authHeaders(token),

          body: JSON.stringify({

            productId,

          }),

        }

      );



      await readJson(response);



      await loadWishlist();

    } catch (err) {

      console.error(

        'Remove wishlist error:',

        err

      );



      setActionMessage(

        err.message ||

          'Failed to remove from wishlist.'

      );

    } finally {

      setActionLoading(false);

    }

  };



  /* =======================================================

     PLACE ORDER

  ======================================================= */



  const placeOrder = async () => {

    if (!token) {

      setShowLogin(true);

      return;

    }



    if (

      actionLoading ||

      activeCartItems.length === 0

    ) {

      return;

    }



    try {

      /*

       * Immediately changes the button to:

       * "Placing the order..."

       */



      setActionLoading(true);

      setActionMessage('');



      const items = activeCartItems
        .filter((item) => item?.productId?._id)
        .map((item) => ({
          productId: item.productId._id,
          quantity: Number(item.quantity),
          ...(item.size ? { size: item.size } : {}),
          ...(item.color ? { color: item.color } : {}),
        }));

      if (items.length === 0) {

        throw new Error(

          'Your cart contains no valid products.'

        );

      }

      const validationResponse = await fetch(`${API_BASE_URL}/cart/validate`, {
        method: 'POST',
        headers: authHeaders(token),
      });
      const validation = await readJson(validationResponse);
      const validatedItems = validation.cart?.items || [];
      setCartItems(validatedItems);

      if (validation.issues?.length) {
        const messages = validation.issues.map((issue) => {
          if (issue.type === 'price') {
            return `${issue.productName}: price changed from ₹${formatPrice(issue.oldPrice)} to ₹${formatPrice(issue.newPrice)}. The total is updated; review it before continuing.`;
          }
          if (issue.type === 'stock') {
            return issue.availableStock > 0
              ? `${issue.productName}: only ${issue.availableStock} available; reduce the quantity to continue.`
              : `${issue.productName} is out of stock; remove it to continue.`;
          }
          return `${issue.productName} is no longer available and was removed from your cart.`;
        });
        setActionMessage(messages.join(' '));
        return;
      }

      const orderItems = validatedItems
        .filter((item) => !item.savedForLater && item?.productId?._id)
        .map((item) => ({
          productId: item.productId._id,
          quantity: Number(item.quantity),
          price: Number(item.productId.price),
          ...(item.size ? { size: item.size } : {}),
          ...(item.color ? { color: item.color } : {}),
        }));

      if (orderItems.length === 0) {
        setActionMessage('Your cart has no available items to order.');
        return;
      }



      /*

       * Actual backend route:

       *

       * POST /api/orders

       */



      const response = await fetch(

        `${API_BASE_URL}/orders`,

        {

          method: 'POST',

          headers: authHeaders(token),

          body: JSON.stringify({

            items: orderItems,

          }),

        }

      );



      await readJson(response);



      /*

       * Backend deletes the cart after

       * successful order creation.

       */



      await loadCart();



      await Promise.all([

        loadContinueShopping(),

        loadRecentlyViewed(),

      ]);



      /*

       * DO NOT close the cart panel.

       *

       * Success dialog appears over the

       * empty cart.

       */



      setShowOrderSuccess(true);

    } catch (err) {

      console.error(

        'Place order error:',

        err

      );



      setActionMessage(

        err.message ||

          'Failed to place order.'

      );

    } finally {

      setActionLoading(false);

    }

  };



  /* =======================================================

     OPEN QUICK ACCESS PANEL

  ======================================================= */



  const openPanel = async (type) => {

    if (!token) {

      setShowLogin(true);

      return;

    }



    setSelectedProduct(null);

    setActionMessage('');

    setActivePanel(type);



    if (type === 'recent') {

      await loadRecentlyViewed();

    }



    if (type === 'continue') {

      await loadContinueShopping();

    }



    if (type === 'cart') {

      await loadCart();

    }



    if (type === 'wishlist') {

      await loadWishlist();

    }

  };



  /* =======================================================

     CART TOTAL

  ======================================================= */



  const cartTotal = useMemo(() => {
    return activeCartItems.reduce((total, item) => {
      const product = item?.productId;
      if (!product) return total;
      return total + Number(product.price || 0) * Number(item.quantity || 0);
    }, 0);
  }, [activeCartItems]);



  /* =======================================================

     LOADING

  ======================================================= */



  if (loading) {

    return (

      <div className="app loading-page">

        <div className="loading-content">

          <div className="loading-icon">

            🛍️

          </div>



          <h2>

            Loading ShopEasy...

          </h2>



          <p>

            Please wait while we load the

            products.

          </p>

        </div>

      </div>

    );

  }



  /* =======================================================

     ERROR

  ======================================================= */



  if (error) {

    return (

      <div className="app loading-page">

        <div className="error-box">

          <div className="error-icon">

            ⚠️

          </div>



          <h2>

            Something went wrong

          </h2>



          <p>{error}</p>



          <button

            className="primary-button"

            onClick={() =>

              window.location.reload()

            }

          >

            Try Again

          </button>

        </div>

      </div>

    );

  }



  /* =======================================================

     MAIN UI

  ======================================================= */



  return (

    <div className="app">

      <main className="app-shell">



        {/* HEADER */}



        <header className="header">

          <div className="brand-area">

            <h1 className="app-title">

              Shop<span>Easy</span>

            </h1>



            <p className="subtitle">

              {token

                ? `Welcome back${

                    user?.name

                      ? `, ${user.name}`

                      : ''

                  }`

                : 'Browsing as guest'}

            </p>

          </div>



          <div className="header-actions">

            {token ? (

              <button

                className="login-button"

                onClick={handleLogout}

              >

                Logout

              </button>

            ) : (

              <button

                className="login-button"

                onClick={() => {

                  setLoginError('');

                  setShowLogin(true);

                }}

              >

                Login

              </button>

            )}

          </div>

        </header>



        {/* QUICK ACCESS */}



        <section className="quick-access">

          <div className="section-heading">

            <div>

              <h2>

                Quick Access

              </h2>



              <p>

                Manage your shopping activity

              </p>

            </div>



            <span className="shortcut-count">

              4 shortcuts

            </span>

          </div>



          <div className="quick-grid">



            <button

              className="quick-card recent-card"

              onClick={() =>

                openPanel('recent')

              }

            >

              <div className="quick-icon">

                🕘

              </div>



              <div>

                <h3>

                  Recently Viewed

                </h3>



                <p>

                  Your browsing history

                </p>

              </div>



              <span className="quick-arrow">

                →

              </span>

            </button>



            <button

              className="quick-card continue-card"

              onClick={() =>

                openPanel('continue')

              }

            >

              <div className="quick-icon">

                🛍️

              </div>



              <div>

                <h3>

                  Continue Shopping

                </h3>



                <p>

                  Pick up where you left off

                </p>

              </div>



              <span className="quick-arrow">

                →

              </span>

            </button>



            <button

              className="quick-card cart-card"

              onClick={() =>

                openPanel('cart')

              }

            >

              <div className="quick-icon">

                🛒

              </div>



              <div>

                <h3>

                  Cart

                </h3>



                <p>

                  Your selected products

                </p>

              </div>



              <span className="quick-arrow">

                →

              </span>

            </button>



            <button

              className="quick-card wishlist-card"

              onClick={() =>

                openPanel('wishlist')

              }

            >

              <div className="quick-icon">

                ❤️

              </div>



              <div>

                <h3>

                  Wishlist

                </h3>



                <p>

                  Your saved products

                </p>

              </div>



              <span className="quick-arrow">

                →

              </span>

            </button>



          </div>

        </section>



        {/* ALL PRODUCTS */}



        <section className="products-section">

          <div className="section-heading">

            <div>

              <h2>

                All Products

              </h2>



              <p>

                {products.length} products

                available

              </p>

            </div>

          </div>



          <div className="product-grid">

            {products.map(

              (product) => (

                <article

                  className="product-card"

                  key={product._id}

                  onClick={() =>

                    handleProductClick(

                      product

                    )

                  }

                >

                  <div className="product-image-wrapper">

                    <img

                      src={product.image}

                      alt={product.name}

                      className="product-image"

                    />

                  </div>



                  <div className="product-info">

                    <span className="product-category">

                      {product.category}

                    </span>



                    <h3>

                      {product.name}

                    </h3>



                    <p className="product-description">

                      {product.description}

                    </p>



                    <div className="product-bottom">

                      <strong>

                        ₹

                        {formatPrice(

                          product.price

                        )}

                      </strong>



                      <span>

                        Tap to view product →

                      </span>

                    </div>

                  </div>

                </article>

              )

            )}

          </div>

        </section>



      </main>



      {/* ===================================================

          PRODUCT DETAIL

      =================================================== */}



      {selectedProduct && (

        <div
          className="modal-overlay"
          onClick={() => setSelectedProduct(null)}
          style={{
            alignItems: 'stretch',
            justifyContent: 'stretch',
            overflow: 'hidden',
            padding: 0,
            boxSizing: 'border-box',
          }}
        >
          <div
            className="product-detail-modal"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 'none',
              height: '100dvh',
              maxHeight: '100dvh',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 0,
              background: '#fffdf9',
              boxShadow: '0 28px 80px rgba(0,0,0,.22)',
            }}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedProduct(null)}
              type="button"
              style={{
                position: 'fixed',
                top: '16px',
                right: '16px',
                margin: 0,
                zIndex: 10,
              }}
            >
              ×
            </button>

            {/* PRODUCT IMAGE */}
            <div
              className="detail-image"
              style={{
                width: '100%',
                height: 'min(54dvh, 620px)',
                minHeight: '260px',
                flex: '0 0 auto',
                background: '#f3f3ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <ProductColorImage
                product={selectedProduct}
                color={selectedColor}
              />
            </div>

            {/* PRODUCT DETAILS — BELOW IMAGE */}
            <div
              className="detail-content"
              style={{
                width: '100%',
                minWidth: 0,
                minHeight: 0,
                boxSizing: 'border-box',
                padding: '32px clamp(20px, 6vw, 88px) 48px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                overflow: 'visible',
              }}
            >
              <span className="detail-category">
                {selectedProduct.category}
              </span>

              <h2>{selectedProduct.name}</h2>

              <p className="detail-description">
                {selectedProduct.description}
              </p>

              <div className="detail-price">
                ₹{formatPrice(selectedProduct.price)}
              </div>

              <div className="detail-stock">
                <strong>Stock:</strong> {selectedProduct.stock}
              </div>

              {/* SIZE */}
              {selectedProduct.sizes?.length > 0 && (
                <div className="variant-selector">
                  <label>Size</label>
                  <div className="variant-options">
                    {selectedProduct.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={
                          selectedSize === size
                            ? 'variant-option selected'
                            : 'variant-option'
                        }
                        onClick={() => setSelectedSize(size)}
                        disabled={actionLoading}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* COLOR */}
              {selectedProduct.colors?.length > 0 && (
                <div className="variant-section">
                  <div className="variant-label">Color</div>

                  <div className="color-options">
                    {selectedProduct.colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${
                          selectedColor === color ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedColor(color)}
                        disabled={actionLoading}
                        title={`Select ${color}`}
                        aria-pressed={selectedColor === color}
                      >
                        <span
                          className="color-circle"
                          style={{
                            backgroundColor:
                              color.toLowerCase() === 'white'
                                ? '#ffffff'
                                : color.toLowerCase() === 'black'
                                ? '#111111'
                                : color.toLowerCase() === 'grey' ||
                                  color.toLowerCase() === 'gray'
                                ? '#808080'
                                : color.toLowerCase() === 'red'
                                ? '#ef4444'
                                : color.toLowerCase() === 'blue'
                                ? '#3b82f6'
                                : color.toLowerCase() === 'green'
                                ? '#22c55e'
                                : color.toLowerCase() === 'pink'
                                ? '#ec4899'
                                : color.toLowerCase() === 'purple'
                                ? '#8b5cf6'
                                : color.toLowerCase() === 'silver'
                                ? '#c0c0c0'
                                : '#d1d5db',
                          }}
                        />
                        <span>{color}</span>
                        {selectedColor === color && (
                          <span aria-hidden="true">✓</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: '10px',
                      color: '#2d6248',
                      fontWeight: 800,
                    }}
                  >
                    Selected color: {selectedColor || 'None'}
                  </div>
                </div>
              )}

              {actionMessage && (
                <div className="success-message">
                  {actionMessage}
                </div>
              )}

              <div className="detail-actions">
                <button
                  className="wishlist-action"
                  disabled={actionLoading}
                  onClick={() => addToWishlist(selectedProduct)}
                  type="button"
                >
                  ♡ &nbsp; Add to Wishlist
                </button>

                <button
                  className="cart-action"
                  disabled={actionLoading}
                  onClick={() => addToCart(selectedProduct)}
                  type="button"
                >
                  🛒 &nbsp; Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ===================================================

          QUICK ACCESS PANEL

      =================================================== */}



      {activePanel && (

  <div

    className="modal-overlay panel-overlay"

    onClick={() => setActivePanel(null)}

  >

          <div

            className={

              activePanel === 'cart'

                ? 'panel-modal panel-cart'

                : 'panel-modal'

            }

            onClick={(event) =>

              event.stopPropagation()

            }

          >

            <button

              className="modal-close"

              onClick={() =>

                setActivePanel(null)

              }

            >

              ×

            </button>



            {/* ================= RECENT ================= */}



            {activePanel === 'recent' && (

              <>

                <div className="panel-header-block">

                  <h2>

                    Recently Viewed

                  </h2>



                  <p>

                    Your latest product

                    activity

                  </p>

                </div>



                {recentlyViewed.length ===

                0 ? (

                  <div className="panel-empty">

                    <div className="panel-empty-icon">

                      🕘

                    </div>



                    <h3>

                      No recently viewed

                      products

                    </h3>



                    <p>

                      Open a product to

                      build your browsing

                      history.

                    </p>

                  </div>

                ) : (

                  <div className="panel-product-grid">

                    {recentlyViewed.map(

                      (item) => {

                        const product = item?.product;



                        if (

                          !product?._id

                        ) {

                          return null;

                        }



                        return (

                          <button

                            className="panel-product"

                            key={

                              product._id

                            }

                            onClick={() =>

                              handleProductClick(

                                product

                              )

                            }

                          >

                            <img

                              src={

                                product.image

                              }

                              alt={

                                product.name

                              }

                            />



                            <strong>

                              {

                                product.name

                              }

                            </strong>



                            <span>

                              ₹

                              {formatPrice(

                                product.price

                              )}

                            </span>

                          </button>

                        );

                      }

                    )}

                  </div>

                )}

              </>

            )}



            {/* ================= CONTINUE ================= */}



            {activePanel ===

              'continue' && (

              <>

                <div className="panel-header-block">

                  <h2>

                    Continue Shopping

                  </h2>



                  <p>

                    Products you've

                    viewed but haven't

                    purchased

                  </p>

                </div>



                {continueShopping.length ===

                0 ? (

                  <div className="panel-empty">

                    <div className="panel-empty-icon">

                      🛍️

                    </div>



                    <h3>

                      Nothing to continue

                      yet

                    </h3>



                    <p>

                      View products and

                      they will appear

                      here until

                      purchased.

                    </p>

                  </div>

                ) : (

                  <div className="panel-product-grid">

                    {continueShopping.map(

                      (item) => {

                        const product = item?.product;



                        if (

                          !product?._id

                        ) {

                          return null;

                        }



                        return (

                          <button

                            className="panel-product"

                            key={

                              product._id

                            }

                            onClick={() =>

                              handleProductClick(

                                product

                              )

                            }

                          >

                            <img

                              src={

                                product.image

                              }

                              alt={

                                product.name

                              }

                            />



                            <strong>

                              {

                                product.name

                              }

                            </strong>



                            <span>

                              ₹

                              {formatPrice(

                                product.price

                              )}

                            </span>

                          </button>

                        );

                      }

                    )}

                  </div>

                )}

              </>

            )}



            {/* ================= CART ================= */}



            {activePanel === 'cart' && (
              <div className="shopping-panel-content">
                <div className="shopping-panel-titlebar">
                  <div className="cart-title-group"><div><h2>My Cart</h2><p>{activeCartItems.length} {activeCartItems.length === 1 ? 'item' : 'items'}</p></div><button type="button" className="cart-refresh-button" onClick={refreshCartManually} disabled={cartRefreshing || !token} aria-label="Refresh cart">{cartRefreshing ? 'Refreshing…' : '↻ Refresh'}</button></div>
                  <div className="shopping-panel-icon">🛒</div>
                </div>
                {activeCartItems.length === 0 ? (
                  <div className="panel-empty"><div className="panel-empty-icon">🛒</div><h3>Your cart is empty</h3><p>Add products from their detail page.</p></div>
                ) : (
                  <>
                    <div className="cart-item-list">
                      {activeCartItems.map((item) => {
                        const product = item?.productId;
                        if (!product?._id) return null;
                        const quantity = Number(item.quantity || 0);
                        return (
                          <div className="cart-product-card" key={item._id || `${product._id}-${item.size || ''}-${item.color || ''}`}>
                            <img className="cart-product-image" src={getColorImage(product, item.color)} alt={`${product.name} in ${item.color || 'default'} color`} onError={(event) => { if (product.image && event.currentTarget.src !== new URL(product.image, window.location.href).href) event.currentTarget.src = product.image; }} />
                            <div className="cart-product-info">
                              <h3>{product.name}</h3>
                              <span className="cart-product-category">{product.category || 'Product'}</span>
                              {(product.sizes?.length > 0 || product.colors?.length > 0) && <div className="cart-variant-selectors">
                                {product.sizes?.length > 0 && <label>Size<select aria-label={`Size for ${product.name}`} value={item.size || ''} disabled={actionLoading} onChange={(event) => updateCartVariant(item, event.target.value, item.color || '')}>{!item.size && <option value="">Choose size</option>}{product.sizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>}
                                {product.colors?.length > 0 && <label>Color<select aria-label={`Color for ${product.name}`} value={item.color || ''} disabled={actionLoading} onChange={(event) => updateCartVariant(item, item.size || '', event.target.value)}>{!item.color && <option value="">Choose color</option>}{product.colors.map((color) => <option key={color} value={color}>{color}</option>)}</select></label>}
                              </div>}
                              <strong className="cart-product-price">₹{formatPrice(product.price)}</strong>
                              <div className="cart-quantity-row"><span>Quantity</span><div className="cart-quantity-controls"><button type="button" className="quantity-button" disabled={actionLoading} onClick={() => updateCartQuantity(product._id, quantity - 1, item._id, item.size, item.color)}>−</button><span className="quantity-value">{quantity}</span><button type="button" className="quantity-button" disabled={actionLoading} onClick={() => updateCartQuantity(product._id, quantity + 1, item._id, item.size, item.color)}>+</button></div></div>
                              <div className="cart-item-actions"><button type="button" className="cart-remove-link" disabled={actionLoading} onClick={() => removeFromCart(product._id, item._id, item.size, item.color)}>Remove</button><button type="button" className="save-for-later-button" disabled={actionLoading} onClick={() => saveItemForLater(item._id)}>Save for Later</button></div>
                            </div>
                            <span className="cart-line-total">₹{formatPrice(Number(product.price || 0) * quantity)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="cart-summary"><div className="cart-total-row"><span>Total</span><strong>₹{formatPrice(cartTotal)}</strong></div>{actionMessage && <div className="panel-action-message">{actionMessage}</div>}<button type="button" className="place-order-button" onClick={placeOrder} disabled={actionLoading}>{actionLoading ? 'Placing the order...' : 'Place Order'}</button></div>
                  </>
                )}
                <div className="saved-for-later-section">
                  <div className="saved-for-later-heading"><div><h2>Saved for Later</h2><p>{savedItems.length} {savedItems.length === 1 ? 'item' : 'items'}</p></div></div>
                  {savedItems.length === 0 ? <div className="saved-empty"><div className="panel-empty-icon">💾</div><p>No products saved for later.</p></div> : <div className="saved-item-list">{savedItems.map((item) => {
                    const product = item?.productId;
                    if (!product?._id) return null;
                    return <div className="saved-product-card" key={item._id}><img src={product.image} alt={product.name} /><div className="saved-product-info"><h3>{product.name}</h3><strong>₹{formatPrice(product.price)}</strong>{(item.size || item.color) && <div className="cart-variant-info">{item.size && <span>Size: <strong>{item.size}</strong></span>}{item.color && <span>Color: <strong>{item.color}</strong></span>}</div>}<div className="saved-actions"><button type="button" disabled={actionLoading} onClick={() => moveSavedItemToCart(item._id)}>Move to Cart</button><button type="button" disabled={actionLoading} onClick={() => removeSavedItem(item._id)}>Remove</button></div></div></div>;
                  })}</div>}
                </div>
              </div>
            )}

            {/* ================= WISHLIST ================= */}



            {activePanel ===

              'wishlist' && (

              <>

                <div className="panel-header-block">

                  <h2>

                    Wishlist

                  </h2>



                  <p>

                    Your saved products

                  </p>

                </div>



                {wishlistItems.length ===

                0 ? (

                  <div className="panel-empty">

                    <div className="panel-empty-icon">

                      ❤️

                    </div>



                    <h3>

                      Your wishlist is

                      empty

                    </h3>



                    <p>

                      Save products from

                      their detail page.

                    </p>

                  </div>

                ) : (

                  <div className="panel-product-grid">

                    {wishlistItems.map(

                      (product) => {

                        if (

                          !product?._id

                        ) {

                          return null;

                        }



                        return (

                          <div

                            className="wishlist-panel-item"

                            key={

                              product._id

                            }

                          >

                            <button

                              type="button"

                              className="panel-product"

                              onClick={() =>

                                handleProductClick(

                                  product

                                )

                              }

                            >

                              <img

                                src={

                                  product.image

                                }

                                alt={

                                  product.name

                                }

                              />



                              <strong>

                                {

                                  product.name

                                }

                              </strong>



                              <span>

                                ₹

                                {formatPrice(

                                  product.price

                                )}

                              </span>

                            </button>



                            <button

                              type="button"

                              className="remove-button"

                              disabled={

                                actionLoading

                              }

                              onClick={() =>

                                removeFromWishlist(

                                  product._id

                                )

                              }

                            >

                              Remove

                            </button>

                          </div>

                        );

                      }

                    )}

                  </div>

                )}

              </>

            )}



          </div>

        </div>

      )}



      {/* ===================================================

          ORDER SUCCESS DIALOG

      =================================================== */}



      {showOrderSuccess && (

        <div

          className="order-success-overlay"

          onClick={(event) => {

            /*

             * Do not close by clicking outside.

             * User must press OK.

             */

            event.stopPropagation();

          }}

        >

          <div

            className="order-success-dialog"

            onClick={(event) =>

              event.stopPropagation()

            }

          >

            <h2>

              Order Placed

            </h2>



            <p>

              Your order was placed

              successfully.

            </p>



            <button

              type="button"

              onClick={() =>

                setShowOrderSuccess(false)

              }

            >

              OK

            </button>

          </div>

        </div>

      )}



      {/* ===================================================

          LOGIN

      =================================================== */}



      {showLogin && (

  <div

    className="modal-overlay"

    onClick={() => {

      if (!loginLoading) {

        setShowLogin(false);

        setLoginError('');

      }

    }}

  >

    <div

      className="login-modal"

      onClick={(event) =>

        event.stopPropagation()

      }

    >

      <button

        className="modal-close"

        onClick={() => {

          if (!loginLoading) {

            setShowLogin(false);

            setLoginError('');

          }

        }}

      >

        ×

      </button>



      <div className="login-icon">

        🛍️

      </div>



      <h2>Welcome to ShopEasy</h2>



      <p className="login-subtitle">

        Login to continue shopping

      </p>



      <form onSubmit={handleLogin}>

        <div className="form-group">

          <label htmlFor="email">

            Email

          </label>



          <input

            id="email"

            type="email"

            value={email}

            onChange={(event) =>

              setEmail(event.target.value)

            }

            placeholder="Enter your email"

            disabled={loginLoading}

            required

          />

        </div>



        <div className="form-group">

          <label htmlFor="password">

            Password

          </label>



          <input

            id="password"

            type="password"

            value={password}

            onChange={(event) =>

              setPassword(event.target.value)

            }

            placeholder="Enter your password"

            disabled={loginLoading}

            required

          />

        </div>



        {loginError && (

          <div className="login-error">

            {loginError}

          </div>

        )}



        <button

          type="submit"

          className="primary-button login-submit"

          disabled={loginLoading}

        >

          {loginLoading

            ? 'Logging in...'

            : 'Login'}

        </button>

      </form>



      <div className="register-divider">

        <span>Don't have an account?</span>

      </div>



      <button

        type="button"

        className="register-link-button"

        disabled={loginLoading}

        onClick={() => {

          setShowLogin(false);

          setLoginError('');

          setShowRegister(true);

          setRegisterError('');

        }}

      >

        Register

      </button>

    </div>

  </div>

)}

{showRegister && (

  <div

    className="modal-overlay"

    onClick={() => {

      if (!registerLoading) {

        setShowRegister(false);

        setRegisterError('');

      }

    }}

  >

    <div

      className="login-modal"

      onClick={(event) =>

        event.stopPropagation()

      }

    >

      <button

        className="modal-close"

        onClick={() => {

          if (!registerLoading) {

            setShowRegister(false);

            setRegisterError('');

          }

        }}

      >

        ×

      </button>



      <div className="login-icon">

        🛍️

      </div>



      <h2>Create Account</h2>



      <p className="login-subtitle">

        Register to start shopping

      </p>



      <form onSubmit={handleRegister}>

        <div className="form-group">

          <label htmlFor="registerName">

            Name

          </label>



          <input

            id="registerName"

            type="text"

            value={registerName}

            onChange={(event) =>

              setRegisterName(

                event.target.value

              )

            }

            placeholder="Enter your name"

            disabled={registerLoading}

            required

          />

        </div>



        <div className="form-group">

          <label htmlFor="registerEmail">

            Email

          </label>



          <input

            id="registerEmail"

            type="email"

            value={registerEmail}

            onChange={(event) =>

              setRegisterEmail(

                event.target.value

              )

            }

            placeholder="Enter your email"

            disabled={registerLoading}

            required

          />

        </div>



        <div className="form-group">

          <label htmlFor="registerPassword">

            Password

          </label>



          <input

            id="registerPassword"

            type="password"

            value={registerPassword}

            onChange={(event) =>

              setRegisterPassword(

                event.target.value

              )

            }

            placeholder="Minimum 6 characters"

            disabled={registerLoading}

            required

          />

        </div>



        {registerError && (

          <div className="login-error">

            {registerError}

          </div>

        )}



        <button

          type="submit"

          className="primary-button login-submit"

          disabled={registerLoading}

        >

          {registerLoading

            ? 'Creating account...'

            : 'Register'}

        </button>

      </form>



      <div className="register-divider">

        <span>Already have an account?</span>

      </div>



      <button

        type="button"

        className="register-link-button"

        disabled={registerLoading}

        onClick={() => {

          setShowRegister(false);

          setRegisterError('');

          setShowLogin(true);

          setLoginError('');

        }}

      >

        Login

      </button>

    </div>

  </div>

)}



    </div>

  );

}



export default App;
