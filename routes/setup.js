var express = require('express');
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
              process.env.APP_NAME,
              process.env.OIDC_REDIRECT_URI,
              apiAccessToken);
          } catch (e) {
            console.log(e);
          }
          try {
            appl = await bbfn.getApplication(process.env.APP_NAME, apiAccessToken);
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

          var termsExists = await bbfn.purposeExists(process.env.TERMS_PURPOSE_ID, apiAccessToken);
          if (!termsExists) {
            await bbfn.createEula(
              process.env.TERMS_PURPOSE_ID,
              "EULA for TrustMe sites",
              process.env.EULA_URL,
              apiAccessToken);
          }

          try {
            await bbfn.createAccessType(process.env.READ_ACCESS_TYPE,apiAccessToken);
          } catch (e) {
            console.log(e);
          }

          var marketingExists = await bbfn.purposeExists(process.env.MARKETING_PURPOSE_ID, apiAccessToken);
          if (!marketingExists) {
            await bbfn.createPurpose(
              process.env.MARKETING_PURPOSE_ID,
              "3",
              "A preference that indicates that the customer agrees with receiving information on promotions, new products, and personalized advice weekly.",
              process.env.READ_ACCESS_TYPE,
              process.env.DEFAULT_ACCESS_TYPE,
              apiAccessToken);
          }

          var paperlessExists = await bbfn.purposeExists(process.env.PAPERLESS_PURPOSE_ID, apiAccessToken);
          if (!paperlessExists) {
            await bbfn.createPurpose(
              process.env.PAPERLESS_PURPOSE_ID,
              "3",
              "A preference that indicates that the customer agrees to paperless billing.",
              process.env.READ_ACCESS_TYPE,
              process.env.DEFAULT_ACCESS_TYPE,
              apiAccessToken);
          }

          try {
            await bbfn.createDpcmRule(
              "Paperless Billing",
              [{"purposeId": "paperless-billing"}],
              "ASSENT_EXPLICIT",
              true,
              "Require consent for paperless billing.  Opt-out.",
              apiAccessToken
            )
          } catch (e) {
            console.log(e);
          }

          try {
            await bbfn.createDpcmRule(
              "Communication-Europe",
              [{
                "purposeId": "communications",
                "geography": {
                  "continentCode": "EU",
                  "countryCode": "",
                  "subdivisionOneCode": "",
                  "subdivisionTwoCode": ""
                }
              }],
              "ASSENT_EXPLICIT",
              false,
              "Require opt-in consent for communications in Europe.",
              apiAccessToken
            )
          } catch (e) {
            console.log(e);
          }

          var communicationsRuleId = await bbfn.getDpcmRuleId("Communication-Europe", apiAccessToken);
          var paperlessRuleId = await bbfn.getDpcmRuleId("Paperless Billing", apiAccessToken);

          await bbfn.createDpcmPolicy([paperlessRuleId, communicationsRuleId], apiAccessToken);

          if (appl) {
            var applId = appl._links.self.href.substring(appl._links.self.href.lastIndexOf('/')+1);
            try {
              await bbfn.associatePurpose(applId, [
                  process.env.MARKETING_PURPOSE_ID,
                  process.env.PAPERLESS_PURPOSE_ID,
                  process.env.TERMS_PURPOSE_ID],
                  apiAccessToken);
            } catch (e) {
              console.log(e);
            }
          }

          var policyId;
          if (groupid) {
            process.env.MFAGROUPID = groupid;
            console.log(`MFA Group ID is ${process.env.MFAGROUPID}`);

            policyId = await bbfn.setupMfaPolicy(`Require 2FA for ${process.env.MFAGROUP}`, process.env.MFAGROUP, apiAccessToken);
            console.log("Done. Created policy " + policyId);
          } else {
            console.log(`Group ${process.env.MFAGROUP} is invalid`);
          }

          try {
            await bbfn.registerTheme(process.env.THEME_NAME, apiAccessToken);
          } catch (e) {console.log(e)};

          var themeId;
          try {
            var themeId = await bbfn.getThemeId(process.env.THEME_NAME,apiAccessToken);
            console.log(themeId);
          } catch (e) {console.log(e)};

          await bbfn.applyPolicyAndTheme(policyId,themeId,appl,apiAccessToken);
          console.log("Policy applied to application");

          if (themeId) {
            process.env.THEME_ID = themeId;
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
