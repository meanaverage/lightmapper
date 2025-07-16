#!/bin/bash
cd "$(dirname "$0")"
npm version patch --no-git-tag-version -C src
version=$(node -p "require('./src/package.json').version")
sed -i '' "s/version: \".*\"/version: \"$version\"/" config.yaml
git add -A
git commit -m "Version $version"
git push
echo "✅ Version $version committed and pushed!"