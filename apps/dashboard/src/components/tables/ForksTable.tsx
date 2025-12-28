import React from "react";
import type { ForkSummary } from "../../lib/apiClient";

interface ForksTableProps {
  forks: ForkSummary[];
}

export const ForksTable: React.FC<ForksTableProps> = ({ forks }) => {
  return (
    <div className="table-shell">
      <table className="table">
        <thead>
          <tr>
            <th>Fork</th>
            <th>Branch</th>
            <th>Owner</th>
            <th>Modules</th>
            <th>Last activity</th>
          </tr>
        </thead>
        <tbody>
          {forks.map((fork) => (
            <tr key={fork.id}>
              <td>{fork.name}</td>
              <td>
                <span className="chip">{fork.branch}</span>
              </td>
              <td>{fork.owner}</td>
              <td>{fork.moduleCount}</td>
              <td style={{ fontSize: 11, color: "#9ca3af" }}>{fork.lastActivityAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
