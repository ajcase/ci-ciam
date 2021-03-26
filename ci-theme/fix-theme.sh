#
# Creates a .zip file, theme-TrustMeInsurance.zip, ready for uploading to Verify 
#

# Read the properties of your environment
. theme.properties

# Create a subdirectory "tmp"
# This "tmp" will be used to change the templates files according to your environment
rm -rf tmp
mkdir tmp
cp -R templates tmp

# Switch to "tmp" and update all html and xml files according to your environment
# Original files are saved to .bak files.
cd tmp
find ./templates/ -type f -name *.html -exec sed -i .bak -e 's|CI_TENANT_URL|'${CI_TENANT_URL}'|g' {} \;
find ./templates/ -type f -name *.html -exec sed -i .bak -e 's|DEMO_APPLICATION_URL|'${DEMO_APPLICATION_URL}'|g' {} \;
find ./templates/ -type f -name *.xml -exec sed -i .bak -e 's|CI_TENANT_URL|'${CI_TENANT_URL}'|g' {} \;
find ./templates/ -type f -name *.xml -exec sed -i .bak -e 's|DEMO_APPLICATION_URL|'${DEMO_APPLICATION_URL}'|g' {} \;
find ./templates/ -type f -name *.html -exec sed -i .bak -e 's|GOOGLE_ID_SOURCE_ID|'${GOOGLE_ID_SOURCE_ID}'|g' {} \;
find ./templates/ -type f -name *.html -exec sed -i .bak -e 's|LINKEDIN_ID_SOURCE_ID|'${LINKEDIN_ID_SOURCE_ID}'|g' {} \;

# Zip the updated templates directory and leave "tmp"
zip -r ../${THEME_NAME}.zip templates
cd ..
