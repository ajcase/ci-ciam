#!/bin/sh
# Updates a .xml template file with an HTML comment link that contains the path to the template file

# Read in the full path
XMLFILE=$1

# Check if the parameter is present and if the file is there.
if [ $# -eq 0 ]; then
    echo "Error: expecting file path argument"
    exit 1
fi
if [ ! -f "$XMLFILE" ]; then
    echo "$XMLFILE does not exist."
    exit 2
fi

# Determine the content of the tag.
TAG="<!-- Template file path: $XMLFILE  -->"
# Search for the line with "[CDATA[<html>" and add the tag
# Note: -i is required otherwise the insert is not so ok.
sed -i.bak -e '/<!\[CDATA\[<html>/ a\'$'\n'"$TAG" $XMLFILE
# Cleanup the temporary .bak file
rm $XMLFILE.bak

exit 0
