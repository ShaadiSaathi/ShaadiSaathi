import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react"
import { cn } from "@/lib/design/cn"
import {
  APP_ERROR_CLASS,
  APP_INPUT_CLASS,
  APP_LABEL_CLASS,
} from "@/lib/design/app-form-styles"

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn(APP_LABEL_CLASS, className)} {...props} />
}

export function FieldError({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <p className={cn(APP_ERROR_CLASS, className)} role="alert">
      {children}
    </p>
  )
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(APP_INPUT_CLASS, className)} {...props} />
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(APP_INPUT_CLASS, className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(APP_INPUT_CLASS, className)} {...props} />
}
