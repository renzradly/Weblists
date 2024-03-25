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
const port = 4000;

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
    const image = result.rows[1].image_uploaded;
    const id = result.rows[1].users_id;
    const category = result.rows[1].category_type;
    const category_description = result.rows[1].category_description;
    console.log(image);
    console.log(id);
    res.render("categories/housing.ejs", {
      uploadedImage: `images/${id}/${image}`,
      category: category,
      description: category_description,
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

app.get("/contact", (req, res) => {
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
  //allowed extension
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

app.post("/uploads", upload, async function (req, res) {
  // req.file is the name of your file in the form above, here 'uploaded_file'
  // req.body will hold the text fields, if there were any
  console.log(req.file, req.body);
  const category = req.body.categories;
  const category_type = req.body.listName;
  const category_description = req.body.description;

  const result = await db.query(
    "INSERT INTO user_uploads (category, category_type, category_description, users_id, image_uploaded) VALUES ($1, $2, $3, $4, $5)",
    [
      category,
      category_type,
      category_description,
      req.user.id,
      req.file.filename,
    ]
  );
});

//upload images
// app.post("/uploads", async (req, res) => {
//   const createFolder = path.join("public/images/", `${req.user.id}`);

//   if (!fs.existsSync(createFolder)) {
//     fs.mkdirSync(createFolder);
//     upload(req, res, (err) => {
//       console.log(upload.filename);
//       if (err) {
//         res.render("./user/uploads.ejs", {
//           error: err,
//           user: req.user.email,
//         });
//       } else {
//         res.render("./user/uploads.ejs", {
//           success: "File uploaded.",
//           user: req.user.email,
//         });
//       }
//     });
//   } else {
//     upload(req, res, (err) => {
//       if (err) {
//         res.render("./user/uploads.ejs", {
//           error: err,
//           user: req.user.email,
//         });
//       } else {
//         res.render("./user/uploads.ejs", {
//           success: "File uploaded.",
//           user: req.user.email,
//         });
//       }
//     });
//   }
// });

app.get("/messages", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/messages.ejs", {
      user: req.user.email,
    });
  } else {
    res.redirect("/login");
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
