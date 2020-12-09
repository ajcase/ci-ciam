. template.properties
mkdir tmp
cp -R templates tmp
cd tmp
find ./templates/ -type f -name *.html -exec sed -i .bak -e 's|CI_TENANT_URL|'${CI_TENANT_URL}'|g' {} \;
find ./templates/ -type f -name *.html -exec sed -i .bak -e 's|DEMO_APPLICATION_URL|'${DEMO_APPLICATION_URL}'|g' {} \;
find ./templates/ -type f -name *.xml -exec sed -i .bak -e 's|CI_TENANT_URL|'${CI_TENANT_URL}'|g' {} \;
find ./templates/ -type f -name *.xml -exec sed -i .bak -e 's|DEMO_APPLICATION_URL|'${DEMO_APPLICATION_URL}'|g' {} \;
find ./templates/ -type f -name *.html -exec sed -i .bak -e 's|GOOGLE_ID_SOURCE_ID|'${GOOGLE_ID_SOURCE_ID}'|g' {} \;
find ./templates/ -type f -name *.html -exec sed -i .bak -e 's|LINKEDIN_ID_SOURCE_ID|'${LINKEDIN_ID_SOURCE_ID}'|g' {} \;
zip -r ../templates.zip templates
cd ..
