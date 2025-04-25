import { getCharacter, getCharacters } from "./characters.js";
import { sendAsCharacter } from "./webhooks.js";
import { generateCharacterResponse } from "./ai.js";
import fs from "fs";
import path from "path";
const activePitches = new Map();
// Function to get a random pitch idea from the file
function getRandomPitchIdea() {
    const pitchIdeasPath = process.env.PITCH_IDEAS_FILE ||
        path.join(process.cwd(), "data", "pitch-ideas.txt");
    try {
        const ideas = fs
            .readFileSync(pitchIdeasPath, "utf-8")
            .split("\n")
            .filter((line) => line.trim());
        return ideas[Math.floor(Math.random() * ideas.length)];
    }
    catch (error) {
        console.error("Error reading pitch ideas:", error);
        return "A new social network for connecting professionals";
    }
}
// Function to trigger pitch chat from scheduler
export async function triggerPitchChat(channelId, client) {
    try {
        console.log("Starting scheduled pitch chat for channel:", channelId);
        // Check if there's already an active pitch session
        if (activePitches.has(channelId)) {
            console.log("Pitch chat already active in this channel");
            return;
        }
        // Get a random pitch idea
        const idea = getRandomPitchIdea();
        // Create a fake message object
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isTextBased()) {
            console.error("Channel not found or not text-based");
            return;
        }
        // Start the pitch discussion
        const textChannel = channel;
        await textChannel.send(`Starting scheduled pitch discussion for: "${idea}"\nEach coach will give two rounds of feedback, followed by voting.`);
        // Initialize pitch state
        const state = {
            idea,
            round: 1,
            responses: [],
            votes: {},
            isActive: true,
        };
        activePitches.set(channelId, state);
        // Start the first round
        await continuePitchDiscussion(channelId);
    }
    catch (error) {
        console.error("Error in scheduled pitch chat:", error);
        // Clean up state on error
        activePitches.delete(channelId);
    }
}
export async function handlePitchCommand(message, idea) {
    const channelId = message.channelId;
    // Check if there's already an active pitch session
    if (activePitches.has(channelId)) {
        await message.reply("There is already an active pitch discussion in this channel. Please wait for it to finish.");
        return;
    }
    // Initialize pitch state
    const state = {
        idea,
        round: 1,
        responses: [],
        votes: {},
        isActive: true,
    };
    activePitches.set(channelId, state);
    // Acknowledge the pitch
    await message.reply(`Starting pitch discussion for: "${idea}"\nEach coach will give two rounds of feedback, followed by voting.`);
    // Start the first round
    await continuePitchDiscussion(channelId);
}
async function continuePitchDiscussion(channelId) {
    const state = activePitches.get(channelId);
    if (!state || !state.isActive)
        return;
    const characters = getCharacters();
    // Get responses for current round
    const currentRoundResponses = state.responses.filter((r) => state.responses.filter((x) => x.character === r.character).length ===
        state.round);
    // Check if round is complete
    if (currentRoundResponses.length === characters.length) {
        if (state.round === 2) {
            // All rounds complete, start voting
            await startVoting(channelId);
            return;
        }
        // Move to next round
        state.round++;
        // Add a small delay between rounds
        setTimeout(() => continuePitchDiscussion(channelId), 3000);
        return;
    }
    // Get the last speaker
    const lastSpeaker = state.responses[state.responses.length - 1]?.character;
    // Find characters who haven't spoken in this round
    const availableCharacters = characters.filter((char) => !currentRoundResponses.some((r) => r.character === char.id));
    // If no available characters, something went wrong
    if (availableCharacters.length === 0) {
        console.error("No available characters to speak");
        return;
    }
    // Pick next character (avoid last speaker if possible)
    let nextCharacter = availableCharacters.find((c) => c.id !== lastSpeaker);
    if (!nextCharacter) {
        nextCharacter = availableCharacters[0];
    }
    // Generate response
    const contextPrompt = state.round === 1
        ? `You are ${nextCharacter.name}. A founder has pitched their business idea: "${state.idea}".
       Give a brief, focused reaction (max 50 words). Be constructive but honest, speaking in your unique voice.
       Focus on a single specific aspect of the idea.`
        : `You are ${nextCharacter.name}. Continue the discussion about: "${state.idea}".
       Previous comments in this round:\n${currentRoundResponses
            .map((r) => `${getCharacter(r.character)?.name}: "${r.message}"`)
            .join("\n")}
       Give a brief, focused follow-up comment (max 50 words). React to others' points while staying in character.
       Focus on a different aspect than what others have mentioned.`;
    try {
        const response = await generateCharacterResponse(nextCharacter.prompt + "\n" + contextPrompt, state.idea);
        state.responses.push({ character: nextCharacter.id, message: response });
        await sendAsCharacter(channelId, nextCharacter.id, response);
        // Add varying delays between responses to feel more natural
        const delay = 2000 + Math.random() * 1000;
        setTimeout(() => continuePitchDiscussion(channelId), delay);
    }
    catch (error) {
        console.error("Error in pitch discussion:", error);
        activePitches.delete(channelId);
    }
}
async function startVoting(channelId) {
    const state = activePitches.get(channelId);
    if (!state)
        return;
    const characters = getCharacters();
    // Generate votes
    for (const character of characters) {
        const votePrompt = `You are ${character.name}. After discussing this business idea: "${state.idea}"
      Discussion history:\n${state.responses
            .map((r) => `${getCharacter(r.character)?.name}: "${r.message}"`)
            .join("\n")}
      Vote either INVEST or PASS, with a very brief reason (10 words max).`;
        try {
            const vote = await generateCharacterResponse(character.prompt + "\n" + votePrompt, state.idea);
            state.votes[character.id] = vote;
            await sendAsCharacter(channelId, character.id, `🗳️ ${vote}`);
            // Add a small delay between votes
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        catch (error) {
            console.error("Error during voting:", error);
        }
    }
    // Calculate and display results
    const investCount = Object.values(state.votes).filter((v) => v.toLowerCase().includes("invest")).length;
    const passCount = Object.values(state.votes).filter((v) => v.toLowerCase().includes("pass")).length;
    const resultMessage = `
📊 Final Vote Results:
INVEST: ${investCount} votes
PASS: ${passCount} votes
${investCount > passCount
        ? "✨ The coaches would invest!"
        : "🤔 The coaches would pass."}`;
    // Use the first character to announce results
    await sendAsCharacter(channelId, characters[0].id, resultMessage);
    // Cleanup
    state.isActive = false;
    setTimeout(() => activePitches.delete(channelId), 5000);
}
