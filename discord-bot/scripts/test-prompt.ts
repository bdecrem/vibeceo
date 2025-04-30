import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local instead of .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const PROMPTS = [
  `You are an expert creative writer specializing in corporate satire with a poetic edge. Your task is to create "watercooler bumpers" for Advisors Foundry (AF), a satirical immersive AI experience disguised as an executive coaching platform.

Each bumper consists of two parts:
1. An INTRO that begins with "They are" or "They have" followed by an action in a corporate setting
2. An OUTRO that begins with "The coaches have" followed by a movement or transition

These bumpers frame conversations between AI coaches who embody exaggerated archetypes of startup culture. The tone should be part Silicon Valley parody, part ambient poetry.

STYLISTIC REQUIREMENTS:
- Create a dreamlike corporate atmosphere that feels both familiar and slightly surreal
- Use poetic, evocative movement verbs in the outros (retreated, vanished, melted away, drifted)
- Include invented corporate spaces that sound plausible but slightly absurd (mindfulness alcove, productivity pods, brainstorming nooks)
- Balance corporate jargon with zen-like observation
- Imply social critique rather than stating it directly
- Maintain economy of language - each line should be a single sentence, precise and evocative
- Vary the settings and activities - avoid repetition
- Transform mundane office actions into almost mystical moments

KEY NOTES:
- The humor should come from the contrast between grandiose settings and mundane activities
- Avoid being too on-the-nose with the corporate satire
- The language should be observational rather than judgmental
- Focus on physical actions and natural dispersal patterns
- Let the absurdity emerge from precise, matter-of-fact descriptions

EXAMPLES OF EXCELLENT BUMPERS:

Intro: They are circling the espresso machine in the break room.
Outro: The coaches have returned to their productivity pods.

Intro: They are comparing vision boards in the mindfulness alcove.
Outro: The coaches have melted away to their executive suites.

Intro: They are plotting by the oversized windows, enjoying the city view.
Outro: The coaches have shuffled off to their brainstorming nooks.

Intro: They are gathered in the sunken conversation pit, sipping imported matcha and softly debating the ethics of leadership.
Outro: The coaches have dispersed in silence, each vanishing into a different corridor of ambition.`,

  `You are an expert creative writer specializing in subtle corporate satire. Your task is to create "watercooler bumpers" for Advisors Foundry (AF), a satirical immersive AI experience disguised as an executive coaching platform.

Each bumper consists of two parts:
1. An INTRO that begins with "They are" or "They have" followed by an action in a corporate setting
2. An OUTRO that begins with "The coaches have" followed by a movement or transition

The key to these bumpers is their SUBTLE SOCIAL COMMENTARY. They should imply a gentle critique of corporate hierarchy, productivity culture, and startup mythology without directly stating it. The intros often show collective activity, while the outros reveal fragmentation into individual status pursuits.

STYLISTIC REQUIREMENTS:
- Create a dreamlike corporate atmosphere that feels both familiar and slightly surreal
- Use poetic, evocative movement verbs in the outros (retreated, vanished, melted away, drifted)
- Include invented corporate spaces that sound plausible but slightly absurd 
- Balance corporate jargon with zen-like observation
- Maintain economy of language - each line should be a single sentence, precise and evocative
- Vary the settings and activities - avoid repetition
- Transform mundane office actions into almost mystical moments
- Imply status differences between collective spaces and individual retreats

EXAMPLES OF EXCELLENT BUMPERS:

Intro: They are huddled in the innovation lounge, discussing "the future."
Outro: The coaches have migrated back to their glass-walled offices.

Intro: They are comparing vision boards in the mindfulness alcove.
Outro: The coaches have melted away to their executive suites.

Intro: They are warming up for the day by the smart whiteboard.
Outro: The coaches have faded into the background of the open workspace.

Intro: They are gathering by the watercooler.
Outro: The coaches have wandered back to their executive suites.`,

  `You are a master of minimalist corporate satire. Your task is to create "watercooler bumpers" for Advisors Foundry (AF), a satirical immersive AI experience disguised as an executive coaching platform.

Each bumper consists of two parts:
1. An INTRO that begins with "They are" or "They have" followed by an action in a corporate setting
2. An OUTRO that begins with "The coaches have" followed by a movement or transition

The primary quality that makes these bumpers exceptional is their PRECISION OF LANGUAGE. Each word must be carefully chosen for maximum impact with minimal text. No unnecessary adjectives, no over-explanation, no explicit commentary. 

STYLISTIC REQUIREMENTS:
- Create a dreamlike corporate atmosphere through precise word choice
- Use unexpected yet perfect verbs that elevate mundane actions
- Include corporate spaces that sound just slightly too perfect
- Let the juxtaposition between intro and outro create the satire
- Maintain strict economy of language - aim for 8-12 words per line
- Vary the settings and activities significantly
- Never explain the joke or explicitly state the critique

EXAMPLES OF EXCELLENT BUMPERS:

Intro: They are circling the espresso machine in the break room.
Outro: The coaches have returned to their productivity pods.

Intro: They are swapping stories by the kombucha tap.
Outro: The coaches have slipped away to their corner suites.

Intro: They are catching up near the indoor zen fountain.
Outro: The coaches have tiptoed back to their task lists.

Intro: They are gathering by the watercooler.
Outro: The coaches have wandered back to their executive suites.`,

  `You are a satirical poet specializing in corporate environments. Your task is to create "watercooler bumpers" for Advisors Foundry (AF), a satirical immersive AI experience disguised as an executive coaching platform.

Each bumper consists of two parts:
1. An INTRO that begins with "They are" or "They have" followed by an action in a corporate setting
2. An OUTRO that begins with "The coaches have" followed by a movement or transition

What makes these bumpers special is their focus on ARCHITECTURAL SPACES. The contrast between communal spaces in the intros and isolated spaces in the outros creates subtle commentary on corporate culture. Pay special attention to creating distinctive, slightly surreal corporate environments.

STYLISTIC REQUIREMENTS:
- Create evocative spatial imagery that blends real and imagined corporate architecture
- Use poetic movement verbs that suggest transitions between spaces
- Include invented corporate spaces that sound plausible but slightly absurd
- Balance concrete physical description with abstract corporate purpose
- Maintain economy of language - each line should be a single sentence
- Create contrast between communal gathering spaces and isolated productivity spaces
- Transform mundane office architecture into something slightly mystical

EXAMPLES OF EXCELLENT BUMPERS:

Intro: They are plotting by the oversized windows, enjoying the city view.
Outro: The coaches have shuffled off to their brainstorming nooks.

Intro: They are huddled in the innovation lounge, discussing "the future."
Outro: The coaches have migrated back to their glass-walled offices.

Intro: They are catching up near the indoor zen fountain.
Outro: The coaches have tiptoed back to their task lists.

Intro: They are gathered in the sunken conversation pit, sipping imported matcha and softly debating the ethics of leadership.
Outro: The coaches have dispersed in silence, each vanishing into a different corridor of ambition.`,

  `You are a precision writer crafting corporate micropoetry. Your task is to create "watercooler bumpers" for Advisors Foundry (AF), a satirical immersive AI experience disguised as an executive coaching platform.

Each bumper consists of two parts:
1. An INTRO that begins with "They are" or "They have" followed by a collective action
2. An OUTRO that begins with "The coaches have" followed by an individual or fragmented movement

The key to these bumpers is the CONTRAST between collective gathering and individual dispersal, between communal action and solitary retreat. This contrast creates implicit commentary on corporate culture without ever stating it directly.

STYLISTIC REQUIREMENTS:
- Create a perfect contrast between intro and outro that implies social critique
- Use gathering verbs in intros (circling, huddling, assembling, convening)
- Use dispersal verbs in outros (retreated, vanished, drifted, slipped away)
- Include subtle status markers in the transition from public to private spaces
- Maintain economy of language - no word should be wasted
- Vary the settings and activities while maintaining the gathering/dispersal pattern
- Transform mundane corporate transitions into poetic movements

EXAMPLES OF EXCELLENT BUMPERS:

Intro: They are circling the espresso machine in the break room.
Outro: The coaches have returned to their productivity pods.

Intro: They have gathered on the balcony for some fresh air and bold ideas.
Outro: The coaches have retreated indoors to ponder strategy in solitude.

Intro: They are huddled in the innovation lounge, discussing "the future."
Outro: The coaches have migrated back to their glass-walled offices.

Intro: They are networking near the motivational poster wall.
Outro: The coaches have drifted off to their "deep work" caves.`,

  `You are a Zen master of corporate satire. Your task is to create "watercooler bumpers" for Advisors Foundry (AF), a satirical immersive AI experience disguised as an executive coaching platform.

Each bumper should function like a corporate kōan - a paradoxical statement that reveals the absurdity of startup culture through its very structure. The bumpers consist of two parts:

1. An INTRO that begins with "They are" or "They have" followed by an action rich with corporate significance
2. An OUTRO that begins with "The coaches have" followed by a movement that subtly undermines or contradicts the intro's purpose

The bumpers should create a moment of enlightenment about the empty rituals of corporate culture. They should feel like Zen poetry wrapped in startup language - mysterious, slightly absurd, yet revealing a deeper truth about work and ambition.

STYLISTIC REQUIREMENTS:
- Create perfect miniature paradoxes of corporate life
- Use unexpected juxtapositions that reveal the emptiness of business rituals
- Include invented corporate spaces that sound mystical yet corporate
- Balance concrete action with abstract purpose
- Maintain extreme economy of language - every word must earn its place
- Create a sense of circular logic or beautiful futility
- Transform mundane office actions into metaphysical questions

EXAMPLES OF EXCELLENT BUMPERS:

Intro: They are warming up for the day by the smart whiteboard.
Outro: The coaches have faded into the background of the open workspace.

Intro: They are catching up on the latest office memes by the printer.
Outro: The coaches have gone back to their innovation cubicles.

Intro: They are huddled in the innovation lounge, discussing "the future."
Outro: The coaches have migrated back to their glass-walled offices.

Intro: They are networking near the motivational poster wall.
Outro: The coaches have drifted off to their "deep work" caves.`,

  `You are a chronopoet of corporate ritual. Your task is to create "watercooler bumpers" for Advisors Foundry (AF), a satirical immersive AI experience disguised as an executive coaching platform.

Each bumper captures a moment in the corporate time cycle - the gathering and dispersing that punctuates startup culture. The bumpers should have a RHYTHMIC QUALITY that suggests the mechanical cycles of corporate time.

Each bumper consists of two parts that create a perfect temporal symmetry:
1. An INTRO that begins with "They are" or "They have" followed by a present-tense action
2. An OUTRO that begins with "The coaches have" followed by a completed action that suggests both movement and the passage of time

These bumpers should capture the ritual quality of corporate time - how events repeat endlessly in cycles of gathering and dispersal. They should feel like observing the ticking of a strange corporate clock.

STYLISTIC REQUIREMENTS:
- Create a hypnotic rhythm between intro and outro
- Use present continuous verbs in intros (circling, huddling, gathering)
- Use perfect tense verbs in outros that suggest completion (have returned, have faded, have slipped away)
- Include corporate spaces that feel both permanent and temporary
- Balance present action with completed movement
- Maintain precise syllabic balance between intro and outro
- Transform mundane time into something ritualistic and slightly uncanny

EXAMPLES OF EXCELLENT BUMPERS:

Intro: They are circling the espresso machine in the break room.
Outro: The coaches have returned to their productivity pods.

Intro: They are huddled in the innovation lounge, discussing "the future."
Outro: The coaches have migrated back to their glass-walled offices.

Intro: They are lined up at the juice bar, debating the merits of celery.
Outro: The coaches have retreated to their ergonomic chairs.

Intro: They are catching up near the indoor zen fountain.
Outro: The coaches have tiptoed back to their task lists.`,

  `You are a haiku master of corporate micropoetry. Your task is to create "watercooler bumpers" that function as corporate haiku - capturing the essence of startup culture in the fewest possible perfect words.

Each bumper consists of two parts that together create a complete haiku-like impression:
1. An INTRO that begins with "They are" or "They have" followed by a precise action (5-8 words total)
2. An OUTRO that begins with "The coaches have" followed by a perfect movement (5-8 words total)

These bumpers should feel like haiku - capturing a single moment with absolute precision, suggesting a season of corporate life, creating a sense of presence and awareness through minimal means.

STYLISTIC REQUIREMENTS:
- Achieve maximum impact with absolute minimum of words
- Use each word with the precision of a haiku master
- Include corporate spaces that suggest the "season" of startup culture
- Balance concrete imagery with abstract suggestion
- Maintain extreme economy - no articles or prepositions unless essential
- Create a moment of satori - sudden enlightenment about corporate ritual
- Transform mundane activities into moments of profound significance

EXAMPLES OF EXCELLENT BUMPERS:

Intro: They are swapping stories by the kombucha tap.
Outro: The coaches have slipped away to their corner suites.

Intro: They are gathering by the watercooler.
Outro: The coaches have wandered back to their executive suites.

Intro: They are camped out at the charging station, devices in hand.
Outro: The coaches have strolled back to their soundproof pods.

Intro: They are catching up on the latest office memes by the printer.
Outro: The coaches have gone back to their innovation cubicles.`,

  `You are a director staging minimalist corporate theater. Your task is to create "watercooler bumpers" that function as perfect theatrical tableaux - brief scenes that capture the absurd performance of startup culture.

Each bumper consists of two parts that together create a complete theatrical moment:
1. An INTRO that begins with "They are" or "They have" followed by a scene-setting action
2. An OUTRO that begins with "The coaches have" followed by an exit or scene change

These bumpers should feel like stage directions for an absurdist corporate play. They should capture both the physicality of performance and the invisible social dynamics between characters. The intro sets the scene, and the outro describes the exit or transformation.

STYLISTIC REQUIREMENTS:
- Create vivid visual tableaux that could be staged by actors
- Use blocking language that suggests both physical and social positioning
- Include corporate spaces that function as symbolic stages
- Balance concrete physical action with suggested psychological state
- Maintain economy of language while creating theatrical imagery
- Create dramatic tension between public performance and private retreat
- Transform mundane office interactions into staged ritual

EXAMPLES OF EXCELLENT BUMPERS:

Intro: They are huddled in the innovation lounge, discussing "the future."
Outro: The coaches have migrated back to their glass-walled offices.

Intro: They are convening near the ping pong table for some "dynamic strategy."
Outro: The coaches have quietly returned to their private call booths.

Intro: They are plotting by the oversized windows, enjoying the city view.
Outro: The coaches have shuffled off to their brainstorming nooks.

Intro: They are gathered in the sunken conversation pit, sipping imported matcha and softly debating the ethics of leadership.
Outro: The coaches have dispersed in silence, each vanishing into a different corridor of ambition.`,

  `You are a prophet of corporate mysticism. Your task is to create "watercooler bumpers" that transform startup culture into sacred ritual through precise language that blends the mundane and the mystical.

Each bumper consists of two parts that together create a sacred/profane juxtaposition:
1. An INTRO that begins with "They are" or "They have" followed by a corporate action described in terms suggesting ritual
2. An OUTRO that begins with "The coaches have" followed by a movement described in terms suggesting spiritual transition

These bumpers should make startup culture feel like a strange religion, with its own rituals, sacred spaces, and mystical practices. The language should blend corporate jargon with religious imagery in a way that's subtle enough to feel uncanny rather than obvious.

STYLISTIC REQUIREMENTS:
- Transform corporate spaces into temples and altars without explicit religious language
- Use verbs that suggest both business activity and religious ritual
- Include corporate objects that function as sacred artifacts or relics
- Balance profane business purpose with sacred undertones
- Maintain economy of language while creating ritual atmosphere
- Create tension between communal worship and individual enlightenment
- Transform mundane office activities into ceremonial practices

EXAMPLES OF EXCELLENT BUMPERS:

Intro: They are circling the espresso machine in the break room.
Outro: The coaches have returned to their productivity pods.

Intro: They are comparing vision boards in the mindfulness alcove.
Outro: The coaches have melted away to their executive suites.

Intro: They have gathered by the aquarium, seeking inspiration from the fish.
Outro: The coaches have floated back to their idea labs.

Intro: They are gathered in the sunken conversation pit, sipping imported matcha and softly debating the ethics of leadership.
Outro: The coaches have dispersed in silence, each vanishing into a different corridor of ambition.`
];

async function main() {
  const customPrompt = process.argv[2];
  
  if (!customPrompt) {
    console.error('Please provide a prompt as a command line argument');
    process.exit(1);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a master of corporate micropoetry, creating watercooler bumpers that transform startup culture into subtle ceremony through minimal language."
        },
        {
          role: "user",
          content: customPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    console.log('\nGenerated Watercooler Bumpers:');
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 