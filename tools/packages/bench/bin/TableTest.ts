import { type SpanningCellConfig, type TableUserConfig, table } from "table";
import { type ColumnGroup, tableSetup } from "../src/table-util/TableReport.ts";

main();

function main(): void {
  const groups: ColumnGroup[] = [
    { columns: [{ title: "name", alignment: "center" }] },
    {
      groupTitle: "lines / sec",
      columns: [
        { title: "max" },
        { title: "Δ%" },
        { title: "p50" },
        { title: "Δ%" },
      ],
    },
    { groupTitle: "time", columns: [{ title: "mean" }, { title: "Δ%" }] },
    { groupTitle: "gc time", columns: [{ title: "mean" }, { title: "Δ%" }] },
    {
      groupTitle: "misc",
      columns: [{ title: "heap kb" }, { title: "L1 miss" }, { title: "N" }],
    },
  ];
  const { config, headerRows } = tableSetup(groups);
  const content = [
    "reduceBuffer",
    "77,200",
    "+0.3%",
    "74,466",
    "-0.9%",
    "1.28",
    "+1.7%",
    "0.03",
    "+33.3%",
    "2,043",
    "+1.6%",
    "546",
  ];
  const rows = [...headerRows, content];
  const newConfig = { ...config };

  console.log(table(rows, newConfig));
  // console.log(config);
}

function mainX(): void {
  const rows = [
    ["head-a", " ", "head-b", " "],
    ["A1", "A2", "B1", "B2"],
  ];
  const config: TableUserConfig = {
    spanningCells: [
      {
        row: 0,
        col: 0,
        colSpan: 2,
        alignment: "center",
      },
      {
        row: 0,
        col: 2,
        colSpan: 2,
        alignment: "center",
      },
    ],
  };
  console.log(table(rows, config));
}
