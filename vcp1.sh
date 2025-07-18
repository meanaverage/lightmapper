#!/bin/bash
cd "$(dirname "$0")"

# Ensure we're on the planner branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "planner" ]; then
    echo "❌ Not on planner branch. Currently on: $current_branch"
    echo "   Please switch to planner branch first: git checkout planner"
    exit 1
fi

npm version patch --no-git-tag-version -C src
version=$(node -p "require('./src/package.json').version")
sed -i '' "s/version: \".*\"/version: \"$version\"/" config.yaml
git add -A
git commit -m "Version $version"
git push origin planner
echo "✅ Version $version committed and pushed to planner branch!"