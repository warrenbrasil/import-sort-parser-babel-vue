"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("@babel/parser");
const core_1 = require("@babel/core");
const types_1 = require("@babel/types");
const path_1 = require("path");
const traverse_1 = require("@babel/traverse");
// TODO: Mocha currently doesn't pick up the declaration in index.d.ts
// eslint-disable-next-line
const findLineColumn = require("find-line-column");
const TYPESCRIPT_EXTENSIONS = [".ts", ".tsx"];
const COMMON_PARSER_PLUGINS = [
    "jsx",
    "doExpressions",
    "objectRestSpread",
    ["decorators", { decoratorsBeforeExport: true }],
    "classProperties",
    "classPrivateProperties",
    "classPrivateMethods",
    "exportDefaultFrom",
    "exportNamespaceFrom",
    "asyncGenerators",
    "functionBind",
    "functionSent",
    "dynamicImport",
    "numericSeparator",
    "optionalChaining",
    "importMeta",
    "bigInt",
    "optionalCatchBinding",
    "throwExpressions",
    ["pipelineOperator", { proposal: "minimal" }],
    "nullishCoalescingOperator",
];
const FLOW_PARSER_PLUGINS = ["flow", "flowComments", ...COMMON_PARSER_PLUGINS];
const FLOW_PARSER_OPTIONS = {
    allowImportExportEverywhere: true,
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    sourceType: "module",
    plugins: FLOW_PARSER_PLUGINS,
};
const TYPESCRIPT_PARSER_PLUGINS = ["typescript", ...COMMON_PARSER_PLUGINS];
const TYPESCRIPT_PARSER_OPTIONS = {
    allowImportExportEverywhere: true,
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    sourceType: "module",
    plugins: TYPESCRIPT_PARSER_PLUGINS,
};
function parseImports(code, options = {}) {
    const babelPartialOptions = core_1.loadPartialConfig({
        filename: options.file,
    });
    let parsed;
    if (babelPartialOptions.hasFilesystemConfig()) {
        // We always prefer .babelrc (or similar) if one was found
        parsed = core_1.parse(code, core_1.loadOptions({ filename: options.file }));
    }
    else {
        const { file } = options;
        const isTypeScript = file && TYPESCRIPT_EXTENSIONS.includes(path_1.extname(file));
        const parserOptions = isTypeScript
            ? TYPESCRIPT_PARSER_OPTIONS
            : FLOW_PARSER_OPTIONS;
        parsed = parser_1.parse(code, parserOptions);
    }
    const imports = [];
    const ignore = (parsed.comments || []).some((comment) => {
        return comment.value.includes("import-sort-ignore");
    });
    if (ignore) {
        return imports;
    }
    traverse_1.default(parsed, {
        ImportDeclaration(path) {
            const { node } = path;
            const importStart = node.start;
            const importEnd = node.end;
            let start = importStart;
            let end = importEnd;
            if (node.leadingComments) {
                const comments = node.leadingComments;
                let current = node.leadingComments.length - 1;
                let previous;
                while (comments[current] && comments[current].end + 1 === start) {
                    if (code
                        .substring(comments[current].start, comments[current].end)
                        .indexOf("#!") === 0) {
                        break;
                    }
                    // TODO: Improve this so that comments with leading whitespace are allowed
                    if (findLineColumn(code, comments[current].start).col !== 0) {
                        break;
                    }
                    previous = current;
                    ({ start } = comments[previous]);
                    current -= 1;
                }
            }
            if (node.trailingComments) {
                const comments = node.trailingComments;
                let current = 0;
                let previous;
                while (comments[current] && comments[current].start - 1 === end) {
                    if (comments[current].loc.start.line !== node.loc.start.line) {
                        break;
                    }
                    previous = current;
                    ({ end } = comments[previous]);
                    current += 1;
                }
            }
            const imported = {
                start,
                end,
                importStart,
                importEnd,
                moduleName: node.source.value,
                type: node.importKind === "type" ? "import-type" : "import",
                namedMembers: [],
            };
            if (node.specifiers) {
                node.specifiers.forEach((specifier) => {
                    if (types_1.isImportSpecifier(specifier)) {
                        const type = specifier.importKind === "type" ? { type: true } : {};
                        imported.namedMembers.push(Object.assign({ name: specifier.imported.name, alias: specifier.local.name }, type));
                    }
                    else if (types_1.isImportDefaultSpecifier(specifier)) {
                        imported.defaultMember = specifier.local.name;
                    }
                    else if (types_1.isImportNamespaceSpecifier(specifier)) {
                        imported.namespaceMember = specifier.local.name;
                    }
                });
            }
            imports.push(imported);
        },
    });
    return imports;
}
exports.parseImports = parseImports;
function formatImport(code, imported, eol = "\n") {
    console.error(code);
    const importStart = imported.importStart || imported.start;
    const importEnd = imported.importEnd || imported.end;
    const importCode = code.substring(importStart, importEnd);
    const { namedMembers } = imported;
    if (namedMembers.length === 0) {
        return code.substring(imported.start, imported.end);
    }
    const newImportCode = importCode.replace(/\{[\s\S]*\}/g, (namedMembersString) => {
        const useMultipleLines = namedMembersString.indexOf(eol) !== -1;
        let prefix;
        if (useMultipleLines) {
            [prefix] = namedMembersString
                .split(eol)[1]
                .match(/^\s*/);
        }
        const useSpaces = namedMembersString.charAt(1) === " ";
        const userTrailingComma = namedMembersString
            .replace("}", "")
            .trim()
            .endsWith(",");
        return formatNamedMembers(namedMembers, useMultipleLines, useSpaces, userTrailingComma, prefix, eol);
    });
    return (code.substring(imported.start, importStart) +
        newImportCode +
        code.substring(importEnd, importEnd + (imported.end - importEnd)));
}
exports.formatImport = formatImport;
function formatNamedMembers(namedMembers, useMultipleLines, useSpaces, useTrailingComma, prefix, eol = "\n") {
    if (useMultipleLines) {
        return ("{" +
            eol +
            namedMembers
                .map(({ name, alias, type }, index) => {
                const lastImport = index === namedMembers.length - 1;
                const comma = !useTrailingComma && lastImport ? "" : ",";
                const typeModifier = type ? "type " : "";
                if (name === alias) {
                    return `${prefix}${typeModifier}${name}${comma}` + eol;
                }
                return `${prefix}${typeModifier}${name} as ${alias}${comma}` + eol;
            })
                .join("") +
            "}");
    }
    const space = useSpaces ? " " : "";
    const comma = useTrailingComma ? "," : "";
    return ("{" +
        space +
        namedMembers
            .map(({ name, alias, type }) => {
            const typeModifier = type ? "type " : "";
            if (name === alias) {
                return `${typeModifier}${name}`;
            }
            return `${typeModifier}${name} as ${alias}`;
        })
            .join(", ") +
        comma +
        space +
        "}");
}
