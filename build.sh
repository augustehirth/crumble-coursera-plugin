set -e
mkdir -p build
rm -r build/*
cp index.html build
rollup -c rollup.config.main.js
cp manifest.no_grader.json build/manifest.json
(cd build && zip ../crumble-no-grader-plugin.zip * -x grader.js)

rollup -c rollup.config.grader.js
cp manifest.grader.json build/manifest.json
(cd build && zip ../crumble-grader-plugin.zip *)

cp build/grader.js test/grader.cjs
