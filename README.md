# import-sort-parser-babel-vue
Vue parser for import-sort. Works with typescript or flow in Vue Single File Components, or just plain typescript or flow code. Most of the code is from [import-sort-parser-babylon](https://github.com/renke/import-sort/tree/master/packages/import-sort-parser-babylon).

# Set-up
[See more about importsortrc](https://github.com/renke/import-sort#using-a-different-style-or-parser)

#### Add the following in `.importsortrc`
```
".js, .jsx, .es6, .es, .mjs, .ts, .tsx, .vue": {
  "parser": "import-sort-parser-babel-vue",
  "style": "eslint"
}
```
#### Or add the following in `package.json`
```
"importSort": {
  ".js, .jsx, .es6, .es, .mjs, .ts, .tsx, .vue": {
    "parser": "import-sort-parser-babel-vue",
    "style": "eslint"
  }
}
```

Personally I prefer `"style": "module"`, you'll need to install `import-sort-style-module`.
