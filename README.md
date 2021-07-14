# Contents

[TOC]

# Introduction

This repository contains assets required to set up a Consumer IAM Demonstration using
the provided NodeJS application and an IBM Security Verify tenant. Then NodeJS application represent a demo company called TrustMeInsurance that is specialised in insurances and loans.

## Demonstration Components
The demonstration environment contains the following components:

### Demo Application
The demonstration application is a NodeJS Express application.

NodeJS is an application execution environment based on
JavaScript.  NodeJS applications can be hosted in many places including on a local machine, in a container environment, or on a hosted service.

These instructions assume a local installation of the Node Package Manager (npm).

### IBM Security Verify

IBM Security Verify is an Identity-as-a-Service (IDaaS) and Authentication-as-a-Service (AaaS) platform.  In this demonstration system it provides all of the authentication and identity services required by the demonstration application.  Integration is via OpenID Connect and privileged REST API's.

If you do not have an Verify tenant, you must complete at
least Exercises 1 and 2 from the [IBM Security Verify Basics Cookbook](https://ibm.biz/cloudidcookbook) as a pre-requisite for this cookbook.

### Google

Google is used as an example Social Sign-On provider.  It is integrated with the demonstration application via Verify.  You will need a Google account so that you can register your Verify tenant as an application.

Note: When creating the application definition on Google, note that you need
to enable the "People API". If you do not do this you will get errors
during single sign-on.

### LinkedIn

LinkedIn is used as an example Social Sign-On provider.  It is integrated with the demonstration application via Verify.  You will need a LinkedIn account so that you can register your Verify tenant as an application.

# Verify Setup

## Identity Sources

### Introduction

The demo application uses 3 identity sources; Verify's native Cloud Directory, Google and LinkedIn.
Use the Verify admin console to navigate to Configuration -> Identity Sources to configure these.

Make sure the *Primary Identity Source* is set to **Cloud Directory**.

### Create Identity Sources for Google and LinkedIn

This requires you to have an account for these services and create
application definitions for Verify. Detailed instructions can be found in the Verify documentation, see these links:

* [Instructions for Google](https://www.ibm.com/support/knowledgecenter/SSCT62/com.ibm.iamservice.doc/tasks/idp_config_google.html)
* [Instructions for LinkedIn](https://www.ibm.com/docs/en/security-verify?topic=source-configuring-your-application-in-linkedin)

You will need to provide redirect URIs as part of this which are given in the Verify Console (along with a link to the developer consoles of the services). When application definitions are created, you will get a ClientID and Secret which you
will enter into the Verify Identity Source definition.

Set the following for Identity Linking for both Google and LinkedIn:

  - *Enabled identity linking for this identity source*: On

  - *Unique User Identifier*: email

  - *Just-in-time Provisioning*: On

## Create Data Consent & Privacy Items

### Introduction

Three Verify DPCM (Data Privacy and Consent Management) items need to be introduced:

1. A purpose "Communications"
2. A purpose "Paperless Billing"
3. A EULA "Terms"

### Create the Purposes

Proceed as follows to add the "Communications" purpose:

* Sign in to your tenant as an administrator
* Navigate to "Data privacy & consent"
* Navigate to the "Purposes" tab
* Click "Create Purpose"
* In the "General Settings" section enter the following:
	* Purpose name: Communications
	* Purpose ID: communications
	* Description: A preference that indicates that the customer agrees with receiving information on promotions, new products, and personalized advice weekly.
	* Tags: trustme
* Click Next
* In the "Default and custom settings" section do the following:
	* Create an "Access type" of value "Read" and set the "Access type ID" to "read"
*  Click Next
*  In the "Attributes" section do the following:
	*  Add the attribute "email" and leave other fields default
* Click "Create Purpose"


Now do the same for "Paperless Billing" using the same procedure. Only following "General Settings" items are different:
* 	Purpose name: Paperless Billing
* 	Purpose ID: paperless-billing
* 	Description: A preference that indicates that the customer agrees with paperless billing

### Create the EULA

Here's the procedure to add the "Terms" EULA:

* Sign in to your tenant as an administrator
* Navigate to "Data privacy & consent"
* Navigate to the "EULAs" tab
* Click "Create EULA"
* In the "General Settings" section enter the following:
	* EULA name: Terms
	* EULA ID: terms
	* Description: The terms and conditions by which a user may use the TrustMeInsurances website
	* Tags: trustme
* Click Next
* In the "Terms of use" section enter the following:
	* URI: http://localhost:3000/terms.html
* Click "Create EULA"

You are of course free to point to another html document instead of the http://localhost:3000/terms.html above.


## Create an Application in Verify

Login to your Verify tenant administrator console as an
administrator.

1.  Go to "Applications" and click "Add application"

2.  Select "Custom Application" and click "Add application"

3.  Set the name to "TrustMeInsurance"

4.  Set the description, and company name (values don't matter)

5. On the "Sign-in" tab change the following settings, and leave other settings as default

    1.  Sign-on method: Open ID Connect 1.0

    2.  Application URL: http://localhost:3000

    3.  Clear: Require proof key code code exchange (PKCE) verification

    4.  User Consent: Do not ask for consent

    5.  Re-direct URIs: http://localhost:3000/oauth/callback

    6.  Select: Send all known user attributes in the ID token

    7.  Select: Specific supported identity sources

        1.  Select Cloud Directory, Google, LinkedIn

    8.  Click Save

	**Note**: After creation a single sign-on client id and secret will be generated. The id and secret correspond to the OIDC_CLIENT_ID and OIDC_CLIENT_ID_SECRET of the .env file which is explained below.
	
	**Note:** API access for sign-in is left to its default of "not restricted". Hence  entitlements such as "authentication yourself", "reset your password", "create consent records" and "read privacy consent" are granted to the application sign-on token. This token is granted to an authenticated user. See this [link ](https://www.ibm.com/docs/en/security-verify?topic=provider-default-api-client-sign-token-entitlements)for a complete list of these default entitlements.


6. In the "API access" tab:

	1. 	Click "Add API client"
	2. Choose a name e.g. "TrustMeInsurance Privileged API Client"
	3. Select the following API access

		    - Manage access policies
		    - Manage attribute sources
		    - Manage templates
		    - Manage users and standard groups
		    - Read application configuration

	**Note**: This API client is used for privileged API access to your Verify tenant. Such access is needed for e.g. automated setup and user self-registration.  After creation a privileged client id and secret will be generated. The id and secret correspond to the API_CLIENT_ID and API_SECRET of the .env file which is explained below.   

7.  In the "Entitlements" tab:

    1.  Select: All users are entitled to this application

    2.  Click Save

8. In the "Privacy" tab:

   Add EULA "Terms", purpose "Paperless Billing" and "Communications". These were 
   configured in the section "Create Data Consent & Privacy items".
   
9. Click Save


# Setup NodeJS Application

## Clone Repository

In the directory where you want the repo clone directory to be created, run
this command:

```
git clone https://github.com/petervolckaert/ci-ciam.git
```


## Install Packages

Go into the *ci-ciam* directory and install required packages:

```
cd ci-ciam
npm install
```

## Create environment file

Create the *.env* file from the provided sample:

```
cp dotenv.sample .env
```

Edit the *.env* file and complete for your environment. For a default configuration, just change the XXXXXXX parts to accomodate your environment

```
PORT=3000
OIDC_REDIRECT_URI=http://localhost:3000/oauth/callback
OIDC_CI_BASE_URI=https://XXXXXXX.ice.ibmcloud.com
OIDC_CLIENT_ID=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
OIDC_CLIENT_SECRET=XXXXXXXXXX
API_CLIENT_ID=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
API_SECRET=XXXXXXXXXX
APP=insurance
MFAGROUP=MFAGroup
ALLOW_DYNAMIC_SETUP=true
MARKETING_PURPOSE_ID=newsletter
PAPERLESS_PURPOSE_ID=paperless-billing
READ_ACCESS_TYPE=read
TERMS_PURPOSE_ID=terms
DEFAULT_ACCESS_TYPE=default
EMAIL_ATTRIBUTE_ID=3
# THEME_NAME and THEME_DESC will determine the name and the description
# of the app's theme. Used by manage-theme.js
THEME_NAME=TrustMeInsurance
THEME_DESC="Theme for the TrustMeInsurance CIAM demo app"
# APP_NAME must be the name of the custom app that is defined in your Verify tenant
# Used by app.js to retrieve the ID of the theme for the app.
APP_NAME=TrustMeInsurance
# BRAND_ID should be 'false'. Any other value will create users with an @BRAND_ID suffix
# BRAND_ID is used in open-account.js and some theme files.
BRAND_ID=false
```

Save the file and close the editor.

## Start the application

Run the following command to start the NodeJS application:

```
npm start
```

The application is running in the foreground, so you need to leave this
window open.

# Perform Automated Setup

## Run the Setup in the Consumer Application

Use a browser to connect to the following URL:

**http://localhost:3000/setup**

Select the **Create Group/Attributes/Policy** checkbox at the bottom of
the page and click **Submit**.

This will create the specified MFA Group, the custom attributes required
by the demo, and an Access Policy which requires 2FA for members of the
MFA Group.

## Apply MFA Access Policy to Application

Login to your Verify tenant administrator console as an
administrator.

1.  Go to Applications menu and edit the Consumer App definition

2.  On Sign-in tab:

    1.  Clear: Use default policy

    2.  Click edit icon for Access Policy

        1.  Select "Require 2FA for MFAGroup" policy

        2.  Click OK

    3.  Click Save

## Disable setup option

This is optional.  If you want to disable the /setup URL in the application:

Edit the .env file:

```
ALLOW_DYNAMIC_SETUP=false
```

Restart the application.

# Configure Application Theme

## Introduction

When you configure an application in IBM Security Verify, you can apply a *theme* so that your login pages, logout pages, notifications and so on have your look&feel.  
Configuring a theme for an app will only affect the look & feel when accessing that app. Other access to the tenant is not affected.

The demo application repository comes with a file **TrustMeInsurance.zip** which must be uploaded to your Verify tenant. Once uploaded, you must configure the demo app to use the theme.


## Register theme in Verify

Navigate to the ci-ciam/ci-theme directory.
Then run the following command to register the theme to your Verify tenant. This command use the .env file in the parent directory ci-ciam. The parameters THEME_NAME and THEME_DESC determine the name and the description. By default the theme name is "TrustMeInsurance" and the zipfile TrustMeInsurance.zip will be uploaded.

```
node manage-theme.js register
```
**Note:** Please see **README-Theme.md** in the *ci-theme* directory for a guide on how to modify the theme, delete the theme or list the current tenant's themes.

## Configure your app for the theme

Login to your Verify tenant administrator console as an
administrator.

1. Go to the hamburger menu and select "Applications"
2. Edit the settings of the Custom Application by clicking the settings wheel. 
3. On the General tab: set the Theme to the newly registered theme which is "TrustMeInsurance" by default
4. Click Save

**Note:** to reset the theme to the default Verify theme simply select "default" as the app theme.

# Making Changes To the Default Config

If you change your setup in the .env file for following parameters:

* The port of the NodeJS app. (Default=3000)
* The name of the application. (Default=TrustMeInsurance)

... then you must also recreate the theme zipfile. Proceed as follows:

* Update the file ci-ciam/ci-theme/templates/common/labels/default/**template_labels.properties** to accomodate your setup.
* Navigate to ci-ciam/ci-theme
* Zip up the templates directory again and name your file <app name>.zip


# License

The contents of this repository are open-source under the Apache 2.0 licence.

```
Copyright 2021 International Business Machines

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
