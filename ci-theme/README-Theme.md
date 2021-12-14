# Managing The Theme

## Introduction

Configuring a theme for an app will only affect the look & feel when that app redirects a user to Verify for specific services such as signing in, password resets, multi-factor authentication and so on.

For some actions the user is not redirected to Verify. For example the demo app self-registers a user by requesting data like his/her email address and then uses the Verify API's to register the user.

A theme is configured for custom apps like the demo app. Other access to the tenant, like e.g. signing in to Verify as an administrator or employee, is not affected.

You can modify a theme by using [Verify API's for customisation](https://docs.verify.ibm.com/verify/reference/customization)

To download and upload a theme (or the template) you can use the excellent Postman collection that is available here: [https://github.com/iamexploring/verify-postman](https://github.com/iamexploring/verify-postman) 

Alternatively you can use the provided **manage-theme.js** script in the ci-theme directory. That approach is described in the next section.

## Modifying the theme using manage-theme.js

Here's how manage-theme.js can be used to modify the theme:

1. Navigate to directory *ci-theme*
2. Make changes to files within the *templates* subdirectory.
3. Zip up the *templates* directory to TrustMeInsurance.zip.
		
	Here's an example command to do so:
	
	 ```
	 zip -r TrustMeInsurance.zip templates
	 ```
4. Run the below command to update the theme. 

	```
	node manage-theme.js update
	```
  

**Note**: use the below command to list all registered themes:

```
node manage-theme.js list
```

**Note**: use the below command to delete the TrustMeInsurance theme

```
node manage-theme.js delete
```


