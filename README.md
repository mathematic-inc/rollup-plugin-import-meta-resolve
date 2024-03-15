# rollup-plugin-import-meta-resolve

A resolver plugin using the import.meta.resolve algorithm provided by Node.js.

This plugin is (more-or-less) a drop-in replacement for the
`@rollup/plugin-node-resolve` plugin.

There are a few differences between this plugin and the Node.js resolver:

1. We allow importing modules without an extension. This is a common practice in
   Node.js, but it is not allowed in ESM. We allow it here to maintain
   compatibility with a large number of modules.
2. We allow importing directories. This is not allowed in ESM, but it is common
   in Node.js. We allow it here to maintain compatibility with a large number of
   modules.
3. We only allow `import` conditions. This is to ensure that ESM-modules are
   consumed first. This doesn't imply that CommonJS modules are not consumed as
   `default` conditions and packages without `export` conditions may still
   resolve to a CommonJS module.

You can use `strict` to disable (1) and (2) (which is recommended), but you may
need to fix some modules that are not compliant with the ESM spec.

This plugin is restrictive by default (e.g. no module roots, no `require`
exports, etc.). This ensures projects are up-to-date and compliant across the
board. If you have custom file tree requirements, it's recommended to use
symlinked directories.
