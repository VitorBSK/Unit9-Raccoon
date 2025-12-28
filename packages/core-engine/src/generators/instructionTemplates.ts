/**
 * Instruction templates that can be used by code generators to produce
 * client-side examples for interacting with Unit09 modules.
 */
export function createRegisterModuleTemplate(): string {
  return [
    "import { PublicKey } from '@solana/web3.js';",
    "import { buildRegisterModuleInstruction } from '@unit09/sdk';",
    "",
    "async function registerModule(program, payer, repoKey, moduleKey) {",
    "  const ix = buildRegisterModuleInstruction(program, {",
    "    moduleKey,",
    "    repoKey,",
    "    name: 'example-module',",
    "    kind: 0,",
    "    tags: 'example',",
    "    metadataUri: null,",
    "  }, payer);",
    "",
    "  // TODO: send the instruction in a transaction.",
    "}"
  ].join("\n");
}
