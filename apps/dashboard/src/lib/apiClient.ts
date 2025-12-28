import fetch from "cross-fetch";

export interface RepoSummary {
  key: string;
  name: string;
  url: string;
  provider: string;
  moduleCount: number;
  forkCount: number;
  lastObservedAt: string;
  active: boolean;
}

export interface ModuleSummary {
  id: string;
  name: string;
  language: string;
  version: string;
  repoKey: string;
  status: string;
}

export interface ForkSummary {
  id: string;
  name: string;
  branch: string;
  owner: string;
  moduleCount: number;
  lastActivityAt: string;
}

export interface GlobalStats {
  observedLines: number;
  modulesGenerated: number;
  activeForks: number;
  reposTracked: number;
  lastSyncAt: string;
}

export interface ApiClientOptions {
  baseUrl?: string;
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(opts: ApiClientOptions = {}) {
    this.baseUrl =
      opts.baseUrl || process.env.NEXT_PUBLIC_UNIT09_API_BASE_URL || "http://localhost:8080/api";
  }

  async getRepos(): Promise<RepoSummary[]> {
    const res = await fetch(`${this.baseUrl}/repos`);
    if (!res.ok) {
      throw new Error(`Failed to fetch repos: ${res.status}`);
    }
    const json = await res.json();
    return json.items ?? [];
  }

  async getModulesByRepo(repoKey: string): Promise<ModuleSummary[]> {
    const res = await fetch(`${this.baseUrl}/repos/${encodeURIComponent(repoKey)}/modules`);
    if (!res.ok) {
      throw new Error(`Failed to fetch modules for repo ${repoKey}: ${res.status}`);
    }
    const json = await res.json();
    return json.items ?? [];
  }

  async getAllModules(): Promise<ModuleSummary[]> {
    // If there is no dedicated endpoint, this can be derived from repos in a real implementation.
    // For now assume there is a top-level modules endpoint.
    const res = await fetch(`${this.baseUrl}/modules`);
    if (!res.ok) {
      throw new Error(`Failed to fetch modules: ${res.status}`);
    }
    const json = await res.json();
    return json.items ?? [];
  }

  async getForks(): Promise<ForkSummary[]> {
    const res = await fetch(`${this.baseUrl}/forks`);
    if (!res.ok) {
      throw new Error(`Failed to fetch forks: ${res.status}`);
    }
    const json = await res.json();
    return json.items ?? [];
  }

  async getStats(): Promise<GlobalStats> {
    const res = await fetch(`${this.baseUrl}/stats`);
    if (!res.ok) {
      throw new Error(`Failed to fetch stats: ${res.status}`);
    }
    const json = await res.json();
    return json.stats ?? {
      observedLines: 0,
      modulesGenerated: 0,
      activeForks: 0,
      reposTracked: 0,
      lastSyncAt: ""
    };
  }
}

export function createApiClient(): ApiClient {
  return new ApiClient();
}
