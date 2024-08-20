const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("index.ejs");
});

router.post("/chat", (req, res) => {
  let name = req.body.name;
  if (!name) {
    return res.redirect("/");
  }
  res.cookie("name", name, { maxAge: 900000, httpOnly: true });
  res.redirect("/chat");
});

router.get("/chat", (req, res) => {
  const name = req.cookies.name;
  if (!name) {
    return res.redirect("/");
  }
  res.render("chat.ejs", { name });
});

module.exports = router;
