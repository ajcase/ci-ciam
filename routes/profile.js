var express = require('express');
var router = express.Router();
var axios = require('axios');

// GET profile
router.get('/', async function(req, res, next) {

  options = {
    headers: {
      'Authorization': 'Bearer ' + req.session.accessToken
    }
  }

  var response = await axios.get(process.env.OIDC_CI_BASE_URI+'/oidc/endpoint/default/userinfo', options);
  console.log('profile.js: ---- User ID token ----');
  var userinfo = response.data;
  var userinfo_string = JSON.stringify(userinfo, null, 2);
  console.log(userinfo_string);

  response = await axios.get(process.env.OIDC_CI_BASE_URI + '/v2.0/Me', options);
  console.log('profile.js: ---- User profile ----');
  var me = response.data;
  var me_string = JSON.stringify(me, null, 2);
  console.log(me_string);
  req.session.userprofile = me;

  response = await axios.get(process.env.OIDC_CI_BASE_URI+'/v1.0/attributes', options);

  console.log('profile.js: ---- Attributes ----');
  attributes = JSON.parse(body);
  attributes_string = JSON.stringify(attributes, null, 2);
  console.log(attributes_string);
  res.render('credential', {
    loggedIn: true,
    idtoken: userinfo_string,
    user: me_string,
    attributes: attributes_string
  });
});

module.exports = router;
