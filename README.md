\# Task 1 – Product Activity Tracking



A full-stack React Native application implementing product activity tracking with Recently Viewed Products, Continue Shopping, Cart, Wishlist, and Order functionality.



\## Features

## 📱 Android APK

The Android application has been built and tested successfully.

👉 **[Download Android APK](https://github.com/Hithashree03-hs/Task1-ProductActivity/releases/latest)**

### Installation
1. Download `app-release.apk`.
2. Transfer it to an Android device or download it directly on the phone.
3. Install the APK.
4. Open the application and start using it.

> The mobile application connects to the deployed Render backend and MongoDB Atlas database, so it does not require the developer's computer to be connected.

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

\- Synchronizes cart changes across signed-in web and mobile devices in real time

\- Update quantities

\- Remove products

\- View cart total

\- Place orders

\- Checks stock and price changes before checkout, notifies the user, and refreshes the cart total



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

