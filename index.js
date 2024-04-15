import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import env from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";

const app = express();
const port = 3000;
app.set("view engine", "ejs");

//number of times for salting password
const saltingRounds = 10;

//env configuration
env.config();

//for body parse get data from HTML inputs
app.use(bodyParser.urlencoded({ extended: true }));

//to points the app where the static files in the projects
app.use(express.static("public"));

//session should be first before passport
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

//passport need to be the next on
app.use(passport.initialize());
app.use(passport.session());

//database configuration
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

//create multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images/" + req.user.id);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      req.body.listName + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

//initialize upload, set limits and check file types
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 },
  fileFilter: function (req, file, cb) {
    checkFileTypes(file, cb);
  },
}).single("imageUpload");

//home page route
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
      user: req.user.email,
    });
  } else {
    res.render("navigation/home.ejs");
  }
});

//housing route
app.get("/housing", upload, async (req, res) => {
  const categ = "housing";
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
      user: req.user.email,
    });
  } else {
    const result = await db.query(
      "SELECT * FROM user_uploads WHERE category = $1",
      [categ]
    );
    const checkRows = result.rows;
    res.render("categories/housing.ejs", {
      housingList: checkRows,
    });
  }
});

app.get("/jobs", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
      user: req.user.email,
    });
  } else {
    res.render("categories/jobs.ejs");
  }
});

app.get("/services", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
      user: req.user.email,
    });
  } else {
    res.render("categories/services.ejs");
  }
});

app.get("/forSale", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
      user: req.user.email,
    });
  } else {
    res.render("categories/forSale.ejs");
  }
});

app.get("/other", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
      user: req.user.email,
    });
  } else {
    res.render("categories/other.ejs");
  }
});

app.get("/about", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
      user: req.user.email,
    });
  } else {
    res.render("navigation/about.ejs");
  }
});

app.get("/contact", async (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
      user: req.user.email,
    });
  } else {
    res.render("navigation/contact.ejs");
  }
});

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
      user: req.user.email,
    });
  } else {
    res.render("./user/login.ejs");
  }
});

app.get("/register", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
      user: req.user.email,
    });
  } else {
    res.render("./user/register.ejs");
  }
});

//register a user
app.post("/register", async (req, res) => {
  const userEmail = req.body.username;
  const userPassword = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  try {
    const emailExist = await db.query("SELECT * FROM users WHERE email = $1", [
      userEmail,
    ]);

    if (userEmail === "" && userPassword === "") {
      res.render("./user/register.ejs", {
        error: "All boxes should not be empty.",
      });
    } else {
      if (emailExist.rows.length > 0) {
        res.render("./user/register.ejs", {
          error: "Email already registered! Login or use another email.",
        });
      } else {
        //hash password before saving to database
        bcrypt.hash(
          userPassword,
          saltingRounds,
          async (err, hashedPassword) => {
            if (err) {
              console.log("Error in hashing", err);
            } else {
              if (userPassword === confirmPassword) {
                const result = await db.query(
                  "INSERT INTO users (email, password) VALUES ($1, $2)",
                  [userEmail, hashedPassword]
                );
                res.render("./user/login.ejs", {
                  success:
                    "You're now registered. Please login using your email and password.",
                });
              } else {
                res.render("./user/register.ejs", {
                  error: "Your password doesn't matched. Please try again.",
                });
              }
            }
          }
        );
      }
    }
  } catch (err) {
    console.log(err);
  }
});

//passport login route
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
  })
);

//logout route
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
      user: req.user.email,
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/uploads", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/uploads.ejs", {
      user: req.user.email,
    });
  } else {
    res.redirect("/login");
  }
});

//function to check the file types of the file trying to upload
function checkFileTypes(file, cb) {
  //allowed extension - below is a regular expression
  const fileTypes = /jpeg|jpg|png|gif/;
  //check the extension base on user file
  const fileExtenstions = fileTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  //check the mimetype or the file type user selected to upload
  const checkMimeType = fileTypes.test(file.mimetype);

  if (checkMimeType && fileExtenstions) {
    return cb(null, true);
  } else {
    cb(
      "You are uploading " + `${file.mimetype}` + " file. Only image allowed."
    );
  }
}

//function to get the current date based on timezone
function getDate(newDate) {
  var currentDate = newDate.getDate();
  var currentMonth = newDate.getMonth();
  var currentYear = newDate.getFullYear();
  var currentHours = newDate.getHours()+8;
  var currentMinutes = newDate.getMinutes();
  var currentSeconds = newDate.getSeconds();
  var convertedDate = new Date(Date.UTC(currentYear,currentMonth,currentDate, currentHours, currentMinutes, currentSeconds));
  var finalDateTime = convertedDate.toLocaleString('fil-PH', { timeZone: 'UTC' });
  return finalDateTime;
}

//creating folder to separate user, uploading files to server and database
app.post("/uploads", function (req, res) {
  const createFolder = path.join("public/images/", `${req.user.id}`);
  if (!fs.existsSync(createFolder)) {
    fs.mkdirSync(createFolder);
    upload(req, res, async (err) => {
      if (err) {
        res.render("./user/uploads.ejs", {
          error: err, 
          user: req.user.email,
        });
      } else {
        const finalDateTime = getDate(new Date());
        const category = req.body.categories;
        const category_type = req.body.listName;
        const category_description = req.body.description;
        const result = await db.query(
          "INSERT INTO user_uploads (category, category_type, category_description, users_id, image_uploaded, date_added) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            category,
            category_type,
            category_description,
            req.user.id,
            req.file.filename,
            finalDateTime
          ]
        );
        res.render("./user/uploads.ejs", {
          success: "File uploaded.",
          user: req.user.email,
        });
      }
    });
  } else {
    upload(req, res, async (err) => {
      if (err) {
        res.render("./user/uploads.ejs", {
          error: err,
          user: req.user.email,
        });
      } else {
        const finalDateTime = getDate(new Date());
        const category = req.body.categories;
        const category_type = req.body.listName;
        const category_description = req.body.description;
        const result = await db.query(
          "INSERT INTO user_uploads (category, category_type, category_description, users_id, image_uploaded, date_added) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            category,
            category_type,
            category_description,
            req.user.id,
            req.file.filename,
            finalDateTime
          ]
        );
        res.render("./user/uploads.ejs", {
          success: "File uploaded.",
          user: req.user.email,
        });
      }
    });
  }
});

app.get("/messages", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/messages.ejs", {
      user: req.user.email,
    });
  } else {
    res.redirect("/login");
  }
});

//outputing uploaded from user
app.get("/contents", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.redirect("/login");
  } else {
    const idOfCurrentUser = req.user.id;
    const result = await db.query(
      "SELECT * FROM user_uploads WHERE users_id = $1 ORDER BY id DESC",
      [idOfCurrentUser]
    );
    const checkRows = result.rows;
    res.render("./user/contents.ejs", {
      allList: checkRows,
      user: req.user.email,
    });
  }
});

//delete an items
app.post("/contents", async (req, res) => {
  const idOfContentsToDelete = req.body.contentsID;
  const myImage = req.body.imageName;

  try {
    fs.unlink(`public/images/${req.user.id}/${myImage}`, async (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log("image deleted.");
        const result = await db.query(
          "DELETE FROM user_uploads WHERE id = $1",
          [idOfContentsToDelete]
        );
        const idOfCurrentUser = req.user.id;
        const checkRows = await db.query(
          "SELECT * FROM user_uploads WHERE users_id = $1 ORDER BY id DESC",
          [idOfCurrentUser]
        );
        const updatedRows = checkRows.rows;
        res.render("./user/contents.ejs", {
          allList: updatedRows,
          user: req.user.email,
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

//get the post to update category
app.post("/updateCateg/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.redirect("/login");
  } else {
    const finalDateTime = getDate(new Date());
    const idOfContentsToUpdate = req.params.id;
    const category = req.body.categories;;
      const updateRow = await db.query(
        "UPDATE user_uploads SET category = $1, date_updated = $2 WHERE id = $3",
        [
          category, finalDateTime, idOfContentsToUpdate
        ]
      );
      res.redirect("/contents");
  }
});

//get the post to update categ_type
app.post("/updateCategType/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.redirect("/login");
  } else {
    const finalDateTime = getDate(new Date());
    const idOfContentsToUpdate = req.params.id;
    const category_type = req.body.editType;
    if (category_type.length > 50) {
      res.send("50 charaters only allowed.")
    } else {
      const updateRow = await db.query(
        "UPDATE user_uploads SET category_type = $1, date_updated = $2 WHERE id = $3",
        [
          category_type, finalDateTime, idOfContentsToUpdate
        ]
      );
      res.redirect("/contents");
    }
    
  }
});

//get the post to update categ_description
app.post("/updateCategDescription/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.redirect("/login");
  } else {
    const finalDateTime = getDate(new Date());
    const idOfContentsToUpdate = req.params.id;
    const category_description = req.body.editDescription;
    if (category_description.length > 500) {
      res.send("500 charaters only allowed.")
    } else {
      const updateRow = await db.query(
        "UPDATE user_uploads SET category_description = $1, date_updated = $2 WHERE id = $3",
        [
          category_description, finalDateTime, idOfContentsToUpdate
        ]
      );
      res.redirect("/contents");
    }
  }
});

app.get("/changePassword", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/changePassword.ejs", {
      user: req.user.email,
    });
  } else {
    res.redirect("/login");
  }
});

//userEmail and userPassword should be matched in HTML input name
passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const emailExist = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [username]
      );
      if (emailExist.rows.length > 0) {
        const user = emailExist.rows[0]; //setting up current user
        const storedHashedPassword = user.password;
        //compare the hashed password from users input
        bcrypt.compare(
          password,
          storedHashedPassword,
          (err, matchedPassword) => {
            if (err) {
              return cb(err);
            } else {
              if (matchedPassword) {
                return cb(null, user);
              } else {
                return cb(
                  "Sorry wrong password! Go back and enter your correct password."
                );
              }
            }
          }
        );
      } else {
        return cb("Email not found. Please go back and register first.");
      }
    } catch (err) {
      return cb(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}.`);
});
