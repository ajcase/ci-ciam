# Introduction
This repository contains the assets required to set up a Consumer IAM Demonstration for the insurance industry using the provided NodeJS application and an IBM Security Verify SaaS tenant.

# Demonstration Components
The demonstration environment consists of the following components:

## NodeJS Application
The NodeJS application in this repository represents the web application of a fictional insurance company called TrustMeInsurance.

The demonstration application is a NodeJS Express application which uses Handlebars for rendering pages.

NodeJS is an application execution environment based on JavaScript.  NodeJS applications can be hosted in many places including on a local machine, in a container environment, or on a hosted service.

These instructions assume a local installation using the Node Package Manager (npm) utility.

## IBM Security Verify SaaS

IBM Security Verify SaaS is an Identity-as-a-Service (IDaaS) which provides directory services, authentication, single sign-on, multi-factor authentication, policy-based authorization, and data privacy and consent management.

In this demonstration environment, Verify SaaS provides all of the identity and access services required by the demonstration application.

Integration for authentication is via OpenID Connect. Integration for account management and data privacy and consent management is via REST API's.

## Social Sign-on providers (optional)
The demo can show integration with Social Sign-on Providers.  This allows users to set up account linking with a social account as an alternative authentication method to using a site-specific username and password.

LinkedIn, Facebook, and Google can be configured in this demo environment (other social sign-on providers are supported by Verify SaaS).

# Pre-requisites

## IBM Security Verify tenant
You will need administrator access to an IBM Security Verify tenant to set up this demonstration environment.  If you do not have a tenant, you can [sign up for a free trial tenant here](https://ibm.biz/verifytrial).

## NodeJS environment
To run the demonstration application on your local machine, you will need to install NodeJS.  You can [download NodeJS here](https://nodejs.org/).

# Setup instructions
## Clone or download this repository
If you have a git client installed on your local machine, clone this repository using the following command:

```bash
git clone https://github.com/iamdemoing/ci-ciam
```

This will create a *ci-ciam* directory in the working directory.

If you don't have a git client, you can download a ZIP file from Github:
1. Use a browser to navigate to https://github.com/iamdemoing/ci-ciam.
2. Click the **Code** button and select **Download ZIP** from the pop-up menu.
3. Extract the ZIP file.  This will create a *ci-ciam* directory in your working directory.

## Install required node modules
Run the following commands to install the node modules required by the demo application:
```bash
cd ci-ciam
npm install
```
## Create .env file
Create a .env file from the provided template:
```bash
cp dotenv.sample .env
```

# Automated Setup instructions
Follow these instructions to perform automated setup of your Verify SaaS tenant.  This approach uses functionality built into the demonstration application to setup your Verify SaaS tenant using management REST APIs.

## Create a privileged API client
Perform the following actions to create a privileged API client which has permissions to manage your tenant:
1. Sign-in to the administration UI of your Verify SaaS tenant.
2. Select **Security > API access** in the navigation menu.
3. Select **Add API client**.
4. Check the **Select all** checkbox. Click **Next**.
5. Check the **Allow configured scopes only** checkbox. Click **Next**.
6. Leave Enable IP filtering clear. Click **Next**.
7. No additional properties are needed.  Click **Next**.
8. Enter a name for the client (e.g. **Admin client**).  Click **Create API client**.

## Add tenant information to .env file
### Read client id and client secret
Perform the following actions to read the client id and client secret for your API client:
1. In the administration UI of your Verify SaaS tenant, select **Security > API access** in the navigation menu.
2. Click the **...** icon on the tile for the API client and select **Connection details**.
3. Make a note of the Client ID and Client secret.  You will need these when configuring the NodeJS application.

### Edit .env file
Open the .env file for the demo application in a text editor.  Provide values for the following parameters:
**OIDC_CI_BASE_URI** - The base URI of your verify tenant.
**API_CLIENT_ID** - The client id of the API client created above.
**API_SECRET** - The client secret of the API client create above.
**OIDC_REDIRECT_URI** - The OIDC redirect URI for the demo application.

```
# Your tenant URL.  You must set this.
OIDC_CI_BASE_URI=https://yourtenantid.verify.ibm.com

# API Client for client_credentials flow
# Give full permissions for auto-setup
API_CLIENT_ID=12345678-aaaa-bbbb-cccc-123456789012
API_SECRET=abcd1234

# OIDC Relying Party configuration.  Auto setup will create this application
# using OIDC_REDIRECT_URI specified here.
OIDC_REDIRECT_URI=http://localhost:3000/oauth/callback
```

## Start the demo application
To start the demo application, make sure you are in the root directory for the application and use the following command:
```bash
npm start
```

The application is now running in the foregound.  Log messages are written to the terminal window.  You will need to leave this terminal window open to keep the application running.

## Run automatic setup
Open a browser and navigate to the */setup* page of the demo application.  If the application is listening on localhost:3000 then the URL you need is [http://localhost:3000/setup](http://localhost:3000/setup).

On the setup page, click the **Run Setup** button.

No messages are shown in the browser.  You can track progress of the auto setup by reading the log messages in the terminal window where the demo application is running.  The setup should take approximately 30 seconds to complete.

If you encounter issues, the application may terminate with an error message.  Once you have resolved the issue, you can restart the application and run the automatic setup again.  It will recognize any steps that have already been completed.

As part of automatic setup, the client id and client secret of the created application are written back into the .env file.  This allows the application to run again in the future without re-running the setup.

## You're ready to use the demo
Once the automatic setup completes successfully, you are ready to use the demo application.  There is no need to restart the application.

## Add additional Identity Providers
In addition to the Cloud Directory, the demo application also supports social sign-on and account linking from Google, LinkedIn, and Facebook.  If these identity provider definitions exist when auto setup is run, these will be added to the application definition. Details on configuration of social sign-on providers can be found below.

# Manual setup instructions

## Attributes
### Introduction
The demonstration application uses the Verify Cloud Directory to store all user information.  Custom attribute definitions must be created to store the attributes that do not exist in the built-in user schema. These attributes are:

* accountId
* ageHome
* birthday
* brandId
* carMake
* carModel
* carYear
* homeType
* quoteCount

### Create Attributes
In the admin UI of your Verify tenant, select **Directory > Attributes** in the navigation menu. For each attribute above, follow these steps:
1. Click **Add attribute**
2. Select **Custom attribute**. Click **Next**.
3. Set *Attribute name* and *Attribute ID* to match name given above. Click **Next**.
4. No changes required for source and value. Click **Next**.
5. No changes required for constraints.  Click **Add attribute**.

## MFA group and access policy
### Introduction
The demo application uses membership of the **MFAGroup** to determine if MFA should be required on login.  Users that choose to enable MFA are added to this group by the application.

### Create group
In the admin UI of your Verify tenant, select **Directory > Users & groups** in the navigation menu. Follow these steps:
1. Select the **Groups** tab and click **Add group**.
2. Enter **MFAGroup** as the group name.
3. Click **Save**.

### Create access policy
Select **Security > Access policies** in the natigation menu.  Follow these steps:
1. Click **Add policy**.
2. Enter "Require 2FA for MFAGroup" as policy name.  Click **Next**.
3. Select **Federated sign-on policy**. Click **Next**.
4. Click **Next** until you are on the *Policy rules* page.
5. Click **Add new rule**.
6. Enter a rule name.
7. Set the following condition: ** User attributes | Group membership | contains each of | MFAGroup**
8. Set the following action: **MFA Always**
9. Click **Next**.
10. Click **Save**.

## Data Privacy and Consent

### Introduction
Three Verify DPCM (Data Privacy and Consent Management) items need to be configured:

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
Login to your Verify tenant administrator console as an administrator.

1. Go to "Applications" and click "Add application"
2. Select "Custom Application" and click "Add application"
3. Set the name to "TrustMeInsurance"
4. Set the description, and company name (values don't matter)
5. On the "Sign-in" tab change the following settings, and leave other settings as default
    1.  Sign-on method: Open ID Connect 1.0
    2.  Application URL: http://localhost:3000
    3.  Clear: Require proof key code code exchange (PKCE) verification
    4.  User Consent: Do not ask for consent
    5.  Re-direct URIs: http://localhost:3000/oauth/callback
    6.  Select: Send all known user attributes in the ID token
    7.  Select: Specific supported identity sources
        * Select Cloud Directory, (and Google, LinkedIn, Facebook if available)
    8.  Deselect: Use default Policy
        * Select policy "Require 2FA for MFAGroup"
    8.  Click Save

	**Note**: After creation a single sign-on client id and secret will be generated. The id and secret correspond to the OIDC_CLIENT_ID and OIDC_CLIENT_ID_SECRET of the .env file which is explained below.

	**Note:** API access for sign-in is left to its default of "not restricted". Hence  entitlements such as "authentication yourself", "reset your password", "create consent records" and "read privacy consent" are granted to the application sign-on token. This token is granted to an authenticated user. See this [link ](https://www.ibm.com/docs/en/security-verify?topic=provider-default-api-client-sign-token-entitlements)for a complete list of these default entitlements.


6. In the "API access" tab:
	1. Click "Add API client"
	2. Choose a name e.g. "TrustMeInsurance Privileged API Client"
	3. Select the following API access
		    - Manage access policies
		    - Manage attribute sources
		    - Manage templates
		    - Manage users and standard groups
		    - Read application configuration

	**Note**: This API client is used for privileged API access to your Verify tenant. Such access is needed for user self-registration.  After creation a privileged client id and secret will be generated. The id and secret correspond to the API_CLIENT_ID and API_SECRET of the .env file which is explained below.

7.  In the "Entitlements" tab:
    1.  Select: All users are entitled to this application
    2.  Click Save

8. In the "Privacy" tab:
   Add EULA "Terms", purpose "Paperless Billing" and "Communications". These were
   configured in the section "Create Data Consent & Privacy items".

9. Click Save

Edit the *.env* file and complete for your environment. For a default configuration, just change the xxxxx parts to accomodate your environment:

```
# Your tenant URL.  You must set this.
OIDC_CI_BASE_URI=https://xxxxxx.verify.ibm.com

# API Client for client_credentials flow
# Give full permissions for auto-setup
API_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
API_SECRET=xxxxxxxx

# OIDC Relying Party configuration.  Auto setup will create this application
# using OIDC_REDIRECT_URI specified here.
OIDC_REDIRECT_URI=http://localhost:3000/oauth/callback

# Auto-setup will complete these values for created application:
OIDC_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
OIDC_CLIENT_SECRET=xxxxxxxx

# Allow setup page access (at /setup)
ALLOW_DYNAMIC_SETUP=true

# Name of application in Verify to be used/created.
APP_NAME=TrustMeInsurance

# Name of theme to be used/created by application.
# Auto setup will look for THEME_NAME.zip in ci-ciam directory.
THEME_NAME=TrustMeInsurance

# Group name to use/create to identify users that have opted-in for MFA
MFAGROUP=MFAGroup

# URL where terms can be loaded.
EULA_URL=http://localhost:3000/terms.html

# Purpose IDs to use/create for DPCM
MARKETING_PURPOSE_ID=communications
PAPERLESS_PURPOSE_ID=paperless-billing
TERMS_PURPOSE_ID=terms

# Access type names to use/create in DPCM
READ_ACCESS_TYPE=read
DEFAULT_ACCESS_TYPE=default

# Attribute ID for e-mail attribute.  Should not need to be changed.
EMAIL_ATTRIBUTE_ID=3

# BRAND_ID should be 'false'. Any other value will create users with an @BRAND_ID suffix
# BRAND_ID is used in open-account.js and some theme files.
BRAND_ID=false

#If true will request DPCM scopes in OIDC request
SEND_PRIVACY_SCOPES=false
```

Save the file and close the editor.

## Configure Application Theme

### Introduction
When you configure an application in IBM Security Verify, you can apply a *theme* so that your login pages, logout pages, notifications and so on have your look and feel.
Configuring a theme for an app will only affect the look and feel when accessing that app. Other access to the tenant is not affected.

The demo application repository comes with a file **TrustMeInsurance.zip** which must be uploaded to your Verify tenant. Once uploaded, you must configure the demo app to use the theme.

### Register theme in Verify

Navigate to the ci-theme directory in the demo application directory.

Run the following command to register the theme to your Verify tenant. This command uses the tenant details from the .env file in the parent directory. Unless specified on the command line, the THEME_NAME parameter determines the name of the theme. By default the theme name is "TrustMeInsurance" and the zipfile TrustMeInsurance.zip will be uploaded.

```
node manage-theme.js register
```
**Note:** Please see **README-Theme.md** in the *ci-theme* directory for a guide on how to modify the theme, delete the theme or list the current tenant's themes.

### Configure your app for the theme
Login to your Verify tenant administrator console as an administrator.

1. Select **Applications > Applications** from the navigation menu.
2. Edit the settings of the Custom Application by clicking the cog icon.
3. On the General tab: set the Theme to the newly registered theme which is "TrustMeInsurance" by default.
4. Click Save.

**Note:** to reset the theme to the default Verify theme simply select "default" as the app theme.

### Changes that require an update to the theme
If users will access you site at a URL other than localhost:3000, you will need to modify the theme. Follow these steps:

1. Update the file ci-ciam/ci-theme/templates/common/labels/default/**template_labels.properties** to accomodate your setup.
2. Navigate to ci-ciam/ci-theme
3. Zip up the templates directory again and name your file <app name>.zip

# Disable automatic setup page in application
This is optional.  If you want to disable the /setup URL in the application, set the following in the .env file:

```
ALLOW_DYNAMIC_SETUP=false
```

Restart the application.

# Create Identity Provider definitions for Social Sign-on
This requires you to have an account for these services and set up your Verify tenant as an application.
Detailed instructions can be found in the Verify documentation, see these links:

* [Instructions for Google](https://www.ibm.com/docs/en/security-verify?topic=provider-configuring-your-application-in-google)
* [Instructions for LinkedIn](https://www.ibm.com/docs/en/security-verify?topic=source-configuring-your-application-in-linkedin)
* [Instructions for Facebook](https://www.ibm.com/docs/en/security-verify?topic=provider-configuring-your-application-in-facebook)

You will need to provide redirect URIs as part of this which are given in the Verify Console (along with a link to the developer consoles of the services). When configuration is complete on the Social sign-on provider, you will get a ClientID and Secret which you
will enter into the Verify Identity Provider definition.

When configuring the Identity Provider in Verify, set the following for Identity Linking:

  - *Enabled identity linking for this identity source*: On
  - *Unique User Identifier*: email
  - *Just-in-time Provisioning*: On

Make sure the *Primary Identity Source* is set to **Cloud Directory**.

## Google as a social sign-on provider
When creating the application definition on Google, note that you need
to enable the "People API". If you do not do this you will get errors
during single sign-on.

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
