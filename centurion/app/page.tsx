"use client";

import {
  ArrowUpRight,
  Banknote,
  CloudUpload,
  HandCoins,
  Replace,
  Search,
  SearchCode,
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

import { useChat } from "@ai-sdk/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/chat",
    onFinish: () => {
      toast.success("Response has been created.");
    },
    onError: () => {
      toast.error("Error creating response.");
    },
  });

  function onSubmit(
    e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLDivElement>,
  ) {
    e.preventDefault();
    handleSubmit(e);
  }

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
              onSubmit(e);
            }
          }}
        >
          <CommandInput
            placeholder="Type a command or search..."
            value={input}
            onValueChange={(value) =>
              handleInputChange({ target: { value } } as any)
            }
          />
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
              <CommandItem>
                <Banknote />
                <span>Borrow Assets</span>
                {/* <CommandShortcut>⌘B</CommandShortcut> */}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="External Actions">
              <CommandItem asChild>
                <Link href="https://flarescan.com/" target="_blank">
                  <Search />
                  <span>Explorer</span>
                </Link>
              </CommandItem>
              <CommandItem asChild>
                <Link
                  href="https://fasset.oracle-daemon.com/sgb"
                  target="_blank"
                >
                  <ArrowUpRight />
                  <span>FAssets</span>
                </Link>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </form>
    </div>
  );
}
