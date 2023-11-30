export function Table({
  headers,
  rows,
}: {
  headers: React.ReactNode[];
  rows: React.ReactNode[][];
}): JSX.Element {
  return (
    <table className="table-auto">
      <thead>
        <tr>
          {headers.map((header, idx) => (
            <th className="px-4" key={idx}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>
            {row.map((cell, idx) => (
              <td className="px-10 py-2" key={idx}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
