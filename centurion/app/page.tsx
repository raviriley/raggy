"use client";

import {
  ArrowUpRight,
  Banknote,
  CloudUpload,
  HandCoins,
  PiggyBank,
  Replace,
  Search,
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
import { useChat } from "@ai-sdk/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/chat",
    onFinish: () => {
      toast.success("Response has been created.");
    },
    onError: () => {
      toast.error("Error creating response.");
    },
  });

  // Add state to track if command UI is active
  const [commandValue, setCommandValue] = useState("");
  const [showingCommands, setShowingCommands] = useState(false);

  function onSubmit(
    e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLDivElement>,
  ) {
    e.preventDefault();

    // Only submit the message if not using command UI
    if (!showingCommands) {
      handleSubmit(e);
    }
  }

  // Function to handle command selections
  const handleCommandSelect = (value: string) => {
    console.log(`Selected command: ${value}`);
    // Here you would implement the specific action for each command
    toast.success(`Executing command: ${value}`);

    // Clear the command UI state
    setShowingCommands(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-bold">
        interact with Flare primitives using natural language
      </div>
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn("whitespace-pre-wrap", m.role === "user" && "ml-auto")}
        >
          <div>
            <div className="font-bold">{m.role}</div>
            <div className="text-sm text-gray-500">
              {m.toolInvocations?.map((t) => t.toolName).join(", ")}
            </div>
            <p>{m.content}</p>
          </div>
        </div>
      ))}
      <form onSubmit={onSubmit}>
        <Command
          className="rounded-lg border shadow-md md:min-w-[450px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              // If command menu is active, let it handle the Enter event
              if (showingCommands) {
                return;
              }
              onSubmit(e);
            }
          }}
          // Use value and onValueChange to detect when command filtering is active
          value={commandValue}
          onValueChange={(value) => {
            setCommandValue(value);
            // If there's any value, we're in command mode
            setShowingCommands(value.length > 0);
          }}
        >
          <CommandInput
            placeholder="Type a command, search for on-chain data, or take actions by describing what you want to do."
            value={input}
            onValueChange={(value) => {
              handleInputChange({ target: { value } } as any);
              // Update command value to match input
              setCommandValue(value);
              // If there's any value, we're in command mode
              setShowingCommands(value.length > 0);
            }}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Blockchain Actions">
              <CommandItem onSelect={() => handleCommandSelect("swap")}>
                <Replace />
                <span>Swap Tokens</span>
              </CommandItem>
              <CommandItem onSelect={() => handleCommandSelect("lend")}>
                <HandCoins />
                <span>Lend Assets</span>
              </CommandItem>
              <CommandItem onSelect={() => handleCommandSelect("borrow")}>
                <Banknote />
                <span>Borrow Assets</span>
              </CommandItem>
              {/* <CommandItem onSelect={() => handleCommandSelect("store")}>
                <CloudUpload />
                <span>Store Data</span>
              </CommandItem> */}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="External Actions">
              <CommandItem
                onSelect={() => {
                  handleCommandSelect("explorer");
                  router.push("https://flarescan.com/");
                }}
              >
                <Search />
                <span>Explorer</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  router.push("https://fasset.oracle-daemon.com/sgb");
                  handleCommandSelect("fassets");
                }}
              >
                <ArrowUpRight />
                <span>FAssets</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  router.push("https://app.kinetic.market/stake");
                  handleCommandSelect("stake");
                }}
              >
                <PiggyBank />
                <span>Kinetic Staking</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </form>
    </div>
  );
}
