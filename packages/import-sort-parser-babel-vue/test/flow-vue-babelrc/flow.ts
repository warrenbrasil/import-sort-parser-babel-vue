import "mocha";

import { assert } from "chai";
import { IImport } from "import-sort-parser";

import { formatImport, parseImports } from "../../lib";

const parseFlowImports = (code) => {
  // Pass (fake) file name to the parser so it can read .babelrc
  return parseImports(code, { file: __dirname + "/flow.js" });
};

describe("parseImports (Flow, with @babel/preset-flow)", () => {
  it("should return default type import", () => {
    const imports = parseFlowImports(
      `
<template>
  <div class="container"></div>
</template>

<script lang="ts">
import type p from 'q';
</script>

<style scoped lang="scss">
@import "@/css/mixins";
</style>
`.trim()
    );

    assert.equal(imports[0].type, "import-type");
    assert.equal(imports[0].start, 75);
    assert.equal(imports[0].end, imports[0].end);
    assert.equal(imports[0].moduleName, "q");
    assert.equal(imports[0].defaultMember, "p");
  });

  it("should include type information for named type imports", () => {
    const imports = parseFlowImports(
      `
<template>
  <div class="container"></div>
</template>

<script lang="ts">
import {type a} from "x";
</script>

<style scoped lang="scss">
@import "@/css/mixins";
</style>
`.trim()
    );

    assert.equal(imports[0].namedMembers[0].type, true);
  });
});
