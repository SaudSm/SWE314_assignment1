
const express = require("express");
const path = require("path");
const app = express();
const port = 3000;
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
const database = require("./database/database.js"); 


app.use('/', express.static(path.join(__dirname, 'public', 'login')));
app.use('/signup', express.static(path.join(__dirname, 'public', 'signup')));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = {
    username: username,
    password: password
  };

  database.authenticate(user)
    .then((result) => {
      if (result.success) {
        // Login successful, return the user data (without sensitive information)
        res.json({ success: true, user: result.data });
      } else {
        // Login failed, redirect with error query parameter
        res.redirect('/?error=true');
      }
    })
    .catch((err) => {
      console.error("Login error:", err);
      res.status(500).send({ success: false, message: 'Internal server error' });
    });
});

app.post('/submitSignup', (req, res) => {
  const { username, password } = req.body;
  const user = {
    username : username,
    password : password
  }
  database.signup(user)
  .then((result) => {
    if(result){
      res.json("user created! please login");
    }
    else{
      res.redirect('/signup?error=true');
    }
  }
  )
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});