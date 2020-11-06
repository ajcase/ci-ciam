var express = require('express');
var request = require('request');
var _ = require('lodash');
var bbfn = require('../functions.js');
var router = express.Router();

router.get('/', function(req, res, next) {
    var loggedIn = ((req.session.loggedIn) ? true : false);
    bbfn.getAllConsents(req.session.accessToken, function(_err, result) {
      res.render('insurance/consent-profile', {
        loggedIn: loggedIn,
        consent: result.consents
      });
    })
});

router.get('/terms', function(req, res, next) {
    var userAccessToken = req.session.accessToken;
    var userId = req.session.userId;
    var purposeID = process.env.TERMS_PURPOSE_ID;

    bbfn.getTerms(purposeID, userId, userAccessToken, function(_err, result) {
      var lastModified = new Date(result.purposes[purposeID].lastModifiedTime *1000);
      var termsDSP = result.purposes[purposeID];
      bbfn.checkTermsDUA(purposeID, termsDSP.accessTypes[0].id, userId, userAccessToken, function(_err, result) {
        if(result[0].result[0].approved) // The user has already consented.
        {
          res.redirect("/profile")
        }
        else{
          res.render('insurance/privacy/eula_consent', {
            layout: false,
            consentTitle: `Terms of service (version ${termsDSP.version})`,
            pageDescription: `The terms of service was updated on ${lastModified.toGMTString()}. Please review and accept the new terms before accessing your profile`,
            refLink: termsDSP.termsOfUse.ref,
            accessTypeId: termsDSP.accessTypes[0].id,
            assertUIDefault: termsDSP.accessTypes[0].assentUIDefault,
            actionHome: "/app/consent/terms"
          });
        }
      });
    });
  });
router.post('/terms', function(req, res, next) {
    var userAccessToken = req.session.accessToken;
    var userId = req.session.userId;
    var purposeID = process.env.TERMS_PURPOSE_ID;
    var assertTerms = (req.body.assertTerms == "true") ? 1 : 2;
    
    bbfn.storeTermsConsent(purposeID, req.body.accessTypeID, userId, assertTerms, userAccessToken, function(_err, result) {
      if(result){
        res.redirect("/app/profile");
      }else{
        //need error handling
      }
    });
  });

module.exports = router;