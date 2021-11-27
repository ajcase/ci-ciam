var axios = require('axios');
const qs = require('qs');
var fs = require('fs');
const FormData = require('form-data');

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

  options = {
    method: 'GET',
    url: process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/userinfo',
    headers: {'Authorization': 'Bearer ' + req.session.accessToken}
  }

  axios(options).then( (response) => {
    if (response.status == 200) {
      console.log("User ID token:", response.data);
      var userinfo = response.data;
      callback(null, userinfo);
    } else {
      callback(response.status, null);
    }
  }).catch((e) => callback(e,null));
}

function authorize(clientID, clientSecret, callback) {
  var options = {
    method: 'POST',
    url: process.env.OIDC_CI_BASE_URI + '/v1.0/endpoint/default/token',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: qs.stringify({
      grant_type: 'client_credentials',
      client_id: clientID,
      client_secret: clientSecret,
      scope: 'openid'
    })
  };

  console.log("Options JSON:", options)

  axios(options).then( (response) => {
    console.log("Authorize API:", response.data)
    callback(null, response.data);
  }).catch((e) => {callback(e,null)});
}

function emailOtp(emailAddress, accessToken, callback) {
  var correlation = getRandomInt();
  var options = {
    method: 'POST',
    url: process.env.OIDC_CI_BASE_URI + '/v2.0/factors/emailotp/transient/verifications',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    data: {
      "correlation": `${correlation}`,
      "emailAddress": emailAddress
    }
  };

  console.log("Options JSON:", options)

  axios(options).then( (response) => {
    console.log("Email OTP initiated:", response.data);
    callback(null, response.data);
  }).catch((e) => {callback(e,null)});
}

function smsOtp(phone, accessToken, callback) {
  var correlation = getRandomInt();
  var options = {
    method: 'POST',
    url: process.env.OIDC_CI_BASE_URI + '/v2.0/factors/smsotp/transient/verifications',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    data: {
      "correlation": `${correlation}`,
      "phoneNumber": phone
    }
  };

  console.log("Options JSON:", options)

  axios(options).then( (response) => {
    console.log("SMS OTP initiated:", response.data);
    callback(null, response.data);
  }).catch((e) => {callback(e,null)});
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
      data: {
                "attributes": [
                  {
                    "name": "email",
                    "value": step.emailAddress
                  }
                ],
                "steps": [
                  {
                    "data": {
                      "correlation": ""+correlation
                    },
                    "method": "emailotp"
                  }
                ],
                "stateId": "BB" + correlation
              }
    };
    console.log("Options JSON:", options)

    axios(options).then ((response) => {
      var buildResponse = {
        'correlation': correlation,
        'txnId': (typeof response.data.trxId !== 'undefined') ? response.data.trxId : uuidv4(),
      }
      console.log("Username Recovery OTP initiated:", response.data);
      callback(null, buildResponse);
    }).catch(e => callback(e,null));
  } else if (step.step == 2) {
    var options = {
      method: 'PUT',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/usc/username/recovery/' + step.txnId,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: {
        "otp": step.otp
      }
    };

    console.log("Options JSON:", options)

    axios(options).then(response => {
      console.log("2.0 Username Recovery OTP verification:", response.data);
      console.log("2.1 Response code:", response.status)
      if (response.status == '200') {
        var buildResponse = {
          'responseCode': response.status,
          'userName': response.data.userName,
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
    }).catch(e => callback(e,null));

  } else {
    console.log("Username Recovery OTP failed");
    callback(null, 500);
  }
}

function verifyOtp(code, txnId, method, accessToken, callback) {
  var options = {
    method: 'POST',
    url: process.env.OIDC_CI_BASE_URI + '/v2.0/factors/' + method + '/transient/verifications/' + txnId,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    data: `{"otp":"${code}"}`
  };
  console.log("Verify transaction JSON:", options)

  axios(options).then( (response) => {
    if (response.status == 204) {
      console.log("Verify OTP completed:")
      callback(null, true);
    } else {
      console.log("Verify OTP failed: The code provided was not correct.")
      console.log("Error message", response.data);
      callback(null, false);
    }
  }).catch((e) => {callback(e,false)});
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

  axios(options).then(response => {
    var jsonBody = response.data;
    if (jsonBody.totalResults !== 0) {
      console.log("Get UserID:", jsonBody.Resources[0])
      callback(null, jsonBody.Resources[0]);
    } else {
      console.log("Get UserID: Failed to find user");
      callback(null, false);
    }
  }).catch(e => callback(e,false));
}

async function getGroupID(groupName, accessToken) {
  var options = {
    method: 'GET',
    url: process.env.OIDC_CI_BASE_URI + `/v2.0/Groups?filter=displayName+eq+"${groupName}"`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  };

  console.log("Options JSON:", options)

  var response = await axios(options);
  var jsonBody = response.data;
  if (jsonBody.totalResults !== 0) {
    console.log("Get GroupID:", jsonBody.Resources[0])
    return jsonBody.Resources[0];
  } else {
    console.log("Get GroupID: Failed to find group");
    throw("Get GroupID: Failed to find group");
  }
};

function getThemeID(appName, accessToken, callback) {

  console.log("Querying theme for " + appName);
  // Get the app's themeID
  var options = {
      method: 'GET',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/applications/',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      params: {
        'limit': 1,
        'search': 'name="' + appName + '"'
      },
    };

  console.log("Options JSON:", options)

  axios(options).then(response => {
    console.log("HTTP response code is: "+response.status);
    if (response.status == 200) {
      console.log("HTTP 200: Successfully retrieved app data");
      let bodyObj=response.data;
      if (bodyObj._embedded.applications.length > 0 &&
          bodyObj._embedded.applications[0].customization != undefined) {
        // A custom theme is set.
        var themeId=bodyObj._embedded.applications[0].customization.themeId;
        console.log("themeId in JSON body = " + themeId);
      } else {
        var themeId="default";
        console.log("themeId set to default");
      }
      callback(null, themeId);
    } else {
      callback(null, false);
    }
  }).catch(_e => {callback(null,false)});;
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

  axios(options).then(response => {
    var jsonBody = response.data;
    if (jsonBody.totalResults !== 0) {
      console.log(`Get full profile of ${userId}:`, jsonBody)
      callback(null, jsonBody);
    } else {
      console.log("Get UserID: Failed to find user");
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

  axios(options).then(response => {
    var jsonBody = response.data;
    if (jsonBody.totalResults !== 0) {
      console.log("Get UserID:", jsonBody.Resources[0])
      callback(null, jsonBody.Resources[0]["urn:ietf:params:scim:schemas:extension:ibm:2.0:User"]["customAttributes"][0]["values"][0]);
    } else {
      console.log("Get UserID: Failed to find user");
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
    data: {
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
          }
  };

  console.log("Options JSON:", options)

  axios(options).then(response => {
    console.log("Password reset response code:", response.status)
    if (response.status == 204) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  }).catch(_e => {callback(null,false)});
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

  axios(options).then(response =>{
    if (response.status == 204) {
      console.log(`User Deleted: ${userId}`);
      callback(null, true);
    } else {
      console.log(`Failed to delete user: ${userId}`);
      callback(null, false);
    }
  }).catch(_e => {callback(null,false)});
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
    var data = {
                    "currentPassword": pwVars.currentPw,
                    "newPassword": pwVars.newPw,
                    "schemas": [
                      "urn:ietf:params:scim:schemas:ibm:core:2.0:ChangePassword",
                      "urn:ietf:params:scim:schemas:extension:ibm:2.0:Notification"
                    ],
                    "urn:ietf:params:scim:schemas:extension:ibm:2.0:Notification": {
                      "notifyPassword": false,
                      "notifyType": "EMAIL"
                    }
                }

    var options = {
      method: 'POST',
      url: process.env.OIDC_CI_BASE_URI + `/v2.0/Me/password`,
      headers: {
        'Content-Type': 'application/scim+json',
        'Accept': 'application/scim+json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: data
    };

    console.log("Options JSON:", options)

    axios(options).then(response => {
      console.log("Passsword reset response code:", response.status)

      if (response.status == 204) {
        callback(null, true);
      } else {
        // unauthorized / error in API call
        callback(null, response.status);
        console.log("Password change error:", response.data)
      }
    }).catch(_e => {callback(null,false)});
  } else {
    // bad request / passwords didn't match
    callback(null, 400);
    console.log("Password change error: Passwords didn't match");
  }
}

function toggleMfa(userId, toggle, accessToken, callback) {

  if (toggle) {
    var data = {
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
                                  "value": userId
                              }
                          ]
                      }
                  ]
              }
  } else {
    var data = {
      "schemas": [
        "urn:ietf:params:scim:api:messages:2.0:PatchOp"
      ],
      "Operations": [
        {
          "op": "remove",
          "path": "members[value eq \"" + userId + "\"]"
        }
      ]
    }
  }

  var options = {
    method: 'PATCH',
    url: process.env.OIDC_CI_BASE_URI + '/v2.0/Groups/' + process.env.MFAGROUPID,
    headers: {
      'Content-Type': 'application/scim+json',
      'Accept': 'application/scim+json',
      'Authorization': `Bearer ${accessToken}`
    },
    data: data
  };

  console.log("Options JSON:", JSON.stringify(options));

  axios(options).then(response => {
    console.log("Group modified response code:", response.status)
    if (response.status == 204) {
      callback(null, true);
    } else {
      callback(null, false);
      console.log("Group modified body:", response.data);
    }
  }).catch(_e => {callback(null,false)});
}

async function createCustomAttr(thisAttr, customName, accessToken) {
  var data = {
              "args": {
                "name": thisAttr.name
              },
              "datatype": thisAttr.type,
              "name": thisAttr.name,
              "description": "Created for Demo App",
              "schemaAttribute":{
                "customAttribute":true,
                "name": customName,
                "scimName":thisAttr.name
              },
              "scope":"tenant",
              "sourceType":"schema",
              "tags":[]
             }

  var options = {
    method: 'POST',
    url: process.env.OIDC_CI_BASE_URI + '/v1.0/attributes/',
    headers: {
      'Content-Type': 'application/scim',
      'Authorization': `Bearer ${accessToken}`
    },
    data: data
  };

  return axios(options).then(response => {
    if (response.status == 201) {
      thisAttr.result = `created as ${customName}`;
    } else {
      thisAttr.result = response.data.messageDescription;
    }
    return thisAttr;
  }).catch(e => {
    thisAttr.result = e.response.data.messageDescription
    return thisAttr;
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

  axios(options).then(async response => {
    if (response.status != 200) {
      callback("list failed: " + response.data, null);
    } else {
      var attributes = response.data.Resources;
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
  }).catch(e => callback("list failed: " + e.response.data));
}

function setFullProfile(userId, body, accessToken, callback) {
  var options = {
    method: 'PUT',
    url: process.env.OIDC_CI_BASE_URI + `/v2.0/Users/${userId}`,
    headers: {
      'Content-Type': 'application/scim+json',
      'Authorization': `Bearer ${accessToken}`
    },
    data: body
  };

  console.log("Options JSON:", options)

  axios(options).then(response => {
    console.log("Profile modified", response.status)
    if (response.status == 200) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  }).catch(_e => {callback(null,false)});
}

function setCustomAttributes(userId, operations, accessToken, callback) {

  var dataStr = `{
          "Operations": [
            ${operations}
          ],
          "schemas": [
            "urn:ietf:params:scim:api:messages:2.0:PatchOp"
          ]
        }`

  var options = {
    method: 'PATCH',
    url: process.env.OIDC_CI_BASE_URI + `/v2.0/Users/${userId}`,
    headers: {
      'Content-Type': 'application/scim+json',
      'Authorization': `Bearer ${accessToken}`
    },
    data: JSON.parse(dataStr)
  };

  console.log("Options JSON:", options)

  axios(options).then(response => {
    console.log("Profile modified", response.status)
    if (response.status == 204) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  }).catch(_e => {callback(null,false)});
}

async function createGroup(groupName, accessToken) {
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
      'method': 'post',
      'url': process.env.OIDC_CI_BASE_URI + '/v2.0/Groups',
      'headers': {
        'Content-Type': 'application/scim+json',
        'Authorization': `Bearer ${accessToken}`
      },
      'data': groupInfo
    }
    console.log("Create group:", groupName)
    return axios(options).then(response => {
      pbody = response.data;
    console.log("Response code:", response.status);
      console.log("Create response:", JSON.stringify(pbody));
      if (response.statusCode == 201) {
        return pbody.id;
      } else {
        throw(response.data);
      }
    });
}

async function getPolicyId(name, accessToken) {
    var options = {
      'method': 'get',
      'url': process.env.OIDC_CI_BASE_URI + `/v1.0/policyvault/accesspolicy?search=name = ${name}`,
      'headers': {
        'Content-Type': 'application/scim+json',
        'Authorization': `Bearer ${accessToken}`
      }
    }
    console.log("Lookup Policy:" + name);
    return axios(options).then(response => {
      pbody = response.data;
      console.log("Response code:", response.status);
      console.log("Lookup response:", JSON.stringify(pbody));
      if (response.status == 200) {
        if (pbody.policies[0]) {
          console.log("Returning id: " + pbody.policies[0].id);
          return pbody.policies[0].id;
        } else {
          console.log("Policy not found");
          return false;
        }
      } else {
        return false;
      }
    });
}

async function createApplication(appName, redirectUrl, accessToken) {

    var data = {
      "client_name": appName,
      "redirect_uris": [ redirectUrl ],
      "all_users_entitled": true,
      "enforce_pkce": false,
      "consent_action": "never_prompt"
    }

    console.log("App creation information:", data)

    var options = {
      'method': 'post',
      'url': process.env.OIDC_CI_BASE_URI + '/oidc/endpoint/default/client_registration',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      'data': data
    }
    return axios(options).then(response => {
      console.log("Create application");
      console.log("Response code:", response.status);
      console.log("Create response:", response.data);
      return response.data;
    }).catch( e => { throw e.response ? e.response.data : e });
}

async function getApplication(appName, accessToken) {
  var options = {
    'method': 'get',
    'url': process.env.OIDC_CI_BASE_URI + '/v1.0/applications',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  }

  console.log("Get applications");
  var response = await axios(options);

  console.log("Response code:", response.status);
  console.log("Get response:", JSON.stringify(response.data));
  if (response.status == 200) {
    var json = response.data;
    if (json._embedded && json._embedded.applications.length > 0) {
      var application;
      for (i in json._embedded.applications) {
        if (appName == json._embedded.applications[i].name) {
          application = json._embedded.applications[i];
          break;
        }
      }

      if (application) {
        options.url = process.env.OIDC_CI_BASE_URI + application._links.self.href;
        response = await axios(options);
        console.log("Get application");
        console.log("Response code:", response.status);
        console.log("Get response:", JSON.stringify(response.data));
        if (response.status == 200) {
            return response.data;
          } else {
            throw(response.data);
          }
      } else {
        throw(JSON.stringify({"error": "No matching application"}));
      }
    } else {
      throw(JSON.stringify({"error":"No applications returned"}));
    }
  } else {
    throw(JSON.stringify(response.data));
  }
}

async function createMfaPolicy(policyName, mfaGroup, accessToken) {
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
    'method': 'post',
    'url': process.env.OIDC_CI_BASE_URI + '/v1.0/policyvault/accesspolicy',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    'data': data
  }

  console.log("Create policy");
  return axios(options).then(response => {
    console.log("Response code:", response.status);
    if (response.status == 201) {
      return true;
    } else {
      console.log("Create response:", response.data);
      throw(response.data);
    }
    }).catch( e => { throw e.response ? e.response.data : e });
}

async function setupMfaPolicy(policyName, mfaGroup, accessToken) {

  var policyId = await getPolicyId(policyName, accessToken);
  console.log("Initial lookup PolicyID: " + policyId);
  if (!policyId) {
    result = await createMfaPolicy(policyName, mfaGroup, accessToken);
    if (result) {
      policyId = await getPolicyId(policyName, accessToken);
    }
  }
  console.log("PolicyId: " + policyId);
  return policyId;
}

function findAccount(accountId, accessToken, callback) {
    var options = {
      'method': 'get',
      'url': process.env.OIDC_CI_BASE_URI + `/v2.0/Users?filter=urn:ietf:params:scim:schemas:extension:ibm:2.0:User:customAttributes.accountId eq "${accountId}" and active eq "false"`,
      'headers': {
        'Content-Type': 'application/scim+json',
        'Authorization': `Bearer ${accessToken}`
      }
    }

    console.log("Lookup accountID:" + accountId);
    axios(options).then(response => {
      pbody = response.data;
      console.log("Response code:", response.status);
      console.log("Lookup response:", JSON.stringify(pbody));
      if (response.status == 200) {
        if (pbody.totalResults == 1) { // only 1 allowed to be returned
          console.log("Returning user record: " + pbody.Resources[0].id);
          callback(null, pbody.Resources[0]);
        } else {
          callback(null, false);
        }
      }
  });
}

function createUser(payload, callback) {
  var options = {
    'method': 'post',
    'url': process.env.OIDC_CI_BASE_URI + `/v2.0/Users`,
    'headers': {
      'Content-Type': 'application/scim+json',
      'Authorization': `Bearer ${accessToken}`
    },
    'data': payload
  }

  console.log("Create user:" + payload.userName);
  axios(options).then(response => {
    pbody = response.data;
    console.log("Response code:", response.status);
    if (response.status == 201) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  }).catch( () => {callback(null,false)});
}

function titleCase(str) {
  str = str.toLowerCase().split(' ');
  for (var i = 0; i < str.length; i++) {
    str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
  }
  return str.join(' ');
}

async function applyPolicyThemeSources(policyid,themeId,sources,app,accessToken) {

  var url = process.env.OIDC_CI_BASE_URI + app._links.self.href;
  if (sources.length > 0) {
    app.identitySources = sources;
  }
  if (policyid) {
    app.authPolicy = {};
    app.authPolicy.id = policyid;
  }
  if (themeId) {
    app.customization = {themeId: themeId};
  }
  delete app._links;
  delete app.xforce;
  delete app.type;
  delete app.icon;
  delete app.defaultIcon;

  console.log("App update information:", app)
  var options = {
    'method': 'put',
    'url': url,
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    'data': app
  }
  console.log("Update application");
  return axios(options).then(response => {
    console.log("Response code:", response.status);
    console.log("Update response:", JSON.stringify(response.data));
    if (response.status == 200) {
      return response.data;
    } else {
      throw(response.data);
    }
  });
}

async function createEula(id,description,url, accessToken) {
  var purposeInfo = {
    "accessTypes": [{
      "id": "default"
    }],
    "category": "eula",
    "customAttributes": [],
    "defaultConsentDuration": null,
    "description": description,
    "id": id,
    "name": id,
    "previousConsentApply": false,
    "tags": [],
    "termsOfUse": {
      "ref": url
    }
  }

  console.log("EULA creation information:", purposeInfo)
  var options = {
    'method': 'post',
    'url': process.env.OIDC_CI_BASE_URI + '/dpcm-mgmt/config/v1.0/privacy/purposes',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    'data': purposeInfo
  }

  console.log("Create EULA:", id)
  var response = await axios(options);
  console.log("Response code:", response.status);
  console.log("Create response:", response.data);

  if (response.status == 201) {
    var patchInfo = {"op":"replace","path":"state","value":1}
    console.log("EULA publish information:", patchInfo)

    var options = {
      'method': 'patch',
      'url': process.env.OIDC_CI_BASE_URI + '/dpcm-mgmt/config/v1.0/privacy/purposes/'+id+'/0',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      'data': patchInfo
    }

    console.log("Publish EULA:", id)
    var response = await axios(options);
    console.log("Response code:", response.status);
    console.log("Publish response:", response.data);
    if (response.status == 204) {
      return true;
    } else {
      throw(response.data);
    }
  } else {
    throw(response.data);
  }
}

async function createAccessType(accessId, accessToken) {

  var accessInfo = {id: accessId, name: accessId}
  console.log("Access type creation information:", accessInfo)
  var options = {
    'method': 'post',
    'url': process.env.OIDC_CI_BASE_URI + '/dpcm-mgmt/config/v1.0/privacy/access-types',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    'data': accessInfo
  }
  console.log("Create AccessType:", accessId)
  return axios(options).then(response => {
    console.log("Response code:", response.status);
    console.log("Create response:", response.data);
    if (response.status == 201) {
      return true;
    } else {
      throw(JSON.stringify(response.data));
    }
  });
}

async function createPurpose(purposeId, attrId, description, readAT, defaultAT, accessToken) {
  var purposeInfo = {
    "accessTypes": [
      {"id": defaultAT},
      {"id": readAT}
    ],
    "attributes": [{
      "accessTypes": [
        {"id": readAT}
      ],
      "id": "" + attrId,
      "mandatory": true,
      "retentionPeriod": null
    }],
    "category": "default",
    "customAttributes": [],
    "defaultConsentDuration": null,
    "description": description,
    "id": purposeId,
    "name": purposeId,
    "previousConsentApply": false,
    "tags": []
  }

  console.log("Purpose creation information:", purposeInfo)
  var options = {
    'method': 'post',
    'url': process.env.OIDC_CI_BASE_URI + '/dpcm-mgmt/config/v1.0/privacy/purposes',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    'data': purposeInfo
  }

  var response = await axios(options);
  console.log("Create Purpose:", purposeId)
  console.log("Response code:", response.statusCode);
  console.log("Create response:", response.data);
  if (response.status == 201) {
    var patchInfo = {"op":"replace","path":"state","value":1}

    console.log("Purpose publish information:", patchInfo)
    var options = {
      'method': 'patch',
      'url': process.env.OIDC_CI_BASE_URI + '/dpcm-mgmt/config/v1.0/privacy/purposes/'+purposeId+'/0',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      'data': patchInfo
    }

      var presponse = await axios(options);
      console.log("Publish Purpose:", purposeId)
      console.log("Response code:", presponse.status);
      console.log("Publish response:", presponse.data);
      if (presponse.status == 204) {
        return true;
      } else {
        throw(JSON.stringify(presponse.data));
      }
  } else {
    throw(JSON.stringify(response.data));
  }
}

async function purposeExists(id, accessToken) {

  console.log("Purpose check: ", id)
  var options = {
    'method': 'get',
    'url': process.env.OIDC_CI_BASE_URI + '/dpcm-mgmt/config/v1.0/privacy/purposes/'+id,
    'headers': {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  }

  return axios(options).then(response => {
    console.log("Response code:", response.status);
    console.log("GET response:", response.data);
    if (response.status == 200) {
      return true;
    } else {
      return false;
    }
  }).catch( () => {return false});
}

async function createDpcmRule(ruleName, conditions, decision, preChecked, description, accessToken) {

  var ruleInfo = {
    "assentUIDefault": preChecked,
    "conditions": conditions,
    "decision": {
      "reason": "",
      "result": decision,
      "script": ""
    },
    "description": description,
    "discloseable": true,
    "legalCategory": 4,
    "name": ruleName,
    "tags": []
  }

  console.log("Rule creation information:", ruleInfo)
  var options = {
    'method': 'post',
    'url': process.env.OIDC_CI_BASE_URI + '/dpcm-mgmt/config/v1.0/privacy/rules',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    'data': ruleInfo
  }
  return axios(options).then(response => {
    console.log("Create Rule:", ruleName)
    console.log("Response code:", response.statusCode);
    console.log("Create response:", response.data);
    if (response.statusCode == 201) {
      return true;
    } else {
      throw(response.data);
    }
  });
}

async function registerTheme(name, accessToken) {
  // Register the theme

  var zipfileName=name + ".zip";
  var themeConfig='{"name": "' + name + '", "description": "Theme for CIAM demo app."}';
  var themeFilename='"' + zipfileName + '"';

  console.log("Registering theme '" + name + "'" + " using file " + zipfileName);

  var form = new FormData();

  form.append("configuration", themeConfig);
  form.append("files", fs.createReadStream("ci-theme/"+zipfileName), themeFilename);

  var options = {
    method: 'POST',
    url: process.env.OIDC_CI_BASE_URI + '/v1.0/branding/themes',
    headers: {
      ...form.getHeaders(),
      'Authorization': 'Bearer ' + accessToken,
    },
    data: form
  };

  console.log("Making API call...");
  var response = await axios(options).catch(e => {throw(e.stack)});
  if (response.status == 201) {
    console.log("Successfully registered theme '" + name + "'");
    return true;
  } else throw(JSON.stringify(response.data));
}

async function getThemeId(name, accessToken) {
  var options = {
    'method': 'get',
    'url': process.env.OIDC_CI_BASE_URI + '/template/v1.0/branding/themes',
    'headers': {
      'Content-Type': 'application/scim+json',
      'Authorization': `Bearer ${accessToken}`
    }
  }

  console.log("Lookup Theme:" + name);
  return axios(options).then(response => {
    console.log("Response code:", response.status);
    console.log("Lookup response:", response.data);
    if (response.status == 200) {
      var pbody = response.data;
      if (pbody.themeRegistrations) {
        for (i in pbody.themeRegistrations) {
          if (pbody.themeRegistrations[i].name == name) {
            return pbody.themeRegistrations[i].id;
          }
        }
      }
    }
    return false;
  });
}

function getDpcmRuleId(name, accessToken) {
  var options = {
    'method': 'get',
    'url': process.env.OIDC_CI_BASE_URI + `/dpcm-mgmt/config/v1.0/privacy/rules?search=name%20=%20%22${name}%22`,
    'headers': {
      'Content-Type': 'application/scim+json',
      'Authorization': `Bearer ${accessToken}`
    }
  }
  console.log("Lookup Rule:" + name);

  return axios(options).then(response => {
    pbody = response.data
    console.log("Response code:", response.status);
    console.log("Lookup response:", JSON.stringify(pbody));
    if (response.status == 200) {
      if (pbody.rules[0]) {
        console.log("Returning id: " + pbody.rules[0].id);
        return pbody.rules[0].id;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }).catch( () => {return false});
}

async function createDpcmPolicy(rules, accessToken) {
  console.log("Policy lookup");
  var options = {
    'method': 'get',
    'url': process.env.OIDC_CI_BASE_URI + '/dpcm-mgmt/config/v1.0/privacy/policies/default',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  }

  var policyResp = await axios(options);
  console.log("Response code:", policyResp.status);

  if (policyResp.status == 200) {
    var version = '' + policyResp.data.version;
    var ruleList = {"ruleList": rules};
    console.log("Policy creation information:", ruleList)

    var options = {
      'method': 'put',
      'url': process.env.OIDC_CI_BASE_URI + '/dpcm-mgmt/config/v1.0/privacy/policies/default',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'if-match': version
      },
      'data': ruleList
    }

    var response = await axios(options);
    console.log("Response code:", response.status);
    if (response.status == 204) {
      return true;
    } else {
      throw(response.data);
    }
  } else {
    throw(policyResp.data);
  }
}

async function associatePurpose(appId, purposeIds, accessToken) {
  var input = [];
  for (i in purposeIds) {
    input.push({
      "op": "add",
      "value": {
        "extCategory": "app",
        "extId": appId,
        "purposeId": purposeIds[i]
      }
    });
  }

  console.log("Associate purpose:", input)
  var options = {
    'method': 'patch',
    'url': process.env.OIDC_CI_BASE_URI + '/dpcm-mgmt/config/v1.0/privacy/purpose-relationships',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    'data': input
  }

  return axios(options).then(response => {
    console.log("Response code:", response.status);
    console.log("Create response:", response.data);
    if (response.status == 204) {
      return true;
    } else {
      throw(response.data);
    }
  });
}

async function getIndentitySourceId(realm, accessToken) {
  var options = {
    'method': 'get',
    'url': process.env.OIDC_CI_BASE_URI + '/v1.0/identitysources',
    'headers': {
      'Content-Type': 'application/scim+json',
      'Authorization': `Bearer ${accessToken}`
    }
  }

  console.log("Lookup Identity Source:" + realm);
  var response = await axios(options);

  console.log("Response code:", response.status);
  console.log("Lookup response:", JSON.stringify(response.data));

  if (response.status == 200) {
    pbody = response.data;
    for (i in pbody.identitySources) {
      for (j in pbody.identitySources[i].properties) {
        if (pbody.identitySources[i].properties[j].key == "realm" &&
            pbody.identitySources[i].properties[j].value == realm) {
          return pbody.identitySources[i].id;
        }
      }
    }
    throw("Source not found for " + realm);
  } else throw("Bad response code for " + realm);
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
  getThemeID: getThemeID,
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
  setupMfaPolicy: setupMfaPolicy,
  findAccount: findAccount,
  createUser: createUser,
  titleCase: titleCase,
  createApplication: createApplication,
  getApplication: getApplication,
  applyPolicyThemeSources: applyPolicyThemeSources,
  createEula: createEula,
  createAccessType: createAccessType,
  createPurpose: createPurpose,
  purposeExists: purposeExists,
  createDpcmRule: createDpcmRule,
  getDpcmRuleId: getDpcmRuleId,
  createDpcmPolicy: createDpcmPolicy,
  associatePurpose: associatePurpose,
  getThemeId: getThemeId,
  registerTheme: registerTheme,
  getIndentitySourceId: getIndentitySourceId
};
