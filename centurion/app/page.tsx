"use client";

import {
  ArrowUpRight,
  Banknote,
  CloudUpload,
  HandCoins,
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
import { SwapForm } from "@/components/swap/swap-form";
import { z } from "zod";

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

  // Add state to control dialog visibility
  const [showSwapDialog, setShowSwapDialog] = useState(false);

  function onSubmit(
    e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLDivElement>,
  ) {
    e.preventDefault();

    // Only submit the message if not using command UI
    if (!showingCommands) {
      setShowSwapDialog(false);
      handleSubmit(e);
    }
  }

  // Create schema for swap form validation
  const swapFormSchema = z.object({
    from: z.string().min(1, "From token is required"),
    to: z.string().min(1, "To token is required"),
    amount: z.number().positive("Amount must be positive"),
  });

  // Function to handle form submission
  const handleSwapSubmit = (data: z.infer<typeof swapFormSchema>) => {
    try {
      // Validate the data
      swapFormSchema.parse(data);

      // Format the data as JSON
      const formattedData = JSON.stringify(
        {
          action: "swap",
          data: {
            fromToken: data.from,
            toToken: data.to,
            amount: data.amount,
          },
        },
        null,
        2,
      );

      // Create an event-like object for handleSubmit
      const mockEvent = {
        // todo: remove this
        preventDefault: () => {},
      };

      // Send the formatted data to the chat
      handleInputChange({ target: { value: formattedData } } as any);
      handleSubmit(mockEvent as any);

      // Show success message
      toast.success("Swap request submitted");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(`Validation error: ${error.errors[0].message}`);
      } else {
        toast.error("An error occurred submitting the swap request");
      }
    }
  };

  // Function to handle command selections
  const handleCommandSelect = (value: string) => {
    console.log(`Selected command: ${value}`);

    // Handle different commands
    switch (value) {
      case "swap":
        setShowSwapDialog(true);
        break;
      case "lend":
        toast.info("Lend functionality coming soon");
        break;
      case "borrow":
        toast.info("Borrow functionality coming soon");
        break;
      case "store":
        toast.info("Store Data functionality coming soon");
        break;
      default:
        toast.info(`Command ${value} selected`);
    }

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
      {/* Render the SwapForm component when showSwapDialog is true */}
      {showSwapDialog && (
        <SwapForm
          onSubmit={handleSwapSubmit}
          onClose={() => setShowSwapDialog(false)}
        />
      )}
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
            placeholder="Type a command or search..."
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
              <CommandItem onSelect={() => handleCommandSelect("store")}>
                <CloudUpload />
                <span>Store Data</span>
              </CommandItem>
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
            </CommandGroup>
          </CommandList>
        </Command>
      </form>
    </div>
  );
}
