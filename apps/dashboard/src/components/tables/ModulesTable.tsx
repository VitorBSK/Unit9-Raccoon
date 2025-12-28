import React from "react";
import type { ModuleSummary } from "../../lib/apiClient";

interface ModulesTableProps {
  modules: ModuleSummary[];
}

export const ModulesTable: React.FC<ModulesTableProps> = ({ modules }) => {
  return (
    <div className="table-shell">
      <table className="table">
        <thead>
          <tr>
            <th>Module</th>
            <th>Language</th>
            <th>Version</th>
            <th>Repo</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.language}</td>
              <td>{m.version}</td>
              <td>
                <span className="chip">{m.repoKey}</span>
              </td>
              <td>
                <span className={m.status === "valid" ? "badge badge-green" : "badge badge-soft"}>
                  {m.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
