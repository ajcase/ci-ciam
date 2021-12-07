var express = require('express');
var axios = require('axios');
var _ = require('lodash');
var bbfn = require('../functions.js');
var router = express.Router();

var DPCMClient = require('../lib/dpcm/dpcmClient');
var dpcmClient = new DPCMClient({
  tenantUrl: process.env.OIDC_CI_BASE_URI,
});

// GET homepage
router.get('/', function(req, res, next) {
  var loggedIn = ((req.session.loggedIn) ? true : false);
  res.render('insurance/index', {
    loggedIn: loggedIn
  });
});

router.get('/app/downloadme', function(req, res, next) {
  console.log("Download data request from:", req.session.userprofile.id)
  //console.log("We have data", req.session.userprofile)
  data = req.session.userprofile
  datetime = new Date();
  filename = `${datetime.getTime()}-mydata.json`
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(data)
})

router.get('/app/dashboard', function(req, res, next) {
  var loggedIn = ((req.session.loggedIn) ? true : false);
  res.render('insurance/dashboard', {
    loggedIn: loggedIn
  });
});

router.get('/app/profile', function(req, res, next) {
  var loggedIn = ((req.session.loggedIn) ? true : false);
  if (loggedIn) {
    var userAccessToken = req.session.accessToken;

    dpcmClient.performDUA(userAccessToken, {
      trace: false,
      items: [
        {
          purposeId: process.env.TERMS_PURPOSE_ID,
          accessTypeId: process.env.DEFAULT_ACCESS_TYPE
        }
      ]
    }, async function(_err, duaRespItems) {
      var result = duaRespItems[0].result[0];
      var approved = result.approved;
      if (!approved) {
        if (!(result.reason && (
          result.reason.messageId == "CSIBT0022E" ||
          result.reason.messageId == "CSIBT0016E"
        ))) {
          res.redirect("/app/consent/terms");
          return;
        } else {
          console.log("DPCM is not configured - skipping EULA");
        }
      }

      var options = {
        method: 'GET',
        url: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/userinfo',
        headers: {
          'Authorization': `Bearer ${userAccessToken}`
        }
      };

      var response = await axios(options);
      console.log('---- User ID token ----');
      console.log(response.data);

      options.url = process.env.OIDC_CI_BASE_URI + '/v2.0/Me';
      response = await axios(options);

      console.log('---- User profile ----');
      var me = response.data;
      console.log(me);

      var phones = [];
      if (me.phoneNumbers)
        phones = me.phoneNumbers.filter(phone => phone.value);
      if (phones.length == 0) {
        delete me.phoneNumbers;
      } else {
        me.phoneNumbers = phones;
      }

      req.session.userprofile = me;

      var mfaEnabled = (typeof(_.filter(me.groups, {
        'id': process.env.MFAGROUPID
      }))[0] !== 'undefined') ? true : false;
        var meLinked = (typeof me["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"]["linkedAccounts"] != 'undefined') ? true : false;
      if (meLinked) {
        var linkedAccounts = me["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"]["linkedAccounts"]
      } else {
        var linkedAccounts = false
      }
      var addresses = (typeof me["addresses"] != 'undefined') ? true : false
      if (addresses) {
        var hasAddress = (typeof me["addresses"][0]["streetAddress"] !== 'undefined') ? true : false;
      }
      console.log(addresses, hasAddress)
      if (!linkedAccounts) {
        var linkedAccountsTotal = false;
      } else {
        var linkedAccountsTotal = {
          'facebook': (typeof(_.filter(linkedAccounts, {
            'realm': "www.facebook.com"
          }))[0] !== 'undefined') ? true : false,
          'linkedin': (typeof(_.filter(linkedAccounts, {
            'realm': "www.linkedin.com"
          }))[0] !== 'undefined') ? true : false,
          'google': (typeof(_.filter(linkedAccounts, {
            'realm': "www.google.com"
          }))[0] !== 'undefined') ? true : false
        }
      }

      console.log(linkedAccountsTotal)

      var customAttributes = me["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"]["customAttributes"]

      var quoteCount = (typeof(_.filter(customAttributes, {
        'name': 'quoteCount'
      }))[0] !== 'undefined') ? (_.filter(customAttributes, {
        'name': 'quoteCount'
      }))[0].values.toString() : false;

      var buildExtProfile = {
        'car': {
          'displayName': "Car",
          'value': (typeof(_.filter(customAttributes, {
            'name': 'carModel'
          }))[0] !== 'undefined') ? `${(_.filter(customAttributes, {'name': 'carYear'}))[0].values.toString()} ${(_.filter(customAttributes, {'name': 'carMake'}))[0].values.toString()} ${(_.filter(customAttributes, {'name': 'carModel'}))[0].values.toString()}` : false,
          'status': ((typeof(_.filter(customAttributes, {
            'name': 'carModel'
          }))[0] !== 'undefined') ? true : false)
        }
      }
      console.log(buildExtProfile);

      // For the "Change Password" button a direct URL to Verify's authn service is used
      // This URL is then passed to the renderer; reference to file profile.hbs
      var buildChangePasswordURL = process.env.OIDC_CI_BASE_URI + "/authsvc/mtfim/sps/authsvc?PolicyId=urn:ibm:security:authentication:asf:changepassword&login_hint=" + me.userName + "&themeId=" + process.env.THEME_ID;
      console.log("--- Change Password URL --- is: " + buildChangePasswordURL);

      //// BUILD CONSENT
      dpcmClient.performDUA(req.session.accessToken, {
        trace: false,
        items: [
          {
            purposeId: process.env.MARKETING_PURPOSE_ID,
            accessTypeId: process.env.READ_ACCESS_TYPE,
            attributeId: process.env.EMAIL_ATTRIBUTE_ID
          },
          {
            purposeId: process.env.PAPERLESS_PURPOSE_ID,
            accessTypeId: process.env.READ_ACCESS_TYPE,
            attributeId: process.env.EMAIL_ATTRIBUTE_ID
          },
        ]
      }, function(_err, duaRespItems) {
        var consentMarketing = false;
        var consentPaperless = false;

        duaRespItems.forEach(function(item, index) {
          if (item.purposeId == process.env.MARKETING_PURPOSE_ID) {
            consentMarketing = item.result[0].approved;
          } else if (item.purposeId == process.env.PAPERLESS_PURPOSE_ID) {
            consentPaperless = item.result[0].approved;
          }
        });

        console.log(`This user has logged consent for
          Marketing ${consentMarketing}
          Paperless ${consentPaperless}`);
        res.render('insurance/profile', {
          user: me,
          loggedIn: loggedIn,
          quotes: quoteCount,
          consentMarketing: consentMarketing,
          consentPaperless: consentPaperless,
          consentPaperlessAccessTypeID: process.env.READ_ACCESS_TYPE,
          consentMarketingAccessTypeID: process.env.READ_ACCESS_TYPE,
          consentAction: "/app/dpcm",
          actionCar: "/open-account?type=car",
          actionHome: "/open-account?type=home",
          actionLife: "/open-account?type=life",
          mfaStatus: mfaEnabled,
          linkedAccounts: linkedAccountsTotal,
          hasAddress: hasAddress,
          extProfile: buildExtProfile,
          changePasswordURL: buildChangePasswordURL
        });
      });
    });
  } else {
    res.redirect('/login');
  }
});

router.post('/app/preferences', function(req, res, next) {
  var userId = req.session.userId;
  var data = req.body;
  console.log("Editing preferences for:", userId)

  bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err, body) {
    if (err) {
      console.log(err);
    } else {
      var accessToken = body.access_token;
      var operations = `
            {
            	"op":"add",
            	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
            	"value": [{"name": "consentPaperless","values":["${data.consentPaperless}"]}]
            },
            {
            	"op":"add",
            	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
            	"value": [{"name": "consentNotifications","values":["${data.consentNotifications}"]}]
            },
            {
            	"op":"add",
            	"path":"urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes",
            	"value": [{"name": "consentPromotions","values":["${data.consentPromotions}"]}]
            }`
      bbfn.setCustomAttributes(userId, operations, accessToken, function(err, body) {
        console.log(body)
        if (body === true) {
          //success
          res.redirect('/app/profile');
        } else {
          //fail
          res.redirect('/app/profile');
        }
      });
    }
  });
});

/*
DPCM Handling Purposes
*/
router.post('/app/dpcm', function(req, res, next) {
  console.log(req.body)
  dpcmClient.storeConsents(req.session.accessToken, [
    {
      purposeId: process.env.MARKETING_PURPOSE_ID,
      accessTypeId: process.env.READ_ACCESS_TYPE,
      attributeId: process.env.EMAIL_ATTRIBUTE_ID,
      state: (req.body.consentMarketing) ? 3 : 4,
    },
    {
      purposeId: process.env.PAPERLESS_PURPOSE_ID,
      accessTypeId: process.env.READ_ACCESS_TYPE,
      attributeId: process.env.EMAIL_ATTRIBUTE_ID,
      state: (req.body.consentPaperless) ? 3 : 4
    }
  ], function(_err, result) {
    console.log("Captured on the other end Scotty!");
    res.redirect('/app/profile');
  });
});


/*
FORGOT PASSWORD
*/
router.get('/app/forgot-password', function(req, res, next) {
  res.render('insurance/resetpassword', {
    layout: false
  });
});
router.post('/app/forgot-password', function(req, res, next) {
  var user = req.body.emailAddress;
  console.log("User trying to reset password:", req.body.emailAddress)
  bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err, body) {
    var accessToken = body.access_token;
    if (err) {
      console.log(err);
    } else {
      console.log("1.0 Password reset attempt:", user)
      bbfn.getUserID(user, accessToken, function(err, body) {
        var userId = body.id;
        if (body === false) {
          res.render('insurance/login-message', {
            title: "Forgot password",
            message: "A password reset attempt has been performed and sent to your registered email address, if you did not receive a code, then please contact support for more information.",
            layout: false,
            button: "Return home"
          });
        } else {
          console.log("2.0 Password reset attempt:", user)
          if (err) {
            console.log(err);
          } else {
            bbfn.emailOtp(body.emails[0].value, accessToken, function(err, body) {
              console.log("3.0 Password reset attempt:", user)
              if (err) {
                console.log(err);
              } else {
                res.render('insurance/otpverify', {
                  title: "Forgot password",
                  message: "Enter the code that was sent to your registered email address, if you did not receive a code, then please contact support for more information.",
                  forgotPassword: true,
                  action: "/app/forgot-password-verify",
                  correlation: body.correlation,
                  txnId: body.id,
                  method: "emailotp",
                  userId: userId,
                  sub: req.body.emailAddress,
                  layout: false,
                  button: "Verify"
                });
              }
            });
          }
        }
      });
    }
  });
});
router.post('/app/forgot-password-verify', function(req, res, next) {
  // verify.otp; verify.txnId; verify.method; verify.userId
  var verify = req.body;
  console.log("1.0 OTP Transaction:", verify.txnId)
  bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err, body) {
    var accessToken = body.access_token;
    if (err) {
      console.log(err);
    } else {
      console.log("2.0 OTP Transaction:", verify.txnId)
      if (err) {
        console.log(err);
      } else {
        bbfn.verifyOtp(verify.otp, verify.txnId, verify.method, accessToken, function(err, body) {
          console.log("3.0 OTP Transaction:", verify.txnId);

          if (err) {
            console.log(err);
          } else {
            if (body === false) {
              res.render('insurance/otpverify', {
                title: "Forgot password",
                message: "The code you entered was incorrect, please enter the code again.",
                action: "/app/forgot-password-verify",
                correlation: verify.correlation,
                txnId: verify.txnId,
                method: "emailotp",
                forgotPassword: true,
                userId: verify.userId,
                sub: req.body.emailAddress,
                button: "Verify",
                layout: false
              });
            } else {
              bbfn.resetPassword(verify.userId, accessToken, function(err, body) {
                console.log("4.0 Forgot password action:", verify.userId);
                if (err) {
                  console.log(err);
                } else {
                  if (body === false) {
                    res.render('insurance/login-message', {
                      title: "Forgot password",
                      message: "There was an issue resetting your password, please contact the support line at 1(800)555-BLUE.",
                      layout: false,
                      button: "Return to login"
                    });
                  } else {
                    res.render('insurance/login-message', {
                      title: "Forgot password",
                      message: "A new password has been sent to your registered email address if it exists. If you did not receive a code, then please contact support for more information.",
                      layout: false,
                      button: "Return to login"
                    });
                  }
                }
              });
            }
          }
        });
      }
    }
  });
});
router.get('/app/forgot-username', function(req, res, next) {
  var loggedIn = ((req.session.loggedIn) ? true : false);
  if (loggedIn === true) {
    res.redirect('/app/profile');
  } else {
    res.render('insurance/recoverusername', {
      layout: false
    });
  }
});

router.post('/app/toggleMfa', function(req, res, next) {
  // form.mfa
  var form = req.body;

  bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err, body) {
    if (err) {
      console.log(err);
    } else {
      var accessToken = body.access_token;

      bbfn.toggleMfa(req.session.userId, form.mfa, accessToken, function(err, body) {
        console.log(body)
        if (body === true) {
          //success
          res.redirect('/app/profile');
        } else {
          //fail
          res.redirect('/app/profile');
        }
      });
    }
  });
});

/*
Delete User
*/
router.get('/app/deleteme', function(req, res, next) {
  console.log(req.session.userprofile);
  var admin = false;
  if (req.session.userprofile.groups) {
    for (group of req.session.userprofile.groups) {
      if (group.displayName == "admin") admin = true;
    }
  }
  if (admin) {
    res.redirect('/app/profile');
  } else {
    res.render('insurance/deleteme', {
      layout: false,
      name: req.session.userprofile.name.givenName + " " + req.session.userprofile.name.familyName,
      action: '/app/deleteme',
      error: false,
      errorMessage: ''
    });
  }
});

router.post('/app/deleteme', function(req, res, next) {
  // form.deleteme
  var form = req.body;

  if (form.name != req.session.userprofile.name.givenName + " " + req.session.userprofile.name.familyName) {
    res.render('insurance/deleteme', {
      layout: false,
      name: req.session.userprofile.name.givenName + " " + req.session.userprofile.name.familyName,
      action: '/app/deleteme',
      error: true,
      errorMessage: 'Name did not match'
    });
  } else {
    bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err, body) {
      if (err) {
        console.log(err);
      } else {
        var accessToken = body.access_token;

        bbfn.deleteUser(req.session.userId, accessToken, function(_err, result) {
          if (result === true) {
            //success
            res.redirect('/logout');
          } else {
            //fail
            res.render('insurance/deleteme', {
              layout: false,
              name: req.session.userprofile.name.givenName + " " + req.session.userprofile.name.familyName,
              action: '/app/deleteme',
              error: true,
              errorMessage: 'Delete failed'
            });
          }
        });
      }
    });
  }
});

/*
Change password
*/
router.get('/app/change-password', function(req, res, next) {
  res.render('insurance/changepassword', {
    layout: false,
    action: '/app/change-password',
    error: false,
    errorMessage: ''
  });
});
router.get('/app/recover-username', function(req, res, next) {
  res.render('insurance/recoverusername', {
    layout: false,
    action: '/app/recover-username',
    error: false,
    errorMessage: ''
  });
});
router.post('/app/recover-username', function(req, res, next) {
  var recoverVars = {
    'step': (typeof req.body.step !== 'undefined') ? req.body.step : '1',
    'txnId': (typeof req.body.txnId !== 'undefined') ? req.body.txnId : null,
    'otp': (typeof req.body.otp !== 'undefined') ? req.body.otp : null,
    'correlation': (typeof req.body.correlation !== 'undefined') ? req.body.correlation : null,
    'emailAddress': (typeof req.body.emailAddress !== 'undefined') ? req.body.emailAddress : null
  }
  console.log("We've been posted:", recoverVars)
  bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err, body) {
    var accessToken = body.access_token
    if (err) {
      console.log(err);
    } else {
      bbfn.recoverUsername(recoverVars, accessToken, function(err, body) {
        if (err) {
          console.log(err);
        } else {
          if (recoverVars.step != '2') {
            console.log("We're on step 1!")
            res.render('insurance/otpverify', {
              title: "Recover username",
              message: "Enter the code that was sent to your registered email address, if you did not receive a code, then please contact support for more information.",
              action: "/app/recover-username",
              recoverUsername: true,
              recoverStep: 2, //fill in hidden field
              correlation: body.correlation,
              txnId: body.txnId,
              button: "Verify",
              layout: false
            });
          } else {
            console.log("We're on step 2!")
            if (body.responseCode == 200) {
              res.render('insurance/login-message', {
                title: "Your username",
                message: `Your username is: ${body.userName}`,
                layout: false,
                button: "Return to login"
              });
            } else {
              res.render('insurance/otpverify', {
                title: "Recover username",
                message: "The code you entered was incorrect, please enter the code again. If you did not receive a code, your account might have not been found.",
                action: "/app/recover-username",
                recoverUsername: true,
                recoverStep: 2, //fill in hidden field
                correlation: body.correlation,
                txnId: body.txnId,
                button: "Verify",
                layout: false
              });
            }
          }
        }
      });
    }
  });
});
router.post('/app/change-password', function(req, res, next) {
  var user = req.session.userprofile.id;
  var userAccessToken = req.session.accessToken;
  var pwVars = {
    'currentPw': req.body.currentPassword,
    'newPw': req.body.newPassword,
    'confirmPw': req.body.confirmPassword
  }
  console.log("1.0 User trying to change password:", user)
  bbfn.changePassword(userAccessToken, pwVars, function(err, body) {
    console.log("2.0 Password change attempt:", user)
    console.log("3.0 Password change status:", body)
    if (err) {
      console.log(err);
    } else {
      if (body === true) {
        res.render('insurance/login-message', {
          title: "Change password successful",
          message: "Your password has been modified. You may exit this window or click the button below to return to your profile.",
          layout: false,
          button: "Return home"
        });
      } else {
        res.render('insurance/changepassword', {
          layout: false,
          action: '/app/change-password',
          error: true,
          errorMessage: (body == 400) ? "New password or old passwords did not match, please try again." : `There was an error: ${body}`
        });
      }
    }
  });
});
/*
Enroll SMS
*/
router.get('/app/enroll/sms', function(req, res, next) {
  res.render('insurance/enroll-sms', {
    layout: false,
    action: '/app/enroll/sms'
  });
});
router.post('/app/enroll/sms', function(req, res, next) {
  var number = req.body.phone;

  bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err, body) {
    var accessToken = body.access_token;
    if (err) {
      console.log(err);
    } else {
      bbfn.smsOtp(number, accessToken, function(err, body) {
        console.log("1.0 MFA enroll attempt:", number)
        if (err) {
          console.log(err);
        } else {
          if (typeof body.messageId != 'undefined' && body.messageId == 'CSIAH0642E') {
            // Bad phone
            res.render('insurance/enroll-sms', {
              layout: false,
              action: '/app/enroll/sms',
              error: true,
              errorMessage: "You've entered an invalid phone number. Please try again and ensure you include the country code."
            });
          } else {
            // Good phone
            res.render('insurance/otpverify', {
              title: "Two-factor enrollment",
              message: "Enter the code that was sent to the phone number provided.",
              sub: number,
              forgotPassword: true,
              action: "/app/enroll/sms/verify",
              correlation: body.correlation,
              txnId: body.id,
              method: "smsotp",
              button: "Verify",
              userId: req.session.userprofile.id,
              layout: false
            });
          }
        }
      });
    }
  });
});
router.post('/app/enroll/sms/verify', function(req, res, next) {
  // verify.otp; verify.txnId; verify.method; verify.userId, verify.sub
  var verify = req.body;
  console.log("1.0 OTP Transaction:", verify.txnId)
  bbfn.authorize(process.env.API_CLIENT_ID, process.env.API_SECRET, function(err, body) {
    var accessToken = body.access_token;
    if (err) {
      console.log(err);
    } else {
      console.log("2.0 OTP Transaction:", verify.txnId)
      if (err) {
        console.log(err);
      } else {
        bbfn.verifyOtp(verify.otp, verify.txnId, verify.method, accessToken, function(err, body) {
          console.log("3.0 OTP Transaction:", verify.txnId);

          if (err) {
            console.log(err);
          } else {
            if (body === false) {
              res.render('insurance/otpverify', {
                title: "Two-factor enrollment",
                message: "The code you entered was incorrect, please enter the code again.",
                action: "/app/enroll/sms/verify",
                correlation: verify.correlation,
                txnId: verify.txnId,
                sub: verify.sub,
                method: "smsotp",
                forgotPassword: true,
                userId: verify.userId,
                layout: false,
                button: "Verify"
              });
            } else {
              var operations = `{
                "op":"add",
                "path":"phoneNumbers",
                "value": [{"type": "mobile","value":"${verify.sub}"}]
              }`
              bbfn.setCustomAttributes(req.session.userprofile.id, operations, accessToken, function(err, body) {
                console.log("4.0 Profile modification:", req.session.userprofile.id);
                if (err) {
                  console.log(err);
                } else {
                  if (body === false) {
                    res.render('insurance/login-message', {
                      title: "Two-factor authentication",
                      message: "There was an issue modifying your account, please contact the support line at 1(800)555-BLUE.",
                      layout: false,
                      button: "Return home"
                    });
                  } else {
                    res.render('insurance/login-message', {
                      title: "Two-factor authentication",
                      message: "Your new security factor is now enrolled and ready to be used the next time you log in.",
                      layout: false,
                      button: "Return home"
                    });
                  }
                }
              });
            }
          }
        });
      }
    }
  });
});
module.exports = router;
