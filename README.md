
# Contents

- [**Introduction**](#introduction)
  - [Demonstration Components](#demonstration-components)
- [**Cloud Identity Setup**](#cloud-identity-setup)
  - [Identity Sources](#identity-sources)
  - [Create an Application in Cloud Identity](#create-an-application-in-cloud-identity)
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
  - [Upload ZIP to Cloud Identity](#upload-zip-to-cloud-identity)

# Introduction

This repository contains assets required to set up a Consumer IAM Demonstration using
the provided NodeJS application and an IBM Cloud Identity tenant.

## Demonstration Components
The demonstration environment contains the following components:

### Demo Application
The demonstration application is a NodeJS Express application.

NodeJS is an application execution environment based on
JavaScript.  NodeJS applications can be hosted in many places including on a local machine,
in a container environment, or on a hosted service.

These instructions assume a local installation of Node Package Manager (npm).

### IBM Cloud Identity

IBM Cloud Identity is an Identity-as-a-Service (IDaaS) and Authentication-as-a-Service (AaaS) platform.  In this demonstration system it provides all of the authentication and identity services
required by the demonstration application.  Integration is via REST API.

If you do not have an IBM Cloud Identity tenant, you must complete at
least Exercises 1 and 2 from the [IBM Cloud Identity Basics Cookbook](https://ibm.biz/cloudidcookbook) as a pre-requisite for this cookbook.

### Google

Google is used as an example Social Sign-On provider.  It is integrated with the demonstration application via IBM Cloud Identity.  You will need a Google account so that you can register your IBM Cloud Identity tenant as an application.

Note: When creating the application definition on Google, note that you need
to enable the "People API". If you do not do this you will get errors
during single sign-on.

### LinkedIn

LinkedIn is used as an example Social Sign-On provider.  It is integrated with the demonstration application via IBM Cloud Identity.  You will need a LinkedIn account so that you can register your IBM Cloud Identity tenant as an application.

# Cloud Identity Setup

## Identity Sources

Make sure the *Primary Identity Source* is set to **Cloud Directory**.

### Create Identity Sources for Google and LinkedIn

This requires you to have an account for these services and create
application definitions for Cloud Identity. You will need to provide
re-direct URIs as part of this which are given in the CI Console (along
with link to the developer consoles of the services). When application
definitions are created, you will get Client/App ID and Secret which you
will enter into the Cloud Identity Identity Source definition.

Set the following for Identity Linking:

  - Enabled: On

  - Unique User Identifier: email

  - Just-in-time Provisioning: On

After saving each Identity Source, go back into its properties and make
a note of the Identity Source ID. This is needed when updating the Cloud
Identity template pages.

## Create an Application in Cloud Identity

Login to your Cloud Identity tenant administrator console as an
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

5.  In entitlements tab:

    1.  Select: All users are entitled to this application

    2.  Click Save

6.  Return to Sign-on tab:

    1.  Make a note of (Application)Client ID and Client Secret

## Create an API Client

Login to your Cloud Identity tenant administrator console as an
administrator.

1.  Go to Configuration menu, API Access tab and click Add API client

2.  Complete name (value doesn't matter)

3.  Select the following API access

    1.  Manage Access Policies

    2.  Manage Attribute Sources

    3.  Manage Users and Standard Groups

    4.  Manage Templates

4.  Click Save

5.  Select new client and edit

    1.  Make a note of Client ID and Client Secret

# Setup NodeJS Application

## Clone Repository

In the directory where you want the repo clone directory to be created, run
this command:

```
git clone https://github.com/iamdemoing/ci-ciam.git
```

## Install Packages

Go into the *ci-ciam* directory and install required packages:

```
cd ci-ciam
git install
```

## Create environment file

Create the *.env* file from the provided sample:

```
cp dotenv.sample .env
```

Edit the *.env* file and complete for your environment:

```
OIDC_CI_BASE\_URI=https://xxxxxxxxx.ice.ibmcloud.com
OIDC_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
OIDC_CLIENT_SECRET=xxxxxxxxxx
OIDC_REDIRECT_URI=http://localhost:3000/oauth/callback
API_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
API_SECRET=xxxxxxxxxx
APP=insurance
MFAGROUP=MFAGroup
ALLOW_DYNAMIC_SETUP=true
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

**https://localhost:3000/setup**

Select the **Create Group/Attributes/Policy** checkbox at the bottom of
the page and click **Submit**.

This will create the specified MFA Group, the custom attributes required
by the demo, and an Access Policy which requires 2FA for members of the
MFA Group.

## Apply MFA Access Policy to Application

Login to your Cloud Identity tenant administrator console as an
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

# Configure Template Pages

This is optional. The demonstration environment works without this
step but you will see the standard Cloud Identity pages when performing
login or logout.

If you replace the template pages this will affect all access to the
tenant.

Many assets in the template pages are loaded from the NodeJS server. If
this server is not available (it's not running or can't be reached by
the client) then the pages will not render properly.

## Create and complete properties file

Go to the ci-templates directory and make a copy of the sample
properties file:

```
cd ci-templates
cp template.properties.sample template.properties
```

Edit the properties file and complete for your environment:

```
CI_TENANT_URL=https://xxxxxxx.ice.ibmcloud.com
DEMO_APPLICATION_URL=http://localhost:3000
GOOGLE_ID_SOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
LINKEDIN_ID_SOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

The Google and LinkedIn ID sources can be found in the Identity Source
properties in the Cloud Identity admin console.

## Run script to create template ZIP file

Run the script to replace variables in the template files and save a ZIP
file for uploading:

```
fix-templates.sh
```

## Upload ZIP to Cloud Identity

Run the following command to upload the branding to your Cloud Identity
tenant. This command reads Cloud Identity and API Client ID and Secret
from the .env file in parent directory.

```
node load-template.js templates.zip
```

If you need to reset the branding, use this command:

```
node load-template.js reset
```

# License

The contents of this repository are open-source under the Apache 2.0 licence.

```
Copyright 2020 International Business Machines

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
