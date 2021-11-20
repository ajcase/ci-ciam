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
router.post('/', async function(req, res, next) {
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

    bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, async function(err, body) {
      if (err) {
        console.log(err);
      } else {
        apiAccessToken = body.access_token;

        if (data.createObjects) {

          var appl = false;
          try {
            await bbfn.createApplication(
              "TrustMeInsurance",
              process.env.OIDC_REDIRECT_URI,
              apiAccessToken);
          } catch (e) {
            console.log(e);
          }
          try {
            appl = await bbfn.getApplication("TrustMeInsurance", apiAccessToken);
          } catch (e) {
            console.log(e);
          }
          console.log(appl);
          if (appl) {
            process.env.OIDC_CLIENT_ID = appl.providers.oidc.properties.clientId;
            process.env.OIDC_CLIENT_SECRET = appl.providers.oidc.properties.clientSecret;
          }

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
              "name": "brandId",
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
            },
            {
              "name": "accountId",
              "type": "string"
            }
          ]
          bbfn.createAttributes(attributes, apiAccessToken, function(_err, results) {
            console.log("Attribute create results: " + JSON.stringify(results));

          });

          var groupid;
          try {
            groupid = await bbfn.createGroup(process.env.MFAGROUP, apiAccessToken);
            console.log(`Group ${groupid} created`);
          } catch (e) {
            console.log(`Group create failed: ${e}`)
          }

          if (!groupid) {
            console.log(`Group create failed: ${err}`)
            var result;
            try {
              result = await bbfn.getGroupID(process.env.MFAGROUP, apiAccessToken)
            } catch (e) {
              console.log("Failed to get group");
            }
            if (result && result['urn:ietf:params:scim:schemas:extension:ibm:2.0:Group'].groupType == "standard") {
              groupid = result.id;
            }
          }

          var policyid;
          if (groupid) {
            process.env.MFAGROUPID = groupid;
            console.log(`MFA Group ID is ${process.env.MFAGROUPID}`);

            policyid = await bbfn.setupMfaPolicy(`Require 2FA for ${process.env.MFAGROUP}`, process.env.MFAGROUP, apiAccessToken);
            console.log("Done. Created policy " + policyid);
          } else {
            console.log(`Group ${process.env.MFAGROUP} is invalid`);
          }

          if (policyid && appl) {
            await bbfn.applyPolicy(policyid,appl,apiAccessToken);
            console.log("Policy applied to application");
          } else {
            console.log("Can't apply policy - either app or policy not found");
          }

        } else {
          var result;
          try {
            result = await bbfn.getGroupID(process.env.MFAGROUP, apiAccessToken);
          } catch (e) {
            console.log("Group lookup failed.");
          }

          if (result && result['urn:ietf:params:scim:schemas:extension:ibm:2.0:Group'].groupType == "standard") {
            process.env.MFAGROUPID = result.id;
            console.log(`MFA Group ID is ${process.env.MFAGROUPID}`);
          } else {
            console.log(`Group ${process.env.MFAGROUP} is invalid`);
          }
        }
      }

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

      res.redirect('/setup');

    });
  }
});

module.exports = router;
