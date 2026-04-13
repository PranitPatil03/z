"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("rounded-xl border border-border/70 bg-popover p-3", className)}
      classNames={{
        root: "w-fit",
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-4",
        month_caption: "relative flex h-9 items-center justify-center",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "absolute left-0 h-8 w-8 rounded-md border-border/70 bg-background/90 text-muted-foreground shadow-sm hover:text-foreground",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "absolute right-0 h-8 w-8 rounded-md border-border/70 bg-background/90 text-muted-foreground shadow-sm hover:text-foreground",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground",
        weeks: "mt-1.5 flex flex-col gap-1",
        week: "flex w-full",
        day: "relative h-9 w-9 p-0 text-center",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-md p-0 text-sm font-medium text-foreground transition-colors aria-selected:opacity-100",
        ),
        selected:
          "bg-primary text-primary-foreground rounded-md shadow-sm hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "ring-1 ring-primary/35 ring-inset font-semibold",
        outside: "text-muted-foreground/50 opacity-60",
        disabled: "text-muted-foreground/50 opacity-50",
        range_start: "rounded-l-md bg-primary text-primary-foreground",
        range_end: "rounded-r-md bg-primary text-primary-foreground",
        range_middle: "bg-muted text-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ className: iconClassName, orientation }) => {
          if (orientation === "left") {
            return <ChevronLeft className={cn("h-4 w-4", iconClassName)} />;
          }
          if (orientation === "right") {
            return <ChevronRight className={cn("h-4 w-4", iconClassName)} />;
          }
          if (orientation === "up") {
            return <ChevronUp className={cn("h-4 w-4", iconClassName)} />;
          }
          return <ChevronDown className={cn("h-4 w-4", iconClassName)} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
