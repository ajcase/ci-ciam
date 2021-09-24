#!/bin/sh
# Updates a .html template file with an HTML comment link that contains the path to the template file

# Read in the full path
HTMLFILE=$1

# Check if the parameter is present and if the file is there.
if [ $# -eq 0 ]; then
    echo "Error: expecting file path argument"
    exit 1
fi
if [ ! -f "$HTMLFILE" ]; then
    echo "$HTMLFILE does not exist."
    exit 2
fi

# Copy original file to .tmp file
cp $HTMLFILE $HTMLFILE.tmp
# Create a .tag file that contains HTML comment line
echo "<!-- Template file path: $HTMLFILE  -->" > $HTMLFILE.tag
# Concatenate the .tmp and the .tag
cat $HTMLFILE.tag $HTMLFILE.tmp > $HTMLFILE
# Cleanup the temporary .tag and .tmp
rm $HTMLFILE.tag $HTMLFILE.tmp

exit 0
