import {
  Banknote,
  Calculator,
  Calendar,
  CloudUpload,
  CreditCard,
  HandCoins,
  Replace,
  Settings,
  Smile,
} from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-bold">
        interact with Flare primitives using natural language
      </div>
      <Command className="rounded-lg border shadow-md md:min-w-[450px]">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Blockchain Actions">
            <CommandItem>
              <Replace />
              <span>Swap Tokens</span>
            </CommandItem>
            <CommandItem>
              <CloudUpload />
              <span>Store Data</span>
            </CommandItem>
            <CommandItem>
              <HandCoins />
              <span>Lend Assets</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="More Options">
            <CommandItem>
              <Banknote />
              <span>Borrow Assets</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Smile />
              <span>Explore Blockchain</span>
              <CommandShortcut>⌘E</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Settings />
              <span>Settings</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
