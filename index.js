import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

const app = express();
const port = 3000;
const saltingRounds  = 10;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//session should be first before passport
app.use(session({
    secret: "FORSESSION",
    resave: false,
    saveUninitialized: true
  }));

//passport need to be the next on
app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "postgres",
    password: "postgres",
    port: 5432,
  });
  db.connect();

app.get("/", (req, res) => {
    res.render("navigation/home.ejs");
});

app.get("/about", (req, res) => {
    res.render("navigation/about.ejs");
});

app.get("/contact", (req, res) => {
    res.render("navigation/contact.ejs");
});

app.get("/login", (req, res) => {
    res.render("./user/login.ejs");
});

app.get("/register", (req, res) => {
    res.render("./user/register.ejs");
});

app.post("/register", async (req, res) => {
    const userEmail = req.body.username;
    const userPassword = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    
    try {
    const emailExist = await db.query("SELECT * FROM users WHERE email = $1", [userEmail]);

    if (userEmail === "" && userPassword === "") {
        res.render("./user/register.ejs",{
        error: "Please enter your email address, password and confirm your password."
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

app.get("/messages", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("./user/messages.ejs", {
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
                          return cb(null, false);
                      } 
                  }
              });
          } else {
              return cb("Email not found.")
          }
    } catch (err) {
      console.log(err)
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