import { Fragment } from "react";
import { columns } from "./components/columns";
import { DataTable } from "./components/data-table";

export { columns, DataTable };

export default function AdvancedTable() {
  return (
    <Fragment>
      <DataTable columns={columns} />
    </Fragment>
  );
}
