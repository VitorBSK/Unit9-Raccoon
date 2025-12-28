import React from "react";

export interface StatCard {
  label: string;
  value: string;
  tag?: string;
  delta?: string;
  deltaDirection?: "up" | "down";
}

interface StatCardsProps {
  stats: StatCard[];
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  return (
    <div className="card-grid">
      {stats.map((stat) => (
        <div key={stat.label} className="card">
          <div className="card-header">
            <div className="card-title">{stat.label}</div>
            {stat.tag && <div className="card-tag">{stat.tag}</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="card-value">{stat.value}</div>
            {stat.delta && (
              <div
                className={
                  stat.deltaDirection === "down" ? "card-delta-down" : "card-delta-up"
                }
              >
                {stat.deltaDirection === "down" ? "↓ " : "↑ "}
                {stat.delta}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
