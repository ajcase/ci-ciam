var request = require('request');
var express = require('express');

function getRandomInt() {
  return Math.floor(1000 + Math.random() * 9000)
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function random_id() {
  return Math.round((10 ** 14 * Math.random())).toString();
}

function oidcIdToken(req, callback) {
  console.log(req.session.accessToken);
  request.get(process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/userinfo', {
    'auth': {
      'bearer': req.session.accessToken
    }
  }, function(err, response, body) {
    console.log("User ID token:", body);
    var userinfo = JSON.parse(body);
    var userinfo_string = JSON.stringify(userinfo, null, 2);
    callback(null, userinfo);
  });
}

function authorize(clientID, clientSecret, callback) {
  var options = {
    method: 'POST',
    url: process.env.OIDC_CI_BASE_URI + '/v1.0/endpoint/default/token',
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
}

function emailOtp(emailAddress, accessToken, callback) {
  var correlation = getRandomInt();
  var options = {
    method: 'POST',
    url: process.env.OIDC_CI_BASE_URI + '/v1.0/authnmethods/emailotp/transient/verification',
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
}

function smsOtp(phone, accessToken, callback) {
  var correlation = getRandomInt();
  var options = {
    method: 'POST',
    url: process.env.OIDC_CI_BASE_URI + '/v1.0/authnmethods/smsotp/transient/verification',
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
}

function recoverUsername(step, accessToken, callback) {
  if (step.step == 1) {
    var correlation = getRandomInt();
    var options = {
      method: 'POST',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/usc/username/recovery',
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
        'txnId': (typeof JSON.parse(body).trxId !== 'undefined') ? JSON.parse(body).trxId : uuidv4(),
      }
      console.log("Username Recovery OTP initiated:", JSON.parse(body));
      if (error) throw new Error(error);
      callback(null, buildResponse);
    });
  } else if (step.step == 2) {
    var options = {
      method: 'PUT',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/usc/username/recovery/' + step.txnId,
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
      console.log("2.1 Response code:", response.statusCode)
      if (response.statusCode == '200') {
        var buildResponse = {
          'responseCode': response.statusCode,
          'userName': JSON.parse(body).userName,
        }
        callback(null, buildResponse);
      } else {
        var buildResponse = {
          'correlation': step.correlation,
          'txnId': (typeof step.txnId !== 'undefined') ? step.txnId : uuidv4(),
        }
        console.log("Error response information:", buildResponse)
        callback(null, buildResponse);
      }
    });
  } else {
    console.log("Username Recovery OTP failed");
    callback(null, 500);
  }
}

function verifyOtp(code, txnId, method, accessToken, callback) {
  var options = {
    method: 'POST',
    url: process.env.OIDC_CI_BASE_URI + '/v1.0/authnmethods/' + method + '/transient/verification/' + txnId,
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
}

function getUserID(emailAddress, accessToken, callback) {
  var options = {
    method: 'GET',
    url: process.env.OIDC_CI_BASE_URI + `/v2.0/Users?filter=userName+eq+"${emailAddress}"&attributes=id,emails`,
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
}

function getGroupID(groupName, accessToken, callback) {
  var options = {
    method: 'GET',
    url: process.env.OIDC_CI_BASE_URI + `/v2.0/Groups?filter=displayName+eq+"${groupName}"`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  };

  console.log("Options JSON:", options)

  request(options, function(error, _response, body) {
    var jsonBody = JSON.parse(body);
    if (jsonBody.totalResults !== 0) {
      console.log("Get GroupID:", jsonBody.Resources[0])
      if (error) throw new Error(error);
      callback(null, jsonBody.Resources[0]);
    } else {
      console.log("Get GroupID: Failed to find group");
      if (error) throw new Error(error);
      callback(null, false);
    }
  });
}

function getFullProfile(userId, accessToken, callback) {
  var options = {
    method: 'GET',
    url: process.env.OIDC_CI_BASE_URI + `/v2.0/Users/${userId}`,
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
}

function getQuoteCount(emailAddress, accessToken, callback) {
  var options = {
    method: 'GET',
    url: process.env.OIDC_CI_BASE_URI + `/v2.0/Users?filter=userName+eq+"${emailAddress}"&attributes=id,emails,urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes.quoteCount`,
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
}

function resetPassword(userId, accessToken, callback) {
  var options = {
    method: 'PATCH',
    url: process.env.OIDC_CI_BASE_URI + `/v2.0/Users/${userId}/passwordResetter`,
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
}

function deleteUser(userId, accessToken, callback) {
  var options = {
    method: 'DELETE',
    url: process.env.OIDC_CI_BASE_URI + `/v2.0/Users/${userId}`,
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  };

  console.log("Options JSON:", options)

  request(options, function(error, response, _body) {
    if (error) throw new Error(error);
    if (response.statusCode == 204) {
      console.log(`User Deleted: ${userId}`);
      callback(null, true);
    } else {
      console.log(`Failed to delete user: ${userId}`);
      callback(null, false);
    }
  });
}

function changePassword(accessToken, pwVars, callback) {
  // Example
  // var pwVars = {
  //   'currentPw': body.currentPassword,
  //   'newPw': body.newPassword,
  //   'confirmPw': body.confirmPassword
  // }

  // Check if passwords match
  if (pwVars.newPw == pwVars.confirmPw) {
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
      url: process.env.OIDC_CI_BASE_URI + `/v2.0/Me/password`,
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
  } else {
    // bad request / passwords didn't match
    callback(null, 400);
    console.log("Password change error:", body)
  }
}

function toggleMfa(userId, toggle, accessToken, callback) {
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
    var data = '{\n    "schemas": [\n        "urn:ietf:params:scim:api:messages:2.0:PatchOp"\n    ],\n    "Operations": [\n        {\n            "op": "remove",\n            "path": "members[value eq \\"' + userId + '\\"]"\n        }\n    ]\n}'
  }

  var options = {
    method: 'PATCH',
    url: process.env.OIDC_CI_BASE_URI + '/v2.0/Groups/' + process.env.MFAGROUPID,
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
}

function createCustomAttr(thisAttr, customName, accessToken) {
  return new Promise((resolve, reject) => {
    var data = `{
                "args": {
                  "name":"${thisAttr.name}"
                },
                "ruleId": "11",
                "datatype":"${thisAttr.type}",
                "name":"${thisAttr.name}",
                "description": "Created for Demo App",
                "schemaAttribute":{
                  "customAttribute":true,
                  "name":"${customName}",
                  "scimName":"${thisAttr.name}"},
                  "scope":"tenant",
                  "sourceType":"rule",
                  "tags":[]
                }`

    var options = {
      method: 'POST',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/attributes/',
      headers: {
        'Content-Type': 'application/scim',
        'Authorization': `Bearer ${accessToken}`
      },
      body: data
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      if (response.statusCode == 201) {
        thisAttr.result = `created as ${customName}`;
      } else {
        thisAttr.result = JSON.parse(body).messageDescription;
      }
      resolve(thisAttr);
    });
  });
}

function createAttributes(attrList, accessToken, callback) {
  var results = [];

  var options = {
    method: 'GET',
    url: process.env.OIDC_CI_BASE_URI + '/v2.0/Schema/attributes?filter=custom',
    headers: {
      'Content-Type': 'application/scim',
      'Accept': 'application/scim+json',
      'Authorization': `Bearer ${accessToken}`
    }
  };

  request(options, async function(error, response, body) {
    if (error) throw new Error(error);
    if (response.statusCode != 200) {
      callback("list failed: " + body, null);
    } else {
      var attributes = JSON.parse(body).Resources;
      var attrNames = [];
      for (i in attributes) {
        attrNames.push(attributes[i].name);
      }

      var num = 1;
      while (attrList.length > 0) {
        var thisAttr = attrList.pop()
        while (attrNames.includes("customAttribute" + num)) {
          num++
        }
        var freeAttribute = "customAttribute" + num;
        num++

        var result = await createCustomAttr(thisAttr, freeAttribute, accessToken);
        results.push(result);
      }
      callback(null, results);
    }
  });
}

function setFullProfile(userId, body, accessToken, callback) {
  var options = {
    method: 'PUT',
    url: process.env.OIDC_CI_BASE_URI + `/v2.0/Users/${userId}`,
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
}

function setCustomAttributes(userId, operations, accessToken, callback) {
  var options = {
    method: 'PATCH',
    url: process.env.OIDC_CI_BASE_URI + `/v2.0/Users/${userId}`,
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

function createGroup(groupName, accessToken, callback) {
  var groupInfo = {
    "displayName": groupName,
    "urn:ietf:params:scim:schemas:extension:ibm:2.0:Group": {
      "description": "Demo Group created via API"
    },
    "schemas": [
      "urn:ietf:params:scim:schemas:core:2.0:Group",
      "urn:ietf:params:scim:schemas:extension:ibm:2.0:Group"
    ]
  }

  console.log("Group creation information:", groupInfo)
  var options = {
    'headers': {
      'Content-Type': 'application/scim+json',
      'Authorization': `Bearer ${accessToken}`
    },
    'body': JSON.stringify(groupInfo)
  }
  request.post(process.env.OIDC_CI_BASE_URI + '/v2.0/Groups', options, function(_err, response, body) {
    console.log("Create group:", groupName)
    pbody = JSON.parse(body);
    console.log("Response code:", response.statusCode);
    console.log("Create response:", body);
    if (response.statusCode == 201) {
      callback(null, pbody.id);
    } else {
      callback(body, false);
    }
  });
}

function getPolicyId(name, accessToken) {
  return new Promise((resolve, reject) => {
    var options = {
      'headers': {
        'Content-Type': 'application/scim+json',
        'Authorization': `Bearer ${accessToken}`
      }
    }
    console.log("Lookup Policy:" + name);
    request.get(process.env.OIDC_CI_BASE_URI + `/v1.0/policyvault/accesspolicy?search=name = ${name}`, options, function(_err, response, body) {
      pbody = JSON.parse(body);
      console.log("Response code:", response.statusCode);
      console.log("Lookup response:", body);
      if (response.statusCode == 200) {
        if (pbody.policies[0]) {
          console.log("Returning id: " + pbody.policies[0].id);
          resolve(pbody.policies[0].id);
        } else {
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  });
}



function createMfaPolicy(policyName, mfaGroup, accessToken) {
  return new Promise((resolve, reject) => {
    var data = {
"description": "2FA Policy for Demo.  Added via API",
"format": "json",
"name": policyName,
"rules": [{
  "alwaysRun": false,
  "conditions": {
    "subjectAttributes": {
      "attributes": [{
        "name": "groupIds",
        "opCode": "EQ",
        "values": [ mfaGroup ]
      }]
    }
  },
  "id": random_id(),
  "name": `2FA for ${mfaGroup}`,
  "result": {
    "action": {
      "allowAccess": false,
      "factorFrequency": "ALWAYS",
      "requireFactor": true
    },
    "authnMethods": ["urn:ibm:security:authentication:asf:macotp"],
    "serverSideActions": []
  }
}, {
  "alwaysRun": false,
  "conditions": {},
  "id": random_id(),
  "name": "Default rule",
  "result": {
    "action": {
      "allowAccess": true,
      "requireFactor": false
    },
    "authnMethods": ["urn:ibm:security:authentication:asf:macotp"],
    "serverSideActions": []
  }
}],
"schemaVersion": "urn:access:policy:3.0:schema"
}

    console.log("Policy creation information:", data)

    var options = {
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      'body': JSON.stringify(data)
    }
    request.post(process.env.OIDC_CI_BASE_URI + '/v1.0/policyvault/accesspolicy', options, function(_err, response, body) {
      console.log("Create policy");
      console.log("Response code:", response.statusCode);
      if (response.statusCode == 201) {
        resolve(true);
      } else {
        console.log("Create response:", body);
        reject(body);
      }
    });
  });
}

async function setupMfaPolicy(policyName, mfaGroup, accessToken, callback) {

  var policyId = await getPolicyId(policyName, accessToken);
  console.log("Initial lookup PolicyID: " + policyId);
  if (!policyId) {
    result = await createMfaPolicy(policyName, mfaGroup, accessToken);
    if (result) {
      policyId = await getPolicyId(policyName, accessToken);
    }
  }
  console.log("PolicyId: " + policyId);
  callback (null, policyId);
  // continue here
}

module.exports = {
  oidcIdToken: oidcIdToken,
  authorize: authorize,
  emailOtp: emailOtp,
  smsOtp: smsOtp,
  recoverUsername: recoverUsername,
  verifyOtp: verifyOtp,
  getUserID: getUserID,
  getGroupID: getGroupID,
  getFullProfile: getFullProfile,
  getQuoteCount: getQuoteCount,
  resetPassword: resetPassword,
  deleteUser: deleteUser,
  changePassword: changePassword,
  toggleMfa: toggleMfa,
  createAttributes: createAttributes,
  setFullProfile: setFullProfile,
  setCustomAttributes: setCustomAttributes,
  createGroup: createGroup,
  setupMfaPolicy: setupMfaPolicy
};
