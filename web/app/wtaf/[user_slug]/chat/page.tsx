import { Suspense } from "react";
import WtafChatClient from "./client";

interface WtafChatPageProps {
	params: {
		user_slug: string;
	};
}

export default function WtafChatPage({ params }: WtafChatPageProps) {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center h-screen">
					Loading WTAF Chat...
				</div>
			}
		>
			<WtafChatClient />
		</Suspense>
	);
}

export function generateMetadata({ params }: WtafChatPageProps) {
	return {
		title: `WTAF Code Generator - ${params.user_slug}`,
		description: 'Generate chaotic code with WTAF - the delusional app generator.',
	};
} 