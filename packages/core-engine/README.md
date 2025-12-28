# @unit09/core-engine

Core pipeline engine for the Unit09 on-chain AI raccoon system.

This package provides the primitives required to run the Unit09 pipeline:

1. Observe code in a repository or local directory
2. Detect languages
3. Parse project structure
4. Build a lightweight code graph
5. Decompose the project into modules
6. Generate basic module artifacts
7. Assemble a build plan
8. Validate modules
9. Optionally sync the result to the on-chain Unit09 program

The engine is intentionally conservative and focuses on producing
structured, inspectable output that can be used by higher-level tools.

## Example

```ts
import { runFullPipeline } from "@unit09/core-engine";
import { createInitialPipelineContext } from "@unit09/shared-types";

async function main() {
  const source = {
    repo: {
      repoKey: "local-repo",
      name: "local-repo",
      url: "file:///path/to/repo",
      description: "Local repository",
      tags: [],
      visibility: "private",
      sourceType: "git-local",
      allowObservation: true,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    revision: "HEAD",
    localPath: "/path/to/repo"
  };

  const result = await runFullPipeline(source, {
    source: { rootDir: "/path/to/repo" }
  });

  console.log(result);
}

main().catch(console.error);
```

Adapt the source descriptor and configuration to match your environment.
