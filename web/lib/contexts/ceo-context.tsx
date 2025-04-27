"use client";

import {
	createContext,
	useContext,
	useState,
	ReactNode,
	useEffect,
} from "react";
import { CEO, CEOContextType } from "@/types/ceo";
import { useChatStore } from "@/lib/store/chat-store";
import { ceos } from "@/data/ceos";

const STORAGE_KEY = "selected-ceo";

const CEOContext = createContext<CEOContextType | undefined>(undefined);

export function CEOProvider({ children }: { children: ReactNode }) {
	const [selectedCEO, setSelectedCEO] = useState<CEO | null>(null);
	const clearMessages = useChatStore((state) => state.clearMessages);

	// Initialize CEO from localStorage
	useEffect(() => {
		const storedCEOId = localStorage.getItem(STORAGE_KEY);
		if (storedCEOId) {
			const ceo = ceos.find((c) => c.id === storedCEOId);
			if (ceo) {
				setSelectedCEO(ceo);
			}
		}
	}, []);

	// Clear chat history when CEO changes
	useEffect(() => {
		if (selectedCEO) {
			clearMessages();
			localStorage.setItem(STORAGE_KEY, selectedCEO.id);
		}
	}, [selectedCEO, clearMessages]);

	const handleSetSelectedCEO = (ceo: CEO) => {
		console.log("Setting CEO to:", ceo.id);
		setSelectedCEO(ceo);
	};

	return (
		<CEOContext.Provider
			value={{ selectedCEO, setSelectedCEO: handleSetSelectedCEO }}
		>
			{children}
		</CEOContext.Provider>
	);
}

export function useCEO() {
	const context = useContext(CEOContext);
	if (context === undefined) {
		throw new Error("useCEO must be used within a CEOProvider");
	}
	return context;
}
