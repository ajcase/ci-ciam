var express = require('express');
var bbfn = require('../functions.js');
var router = express.Router();
var passport = require('passport');
var fs = require('fs');
var os = require('os');

var OpenIDStrategy = require('passport-openidconnect').Strategy;
const { error } = require('console');

var apiAccessToken;

function setEnvValues(updates) {

  const ENV_VARS = fs.readFileSync("./.env", "utf8").split(os.EOL);

  for (i in updates) {
    if (updates[i].key && updates[i].value) {
      var target = ENV_VARS.indexOf(ENV_VARS.find((line) => {
        return line.match(new RegExp(updates[i].key + "="));
      }));
      console.log(target);
      // replace the key/value with the new value
      if (target > 0) {
        ENV_VARS.splice(target, 1, `${updates[i].key}=${updates[i].value}`);
      } else {
        ENV_VARS.push(`${updates[i].key}=${updates[i].value}`);
      }
    }
  }

  // write everything back to the file system
  fs.writeFileSync("./.env", ENV_VARS.join(os.EOL));

}

// GET setup page
router.get('/', function(req, res, next) {
  if (process.env.ALLOW_DYNAMIC_SETUP == "false") {
    res.render('error', {
      message: "Automated setup is disabled by configuration",
      detail: "ALLOW_DYNAMIC_SETUP is set to false in .env environment file"
    });
  } else {
    res.render('setup', {
      prompt: true
    });
  }
});

// Post from setup page
router.post('/', async function(req, res, next) {
  if (process.env.ALLOW_DYNAMIC_SETUP == "false") {
    res.render('error', {
      message: "Automated setup is disabled by configuration",
      detail: "ALLOW_DYNAMIC_SETUP is set to false in .env environment file"
    });
  } else {

    bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, async function(err, body) {
      if (err) {
        console.log(err);
      } else {
        apiAccessToken = body.access_token;

        var appl = false;
        try {
          await bbfn.createApplication(
            process.env.APP_NAME,
            process.env.OIDC_REDIRECT_URI,
            apiAccessToken);
        } catch (e) {
          console.log("WARNING: Failed to create app " + process.env.APP_NAME + ". Continuing anyway.");
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
          setEnvValues([{
              key: "OIDC_CLIENT_ID",
              value: appl.providers.oidc.properties.clientId
            },
            {
              key: "OIDC_CLIENT_SECRET",
              value: appl.providers.oidc.properties.clientSecret
            },
          ]);
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
          await bbfn.createAccessType(process.env.READ_ACCESS_TYPE, apiAccessToken);
        } catch (e) {
          console.log(e);
        }

        var readAcessTypeId = await bbfn.getAccessTypeId(process.env.READ_ACCESS_TYPE, apiAccessToken);

        var marketingExists = await bbfn.purposeExists(process.env.MARKETING_PURPOSE_ID, apiAccessToken);
        if (!marketingExists) {
          await bbfn.createPurpose(
            process.env.MARKETING_PURPOSE_ID,
            "3",
            "A preference that indicates that the customer agrees with receiving information on promotions, new products, and personalized advice weekly.",
            readAcessTypeId,
            process.env.DEFAULT_ACCESS_TYPE,
            apiAccessToken);
        }

        var paperlessExists = await bbfn.purposeExists(process.env.PAPERLESS_PURPOSE_ID, apiAccessToken);
        if (!paperlessExists) {
          await bbfn.createPurpose(
            process.env.PAPERLESS_PURPOSE_ID,
            "3",
            "A preference that indicates that the customer agrees to paperless billing.",
            readAcessTypeId,
            process.env.DEFAULT_ACCESS_TYPE,
            apiAccessToken);
        }

        try {
          await bbfn.createDpcmRule(
            "Paperless Billing",
            [{
              "purposeId": "paperless-billing"
            }],
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
          var applId = appl._links.self.href.substring(appl._links.self.href.lastIndexOf('/') + 1);
          try {
            await bbfn.associatePurpose(applId, [
                process.env.MARKETING_PURPOSE_ID,
                process.env.PAPERLESS_PURPOSE_ID,
                process.env.TERMS_PURPOSE_ID
              ],
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
        } catch (e) {
          console.log(e)
        };

        var themeId;
        try {
          var themeId = await bbfn.getThemeId(process.env.THEME_NAME, apiAccessToken);
          console.log(themeId);
        } catch (e) {
          console.log(e)
        };

        var googleId;
        try {
          var googleId = await bbfn.getIdentitySourceId("www.google.com", apiAccessToken);
          console.log(googleId);
        } catch (e) {
          console.log(e)
        }

        var linkedInID;
        try {
          var linkedInID = await bbfn.getIdentitySourceId("www.linkedin.com", apiAccessToken);
          console.log(linkedInID);
        } catch (e) {
          console.log(e)
        }

        var facebookID;
        try {
          var facebookID = await bbfn.getIdentitySourceId("www.facebook.com", apiAccessToken);
          console.log(facebookID);
        } catch (e) {
          console.log(e)
        }

        var cloudId;
        try {
          var cloudId = await bbfn.getIdentitySourceId("cloudIdentityRealm", apiAccessToken);
          console.log(cloudId);
        } catch (e) {
          console.log(e)
        }

        var sources = [];
        if (googleId) sources.push(googleId);
        if (linkedInID) sources.push(linkedInID);
        if (facebookID) sources.push(facebookID);
        if (cloudId) sources.push(cloudId);


        try {
          await bbfn.applyPolicyThemeSources(policyId, themeId, sources, appl, apiAccessToken);
          console.log("Policy applied to application");
        } catch (e) {
          console.log("applyPolicyThemeSources threw: " + e);
          res.render('error', {
            message: "Failed to apply policy to app " + process.env.APP_NAME,
            detail: JSON.stringify(e)
          });
          return;
        }

        if (themeId) {
          process.env.THEME_ID = themeId;
        }

      }

      passport.use(new OpenIDStrategy({
          issuer: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default',
          clientID: process.env.OIDC_CLIENT_ID, // from .env file
          clientSecret: process.env.OIDC_CLIENT_SECRET, // from .env file
          authorizationURL: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/authorize', // this won't change
          userInfoURL: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/userinfo', // this won't change
          tokenURL: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/token', // this won't change
          callbackURL: process.env.OIDC_REDIRECT_URI, // from .env file
          passReqToCallback: true
        },
        function(req, issuer, claims, acr, idToken, accessToken, params, cb) {
          console.log('issuer:', issuer);
          console.log('claims:', claims);
          console.log('acr:', acr);
          console.log('idtoken:', idToken);
          console.log('accessToken:', accessToken);
          console.log('params:', params);

          req.session.accessToken = accessToken;
          req.session.userId = claims.id;
          req.session.loggedIn = true;
          return cb(null, claims);
        }));

      res.render('setup', {
        success: true
      });

    });
  }
});

module.exports = router;
