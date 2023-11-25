export function Button({
  children,
  variant = "primary",
  type = "submit",
  disabled = false,
}: {
  variant?: "primary" | "secondary" | "inline";
  type?: "submit";
  disabled?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  const classNames = {
    primary:
      "rounded bg-blue-500 w-full px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400",
    secondary:
      "rounded bg-slate-600 px-4 py-2 text-blue-100 hover:bg-blue-500 active:bg-blue-600",
    inline: "rounded text-white bg-red-500 bold px-2",
  };

  return (
    <button className={classNames[variant]} type={type} disabled={disabled}>
      {children}
    </button>
  );
}
