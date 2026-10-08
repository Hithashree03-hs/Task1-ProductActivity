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

# Feature deployment setup

## Backend environment

Set these variables in the backend deployment environment. Do not commit real secrets.

- `MONGODB_URI`: MongoDB Atlas URI. Multi-document transactions for checkout, cancellation, and payment processing require a replica set (Atlas provides one).
- `JWT_SECRET`: strong secret used to sign authentication tokens.
- `PUSH_TOKEN_ENCRYPTION_KEY`: random secret with at least 32 characters. Expo device tokens are encrypted at rest with AES-GCM; changing this key makes already stored tokens unreadable, so rotate by re-registering devices.
- `EXPO_ACCESS_TOKEN`: optional Expo access token for authenticated Expo push API requests.
- `PAYMENT_WEBHOOK_SECRET`: at least 32 characters, shared with the payment provider or adapter.
- `INTERNAL_EVENTS_SECRET`: at least 32 characters, shared with the trusted order/product event producer.

Scheduled jobs are started with the API process: scheduled push dispatch runs every minute, abandoned-cart scheduling every five minutes, and Expo receipt checks every fifteen minutes. Run one API scheduler instance, or add a distributed job lock before scaling the API horizontally.

## Mobile push setup

Configure `EXPO_PUBLIC_EAS_PROJECT_ID` with the EAS project UUID before building. The application requests notification permission and registers a device token after a user signs in. Configure Android FCM credentials and iOS APNs credentials in that EAS project; the app cannot receive remote notifications from a store build until those provider credentials and signing profiles are provisioned. Native projects have Expo module autolinking configured; rebuild the native app after changing notification/native configuration.

## Webhook signatures and event formats

Both endpoints sign the exact raw UTF-8 request body with HMAC-SHA256 and send the lowercase or uppercase hex digest in the header shown. The server compares signatures in constant time and rejects missing/invalid signatures. Each event ID is idempotent.

Payment endpoint: `POST /api/webhooks/payment`, header `x-payment-signature`.

```json
{"id":"provider-event-123","type":"payment.succeeded","data":{"orderId":"MONGODB_ORDER_ID","amount":1299,"currency":"INR"}}
```

Supported payment event types are `payment.succeeded`, `payment.failed`, and `payment.refunded`. Success validates amount and currency against the order before recording the event and changing payment state.

Internal event endpoint: `POST /api/internal/events`, header `x-internal-signature`.

```json
{"id":"inventory-event-123","type":"product.updated","data":{"productId":"MONGODB_PRODUCT_ID","price":999,"stock":12}}
```

Supported types: `product.updated` (price/stock changes, including wishlist drop and restock alerts), `order.shipped`, `order.delivered`, and `promotion` (broadcast subject to each user's notification preferences). Sign the exact JSON bytes, for example in Node.js:

```js
const signature = require('crypto').createHmac('sha256', secret).update(rawBody).digest('hex');
```

## Feature behavior

Recently Viewed keeps 20 unique ordered items for display and cross-device sync. Recommendation activity is stored separately up to 50 unique product views. Product recommendations exclude out-of-stock and recently purchased items. Order history supports server pagination and filters, invoice PDF downloads, reorder, and status-guarded cancellation/return requests. Notification preferences and theme preference are synchronized to the user account; the theme is also cached with AsyncStorage for startup/offline use.
