#!/usr/bin/env node

/*
 * Usage: node manage-theme.js <option>
 * Where <option> is either one of:
 *  list:
 *    Lists the currently registered themes
 *  register:
 *    Upload/register the theme for this app.
 *    Note: For this to work you must delete the existing theme using "node manage-theme.js delete"
 *  delete:
 *    Delete the TrustMeInsurance theme.
 *    For this to work you must configure all apps such that they do not use the theme
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

function registerTheme(accessToken) {
  // Register the theme
  return new Promise((resolve, reject) => {  
   
    var zipfileName=process.env.THEME_NAME + ".zip";
    var themeConfig='{"name": "' + process.env.THEME_NAME + '", "description": "' + process.env.THEME_DESC + '"}';
    var themeFilename='"' + process.env.THEME_NAME + ".zip" + '"'; 
    //var themeFilename=process.env.THEME_NAME + ".zip"; 
    console.log("Registering theme for " + process.env.THEME_NAME + " using file " + zipfileName);

    // See if the zip file is there
    var templateFile = undefined;
    try {
      templateFile = fs.createReadStream(zipfileName);
    } catch(e) {console.log(e);reject(e)}

    if (templateFile === undefined) {
      console.log("Cannot access file " + zipfileName);
      reject("Cannot access file " + zipfileName);
    }

    // Register the theme
    var options = {
      method: 'POST',
      url: process.env.OIDC_CI_BASE_URI + '/v1.0/branding/themes',
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
        if (response.statusCode == 201) {
          console.log("Successfully registered theme " + process.env.THEME_NAME);
          resolve(true);
        } else reject(response);
      }
    });
  });
}



function deleteTheme(accessToken,themeID) {
  return new Promise((resolve, reject) => {
    // Delete registered theme by id
    console.log("Deleting theme '" + process.env.THEME_NAME + "'");
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
        else reject(response);
      }
    });
  });
}


async function deleteMyTheme(accessToken,themes) {
    // Only async functions can call other functions with "await"
    // themes contains the parsed JSON content of the body of the response to GET /v1.0/branding/themes
    themefound=false;
    for (i=0;i < themes.total;i++) {
      reg=themes.themeRegistrations[i];
      if (reg.name == process.env.THEME_NAME) {
        // There's an existing theme for this app: delete this theme
        themefound=true;
        var result = await deleteTheme(accessToken, reg.id);
        if (result) console.log("Successfully deleted theme '" + process.env.THEME_NAME + "'");
        else console.log("Failed to delete theme " + process.env.THEME_NAME);
      }
    }
    if (!themefound) console.log("Cannot delete theme " + process.env.THEME_NAME + ". It does not exist.");
    return (themefound);
  }



/*
 * Main Logic
 */
async function main(action) {

  var tokenData = await getAccessToken();

  var themesData = await getThemesData(tokenData.access_token);

  switch(action) {
    case "list":
      listThemes(themesData);
      break;
    case "register":
      await registerTheme(tokenData.access_token);
      break;
    case "delete":
      await deleteMyTheme(tokenData.access_token,themesData);
      break;
    default:
      // code block
  }
};


/*
 * Execution Starts Here
 */

args = process.argv;

if (args.length != 3) {
  console.log("Usage: node " + filenameOnly(args[1]) + " list | register | delete ");
} else {
  main(args[2]);
}
