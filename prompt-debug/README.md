# Prompt Generation System

This directory contains the key files used for generating prompts for the GPT model in the Discord bot. The system is responsible for creating scene introductions, conversations, and conclusions.

## Key Files

1. `sceneFramework.ts` - Core prompt generation logic
   - Contains functions for generating intro, conversation, and outro prompts
   - Handles coach selection and scene context
   - Manages GPT API calls and response parsing

2. `coach-dynamics.ts` - Coach state and dynamics
   - Defines coach emotional states
   - Tracks active flags and relationships
   - Used to inform prompt generation

3. `coach-backstory.ts` - Coach backstories
   - Contains personal histories
   - Defines preferred times and locations
   - Used for weighted coach selection

4. `discord-ceos.ts` - Coach character definitions
   - Contains coach names and character traits
   - Used for prompt generation and validation

## Current Issues

The system is currently experiencing issues with:
1. GPT making up new characters despite strict rules
2. Inconsistent coach name usage
3. Potential issues with coach data resolution

## Debug Information

- The system uses a strict set of rules to prevent character invention
- Coach names are validated against a predefined list
- Temperature is set to 0.5 to reduce creativity
- System messages and prompts are aligned to enforce rules

## How to Test

1. Check the logs in the `logs` directory for actual prompts and responses
2. Verify coach data resolution in `discord-ceos.ts`
3. Test prompt generation with different coach combinations
4. Monitor GPT responses for rule violations 