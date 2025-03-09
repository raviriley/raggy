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
import { FLARE_TOKENS } from "@/lib/config";

export type Token = {
  value: string;
  label: string;
  icon: React.ReactNode | string;
  address?: string;
  decimals?: number;
};

export function ComboBoxResponsive({
  onTokenSelect,
  selectedToken,
  label = "Set token",
}: {
  onTokenSelect?: (token: Token) => void;
  selectedToken?: Token | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [localSelectedToken, setLocalSelectedToken] = useState<Token | null>(
    selectedToken || null
  );

  const handleTokenSelect = (token: Token | null) => {
    setLocalSelectedToken(token);
    if (token && onTokenSelect) {
      onTokenSelect(token);
    }
  };

  const displayToken = selectedToken || localSelectedToken;

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            {displayToken ? (
              <div className="flex items-center gap-2">
                {typeof displayToken.icon === "string" ? (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-xs">
                    {displayToken.icon}
                  </div>
                ) : (
                  displayToken.icon
                )}
                <span>{displayToken.label}</span>
              </div>
            ) : (
              <>+ {label}</>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <TokenList setOpen={setOpen} setSelectedToken={handleTokenSelect} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {displayToken ? (
            <div className="flex items-center gap-2">
              {typeof displayToken.icon === "string" ? (
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-xs">
                  {displayToken.icon}
                </div>
              ) : (
                displayToken.icon
              )}
              <span>{displayToken.label}</span>
            </div>
          ) : (
            <>+ {label}</>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <TokenList setOpen={setOpen} setSelectedToken={handleTokenSelect} />
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
          {FLARE_TOKENS.map((token) => (
            <CommandItem
              key={token.value}
              value={token.value}
              onSelect={(value) => {
                setSelectedToken(
                  FLARE_TOKENS.find((token) => token.value === value) || null
                );
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                {typeof token.icon === "string" ? (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-xs">
                    {token.icon}
                  </div>
                ) : (
                  <Circle />
                )}
                <span>{token.label}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
