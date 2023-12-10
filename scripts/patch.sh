#!/bin/bash

file="node_modules/playwright-core/lib/server/browserContext.js"
if [ "$2" == "root" ]; then
  file="./backend/$file"
else
  file="./$file"
fi

line_number=108
original_line="if ((0, _utils.debugMode)() === 'console') await this.extendInjectedScript(consoleApiSource.source);"
fixed_line="await this.extendInjectedScript(consoleApiSource.source);"


if [ "$1" == "off" ]; then
  new_line="    $original_line"
else
  new_line="    $fixed_line"
fi


# use sed to change the line
# The exact syntax of the sed command depends on the OS unfortunately - specifically the -i parameter differs on linux v.s. mac
if [ "$(uname)" == "Darwin" ]; then
    sed -i .bak "${line_number}s/.*/${new_line}/" $file
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
  sed -i "${line_number}s/.*/${new_line}/" $file
fi
