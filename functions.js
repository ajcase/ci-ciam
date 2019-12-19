var request = require('request');
var express = require('express');
var OIDC_BASE_URI = process.env.OIDC_CI_BASE_URI;
var API_CLIENT_ID = process.env.API_CLIENT_ID;
var API_CLIENT_SECRET = process.env.API_CLIENT_SECRET;
var OIDC_TOKEN_URI = OIDC_BASE_URI + '/oidc/endpoint/default';
var MFAGROUPID = process.env.MFAGROUPID;

function getRandomInt() {
  return Math.floor(1000 + Math.random() * 9000)
}
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = {
  oidcIdToken: function(req, callback) {
    console.log(req.session.accessToken);
    request.get(`${OIDC_TOKEN_URI}/userinfo`, {
      'auth': {
        'bearer': req.session.accessToken
      }
    }, function(err, response, body) {
      console.log("User ID token:", body);
      var userinfo = JSON.parse(body);
      var userinfo_string = JSON.stringify(userinfo, null, 2);
      callback(null, userinfo);
    });
  },
  authorize: function(clientID, clientSecret, callback) {
    var options = {
      method: 'POST',
      url: OIDC_BASE_URI + '/v1.0/endpoint/default/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      form: {
        grant_type: 'client_credentials',
        client_id: clientID,
        client_secret: clientSecret,
        scope: 'openid'
      }
    };

    console.log("Options JSON:", options)

    request(options, function(error, response, body) {
      console.log("Authorize API:", JSON.parse(body))
      if (error) throw new Error(error);
      callback(null, JSON.parse(body));
    });
  },
  emailOtp: function(emailAddress, accessToken, callback) {
    var correlation = getRandomInt();
    var options = {
      method: 'POST',
      url: `${OIDC_BASE_URI}/v1.0/authnmethods/emailotp/transient/verification`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: `{"correlation":"${correlation}","otpDeliveryEmailAddress":"${emailAddress}"}`
    };
    console.log("Options JSON:", options)

    request(options, function(error, response, body) {
      console.log("Email OTP initiated:", body);
      if (error) throw new Error(error);
      callback(null, JSON.parse(body));
    });
  },
  smsOtp: function(phone, accessToken, callback) {
    var correlation = getRandomInt();
    var options = {
      method: 'POST',
      url: `${OIDC_BASE_URI}/v1.0/authnmethods/smsotp/transient/verification`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: `{"correlation":"${correlation}","otpDeliveryMobileNumber":"${phone}"}`
    };
    console.log("Options JSON:", options)

    request(options, function(error, response, body) {
      console.log("SMS OTP initiated:", body);
      if (error) throw new Error(error);
      callback(null, JSON.parse(body));
    });
  },
  recoverUsername: function(step, accessToken, callback) {
    if(step.step == 1){
      var correlation = getRandomInt();
      var options = {
        method: 'POST',
        url: `${OIDC_BASE_URI}/v1.0/usc/username/recovery`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: `{
                "attributes": [
                  {
                    "name": "email",
                    "value": "${step.emailAddress}"
                  }
                ],
                "steps": [
                  {
                    "data": {
                      "correlation": "${correlation}"
                    },
                    "method": "emailotp"
                  }
                ],
                "stateId": "BB${correlation}"
              }`
      };
      console.log("Options JSON:", options)

      request(options, function(error, response, body) {
        var buildResponse = {
          'correlation': correlation,
          'txnId': (typeof JSON.parse(body).trxId !== 'undefined') ? JSON.parse(body).trxId: uuidv4(),
        }
        console.log("Username Recovery OTP initiated:", JSON.parse(body));
        if (error) throw new Error(error);
        callback(null, buildResponse);
      });
    }
    else if(step.step == 2){
      var options = {
        method: 'PUT',
        url: `${OIDC_BASE_URI}/v1.0/usc/username/recovery/${step.txnId}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: `{
                "otp": "${step.otp}"
              }`
      };
      console.log("Options JSON:", options)

      request(options, function(error, response, body) {
        if (error) throw new Error(error);
        console.log("2.0 Username Recovery OTP verification:", JSON.parse(body));
        console.log("2.1 Response code:",response.statusCode)
        if(response.statusCode == '200'){
          var buildResponse = {
            'responseCode': response.statusCode,
            'userName': JSON.parse(body).userName,
          }
          callback(null, buildResponse);
        }else{
          var buildResponse = {
            'correlation': step.correlation,
            'txnId': (typeof step.txnId !== 'undefined') ? step.txnId : uuidv4(),
          }
          console.log("Error response information:", buildResponse)
          callback(null, buildResponse);
        }
      });
    }
    else {
        console.log("Username Recovery OTP failed");
        callback(null, 500);
    }
  },
  verifyOtp: function(code, txnId, method, accessToken, callback) {
    var options = {
      method: 'POST',
      url: `${OIDC_BASE_URI}/v1.0/authnmethods/${method}/transient/verification/${txnId}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: `{"otp":"${code}"}`
    };
    console.log("Verify transaction JSON:", options)

    request(options, function(error, response, body) {
      var jsonBody = JSON.parse(body);
      if (jsonBody.messageId == "CSIAH0620I") {
        console.log("Verify OTP completed:", jsonBody)
        if (error) throw new Error(error);
        callback(null, JSON.parse(body));
      } else {
        console.log("Verify OTP failed: The code provided was not correct.")
        console.log("Error message", jsonBody.messageId)
        if (error) throw new Error(error);
        callback(null, false);
      }
    });
  },
  getUserID: function(emailAddress, accessToken, callback) {
    var options = {
      method: 'GET',
      url: `${OIDC_BASE_URI}/v2.0/Users?filter=userName+eq+"${emailAddress}"&attributes=id,emails`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    console.log("Options JSON:", options)

    request(options, function(error, response, body) {
      var jsonBody = JSON.parse(body);
      if (jsonBody.totalResults !== 0) {
        console.log("Get UserID:", jsonBody.Resources[0])
        if (error) throw new Error(error);
        callback(null, jsonBody.Resources[0]);
      } else {
        console.log("Get UserID: Failed to find user");
        if (error) throw new Error(error);
        callback(null, false);
      }
    });
  },
  getFullProfile: function(userId, accessToken, callback) {
    var options = {
      method: 'GET',
      url: `${OIDC_BASE_URI}/v2.0/Users/${userId}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };

    console.log("Options JSON:", options)

    request(options, function(error, response, body) {
      var jsonBody = JSON.parse(body);
      if (jsonBody.totalResults !== 0) {
        console.log(`Get full profile of ${userId}:`, jsonBody)
        if (error) throw new Error(error);
        callback(null, jsonBody);
      } else {
        console.log("Get UserID: Failed to find user");
        if (error) throw new Error(error);
        callback(null, false);
      }
    });
  },
  getQuoteCount: function(emailAddress, accessToken, callback) {
    var options = {
      method: 'GET',
      url: `${OIDC_BASE_URI}/v2.0/Users?filter=userName+eq+"${emailAddress}"&attributes=id,emails,urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes.quoteCount`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };

    console.log("Options JSON:", options)

    request(options, function(error, response, body) {
      var jsonBody = JSON.parse(body);
      if (jsonBody.totalResults !== 0) {
        console.log("Get UserID:", jsonBody.Resources[0])
        if (error) throw new Error(error);
        callback(null, jsonBody.Resources[0]["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"]["customAttributes"][0]["values"][0]);
      } else {
        console.log("Get UserID: Failed to find user");
        if (error) throw new Error(error);
        callback(null, false);
      }
    });
  },
  resetPassword: function(userId, accessToken, callback) {
    var options = {
      method: 'PATCH',
      url: `${OIDC_BASE_URI}/v2.0/Users/${userId}/passwordResetter`,
      headers: {
        'Content-Type': 'application/scim+json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: `{
              "schemas": [
                  "urn:ietf:params:scim:api:messages:2.0:PatchOp"
              ],
              "operations": [
                  {
                      "op": "replace",
                      "value": {
                          "password": "auto-generate",
                          "urn:ietf:params:scim:schemas:extension:ibm:2.0:Notification": {
                              "notifyType": "EMAIL",
                              "notifyPassword": true,
                              "notifyManager": false
                          }
                      }
                  }
              ]
          }`
    };

    console.log("Options JSON:", options)

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      console.log("Password reset response code:", response.statusCode)
      if (response.statusCode == 204) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    });
  },
  changePassword: function(accessToken, pwVars, callback) {
    // Example
    // var pwVars = {
    //   'currentPw': body.currentPassword,
    //   'newPw': body.newPassword,
    //   'confirmPw': body.confirmPassword
    // }

    // Check if passwords match
    if(pwVars.newPw == pwVars.confirmPw){
      var data = `{
                    "currentPassword": "${pwVars.currentPw}",
                    "newPassword": "${pwVars.newPw}",
                    "schemas": [
                      "urn:ietf:params:scim:schemas:ibm:core:2.0:ChangePassword",
                      "urn:ietf:params:scim:schemas:extension:ibm:2.0:Notification"
                    ],
                    "urn:ietf:params:scim:schemas:extension:ibm:2.0:Notification": {
                      "notifyPassword": false,
                      "notifyType": "EMAIL"
                    }
                  }`

      var options = {
        method: 'POST',
        url: `${OIDC_BASE_URI}/v2.0/Me/password`,
        headers: {
          'Content-Type': 'application/scim+json',
          'Accept': 'application/scim+json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: data
      };

      console.log("Options JSON:", options)

      request(options, function(error, response, body) {
        if (error) throw new Error(error);
        console.log("Passsword reset response code:", response.statusCode)

        if (response.statusCode == 204) {
          callback(null, true);
        } else {
          // unauthorized / error in API call
          callback(null, response.statusCode);
          console.log("Password change error:", body)
        }
      });
    }
    else{
          // bad request / passwords didn't match
          callback(null, 400);
          console.log("Password change error:", body)
    }
  },
  toggleMfa: function(userId, toggle, accessToken, callback) {
    var toggleValue = ((toggle) ? "add" : "remove");

    if (toggle) {
      var data = `{
                  "schemas": [
                      "urn:ietf:params:scim:api:messages:2.0:PatchOp"
                  ],
                  "Operations": [
                      {
                          "op": "add",
                          "path": "members",
                          "value": [
                              {
                                  "type": "user",
                                  "value": "${userId}"
                              }
                          ]
                      }
                  ]
              }`
    } else {
      var data = '{\n    "schemas": [\n        "urn:ietf:params:scim:api:messages:2.0:PatchOp"\n    ],\n    "Operations": [\n        {\n            "op": "remove",\n            "path": "members[value eq \\"'+ userId +'\\"]"\n        }\n    ]\n}'
    }

    var options = {
      method: 'PATCH',
      url: `${OIDC_BASE_URI}/v2.0/Groups/${MFAGROUPID}`,
      headers: {
        'Content-Type': 'application/scim+json',
        'Accept': 'application/scim+json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: data
    };

    console.log("Options JSON:", options)

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      console.log("Group modified response code:", response.statusCode)

      if (response.statusCode == 204) {
        callback(null, true);
      } else {
        callback(null, false);
        console.log("Group modified body:", body)
      }
    });
  },
  setFullProfile: function(userId, body, accessToken, callback) {
    var options = {
      method: 'PUT',
      url: `${OIDC_BASE_URI}/v2.0/Users/${userId}`,
      headers: {
        'Content-Type': 'application/scim+json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    };

    console.log("Options JSON:", options)

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      console.log("Profile modified", response.statusCode)
      if (response.statusCode == 200) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    });
  },
  setCustomAttributes: function(userId, operations, accessToken, callback) {
    var options = {
      method: 'PATCH',
      url: `${OIDC_BASE_URI}/v2.0/Users/${userId}`,
      headers: {
        'Content-Type': 'application/scim+json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: `{
            "Operations": [
              ${operations}
            ],
            "schemas": [
              "urn:ietf:params:scim:api:messages:2.0:PatchOp"
            ]
          }`
    };

    console.log("Options JSON:", options)

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      console.log("Profile modified", response.statusCode)
      if (response.statusCode == 204) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    });
  }
}
