# Common errors

- Blank page with only written `[object Object]`.
  In the console, the following error: `Uncaught (in promise) TypeError: Cannot read property 'appendChild' of null`
  Solution:
  * clean all generated files (node_modules/, lib/, tsconfig.tsbuildinfo, etc) recursively
  * add `defer` in the script tag in the html file.