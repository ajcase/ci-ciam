var express = require('express');
var request = require('request');
var _ = require('lodash');
var bbfn = require('../functions.js');
var router = express.Router();
var passport = require('passport');
var OpenIDStrategy = require('passport-openidconnect').Strategy;

var apiAccessToken;

// GET setup page
router.get('/', function(req, res, next) {
  if (process.env.ALLOW_DYNAMIC_SETUP == "false") {
    res.render('error', {
      message: "Dynamic Setup is disabled"
    });
  } else {
    var loggedIn = ((req.session.loggedIn) ? true : false);
    res.render('setup', {
      baseUri: process.env.OIDC_CI_BASE_URI,
      APIclientId: process.env.API_CLIENT_ID,
      OIDCclientId: process.env.OIDC_CLIENT_ID,
      OIDCredirectUri: process.env.OIDC_REDIRECT_URI,
      MFAgroup: process.env.MFAGROUP
    });
  }
});

// Post from setup page
router.post('/', function(req, res, next) {
  if (process.env.ALLOW_DYNAMIC_SETUP == "false") {
    res.render('error', {
      message: "Dynamic Setup is disabled"
    });
  } else {
    var data = req.body;
    console.log(data);
    if (data.baseUri) process.env.OIDC_CI_BASE_URI = data.baseUri;
    if (data.APIclientId) process.env.API_CLIENT_ID = data.APIclientId;
    if (data.APIclientSecret) process.env.API_SECRET = data.APIclientSecret;
    if (data.OIDCclientId) process.env.OIDC_CLIENT_ID = data.OIDCclientId;
    if (data.OIDCclientSecret) process.env.OIDC_CLIENT_SECRET = data.OIDCclientSecret;
    if (data.OIDCredirectUri) process.env.OIDC_REDIRECT_URI = data.OIDCredirectUri;
    if (data.MFAgroup) process.env.MFAGROUP = data.MFAgroup;

    passport.use(new OpenIDStrategy({
        issuer: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default',
        clientID: process.env.OIDC_CLIENT_ID,
        clientSecret: process.env.OIDC_CLIENT_SECRET,
        authorizationURL: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/authorize', // this won't change
        userInfoURL: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/userinfo', // this won't change
        tokenURL: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/token', // this won't change
        callbackURL: process.env.OIDC_REDIRECT_URI,
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

    bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err, body) {
      if (err) {
        console.log(err);
      } else {
        apiAccessToken = body.access_token;

        if (data.createObjects) {
          attributes = [{
              "name": "birthday",
              "type": "string"
            },
            {
              "name": "consentPaperless",
              "type": "string"
            },
            {
              "name": "consentNotifications",
              "type": "string"
            },
            {
              "name": "consentPromotions",
              "type": "string"
            },
            {
              "name": "quoteCount",
              "type": "string"
            },
            {
              "name": "carModel",
              "type": "string"
            },
            {
              "name": "carMake",
              "type": "string"
            },
            {
              "name": "carYear",
              "type": "string"
            },
            {
              "name": "ageHome",
              "type": "string"
            },
            {
              "name": "homeType",
              "type": "string"
            }
          ]
          bbfn.createAttributes(attributes, apiAccessToken, function(_err, results) {
            console.log("Attribute create results: " + JSON.stringify(results));

          });

          bbfn.createGroup(process.env.MFAGROUP, apiAccessToken, function(err, result) {
            if (result) {
              console.log(`Group ${result} created`);
              process.env.MFAGROUPID = result;
              bbfn.setupMfaPolicy(`Require 2FA for ${process.env.MFAGROUP}`, process.env.MFAGROUP, apiAccessToken, (err, result) => {
                console.log("Done.");
              });
            } else {
              console.log(`Group create failed: ${err}`)
              bbfn.getGroupID(process.env.MFAGROUP, apiAccessToken, (_err, result) => {
                if (result && result['urn:ietf:params:scim:schemas:extension:ibm:2.0:Group'].groupType == "standard") {
                  process.env.MFAGROUPID = result.id;
                  console.log(`MFA Group ID is ${process.env.MFAGROUPID}`);
                  bbfn.setupMfaPolicy(`Require 2FA for ${process.env.MFAGROUP}`, process.env.MFAGROUP, apiAccessToken, (err, result) => {
                    console.log("Done.");
                  });
                } else {
                  console.log(`Group ${process.env.MFAGROUP} is invalid`);
                }
              });

            }
          });
        } else {
          bbfn.getGroupID(process.env.MFAGROUP, apiAccessToken, (_err, result) => {
            if (result && result['urn:ietf:params:scim:schemas:extension:ibm:2.0:Group'].groupType == "standard") {
              process.env.MFAGROUPID = result.id;
              console.log(`MFA Group ID is ${process.env.MFAGROUPID}`);
            } else {
              console.log(`Group ${process.env.MFAGROUP} is invalid`);
            }
          });
        }
      }
    });

    res.redirect('/setup');
  }
});

module.exports = router;
