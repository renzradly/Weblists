import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import env from "dotenv";
import fileUpload from "express-fileupload";
import fs from 'fs';

const app = express();
const port = 8000;
const saltingRounds  = 10;  

env.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(fileUpload());

//session should be first before passport
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

//passport need to be the next on
app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
db.connect();

app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
        user: req.user.email,
    });
  } else {
    res.render("navigation/home.ejs");
  }
});

app.get("/housing", async(req, res) => {
  const categ = "housing";
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
        user: req.user.email,
    });
  } else {
    const result = await db.query("SELECT * FROM user_uploads WHERE category = $1", [categ]);
    var ako = result.rows[4];

    const displayImg = "data:imag/png;base64," + ako.image_uploaded.toString("base64");
    console.log(displayImg)
    res.render("categories/housing.ejs", {
        image: displayImg
    });
  }
});

app.get("/jobs", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
        user: req.user.email,
    });
  } else {
    res.render("categories/jobs.ejs")
  }
});

app.get("/services", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
        user: req.user.email,
    });
  } else {
    res.render("categories/services.ejs")
  }
});

app.get("/forSale", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
        user: req.user.email,
    });
  } else {
    res.render("categories/forSale.ejs")
  }
});

app.get("/other", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
        user: req.user.email,
    });
  } else {
    res.render("categories/other.ejs")
  }
});

app.get("/about", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
        user: req.user.email,
    });
  } else {
    res.render("navigation/about.ejs")
  }
});

app.get("/contact", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
        user: req.user.email,
    });
  } else {
    res.render("navigation/contact.ejs")
  }
});

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
        user: req.user.email,
    });
  } else {
    res.render("./user/login.ejs")
  }
});

app.get("/register", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("./user/profile.ejs", {
        user: req.user.email,
    });
  } else {
    res.render("./user/register.ejs")
  }
});

app.post("/register", async (req, res) => {
    const userEmail = req.body.username;
    const userPassword = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    
    try {
    const emailExist = await db.query("SELECT * FROM users WHERE email = $1", [userEmail]);

    if (userEmail === "" && userPassword === "") {
        res.render("./user/register.ejs",{
        error: "All boxes should not be empty."
        });
    } else {
            if(emailExist.rows.length > 0) {
                res.render("./user/register.ejs",{
                error: "Email already registered! Login or use another email."
            });
            } else {
                //hash password before saving to database
                bcrypt.hash(userPassword, saltingRounds, async (err, hashedPassword) => {
                    if (err) {
                    console.log("Error in hashing", err);
                    } else {
                    if (userPassword === confirmPassword) {
                        const result = await db.query("INSERT INTO users (email, password) VALUES ($1, $2)",[userEmail, hashedPassword]);
                        res.render("./user/login.ejs", {
                        success: "You're now registered. Please login using your email and password."
                        });
                    } else {
                        res.render("./user/register.ejs",{
                        error: "Your password doesn't matched. Please try again."
                        });
                    }
                    }
                });
            }
    }
    } catch (err) {
        console.log(err);
    }
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
  }));

app.get('/logout', (req, res, next) => {
    req.logout( (err) => {
      if (err) { return next(err); }
      res.redirect('/');
    });
});

app.get("/profile", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("./user/profile.ejs", {
            user: req.user.email,
        });
      } else {
        res.redirect("/login")
      }
});

app.get("/uploads", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("./user/uploads.ejs", {
            user: req.user.email,
        });
      } else {
        res.redirect("/login")
      }
});

app.post("/uploads", async (req, res) => {
  const uploadCategory = req.body;
  const {name, data} = req.files.imageUpload;
  console.log(req.user.id);
  console.log(req.user.email);
  console.log(name);

  if (uploadCategory.listName === "" && uploadCategory.description === "") {
      res.render("./user/uploads.ejs", {
      user: req.user.email,
      error: "Type and Description are required to upload." 
    });
  } else {
      const result = await db.query("INSERT INTO user_uploads (category, category_type, category_description, image_name, image_uploaded, users_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [uploadCategory.categories, uploadCategory.listName, uploadCategory.description, name, data, req.user.id]);
      res.render("./user/uploads.ejs", {
      user: req.user.email,
      success: "It is saved to the database. Upload again."
    });
  }
});

app.get("/messages", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("./user/messages.ejs", {
            user: req.user.email,
        });
      } else {
        res.redirect("/login")
      }
});

app.get("/changePassword", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("./user/changePassword.ejs", {
            user: req.user.email,
        });
      } else {
        res.redirect("/login")
      }
});

//userEmail and userPassword should be matched in HTML input name
passport.use(new Strategy(async function verify(username, password, cb){
    try {
      const emailExist = await db.query("SELECT * FROM users WHERE email = $1", [username]); 
            if (emailExist.rows.length > 0) {
              const user = emailExist.rows[0];//setting up current user
              const storedHashedPassword = user.password;
              //compare the hashed password from users input
              bcrypt.compare(password, storedHashedPassword, (err, matchedPassword) => {
                  if (err) {
                    return cb(err);
                  } else {
                      if (matchedPassword) {
                        return cb(null, user);
                      } else {
                          return cb("Sorry wrong password! Go back and enter your correct password.");
                      }
                  }
              });
          } else {
              return cb("Email not found. Please go back and register first.");
          }
    } catch (err) {
      return cb(err);
    }
}));

  passport.serializeUser((user, cb) => {
    cb(null, user);
  });
  
  passport.deserializeUser((user, cb) => {
    cb(null, user);
  });

app.listen(port, () => {
    console.log(`Server is listening on port ${port}.`);
});