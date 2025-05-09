// ... existing code ...

		// Create staff-meetings directory if it doesn't exist
		const meetingsDir = path.join(__dirname, "data", "weekend-conversations");
		if (!fs.existsSync(meetingsDir)) {
			fs.mkdirSync(meetingsDir, { recursive: true });
		}

		// Save the structured messages to a JSON file
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const jsonFilePath = path.join(meetingsDir, `weekend-${timestamp}.json`);
		
		// Save even if validation would fail - better to have partial data than none
		fs.writeFileSync(
			jsonFilePath,
			JSON.stringify({ messages: validMessages }, null, 2)
		);

		console.log(`Saved ${validMessages.length} structured messages to: ${jsonFilePath}`);

// ... existing code ... 