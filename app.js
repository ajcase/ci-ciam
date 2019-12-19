require('dotenv').config();

var request = require('request');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

// Use Passport with OpenId Connect strategy to
// Authenticate users with IBM Cloud Identity Connect
var passport = require('passport')
var OpenIDStrategy = require('passport-openidconnect').Strategy

var index = require('./routes/index');
var profile = require('./routes/profile');
var openaccount = require('./routes/open-account');

function titleCase(string) {
      var sentence = string.toLowerCase().split(" ");
      for(var i = 0; i< sentence.length; i++){
         sentence[i] = sentence[i][0].toUpperCase() + sentence[i].slice(1);
      }
   return sentence.join(" ");
   }

// edit this URL with your base URL for IBM Cloud Identity OIDC default endpoint
var OIDC_BASE_URI = process.env.OIDC_CI_BASE_URI;
var OIDC_TOKEN_URI = OIDC_BASE_URI+'/oidc/endpoint/default';
var APP = process.env.APP;

// Configure the OpenId Connect Strategy
// with credentials obtained from env details (.env)
passport.use(new OpenIDStrategy({
  issuer: OIDC_TOKEN_URI,
  clientID: process.env.OIDC_CLIENT_ID, // from .env file
  clientSecret: process.env.OIDC_CLIENT_SECRET, // from .env file
  authorizationURL: `${OIDC_TOKEN_URI}/authorize`, // this won't change
  userInfoURL: `${OIDC_TOKEN_URI}/userinfo`, // this won't change
  tokenURL: `${OIDC_TOKEN_URI}/token`, // this won't change
  callbackURL: process.env.OIDC_REDIRECT_URI, // from .env file
  passReqToCallback: true
},
function(req, issuer, userId, profile, accessToken, refreshToken, params, cb) {

  console.log('issuer:', issuer);
  console.log('userId:', userId);
  console.log('accessToken:', accessToken);
  console.log('refreshToken:', refreshToken);
  console.log('params:', params);

  req.session.accessToken = accessToken;
  req.session.userId = userId;
  req.session.loggedIn = true;
  return cb(null, profile);
}));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Passport requires session to persist the authentication
// so were using express-session for this example
app.use(session({
  secret: 'secret sause',
  resave: false,
  saveUninitialized: true
}))

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware for checking if a user has been authenticated
// via Passport and IBM OpenId Connect
function checkAuthentication(req,res,next){
  if(req.isAuthenticated()){
      next();
  } else{
      req.session.returnTo = req.url
      res.redirect("/");
  }
}
app.locals.pageTitle = titleCase(APP);
app.locals.bodyCSS = APP;
app.use('/', index);
app.use('/app/profile', checkAuthentication, profile);
app.use('/open-account', openaccount);
// Only allow authenticated users to access the /users route
//app.use('/users', checkAuthentication, users);
// Only allow authenticated users to access the /users route

// Initiates an authentication request with IBM
// The user will be redirect to IBM and once authenticated
// they will be returned to the callback handler below
app.get('/login', passport.authenticate('openidconnect', {
  successReturnToOrRedirect: "/",
  scope: 'email profile'
}));
app.get('/login-linkedin', passport.authenticate('openidconnect', {
  successReturnToOrRedirect: "/",
  scope: 'email profile',
  login_hint: `{"realm":"www.linkedin.com"}`
}));
app.get('/login-google', passport.authenticate('openidconnect', {
  successReturnToOrRedirect: "/",
  scope: 'email profile',
  login_hint: `{"realm":"www.google.com"}`
}));
// app.get('/new-linkedin', passport.authenticate('openidconnect', {
//   successReturnToOrRedirect: "/open-account",
//   scope: 'email profile',
//   login_hint: `{"realm":"www.linkedin.com"}`
// }));
// app.get('/new-google', passport.authenticate('openidconnect', {
//   successReturnToOrRedirect: "/open-account",
//   scope: 'email profile',
//   login_hint: `{"realm":"www.google.com"}`
// }));

// Callback handler that IBM will redirect back to
// after successfully authenticating the user
app.get('/oauth/callback', passport.authenticate('openidconnect', {
  callback: true,
  successReturnToOrRedirect: '/app/profile',
  failureRedirect: '/'
}))

// Destroy both the local session and
// revoke the access_token at IBM
app.get('/logout', function(req, res){
  request.post(`${OIDC_TOKEN_URI}/revoke`, {
    'form':{
      'client_id': process.env.OIDC_CLIENT_ID,
      'client_secret': process.env.OIDC_CLIENT_SECRET,
      'token': req.session.accessToken,
      'token_type_hint': 'access_token'
    }
  },function(err, respose, body){

    console.log('Session Revoked at IBM');
    req.session.loggedIn = false;
    res.redirect('/');
  });
});

// catch error
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
