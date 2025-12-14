/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "./data-table";

interface TableRow {
  id: string;
  title: string;
  status: string;
}

const columns: DataTableColumn<TableRow>[] = [
  {
    key: "title",
    header: "Title",
    render: (row) => row.title,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => row.status,
  },
];

describe("data table qa checks", () => {
  it("supports keyboard row activation for accessibility", () => {
    const onRowClick = vi.fn<(row: TableRow) => void>();

    render(
      <DataTable
        columns={columns}
        data={[{ id: "row_1", title: "Invoice 1", status: "issued" }]}
        rowKey={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );

    const rowCell = screen.getByText("Invoice 1");
    const rowElement = rowCell.closest("tr");

    expect(rowElement).toBeTruthy();
    if (!rowElement) {
      throw new Error("Expected row element for keyboard activation test");
    }

    fireEvent.keyDown(rowElement, { key: "Enter" });
    fireEvent.keyDown(rowElement, { key: " " });

    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it("renders empty state semantics when no data is available", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(row) => row.id}
        emptyState={<div>No records available</div>}
      />,
    );

    expect(screen.getByText("No records available")).toBeInTheDocument();
  });

  it("keeps horizontal overflow container for responsive table behavior", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={[{ id: "row_1", title: "Invoice 1", status: "issued" }]}
        rowKey={(row) => row.id}
      />,
    );

    const overflowContainer = container.querySelector(".overflow-x-auto");
    expect(overflowContainer).toBeTruthy();
  });

  it("renders large list within acceptable performance budget", () => {
    const manyRows: TableRow[] = Array.from({ length: 400 }).map(
      (_, index) => ({
        id: `row_${index}`,
        title: `Invoice ${index}`,
        status: "issued",
      }),
    );

    const start = performance.now();
    render(
      <DataTable columns={columns} data={manyRows} rowKey={(row) => row.id} />,
    );
    const end = performance.now();

    expect(end - start).toBeLessThan(2500);
  });
});
