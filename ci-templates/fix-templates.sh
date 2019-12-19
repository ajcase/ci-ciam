mkdir tmp
cp -R templates tmp
cd tmp
find ./templates/ -type f -name *.html -exec sed -i .bak -e 's|CI_TENANT_URL|https://yourtenantid.ice.ibmcloud.com|g' {} \;
find ./templates/ -type f -name *.html -exec sed -i .bak -e 's|DEMO_APPLICATION_URL|http://localhost:3000|g' {} \;
find ./templates/ -type f -name *.xml -exec sed -i .bak -e 's|CI_TENANT_URL|https://yourtenantid.ice.ibmcloud.com|g' {} \;
find ./templates/ -type f -name *.xml -exec sed -i .bak -e 's|DEMO_APPLICATION_URL|http://localhost:3000|g' {} \;
zip -r ../templates.zip templates
cd ..

