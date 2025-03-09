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
import Image from "next/image";

export type Token = {
  value: string;
  label: string;
  icon: React.ReactNode | string;
  address?: string;
  decimals?: number;
  imageUrl?: string;
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

  const renderTokenIcon = (token: Token) => {
    if (token.imageUrl) {
      return (
        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={token.imageUrl}
            alt={token.label}
            width={24}
            height={24}
            className="object-cover"
          />
        </div>
      );
    } else if (typeof token.icon === "string") {
      return (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs flex-shrink-0">
          {token.icon}
        </div>
      );
    } else {
      return <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />;
    }
  };

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-2 px-3 border-gray-300"
          >
            {displayToken ? (
              <div className="flex items-center gap-3 w-full">
                {renderTokenIcon(displayToken)}
                <div className="flex flex-col items-start">
                  <span className="font-medium">{displayToken.label}</span>
                  <span className="text-xs text-gray-500">
                    {displayToken.value.toUpperCase()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">+ {label}</div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0 border rounded-lg shadow-lg"
          align="start"
          sideOffset={4}
        >
          <TokenList
            setOpen={setOpen}
            setSelectedToken={handleTokenSelect}
            renderTokenIcon={renderTokenIcon}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start h-auto py-2 px-3 border-gray-300"
        >
          {displayToken ? (
            <div className="flex items-center gap-3 w-full">
              {renderTokenIcon(displayToken)}
              <div className="flex flex-col items-start">
                <span className="font-medium">{displayToken.label}</span>
                <span className="text-xs text-gray-500">
                  {displayToken.value.toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">+ {label}</div>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="px-4 pb-6">
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Select Token</h3>
          <TokenList
            setOpen={setOpen}
            setSelectedToken={handleTokenSelect}
            renderTokenIcon={renderTokenIcon}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function TokenList({
  setOpen,
  setSelectedToken,
  renderTokenIcon,
}: {
  setOpen: (open: boolean) => void;
  setSelectedToken: (token: Token | null) => void;
  renderTokenIcon: (token: Token) => React.ReactNode;
}) {
  return (
    <Command className="rounded-md">
      <CommandInput placeholder="Search tokens..." className="py-3" />
      <div>
        <CommandList>
          <CommandEmpty>No tokens found.</CommandEmpty>
          <CommandGroup className="pb-4" heading="Available Tokens">
            {FLARE_TOKENS.map((token) => (
              <CommandItem
                key={token.value}
                value={token.value + " " + token.label}
                className="flex items-center py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onSelect={(value) => {
                  setSelectedToken(
                    FLARE_TOKENS.find((token) => token.value === value) || null
                  );
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  {renderTokenIcon(token)}
                  <div className="flex flex-col">
                    <span className="font-medium">{token.label}</span>
                    <span className="text-xs text-gray-500">
                      {token.value.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </div>
    </Command>
  );
}
