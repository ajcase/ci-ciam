var express = require('express');
var bbfn = require('../functions');
var router = express.Router();

function match(a,b){
  if(a === b){
    return a;
  }
  else{
    return false;
  }
}

// Start account claim
router.get('/', function(req, res, next) {
  // get account ID
  if(req.session.loggedIn){
      res.redirect('/profile');
    }
    else {
      res.render('insurance/claim/enter-creds', {
         action: '/account-claim',
         loggedIn: false
      });
    }
});
router.post('/', function(req, res, next) {
    // get account ID
    console.log("Finding account for:", req.body)
    req.session.accountId = req.body.accountId; // form input name is accountId
    console.log("Finding account for:", req.session.accountId);
    //lookupAccount
    bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err,  body){
      if (err) {
        console.log(err);
      } else {
          var accessToken = body.access_token;
          bbfn.findAccount(req.session.accountId, accessToken, function(err,  body){
            console.log(body)
            if(body)
              {
                res.render('insurance/claim/show-account-setup', {
                    user: body,
                    action: '/account-claim/create'
                });
              }else{
                res.render('insurance/claim/show-account-setup', {
                    notExists: true,
                    action: '/account-claim'
              });
              }
            })
        }
    });
});

module.exports = router;
