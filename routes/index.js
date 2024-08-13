const express = require('express');
const router = express.Router();

router.get('/',(req,res)=>{
    res.render('index.ejs');
})

router.get('/chat',(req,res)=>{
    res.render('chat.ejs');
})


module.exports = router;