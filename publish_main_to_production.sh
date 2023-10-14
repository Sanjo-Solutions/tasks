#!/bin/sh

git checkout production
git merge --no-ff main
git push
git checkout main
