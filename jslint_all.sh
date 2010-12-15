#!/usr/bin/env bash
for foo in `ls *.js test/*.js`; do echo "==== Checking $foo ===="; jslint $foo; done
