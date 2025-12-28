import React from "react";
import type { RepoSummary } from "../../lib/apiClient";

interface ReposTableProps {
  repos: RepoSummary[];
}

export const ReposTable: React.FC<ReposTableProps> = ({ repos }) => {
  return (
    <div className="table-shell">
      <table className="table">
        <thead>
          <tr>
            <th>Repository</th>
            <th>Provider</th>
            <th>Modules</th>
            <th>Forks</th>
            <th>Last observed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {repos.map((repo) => (
            <tr key={repo.key}>
              <td>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span>{repo.name}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{repo.url}</span>
                </div>
              </td>
              <td>{repo.provider}</td>
              <td>{repo.moduleCount}</td>
              <td>{repo.forkCount}</td>
              <td style={{ fontSize: 11, color: "#9ca3af" }}>{repo.lastObservedAt}</td>
              <td>
                <span className={repo.active ? "badge badge-green" : "badge badge-soft"}>
                  {repo.active ? "Active" : "Idle"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
