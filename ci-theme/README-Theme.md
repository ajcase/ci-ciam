# Modifying the theme

## Introduction

Configuring a theme for an app will only affect the look & feel when that app redirects a user to Verify for specific services such as signing in, password resets, multi-factor authentication and so on.

For some actions the user is not redirected to Verify. For example the demo app self-registers a user by requesting data like his/her email address and then uses the Verify API's to register the user.

A theme is configured for custom apps like the demo app. Other access to the tenant, like e.g. signing in to Verify as an administrator or employee, is not affected.

Many assets in the theme pages are loaded from the NodeJS server. If
this server is not available (it's not running or can't be reached by
the client) then the pages will not render.

You can modify a theme by using [Verify API's for customisation](https://docs.verify.ibm.com/verify/reference/customization)

Alternatively you can use the provided **manage-theme.js** script in the ci-theme directory.

## Modifying the theme using manage-theme.js

Here's how manage-theme.js can be used to modify the theme:

1. Navigate to directory *ci-theme*
2. Make changes to files within the *templates* subdirectory.
3. Re-run the *fix-theme.sh* script: see above. This will create an updated ZIP file in the *ci-theme* directory
4. Configure the Custom Application for the "default" theme. See section "Configure your app for the theme" but this time you select "default". 
5. Run the below command to delete the currently active theme. 

	```
	node manage-theme.js delete
	```

6. Run the below command to register the updated theme

	```
	node manage-theme.js register
	```
  

Note: use the below command to list all registered themes:

```
node manage-theme.js list
```
## Modified theme files

Below files within the *templates* directory have been updated for the demo app.
This list will help you find the files that you want to modify.

```
./authentication/login/cloud_directory/password/change_password/default/first_login_change_password.html
./authentication/login/cloud_directory/user_login/default/cloud_directory_login.html
./authentication/login/identity_source/identity_source_selection/default/combined_login_selection.html
./authentication/mfa/mfa_selection/default/combined_mfa_selection.html
./authentication/mfa/otp_auth/default/otp_submit.html
./notifications/user_management/login/default/user_password_change_not_show_email.xml
./notifications/user_management/login/default/user_password_change_show_email.xml
./notifications/user_management/profile/cs/user_profile_modified_email.xml
./notifications/user_management/profile/default/account_created_email.xml
./authentication/login/cloud_directory/password/change_password/default/first_login_change_password.html
./authentication/login/cloud_directory/user_login/default/cloud_directory_login.html
./authentication/login/identity_source/identity_source_selection/default/combined_login_selection.html
./authentication/mfa/mfa_selection/default/combined_mfa_selection.html
./authentication/mfa/otp_auth/default/otp_submit.html /tmp/templates/authentication/mfa/otp_auth/default/otp_submit.html
./notifications/user_management/login/default/user_password_change_not_show_email.xml
./notifications/user_management/profile/cs/user_profile_modified_email.xml
./notifications/user_management/profile/default/account_created_email.xml
```

