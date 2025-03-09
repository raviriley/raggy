"use server";

export async function swapTokens({
  token_in,
  token_out,
  amount_in,
  wallet_to_swap_from,
}: {
  token_in: string;
  token_out: string;
  amount_in: number;
  wallet_to_swap_from: string;
}) {
  console.log("token_in", token_in);
  console.log("token_out", token_out);
  console.log("amount_in", amount_in);
  console.log("wallet_to_swap_from", wallet_to_swap_from);
  return "success";
}
