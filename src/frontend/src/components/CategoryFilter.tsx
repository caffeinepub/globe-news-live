import type { Category } from "../types";

const FILTER_CATS: Category[] = [
  "All",
  "World",
  "Politics",
  "Tech",
  "Business",
  "Sports",
];

interface CategoryFilterProps {
  active: Category;
  onChange: (cat: Category) => void;
}

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-full"
      style={{
        background: "rgba(11,16,32,0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(27,35,52,0.9)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}
      data-ocid="filter.panel"
    >
      {FILTER_CATS.map((cat) => (
        <button
          type="button"
          key={cat}
          onClick={() => onChange(cat)}
          className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase transition-all"
          style={
            active === cat
              ? {
                  background: "#fff",
                  color: "#0B1020",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }
              : {
                  background: "transparent",
                  color: "#A9B3C7",
                }
          }
          data-ocid={`filter.${cat.toLowerCase()}.tab`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
