import type { ComponentPropsWithRef } from "react";
import { cx } from "./utils";
import "./ui-forms.css";

export type TextareaProps = ComponentPropsWithRef<"textarea">;

/** Textarea Eyris — mesmas bordas/focus do Input, altura livre. */
export function Textarea({ className, ...rest }: TextareaProps) {
  return <textarea className={cx("ui-textarea", className)} {...rest} />;
}
