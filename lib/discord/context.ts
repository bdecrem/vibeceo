import { Message } from 'discord.js';

export interface PitchContext {
  isJoke: boolean;
  isUnderdeveloped: boolean;
  pros: string[];
  cons: string[];
  originalMessage: Message;
}

export interface PitchAnalysisContext {
  pros: string[];
  cons: string[];
  developmentScore: number;
  isJoke: boolean;
}

export function derivePitchFlags(analysis: PitchAnalysisContext): { isJoke: boolean; isUnderdeveloped: boolean } {
  return {
    isJoke: analysis.isJoke,
    isUnderdeveloped: analysis.developmentScore < 5
  };
}

export function generatePromptContext(context: PitchContext): string {
  const flags: string[] = [];
  if (context.isJoke) flags.push("This appears to be a joke pitch");
  if (context.isUnderdeveloped) flags.push("This pitch needs more development");
  
  const contextParts = [
    flags.length > 0 ? `Context flags: ${flags.join(", ")}` : "",
    context.pros.length > 0 ? `Pros:\n${context.pros.map(pro => `- ${pro}`).join("\n")}` : "",
    context.cons.length > 0 ? `Cons:\n${context.cons.map(con => `- ${con}`).join("\n")}` : ""
  ].filter(part => part !== "");

  return contextParts.join("\n\n");
}