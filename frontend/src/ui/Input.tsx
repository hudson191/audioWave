import type { ComponentPropsWithRef } from "react";
import { cx } from "./utils";
import "./ui-forms.css";

export type InputProps = ComponentPropsWithRef<"input">;

/** Input Eyris — 36px, radius 8px, border --color-border-input. */
export function Input({ className, ...rest }: InputProps) {
  return <input className={cx("ui-input", className)} {...rest} />;
}
