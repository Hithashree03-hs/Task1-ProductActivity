\# Task 1 – Product Activity Tracking



A full-stack React Native application implementing product activity tracking with Recently Viewed Products, Continue Shopping, Cart, Wishlist, and Order functionality.



\## Features



\### Recently Viewed Products

\- Tracks recently viewed products

\- Supports anonymous users

\- Supports logged-in users

\- Maintains latest 20 unique products

\- Automatically removes older entries

\- Preserves viewing order

\- Prevents duplicate product records

\- Merges anonymous history with server-side history after login



\### Real-Time Synchronization

\- Socket.IO based real-time updates

\- Synchronizes Recently Viewed products across multiple devices

\- Updates automatically when a product is viewed on another device



\### Continue Shopping

\- Displays products viewed but not purchased

\- Provides quick Add to Cart action

\- Provides quick Add to Wishlist action

\- Purchased products are automatically excluded



\### Cart

\- Add products to cart

\- Update quantities

\- Remove products

\- View cart total

\- Place orders



\### Wishlist

\- Add products to wishlist

\- Remove products from wishlist

\- Open wishlist products and view their details

\- Add wishlist products to cart



\## Tech Stack



\### Frontend

\- React Native

\- TypeScript

\- JavaScript

\- React Navigation

\- Axios

\- AsyncStorage

\- Socket.IO Client



\### Backend

\- Node.js

\- Express.js

\- TypeScript

\- MongoDB

\- Mongoose

\- Socket.IO

\- JWT Authentication

\- REST API



\### Development Tools

\- Git

\- GitHub

\- Android Studio

\- VS Code



\## Project Structure



```text

Task1-ProductActivity/

│

├── backend/

│   ├── src/

│   │   ├── controllers/

│   │   ├── models/

│   │   ├── routes/

│   │   ├── services/

│   │   ├── sockets/

│   │   └── seed/

│   ├── package.json

│   └── tsconfig.json

│

├── mobile/

│   ├── src/

│   │   ├── api/

│   │   ├── navigation/

│   │   ├── screens/

│   │   └── services/

│   ├── android/

│   └── package.json

│

└── README.md

