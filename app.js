require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const List = require("./models/listing.js")
const Review = require("./models/reviews.js")
const path = require("path")
const methodOver = require("method-override")
const ejsmate = require("ejs-mate")
const wrapAsync = require("./utilies/wrapAsync.js")
const ExpressError = require("./utilies/ExpressError.js")
const listingRouter = require("./routes/listings.js")
const reviewsRoute = require("./routes/router.js")
const userRouter = require("./routes/user.js");
const session = require("express-session")
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js")

const url = process.env.DB_URL;
app.get("/", (req, res) => {
  res.send("listingRouter");
})

async function main() {
  try {
    await mongoose.connect(url);
    console.log("MongoDB connection successful!");

    app.listen(8080, () => {
      console.log("Server is listening to port 8080");
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOver("_method"));
app.engine("ejs", ejsmate)
app.use(express.static(path.join(__dirname, "/public")))

const store = MongoStore.create({
  mongoUrl: url,
  crypto: {
    secret: process.env.SESSION_SECRET,
  },
  touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
  console.log("Session store error", e)
});

const sessionOptions = {
  store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  Cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
}

app.use(session(sessionOptions))
app.use(flash())
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({ usernameField: 'email' }, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
})

app.use("/", userRouter)
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewsRoute);




// ****** middleware ********//
app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});




app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something Went Wrong!" } = err;
  res.render("error.ejs", { err })
})

main();