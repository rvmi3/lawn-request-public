const express = require("express");
const app = express();
const path = require("path");
const db = require("./data/database");
const mainRoutes = require("./routes/mainRoutes");
const session = require("express-session");
const cors = require("cors");
const mongoDBstore = require("connect-mongodb-session")(session);

const store = new mongoDBstore({
  uri: "mongodb://127.0.0.1:27017",
  databaseName: "lawn",
  collection: "sessions",
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/images", express.static("images"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 2 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

app.use(async function (req, res, next) {
  const isAuth = req.session.isAuth;

  if (!isAuth) {
    return next();
  }
  res.locals.userId = req.session.user.userId;
  res.locals.user = req.session.user.email;

  const user = await db.getDb().collection("users").findOne({ _id: res.locals.userId });
  res.locals.isAuth = isAuth;
  res.locals.isLs = user.isLandscaper;
  res.locals.cr = user.cr;

  res.locals.name = user.name.first + " " + user.name.last;
  if (!user.address) {
    return next();
  }

  res.locals.zip = user.address.zip;
  res.locals.city = user.address.city;

  next();
});

app.use(mainRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  res.status(500).json({ message: "Internal Server Error" });
});

app.use(function (req, res) {
  res.render("404", { message: "Page does not exist" });
});

db.connectToDatabase().then(function () {
  app.listen(3000);
});
