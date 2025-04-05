import * as React from "react";
import { cn } from "@/lib/utils";

interface SidebarContextValue {
	isOpen: boolean;
	toggle: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue>({
	isOpen: true,
	toggle: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
	const [isOpen, setIsOpen] = React.useState(true);
	const [isMobile, setIsMobile] = React.useState(false);
	const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

	React.useEffect(() => {
		const checkMobile = () => {
			const mobile = window.innerWidth < 768;
			setIsMobile(mobile);
			if (mobile) {
				setIsOpen(false);
			}
		};

		// Initial check
		checkMobile();

		// Add event listener for window resize
		window.addEventListener("resize", checkMobile);

		// Cleanup
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return (
		<SidebarContext.Provider value={{ isOpen, toggle }}>
			{children}
		</SidebarContext.Provider>
	);
}

export function useSidebar() {
	return React.useContext(SidebarContext);
}

export const Sidebar = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
	const { isOpen } = useSidebar();
	return (
		<div
			ref={ref}
			className={cn(
				"group/sidebar h-full flex-col bg-[#1a3d3d]/[0.98] backdrop-blur-sm text-white transition-all duration-300 md:border-0 border-0",
				"relative z-40 md:z-0",
				"w-[240px] md:w-60 shrink-0",
				isOpen
					? "translate-x-0 flex"
					: "-translate-x-[240px] md:-translate-x-[240px] hidden",
				className
			)}
			{...props}
		/>
	);
});
Sidebar.displayName = "Sidebar";

export const SidebarHeader = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
	const { isOpen } = useSidebar();
	return (
		<div
			ref={ref}
			className={cn(
				"flex items-center transition-opacity",
				isOpen ? "opacity-100" : "opacity-0 group-hover/sidebar:opacity-100",
				className
			)}
			{...props}
		/>
	);
});
SidebarHeader.displayName = "SidebarHeader";

export const SidebarContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
	const { isOpen } = useSidebar();
	return (
		<div
			ref={ref}
			className={cn(
				"flex-1 overflow-auto py-2 transition-opacity",
				isOpen ? "opacity-100" : "opacity-0 group-hover/sidebar:opacity-100",
				className
			)}
			{...props}
		/>
	);
});
SidebarContent.displayName = "SidebarContent";

export const SidebarFooter = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
	const { isOpen } = useSidebar();
	return (
		<div
			ref={ref}
			className={cn(
				"transition-opacity",
				isOpen ? "opacity-100" : "opacity-0 group-hover/sidebar:opacity-100",
				className
			)}
			{...props}
		/>
	);
});
SidebarFooter.displayName = "SidebarFooter";

export const SidebarTrigger = React.forwardRef<
	HTMLButtonElement,
	React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
	const { toggle } = useSidebar();
	return (
		<button
			ref={ref}
			onClick={toggle}
			className={cn(
				"inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
				className
			)}
			{...props}
		>
			<svg
				className="h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M4 6h16M4 12h16M4 18h16"
				/>
			</svg>
		</button>
	);
});
SidebarTrigger.displayName = "SidebarTrigger";

export const SidebarGroup = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("px-3 py-2", className)} {...props} />
));
SidebarGroup.displayName = "SidebarGroup";

export const SidebarGroupLabel = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"mb-2 text-xs font-medium text-white/50 uppercase tracking-wider",
			className
		)}
		{...props}
	/>
));
SidebarGroupLabel.displayName = "SidebarGroupLabel";

export const SidebarGroupContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("space-y-1", className)} {...props} />
));
SidebarGroupContent.displayName = "SidebarGroupContent";

export const SidebarMenu = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("min-w-full", className)} {...props} />
));
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("", className)} {...props} />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

export const SidebarMenuButton = React.forwardRef<
	HTMLButtonElement,
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		isActive?: boolean;
		children?: [React.ReactNode, React.ReactNode];
	}
>(({ className, isActive, children = [null, null], ...props }, ref) => {
	const { isOpen } = useSidebar();
	return (
		<button
			ref={ref}
			className={cn(
				"group relative flex w-full items-center rounded-lg text-sm font-medium",
				"hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#40e0d0]",
				"text-white/90 disabled:pointer-events-none disabled:opacity-50",
				isActive && "bg-white/5",
				!isOpen && "justify-center",
				className
			)}
			{...props}
		>
			{children[0] ? (
				<div className="flex items-center gap-3">
					<div className="flex h-4 w-4 items-center justify-center">
						{children[0]}
					</div>
					<span
						className={cn(
							"transition-opacity",
							isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
						)}
					>
						{children[1]}
					</span>
				</div>
			) : (
				<span className="w-full text-left px-3 py-2">{children[1]}</span>
			)}
		</button>
	);
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarRail = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
	const { isOpen } = useSidebar();
	return (
		<div
			ref={ref}
			className={cn(
				"absolute right-0 top-0 h-full w-1 cursor-ew-resize bg-border transition-opacity",
				isOpen ? "opacity-100" : "opacity-0",
				className
			)}
			{...props}
		/>
	);
});
SidebarRail.displayName = "SidebarRail";
