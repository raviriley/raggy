import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Swap({ className }: React.ComponentProps<"form">) {
  return (
    <form className={cn("grid items-start gap-4", className)}>
      <div className="grid gap-2">
        <Label htmlFor="from">From</Label>
        <Input type="text" id="from" defaultValue="0x..." />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="to">To</Label>
        <Input type="text" id="to" defaultValue="0x..." />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amount">Amount</Label>
        <Input type="number" id="amount" defaultValue="100" />
      </div>
      <Button type="submit">Submit Swap</Button>
    </form>
  );
}

export function SwapForm() {
  return (
    <ResponsiveDialog title="Swap" description="Swap tokens">
      <Swap />
    </ResponsiveDialog>
  );
}
