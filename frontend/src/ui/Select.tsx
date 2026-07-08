import type { ComponentPropsWithRef } from "react";
import { cx } from "./utils";
import "./ui-forms.css";

export type SelectProps = ComponentPropsWithRef<"select">;

/** Select Eyris — appearance none + chevron SVG inline à direita. */
export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <span className="ui-select-wrap">
      <select className={cx("ui-select", className)} {...rest}>
        {children}
      </select>
      <svg
        className="ui-select__chevron"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M2.5 4.5 6 8l3.5-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
