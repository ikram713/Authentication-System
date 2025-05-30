require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
require("./Config/PassportConfig");


const app = express();
const PORT = process.env.PORT || 3000;

// Setup Swagger docs route
const setupSwagger = require('./Doc');
setupSwagger(app);


// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware
const storeSession = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
});
app.use(
    session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storeSession,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
    })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// CORS
app.use(
    cors({
    origin: "http://localhost:3000", // Update as needed
    credentials: true,
    })
);

// Route
app.use("/auth", require('./Routes/AuthRoutes'));

// Database connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
    console.log("Connection to database successful");
    app.listen(PORT, () => {
        console.log(`App running successfully on port ${PORT}`);
    });
    })
    .catch((err) => console.error("Database connection failed:", err));



    