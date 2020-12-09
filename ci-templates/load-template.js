#!/usr/bin/env node

var request = require('request');
var dotenv = require('dotenv');
var fs = require('fs');

dotenv.config({
  path: '../.env'
});

function getAccessToken() {
  return new Promise((resolve, reject) => {

    var options = {
      method: 'POST',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/endpoint/default/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      form: {
        grant_type: 'client_credentials',
        client_id: process.env.API_CLIENT_ID,
        client_secret: process.env.API_SECRET,
      }
    };

    request(options, (error, _response, body) => {
      if (error) {
        reject(error);
      } else {
        let pb = JSON.parse(body);
        resolve(pb);
      }
    });
  });
}

function resetBranding(accessToken) {
  return new Promise((resolve, reject) => {

    var options = {
      method: 'DELETE',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/branding/reset',
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    };

    request(options, (error, response, _body) => {
      if (error) {
        reject(error);
      } else {
        if (response.statusCode == 204) resolve(true);
        else reject(response);
      }
    });
  });
}

function updateBranding(file, accessToken) {
  return new Promise((resolve, reject) => {

    var options = {
      method: 'POST',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/branding/upload',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/octet-stream'
      },
      formData: {
        attachments: file
      }
    };

    request(options, (error, response, _body) => {
      if (error) {
        reject(error);
      } else {
        if (response.statusCode == 201) resolve(true);
        else reject(response);
      }
    });
  });
}

/*
 * Main Logic
 */
async function main(file) {

  var tokenData = await getAccessToken();

  if (file == "reset") { // Reset
    console.log("Resetting Branding...");
    try {
      var result = await resetBranding(tokenData.access_token);
      if (result) console.log("Done")
      else console.log("Failed");
    } catch (e) {
      console.log("Failed: " + JSON.stringify(e));
    }
  } else { // Upload
    console.log("Uploading File: " + file);
    var templateFile = undefined;
    try {
    templateFile = fs.createReadStream(file);
  } catch(e) {console.log(e)}

    if (templateFile === undefined) {
      console.log("Cannot access file");
    } else {
    try {
      var result = await updateBranding(templateFile, tokenData.access_token);
      if (result) console.log("Done")
      else console.log("Failed");
    } catch (e) {
      console.log("Failed: " + JSON.stringify(e));
    }
  }}
};

/*
 * Execution Starts Here
 */

args = process.argv;

if (args.length != 3) {
  console.log("Usage: load-template.js <file> | reset");
} else {
  main(args[2]);
}
