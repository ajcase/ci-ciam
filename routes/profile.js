var request = require('request');
var express = require('express');
var router = express.Router();

// GET profile
router.get('/', function(req, res, next) {

  request.get(process.env.OIDC_CI_BASE_URI+'/oidc/endpoint/default/userinfo', {
    'auth': {
      'bearer': req.session.accessToken
    }
  },function(err, response, body){
    console.log('---- User ID token ----')
    console.log(body);

    var userinfo = JSON.parse(body);
    var userinfo_string = JSON.stringify(userinfo, null, 2);

    request.get(process.env.OIDC_CI_BASE_URI + '/v2.0/Me', {
      'auth': {
        'bearer': req.session.accessToken
      }
    },function(err, response, body){

      console.log('---- User profile ----')
      console.log(body);

      var me = JSON.parse(body);
      var me_string = JSON.stringify(me, null, 2);
      req.session.userprofile = me;

      request.get(process.env.OIDC_CI_BASE_URI+'/v1.0/attributes', {
        'auth': {
          'bearer': req.session.accessToken
        }
      },function(err, response, body){

        console.log('---- Attributes ----')
        console.log(body);

        attributes = JSON.parse(body);
        attributes_string = JSON.stringify(attributes, null, 2);

        res.render('credential', {
          loggedIn: true,
          idtoken: userinfo_string,
          user: me_string,
          attributes: attributes_string
        });
      });
    });
  });
});

module.exports = router;
