import React, { useEffect, useRef } from "react";
import { Textarea } from "#/components/ui/textarea";
import { cn } from "#/lib/utils";

interface AutoResizeTextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	className?: string;
}

const AutoResizeTextarea = React.forwardRef<
	HTMLTextAreaElement,
	AutoResizeTextareaProps
>(({ className, ...props }, ref) => {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const setRefs = (element: HTMLTextAreaElement) => {
		textareaRef.current = element;
		if (typeof ref === "function") {
			ref(element);
		} else if (ref) {
			ref.current = element;
		}
	};

	const resizeTextarea = () => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			const scrollHeight = textareaRef.current.scrollHeight;
			textareaRef.current.style.height = `${scrollHeight}px`;
		}
	};

	useEffect(() => {
		if (textareaRef.current) {
			const lineHeight = Number.parseInt(
				getComputedStyle(textareaRef.current).lineHeight,
			);
			textareaRef.current.style.height = `${lineHeight}px`;

			if (textareaRef.current.value) {
				resizeTextarea();
			}
		}
	}, []);

	const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		resizeTextarea();
		if (props.onChange) {
			props.onChange(e);
		}
	};

	return (
		<Textarea
			{...props}
			ref={setRefs}
			onChange={handleInput}
			className={cn(
				"min-h-[40px] overflow-hidden border-0 shadow-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
				className,
			)}
			rows={1}
		/>
	);
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export default AutoResizeTextarea;
