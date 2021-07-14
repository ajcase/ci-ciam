# Overview



# Starting the NodeJS application

When you start the NodeJS app using 'npm start' the NodeJS app is quering Verify to get following information:
* the id of the MFA group.
* the currently configured theme for the TrustMeInsurance demo app.

**Note**: The NodeJS app needs the currently configured theme for a correct logout. A logout is triggered from the NodeJS app and needs to be theme specific. Referring to the ?themeId= query parameter when calling /idaas/mtfim/sps/idaas/logout in app.js

**_Implementation details:_**

	NodeJS app files:
	 
	* ci-ciam/app.js: calls the Verify API's using functions.
	* ci-caim/functions.js: contains functions to call Verify API's.
	
	Verify API's: 
	
	* /v1.0/applications/ to get the themeID based on the APP_NAME env param
	* /v2.0/Groups to get the groupID based on the MFAGROUP env param


# Login

TThe NodeJS app uses [Passport authentication middleware](http://www.passportjs.org/) for its OIDC interface with Verify. See the passport.use() call in app.js on how the OIDC configuration is set.

he NodeJS app's login button calls /login. This NodeJS route is defined in app.js and calls passport.authenticate(). At its turn this will redirect the user to the Verify OIDC endpoint authorize. 


**_Implementation details:_**

	NodeJS app files:
	 
	* ci-ciam/app.js: implements the NodeJS route to /login - app.get('/logout',...)
	
	Calls to Verify: 
	
	* /oidc/endpoint/default/authorize to handle the OIDC authentication flow
	* /idaas/mtfim/sps/idaas/login to authentication the user
	* /authsvc/mtfim/sps/authsvc to post the username & password for authentication
	* /idaas/mtfim/sps/idaas/login/google for Google login
	* /idaas/mtfim/sps/idaas/login/linkedin for LinkedIn login

	Theme files:
	
	* authentication/login/identity_source/identity_source_selection/default/combined_login_selection.html



# Logout

A logout consist of a number of actions:

* Revoke the tokens regarding the single sign-on session. Therefore the OIDC revoke endpoint is called. This endpoint does not reply with a message to the user.
* Terminate the session with Verify. Therefore calling the /idaas/mtfim/sps/idaas/logout endpoint. This endpoint replies with a message to the user.
* The theme file executes Javascript to do a sessionStorage.clear(), a localStorage.clear() and to delete all cookies using Javascript

**_Implementation details:_**

	NodeJS app files:
	 
	* ci-ciam/app.js: implements the NodeJS route to /logout - app.get('/logout',...)
	
	Calls to Verify: 
	
	* /oidc/endpoint/default/revoke to revoke tokens
	* /idaas/mtfim/sps/idaas/logout to logout the user's session.

	Theme files:
	
	* 	ci-theme/templates/authentication/logout/default/logout_success.ht

	
# Password Forgotten

The password forgotten flow is basically:

* User selects "Forgot Password?" on the login screen
* User inputs email address
* User receives email with link to reset password
* User clicks link in email
* User provides new password
* User receives email of reset completion

This flow is completely handled by Verify - there is nothing to modify in the TrustMeInsurance demo app. 	
	
**_Implementation details:_**

	
Calls to Verify: 
	
* /authsvc/mtfim/sps/authsvc?PolicyId=urn:ibm:security:authentication:asf:forgotpassword to kickoff the forgotten password flow
* /authsvc/mtfim/sps/authsvc?StateId to continue the flow; post the email address, and further on; post the new password
* /authsvc/mtfim/sps/authsvc?PolicyId=urn:ibm:security:authentication:asf:forgotpassword&stage=reset to start the actual password reset
	

Theme files:
	
* templates/authentication/login/identity\_source/identity\_source\_selection/default/**combined\_login\_selection.html** (Contains link to password forgotten link: authsvc/mtfim/sps/authsvc?urn:ibm:security:authentication:asf:forgotpassword)
*  templates/authentication/login/cloud\_directory/password/forgot\_password/default/**forgot\_password.html** (asks the user to provide his/her email address)
*  templates/authentication/login/cloud_directory/password/forgot\_password/default/**forgot\_password\_success.html** (Tells the user to check his/her email)
*  templates/authentication/login/cloud\_directory/password/forgot\_password/default/**password\_recovery\_email.xml** (the email's content with instructions and the link)
*  templates/authentication/login/cloud\_directory/password/change\_password/default/**first\_login\_change\_password.htm**l (the form to input the new password)
*  templates/authentication/login/cloud\_directory/password/forgot\_password/default/**reset\_password\_complete.xml** (the email's content that notifies the user that the password reset is completed.)
*  templates/authentication/mfa/error/default/**auth\_request\_error.html** (error page, e.g. when the link has expired)
	
	
# 	My Profile

The TrustMeInsurance's "My Profile", which is showing a user's profile including basic information, DPCM info, MFA info etc, is triggered by the URL: http://localhost:3000/app/profile (assuming a default installation on localhost:3000).
All of this is done in the NodeJS file **index.js**.

index.js gather the data, while the view  in **views/insurance/profile.hbs** renders the 'My Profile' page.
 


**_Implementation details:_**

	NodeJS app files:
	 
	* ci-ciam/routes/index.js: implements the NodeJS routes to app/profile, app/dpcm, app/toggleMfa
	* ci-ciam/routes/app/profile.js: has similar code as in index.js and is used to redirect the user after changes to the profile.
	* ci-ciam/views/insurance/profile.hbs: handlebar file to render the 'My Profile' page
	* ci-ciam/lib/dpcm/dpcmClient.js: a set of functions to manage the DPCM (privacy and consents) setting.
	* ci-caim/functions.js: contains functions to call Verify API's. F.i. to toggle the MFA setting, send/verify OTP's, delete the user, etc

		
	Calls to Verify: 
	
	* /oidc/endpoint/default/userinfo to get the user's id and other OIDC claims
	* /v2.0/Me API to get the full user profile 
	* /v1.0/attributes API to get the user's custom attributes such as 'car'
	* /dpcm/v1.0/privacy/data-usage-approval provides the data usage approval to retrieve if the user has accepted the terms, and to get the opt-in/opt-out status of the 2 'purposes' 
	* /dpcm/v1.0/privacy/data-subject-presentation to present the data subject information to the user at runtime. *Note sure this is actually used by the app*
	* /dpcm/v1.0/privacy/consents to store the user's consents about the purposes 'Communications' and 'paperless billing'
	* /dpcm-mgmt/config/v1.0/privacy/consents to read the user's consents
	* /v2.0/Groups/6400058OSK to manage the user's membership to MFAGroup
 
 


