"use client";

import { forwardRef, type HTMLAttributes } from "react";
import {
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  CursorClickIcon,
  DeleteIcon,
  EyeIcon,
  FolderOpenIcon,
  PlusIcon,
  SendIcon,
  XIcon,
  type CursorClickIconHandle,
  type EyeIconHandle,
} from "lucide-animated";

import { cn } from "@/lib/utils";

type AnimatedIconProps = HTMLAttributes<HTMLDivElement> & {
  size?: number;
  animateOnHover?: boolean;
};

function iconClassName(className?: string) {
  return cn("inline-flex shrink-0 items-center justify-center text-current", className);
}

export function AnimatedArrowRightIcon({ className, size = 16, ...props }: AnimatedIconProps) {
  return <ArrowRightIcon size={size} className={iconClassName(className)} {...props} />;
}

export function AnimatedArrowUpIcon({ className, size = 16, ...props }: AnimatedIconProps) {
  return <ArrowUpIcon size={size} className={iconClassName(className)} {...props} />;
}

export function AnimatedArrowUpRightIcon({ className, size = 16, ...props }: AnimatedIconProps) {
  return <ArrowUpRightIcon size={size} className={iconClassName(className)} {...props} />;
}

export const AnimatedCursorClickIcon = forwardRef<CursorClickIconHandle, AnimatedIconProps>(
  function AnimatedCursorClickIcon({ className, size = 16, ...props }, ref) {
    return <CursorClickIcon ref={ref} size={size} className={iconClassName(className)} {...props} />;
  },
);

export function AnimatedDeleteIcon({ className, size = 16, ...props }: AnimatedIconProps) {
  return <DeleteIcon size={size} className={iconClassName(className)} {...props} />;
}

export const AnimatedEyeIcon = forwardRef<EyeIconHandle, AnimatedIconProps>(
  function AnimatedEyeIcon({ className, size = 16, ...props }, ref) {
    return <EyeIcon ref={ref} size={size} className={iconClassName(className)} {...props} />;
  },
);

export function AnimatedFolderOpenIcon({ className, size = 16, ...props }: AnimatedIconProps) {
  return <FolderOpenIcon size={size} className={iconClassName(className)} {...props} />;
}

export function AnimatedPlusIcon({ className, size = 16, ...props }: AnimatedIconProps) {
  return <PlusIcon size={size} className={iconClassName(className)} {...props} />;
}

export function AnimatedSendIcon({ className, size = 16, ...props }: AnimatedIconProps) {
  return <SendIcon size={size} className={iconClassName(className)} {...props} />;
}

export function AnimatedXIcon({ className, size = 16, ...props }: AnimatedIconProps) {
  return <XIcon size={size} className={iconClassName(className)} {...props} />;
}
