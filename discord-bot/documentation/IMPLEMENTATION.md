# Waterheater Chat Implementation

## Step 1: Waterheater Chat Structure Changes
- [x] Modify `triggerWaterheaterChat` to use 6 messages with clear roles
- [x] Remove redundant code (channel fetch and event message calls)
- [x] Keep the random coach and incident selection

## Step 2: Scheduler Integration
- [x] Add `waterheater` to the `serviceMap` in `scheduler.ts`
- [x] Import `triggerWaterheaterChat` function
- [x] Ensure it works with the scheduler's intro/outro message system

## Step 3: Story Arc Integration
- [x] After waterheater chat completes, create a new story arc entry in `story-arcs.json`
- [x] Use the coaches from the waterheater chat to populate the `requiredCharacters`
- [x] Follow the exact structure of the "getting_irritated_by_kailey" example
- [x] Allow customization of probability, promptAttribute, context, etc.

## Progress
- Started: [Current Date]
- Current Step: 3
- Status: Completed All Steps
- Implementation Complete 