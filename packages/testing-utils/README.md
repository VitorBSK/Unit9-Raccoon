# @unit09/testing-utils

Testing utilities for the Unit09 project. These helpers are designed to make
it easier to write integration tests against a local Solana validator and
the Unit09 program.

## Features

- Localnet helpers for funding accounts in tests
- Simple test wallet wrapper
- Unit09 program fixture
- JSON snapshot helpers
- Small time utilities

Example:

```ts
import { createLocalnetContext } from "@unit09/testing-utils";
import idl from "@unit09/idl/unit09_program.json";

async function main() {
  const ctx = await createLocalnetContext();
  console.log("Localnet URL:", ctx.url);
  console.log("Payer:", ctx.payer.publicKey.toBase58());
}

main().catch(console.error);
```

You can customize the RPC URL and use these utilities in your preferred
test runner (Jest, Mocha, Vitest, etc.).
