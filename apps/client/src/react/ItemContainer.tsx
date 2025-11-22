export type ItemContainerProps = {
  disabled?: boolean;
  selected?: boolean;
} & JSX.IntrinsicElements["div"];

export default function ItemContainer({
  className,
  disabled,
  selected,
  onClick,
  children,
  ...passProps
}: ItemContainerProps) {
  return (
    <div
      className={[
        "flex cursor-pointer hover:text-info hover:bg-orange-700 hover:text-white",
        disabled && selected
          ? "opacity-60 bg-gray-500 text-white"
          : disabled
            ? "opacity-60 bg-gray-500 text-gray-700"
            : selected
              ? "bg-red-700  text-blue-300"
              : "",
        className ?? "",
      ].join(" ")}
      onClick={disabled ? undefined : onClick}
      {...passProps}
    >
      {children}
    </div>
  );
}
