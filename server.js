require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const expressLayout = require("express-ejs-layouts");
const PORT = process.env.PORT || 3000;
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("express-flash");
const MongoStore = require("connect-mongo");
const dbURI = process.env.MONGODB_URI;
const passport = require("passport");
const passportInit = require("./app/config/passport");
const cors = require("cors");
const routesInit = require("./routes/index.js");
const Emitter = require("events");

// mongodb+srv://skshakya:bOeNh2adPDOmfRkh@cluster0.lhtgd.mongodb.net/pizza?retryWrites=true&w=majority
// Database connection

mongoose
    .connect("mongodb+srv://skshakya:bOeNh2adPDOmfRkh@cluster0.lhtgd.mongodb.net/pizza?retryWrites=true&w=majority", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // useCreateIndex: true,
    })
    .catch((err) => console.log(err));
// Event emitter
const eventEmitter = new Emitter();
app.set("eventEmitter", eventEmitter);

// Session config
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: new MongoStore({
            mongoUrl: "mongodb+srv://skshakya:bOeNh2adPDOmfRkh@cluster0.lhtgd.mongodb.net/pizza?retryWrites=true&w=majority",
        }),
        cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 24 hour
    })
);

app.use(cors());
app.use(flash());

// Assets
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Passport config
passportInit(passport);
app.use(passport.initialize());
app.use(passport.session());

// Global middleware
app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.user = req.user;
    next();
});

// Set Template engine
app.use(expressLayout);
app.set("views", path.join(__dirname, "/src/views"));
app.set("view engine", "ejs");

routesInit(app);

const server = app.listen(PORT, () => {
    console.log(`Listening on port http://localhost:${PORT}`);
});

// Socket
const io = require("socket.io")(server);
io.on("connection", (socket) => {
    // Join socket
    socket.on("join", (orderId) => {
        socket.join(orderId);
    });
});

eventEmitter.on("orderUpdated", (data) => {
    io.to(`order_${data.id}`).emit("orderUpdated", data);
});

eventEmitter.on("orderPlaced", (data) => {
    io.to("adminRoom").emit("orderPlaced", data);
});