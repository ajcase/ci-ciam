#!/usr/bin/env node

/*
 * Usage: node manage-theme.js <option>
 * Where <option> is either one of:
 *  list:
 *    Lists the currently registered themes
 *  register:
 *    Upload/register the theme for this app.
 *    Note: For this to work the theme may not exist. Verify this by using "node manage-theme.js list".
 *    If needed: delete the existing theme using "node manage-theme.js delete"
 *  update:
 *    Upload/update the theme for this app.
 *    Note: For this to work the theme must exist. Verify this by using "node manage-theme.js list"
 *  delete:
 *    Delete the TrustMeInsurance theme.
 *    For this to work you must configure all apps such that they do not use the theme
 *
 *
 * Note: this script uses the .env file in ci-ciam for following parameters:
 * - THEME_NAME: defaults to TrustMeInsurance
 * - API_CLIENT_ID and API_SECRET: credentials for privileged API access
 * - OIDC_CI_BASE_URI: points to your tenant
 *
 */

var request = require('request');
var dotenv = require('dotenv');
var fs = require('fs');

// read the .env environment file
dotenv.config({
  path: '../.env'
});

function filenameOnly(path) {
    // return the filename of a file path
    return(path.split('\\').pop().split('/').pop());
}

function getAccessToken() {
  // get token to talk with Verify
  // returns the body of the POST call as an object
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

function getThemesData(accessToken) {
  // get registered themes in Verify
  // returns the body of the GET call as an object
  return new Promise((resolve, reject) => {
    // Query registered themes using API and return these in a JS object
    var options = {
      method: 'GET',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/branding/themes',
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    };

    request(options, (error, response, _body) => {
      if (error) {
        reject(error);
      } else {
        if (response.statusCode == 200) {
          // Parse JSON-formatted body of the response into an object
          let bodyObj=JSON.parse(response.body);
          resolve(bodyObj);
        } else reject(response);
      }
    });
  });
}

function listThemes(themes) {
  // themes contains the parsed JSON content of the body of the response to GET /v1.0/branding/themes
  for (i=0;i < themes.total;i++) {
    theme=themes.themeRegistrations[i];
    // print name, id and description of a registered theme
    console.log(theme.name.padEnd(20)+" | "+theme.id.padEnd(35)+" | "+theme.description.padEnd(35));
  }
  return (true);
}

function registerTheme(accessToken,themeName) {
  // Register the theme
  return new Promise((resolve, reject) => {

    var zipfileName=themeName + ".zip";
    var themeConfig='{"name": "' + themeName + '", "description": "Uploaded via API"}';
    var themeFilename='"' + themeName + ".zip" + '"';

    console.log("Registering theme '" + themeName + "'" + " using file " + zipfileName);

    // Register the theme
    // console.log("Preparing API call...");
    var options = {
      method: 'POST',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/branding/themes',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      formData: {
        'files': {
          'value': fs.createReadStream(zipfileName),
          'options': {
            'filename': themeFilename
          }
        },
        'configuration': themeConfig
      }
    };
    console.log("Making API call...");
    request(options, (error, response, _body) => {
      if (error) {
        reject(error);
      } else {
        if (response.statusCode == 201) {
          console.log("Successfully registered theme '" + themeName + "'");
          resolve(true);
        } else reject(response);
      }
    });
  }).catch(error => console.log("ERROR details: \n\t" + error.stack));
}

function updateTheme(accessToken,themeID,themeName) {
  // Update the theme
  return new Promise((resolve, reject) => {

    var zipfileName=themeName + ".zip";
    var themeConfig='{"name": "' + themeName + '", "description": "Theme uploaded via API"}';
    var themeFilename='"' + themeName + ".zip" + '"';
    console.log("Updating theme for '" + themeName + "'" + " using file " + zipfileName);

    templateFile = fs.createReadStream(zipfileName);

    templateFile.on('error', function(error) {
      console.log("ERROR: Cannot access file " + zipfileName);
      // console.log("Detailed error: " + error.stack);
      reject(error);
    });

    //templateFile.on('end',function() {
      // Update the theme
      var options = {
        method: 'PUT',
        url: process.env.OIDC_CI_BASE_URI + '/v1.0/branding/themes/' + themeID,
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        formData: {
          'files': {
            'value': templateFile,
            'options': {
              'filename': themeFilename
            }
          },
          'configuration': themeConfig
        }
      };
      console.log("Making API call...");
      request(options, (error, response, _body) => {
        if (error) {
          reject(error);
        } else {
          if (response.statusCode == 204) {
            // console.log("Successfully updated theme id " + themeID);
            resolve(true);
          } else reject(response);
        }
      });
    //});
  }).catch(error => console.log("ERROR details: \n\t" + error.stack));
}


function deleteTheme(accessToken,themeID,themeName) {
  return new Promise((resolve, reject) => {
    // Delete registered theme by id
    console.log("Deleting theme '" + themeName + "'");
    var options = {
      method: 'DELETE',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/branding/themes/' + themeID,
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    };
    console.log("Making API call...");
    request(options, (error, response, _body) => {
      if (error) {
        //console.log("deleteTheme:Error: " + error);
        //console.log("deleteTheme:Response: " + JSON.stringify(response));
        reject(error);
      } else {
        //console.log("Response code: " + response.statusCode);
        //console.log("Response : " + JSON.stringify(response));
        if (response.statusCode == 204) resolve(true);
        else reject(response.body);
      }
    });
  });
}

function downloadTheme(accessToken,themeID,themeName) {
  return new Promise((resolve, reject) => {
    // Download registered theme by id
    console.log("Get theme '" + themeName + "'");
    var options = {
      method: 'GET',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/branding/themes/' + themeID,
      headers: {
        'Authorization': 'Bearer ' + accessToken
      },
      gzip: true
    };
    console.log("Making API call...");
    var file = fs.createWriteStream(themeName + ".zip");
    let stream = request(options).pipe(file)
    .on('finish', () => {
      console.log(`The file has finished downloading.`);
      resolve(true);
    })
    .on('error', (error) => {
      reject(error);
    });
  });
}


async function deleteMyTheme(accessToken,themes,themeName) {
    // Only async functions can call other functions with "await"
    // themes contains the parsed JSON content of the body of the response to GET /v1.0/branding/themes
    themefound=false;
    for (i=0;i < themes.total;i++) {
      reg=themes.themeRegistrations[i];
      if (reg.name == themeName) {
        // There's an existing theme for this app: delete this theme
        themefound=true;
	try {
        	var result = await deleteTheme(accessToken, reg.id,themeName);
        	if (result) console.log("Successfully deleted theme '" + themeName + "'");
        	else console.log("Failed to delete theme " + themeName);
        } catch (e) { console.log("Failed to delete theme: " + e); }
      }
    }
    if (!themefound) console.log("Cannot delete theme " + themeName + ". It does not exist.");
    return (themefound);
  }

async function updateMyTheme(accessToken,themes,themeName) {
    // Only async functions can call other functions with "await"
    // themes contains the parsed JSON content of the body of the response to GET /v1.0/branding/themes
    themefound=false;
    for (i=0;i < themes.total;i++) {
      reg=themes.themeRegistrations[i];
      if (reg.name == themeName) {
        // There's an existing theme for this app: update this theme
        themefound=true;
        var result = await updateTheme(accessToken, reg.id,themeName);
        if (result) console.log("Successfully updated theme '" + themeName + "'");
        else console.log("Failed to update theme " + themeName);
      }
    }
    if (!themefound) console.log("Cannot update theme " + themeName + ". It does not exist.");
    return (themefound);
  }

  async function downloadMyTheme(accessToken,themes,themeName) {
      // Only async functions can call other functions with "await"
      // themes contains the parsed JSON content of the body of the response to GET /v1.0/branding/themes
      themefound=false;
      for (i=0;i < themes.total;i++) {
        reg=themes.themeRegistrations[i];
        if (reg.name == themeName) {
          // There's an existing theme for this app: download this theme
          themefound=true;
          var result = await downloadTheme(accessToken, reg.id, themeName);
          if (result) console.log("Successfully downloaded theme '" + themeName + "'");
          else console.log("Failed to download theme " + themeName);
        }
      }
      if (!themefound) console.log("Cannot download theme " + themeName + ". It does not exist.");
      return (themefound);
    }

/*
 * Main Logic
 */
async function main(args) {
  var tokenData = await getAccessToken();
  var themeName = args[3] ? args[3] : process.env.THEME_NAME;
  var themesData = await getThemesData(tokenData.access_token);

  switch(args[2]) {
    case "list":
      listThemes(themesData);
      break;
    case "register":
      await registerTheme(tokenData.access_token,themeName);
      break;
    case "delete":
      await deleteMyTheme(tokenData.access_token,themesData,themeName);
      break;
    case "update":
      await updateMyTheme(tokenData.access_token,themesData,themeName);
      break;
    case "download":
      await downloadMyTheme(tokenData.access_token,themesData, themeName);
      break;
    default:
      // code block
  }
};


/*
 * Execution Starts Here
 */

args = process.argv;

if (args.length < 3) {
  console.log("Usage: node " + filenameOnly(args[1]) + " <list | download | register | update | delete> [theme]");
} else {
  main(args);
}
