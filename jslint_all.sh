#!/usr/bin/env bash
for foo in `ls *.js`; do echo "==== Checking $foo ===="; jslint $foo; done
