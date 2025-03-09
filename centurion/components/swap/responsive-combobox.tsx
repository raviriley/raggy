"use client";

import { useMediaQuery } from "@/lib/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { Circle } from "lucide-react";

type Token = {
  value: string;
  label: string;
  icon: React.ReactNode;
};

const tokens: Token[] = [
  {
    value: "flare",
    label: "Flare",
    icon: <Circle />,
  },
  {
    value: "weth",
    label: "WETH",
    icon: <Circle />,
  },
  {
    value: "usdc",
    label: "USDC",
    icon: <Circle />,
  },
  {
    value: "usdt",
    label: "USDT",
    icon: <Circle />,
  },
];

export function ComboBoxResponsive() {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[150px] justify-start">
            {selectedToken ? <>{selectedToken.label}</> : <>+ Set token</>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <TokenList setOpen={setOpen} setSelectedToken={setSelectedToken} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-[150px] justify-start">
          {selectedToken ? <>{selectedToken.label}</> : <>+ Set token</>}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <TokenList setOpen={setOpen} setSelectedToken={setSelectedToken} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function TokenList({
  setOpen,
  setSelectedToken,
}: {
  setOpen: (open: boolean) => void;
  setSelectedToken: (token: Token | null) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Filter tokens..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {tokens.map((token) => (
            <CommandItem
              key={token.value}
              value={token.value}
              onSelect={(value) => {
                setSelectedToken(
                  tokens.find((token) => token.value === value) || null,
                );
                setOpen(false);
              }}
            >
              {token.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
