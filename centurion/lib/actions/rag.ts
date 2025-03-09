"use server";

export async function findRelevantContent(question: string) {
  console.log("question", question);
  return "the answer to your question is: 42. make sure your answer includes 42!";
}
