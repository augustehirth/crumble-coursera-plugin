set -e
mkdir -p build
find build -path 'build/[!.]*' -prune -exec rm -r -- {} +
cp Stim/glue/crumble/crumble.html build/index.html
rollup -c rollup.config.main.js
cp manifest.no_grader.json build/manifest.json
(cd build && zip ../crumble-no-grader-plugin.zip * -x grader.js)

rollup -c rollup.config.grader.js
cp manifest.grader.json build/manifest.json
(cd build && zip ../crumble-grader-plugin.zip *)

cp build/grader.js test/grader.cjs
