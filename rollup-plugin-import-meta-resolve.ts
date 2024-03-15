import {lstatSync, realpathSync} from "fs";
import {extname} from "path";
import {fileURLToPath, pathToFileURL} from "url";

import {moduleResolve} from "import-meta-resolve";
import type {Plugin} from "rollup";

interface ImportMetaResolvePluginOptions {
  /**
   * Whether we should strictly follow Node resolution.
   *
   * Usually you will have some deviant modules that do use some legacy
   * resolution algorithm. Since this is generally the case, this is set to
   * false, but if you can get away with turning this on, then keep it on since
   * that implies all your modules are compliant with Node resolution!
   *
   * @defaultValue `false`
   */
  strict: boolean;
  /**
   * Whether we should allow importing JSON files.
   *
   * We default to `false` to follow the ESM spec. Once native JSON modules are
   * supported, this may change.
   *
   * @defaultValue `false`
   */
  allowJson: boolean;
  /**
   * Whether we should allow importing `.node` files.
   *
   * @defaultValue `false`
   */
  allowNode: boolean;
}

/**
 * A resolver plugin using the import.meta.resolve algorithm provided by
 * Node.js.
 *
 * This plugin is (more-or-less) a drop-in replacement for the
 * `@rollup/plugin-node-resolve` plugin.
 *
 * There are a few differences between this plugin and the Node.js resolver:
 *
 *  1. We allow importing modules without an extension. This is a common
 *     practice in Node.js, but it is not allowed in ESM. We allow it here to
 *     maintain compatibility with a large number of modules.
 *  2. We allow importing directories. This is not allowed in ESM, but it is
 *     common in Node.js. We allow it here to maintain compatibility with a
 *     large number of modules.
 *  3. We only allow `import` conditions. This is to ensure that ESM-modules are
 *     consumed first. This doesn't imply that CommonJS modules are not consumed
 *     as `default` conditions and packages without `export` conditions may
 *     still resolve to a CommonJS module.
 *
 * You can use `strict` to disable (1) and (2) (which is recommended), but
 * you may need to fix some modules that are not compliant with the ESM spec.
 *
 * This plugin is restrictive by default (e.g. no module roots, no `require`
 * exports, etc.). This ensures projects are up-to-date and compliant across the
 * board. If you have custom file tree requirements, it's recommended to use
 * symlinked directories.
 */
export default function importMetaResolve(
  options: Partial<ImportMetaResolvePluginOptions> = {},
): Plugin {
  const settings = {
    strict: options.strict ?? false,
    allowJson: options.allowJson ?? false,
    allowNode: options.allowNode ?? false,
  } satisfies ImportMetaResolvePluginOptions;

  const conditions = new Set(["import"]);
  const extensions = [".mjs", ".js"];

  function resolve(source: string, importer: string) {
    try {
      return fileURLToPath(
        moduleResolve(
          source,
          pathToFileURL(importer),
          new Set(conditions),
          true,
        ),
      );
    } catch (error) {
      if (lstatSync(importer).isSymbolicLink()) {
        return resolve(source, realpathSync(importer));
      } else {
        throw error;
      }
    }
  }

  function handler(source: string, importer: string) {
    try {
      // Try to resolve an ESM-compliant import.
      return resolve(source, importer);
    } catch (error) {
      if (settings.strict) {
        return;
      }

      // The module is probably broken, but perhaps another resolver can handle
      // it.
      if (
        !isUnsupportedDirImportError(error) &&
        !isUnsupportedEsmImportError(error)
      ) {
        return;
      }

      // At this point, we know the import is not ESM-compliant but may use a
      // legacy heuristics. In Node.js, this is
      //
      // We allow the following heuristics (in order):
      //
      //  1. If the import has no extension, we try to guess it.
      //  2. If the import is a directory, we try to resolve the import with
      //     `index` appended and start over.
      //
      if (extname(source) === "") {
        for (const extension of extensions) {
          try {
            const resolved = resolve(`${source}${extension}`, importer);
            if (resolved !== undefined) {
              return resolved;
            }
          } catch {}
        }
        if (settings.allowJson) {
          try {
            const resolved = resolve(`${source}.json`, importer);
            if (resolved !== undefined) {
              return resolved;
            }
          } catch {}
        }
        if (settings.allowNode) {
          try {
            const resolved = resolve(`${source}.node`, importer);
            if (resolved !== undefined) {
              return resolved;
            }
          } catch {}
        }
      }
      if (isUnsupportedDirImportError(error)) {
        return handler(`${source}/index`, importer);
      }
    }
    return undefined;
  }

  return {
    name: "import-meta-resolve",
    resolveId: {
      order: "post",
      handler(source, importer) {
        // If there is no importer, leave it to the next resolver.
        if (importer === undefined) {
          return;
        }
        return handler(source, importer);
      },
    },
  };
}

function isUnsupportedDirImportError(error: unknown) {
  return isErrNoError(error) && error.code === "ERR_UNSUPPORTED_DIR_IMPORT";
}

function isUnsupportedEsmImportError(error: unknown) {
  return isErrNoError(error) && error.code === "ERR_UNSUPPORTED_ESM_IMPORT";
}

function isErrNoError(error: unknown): error is {code: string} {
  return error instanceof Object && "code" in error;
}
