E-Commerce Project
==================

Table of Contents
-----------------

01.  [About](#about)
02.  [Features](#features)
03.  [Technologies](#technologies)
04.  [Installation](#installation)
05.  [Usage](#usage)
06.  [API Documentation](#api-documentation)
07.  [Authentication](#authentication)
08.  [Database Schema](#database-schema)
09.  [Testing](#testing)
10. [Deployment](#deployment)
11. [Contributing](#contributing)
12. [License](#license)
13. [Contact](#contact)

About
-----

This e-commerce project is a backend API built with Node.js, Express, and TypeScript, designed to handle user authentication, product management, order processing, and real-time notifications. It provides a scalable and efficient solution for managing an online store, handling various e-commerce functionalities with secure authentication, role-based access, and comprehensive error handling.

Features
--------

*   User registration and authentication with JWT
*   Role-based access control for users and admins
*   Product management (CRUD operations)
*   Order management with stock validation
*   Real-time notifications via WebSocket
*   Error handling and input validation
*   Pagination for retrieving orders
*   Unit tests for API endpoints

Technologies
------------

*   Node.js
*   Express.js
*   TypeScript
*   MongoDB (Mongoose)
*   JWT (JSON Web Tokens)
*   Socket.io for real-time communication
*   Cloudinary for image storage
*   Postman for API documentation
*   npm for package management

Installation
------------

### Prerequisites

*   Node.js (v14 or higher)
*   MongoDB (local or cloud instance)
*   npm (Node Package Manager)

### Steps to Install

01.  Clone the repository:
    `git clone <https://github.com/NayanThapaMagar/e-commerce-backend>
    cd e-commerce-project`

02.  Install dependencies:

 `npm install`

03.  Create a `.env` file in the root directory and add your environment variables:
    plaintext

    `PORT=
    MONGODB_URI=
    JWT_SECRET=
    CLOUDINARY_NAME=
    CLOUDINARY_API_KEY=
    CLOUDINARY_API_SECRET=
    NODE_ENV=`

Usage
-----

### Running the Application

To start the application, run the following command:

 `npm start`

The server will start on the specified `PORT` (default is 5000).

### Environment Variables

Make sure to set the environment variables in the `.env` file to configure your application correctly.

API Documentation
-----------------

The full API documentation is available on Postman. [View the documentation here.](https://documenter.getpostman.com/view/27057118/2sAY4xAMZi)

### Base URL

 `http://localhost:<PORT>`

### Endpoints

*   **User Registration**: `POST /auth/register`
*   **User Login**: `POST /auth/login`
*   **Create a Product**: `POST /products`
*   **Update a Product**: `PUT /products/:id`
*   **Delete a Product**: `DELETE /products/:id`
*   **Get All Products**: `GET /products`
*   **Get Admin User's Products**: `GET /products/my-products`
*   **Search Products**: `GET /products/search`
*   **Place an Order**: `POST /orders`
*   **Update Order**: `PUT /orders/:id`
*   **Update Order Status**: `PATCH /orders/:id/status`
*   **Cancel Order**: `PATCH /orders/:id/cancel`
*   **Get All Orders**: `GET /orders`
*   **Get User's Orders**: `GET /orders/my-orders`

Refer to the [Postman documentation](https://documenter.getpostman.com/view/27057118/2sAY4xAMZi) for detailed request and response examples.

Authentication
--------------

The API uses JWT for authentication. Upon registration or login, a token is generated and must be included in the `Authorization` header for protected routes.

 `Authorization: Bearer <token>`

Database Schema
---------------

### User Schema

*   `username`: String
*   `email`: String
*   `password`: String (hashed)
*   `role`: String (admin/user)

### Product Schema

*   `name`: String
*   `description`: String
*   `price`: Number
*   `stock`: Number
*   `imageUrl`: String

### Order Schema

*   `user`: ObjectId (references User)
*   `items`: Array of objects (productId, quantity)
*   `totalPrice`: Number
*   `status`: String (pending, placed, shipped, canceled)

Testing
-------

### Running Tests

To run the tests, use the following command:

 `npm test`

### Writing Tests

The project uses **Jest** as the testing framework. Follow the existing test patterns in the `__tests__` directory for writing new tests.

**Jest Configuration ( `jest.config.js` ):**

javascript

`/** @type {import('ts-jest'). JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest', 
  testEnvironment: 'node', 
  testMatch: ['**/__tests__/**/*.test.ts'], 
  transform: {

    "^.+.tsx?$": ["ts-jest", {}],

  }, 
}; `

TypeScript Configuration
------------------------

The project is built using **TypeScript**. Below is the `tsconfig.json` file used to configure the TypeScript compiler:

`{
  "compilerOptions": {

    "target": "ES6",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": [
      "node",
      "jest",
      "express"
    ],
    "typeRoots": [
      "./node_modules/@types",
      "./src/@types"
    ]

  }, 
  "include": [

    "src/**/*"

  ], 
  "exclude": [

    "node_modules",
    "**/*.spec.ts"

  ], 
  "files": ["src/types/express.d.ts"]
}`

Deployment
----------

Deployment instructions will depend on the chosen platform (e.g., Heroku, AWS). Ensure that environment variables are correctly set in the production environment.

Contributing
------------

Contributions are welcome! Please open an issue or submit a pull request with your suggestions or improvements.

License
-------

This project is not licensed.

Contact
-------

For any inquiries, please contact:

*   **Name**: Nayan Thapa Magar
*   **Email**: thapamagarnayan393@gmail.com
