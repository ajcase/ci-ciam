
# Contents

- [**Introduction**](#introduction)
  - [Demonstration Components](#demonstration-components)
- [**Verify Setup**](#verify-setup)
  - [Identity Sources](#identity-sources)
  - [Create an Application in Verify](#create-an-application-in-verify)
  - [Create an API Client](#create-an-api-client)
- [**Setup NodeJS Application**](#setup-nodejs-application)
  - [Clone Repository from GitHub](#clone-repository-from-github)
  - [Install Packages](#install-packages)
  - [Create environment file](#create-environment-file)
  - [Start the application](#start-the-application)
- [**Perform Automated Setup**](#perform-automated-setup)
  - [Run the Setup in the Consumer Application](#run-the-setup-in-the-consumer-application)
  - [Apply MFA Access Policy to Application](#apply-mfa-access-policy-to-application)
  - [Disable setup option](#disable-setup-option)
- [**Configure Template Pages**](#configure-template-pages)
  - [Create and complete properties file](#create-and-complete-properties-file)
  - [Run script to create template ZIP file](#run-script-to-create-template-zip-file)
  - [Upload ZIP to Verify](#upload-zip-to-verify)

# Introduction

This repository contains assets required to set up a Consumer IAM Demonstration using
the provided NodeJS application and an IBM Security Verify tenant.

## Demonstration Components
The demonstration environment contains the following components:

### Demo Application
The demonstration application is a NodeJS Express application.

NodeJS is an application execution environment based on
JavaScript.  NodeJS applications can be hosted in many places including on a local machine,
in a container environment, or on a hosted service.

These instructions assume a local installation of Node Package Manager (npm).

### IBM Security Verify

IBM Security Verify is an Identity-as-a-Service (IDaaS) and Authentication-as-a-Service (AaaS) platform.  In this demonstration system it provides all of the authentication and identity services
required by the demonstration application.  Integration is via REST API.

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

Make sure the *Primary Identity Source* is set to **Cloud Directory**.

### Create Identity Sources for Google and LinkedIn

This requires you to have an account for these services and create
application definitions for Verify. You will need to provide
re-direct URIs as part of this which are given in the CI Console (along
with link to the developer consoles of the services). When application
definitions are created, you will get Client/App ID and Secret which you
will enter into the Verify Identity Source definition.

Set the following for Identity Linking:

  - Enabled: On

  - Unique User Identifier: email

  - Just-in-time Provisioning: On

### Create Data & Privacy items

1. Create purpose "Communications"
2. Create purpose "Paperless Billing"
3. Create EULA "Terms"

!!**TO BE COMPLETED with details**!!


## Create an Application in Verify

Login to your Verify tenant administrator console as an
administrator.

1.  Go to Applications menu and click Add application

2.  Select Custom Application and click Add application

3.  Complete name, description, and company name (values don't matter)

4.  On Sign-in tab:

    1.  Sign-on Method: Open ID Connect 1.0

    2.  Application URL: http://localhost:3000

    3.  Clear: Require proof key code code exchange (PKCE) verification

    4.  User Consent: Do not ask for consent

    5.  Re-direct URIs: http://localhost:3000/oauth/callback

    6.  Select: Send all known user attributes in the ID token

    7.  Select: Specific supported identity sources

        1.  Select Cloud Directory, Google, LinkedIn

    8.  Click Save

5.  In the API Access tab:

	1. 	Edit the API key that was created for the app
	2. Check "Configure API Access"
	3. Select the following API access

		    - Manage access policies
		    - Manage attribute sources
		    - Manage users and standard Groups
		    - Manage templates
		    - Manage privacy purposes and EULA
		    - Manage privacy consents

6.  In entitlements tab:

    1.  Select: All users are entitled to this application

    2.  Click Save

7. In Privacy tab:

   Add EULA "Terms", purpose "Paperless Billing" and "Communications". These were 
   configured in the section "Create Data & Privacy items".

8.  Return to Sign-on tab:

    1.  Make a note of Client ID and Client Secret


# Setup NodeJS Application

## Clone Repository

In the directory where you want the repo clone directory to be created, run
this command:

```
git clone https://github.com/ajcase/ci-ciam.git
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

Edit the *.env* file and complete for your environment:

```
OIDC_CI_BASE_URI=https://xxxxxxxx.ice.ibmcloud.com
OIDC_CLIENT_ID=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
OIDC_CLIENT_SECRET=XXXXXXXXXX
OIDC_REDIRECT_URI=http://localhost:3000/oauth/callback
API_CLIENT_ID=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
API_SECRET=XXXXXXXXXX
APP=insurance
MFAGROUP=MFAGroup
ALLOW_DYNAMIC_SETUP=true
MARKETING_PURPOSE_ID=
PAPERLESS_PURPOSE_ID=
READ_ACCESS_TYPE=
TERMS_PURPOSE_ID=
DEFAULT_ACCESS_TYPE=default
EMAIL_ATTRIBUTE_ID=3
THEME_NAME=TrustMeInsurance
THEME_DESC="Theme for TrustMeInsurance demo CIAM app"
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

This is optional. When you configure an application in IBM Security Verify, you can apply a *theme* so that your brand displays on login and logout pages. 
Configuring a theme for an app will only affect the look & feel when accessing that app. Other access to the tenant is not affected.

Note: many assets in the theme pages are loaded from the NodeJS server. If
this server is not available (it's not running or can't be reached by
the client) then the pages will not render properly.

## Create and complete properties file

Go to the ci-theme directory and make a copy of the sample
properties file:

```
cd ci-theme
cp theme.properties.sample theme.properties
```

Edit the properties file and complete for your environment:

```
CI_TENANT_URL=https://xxxxxxx.verify.ibm.com
DEMO_APPLICATION_URL=http://localhost:3000
GOOGLE_ID_SOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
LINKEDIN_ID_SOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
THEME_NAME=TrustMeInsurance
```

The Google and LinkedIn ID sources can be found in the Identity Source
properties in the Verify admin console.

## Run script to create theme ZIP file

Navigate to the ci-theme directory.
Then run the script below to replace variables in the theme files and save a ZIP
file for uploading:

```
cd ci-theme
./fix-theme.sh
```
This will result in a great number of messages like the below. This is ok.

```
...

updating: templates/notifications/user_management/login/es/user_password_reset_email.xml.bak (deflated 59%)
updating: templates/notifications/user_management/login/es/user_password_change_not_show_email.xml.bak (deflated 57%)
updating: templates/notifications/user_management/login/es/access_denied_email.html (deflated 58%)
updating: templates/notifications/user_management/login/es/mfa_sign_in_attempt_email.html (deflated 61%)
updating: templates/notifications/user_management/login/es/user_password_reset_email.xml (deflated 59%)
```

## Register theme in Verify

Navigate to the ci-theme directory.
Then run the following command to register the theme to your Verify tenant. This command use the .env file in parent directory. The .env file contains the configuration for your Verify tenant.

```
node manage-theme.js register
```
## Configure your app for the theme

Login to your Verify tenant administrator console as an
administrator.

1. Go to the hamburger menu and select Applications
2. Edit the settings of the Custom Application by clicking the settings wheel. 
3. On the General tab: set the Theme to the newly registered theme.
4. Click Save

Note: to reset the theme to the default Verify theme simply select "default" as the app theme.

## Modifying the theme

Please see **README-Theme.md** in the *ci-theme* directory for a guide on how to modify the theme.


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
