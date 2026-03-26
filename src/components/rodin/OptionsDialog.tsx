import { useState, useEffect } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "#/components/ui/drawer";
import { Label } from "#/components/ui/label";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Switch } from "#/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { useMediaQuery } from "#/hooks/use-media-query";

type EnvironmentPreset =
	| "apartment"
	| "city"
	| "dawn"
	| "forest"
	| "lobby"
	| "night"
	| "park"
	| "studio"
	| "sunset"
	| "warehouse";

const ENVIRONMENT_PRESETS: { value: EnvironmentPreset; label: string }[] = [
	{ value: "apartment", label: "Apartment" },
	{ value: "city", label: "City" },
	{ value: "dawn", label: "Dawn" },
	{ value: "forest", label: "Forest" },
	{ value: "lobby", label: "Lobby" },
	{ value: "night", label: "Night" },
	{ value: "park", label: "Park" },
	{ value: "studio", label: "Studio" },
	{ value: "sunset", label: "Sunset" },
	{ value: "warehouse", label: "Warehouse" },
];

interface OptionsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	options: {
		condition_mode: "concat" | "fuse";
		quality: "high" | "medium" | "low" | "extra-low";
		geometry_file_format: "glb" | "usdz" | "fbx" | "obj" | "stl";
		use_hyper: boolean;
		tier: "Regular" | "Sketch";
		TAPose: boolean;
		material: "PBR" | "Shaded";
	};
	onOptionsChange: (options: OptionsDialogProps["options"]) => void;
	environment: EnvironmentPreset;
	onEnvironmentChange: (env: EnvironmentPreset) => void;
}

export default function OptionsDialog({
	open,
	onOpenChange,
	options,
	onOptionsChange,
	environment,
	onEnvironmentChange,
}: OptionsDialogProps) {
	const [localOptions, setLocalOptions] = useState(options);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	useEffect(() => {
		setLocalOptions(options);
	}, [options]);

	const handleChange = (key: string, value: string | boolean) => {
		setLocalOptions((prev) => {
			const updated = { ...prev, [key]: value };
			onOptionsChange(updated as typeof options);
			return updated;
		});
	};

	const content = (
		<div className="py-2">
			<Tabs defaultValue="basic" className="w-full">
				<TabsList className="mb-4 grid grid-cols-2">
					<TabsTrigger value="basic">Basic Settings</TabsTrigger>
					<TabsTrigger value="advanced">Advanced</TabsTrigger>
				</TabsList>

				<TabsContent value="basic" className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label className="font-mono text-white">Quality</Label>
							<Select
								value={localOptions.quality}
								onValueChange={(value) => handleChange("quality", value)}
							>
								<SelectTrigger className="border-[rgba(255,255,255,0.12)] bg-black text-white">
									<SelectValue placeholder="Select quality" />
								</SelectTrigger>
								<SelectContent className="border-[rgba(255,255,255,0.12)] bg-black text-white">
									<SelectItem value="high">High (50k)</SelectItem>
									<SelectItem value="medium">Medium (18k)</SelectItem>
									<SelectItem value="low">Low (8k)</SelectItem>
									<SelectItem value="extra-low">Extra Low (4k)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="font-mono text-white">Format</Label>
							<Select
								value={localOptions.geometry_file_format}
								onValueChange={(value) =>
									handleChange("geometry_file_format", value)
								}
							>
								<SelectTrigger className="border-[rgba(255,255,255,0.12)] bg-black text-white">
									<SelectValue placeholder="Select format" />
								</SelectTrigger>
								<SelectContent className="border-[rgba(255,255,255,0.12)] bg-black text-white">
									<SelectItem value="glb">GLB</SelectItem>
									<SelectItem value="usdz">USDZ</SelectItem>
									<SelectItem value="fbx">FBX</SelectItem>
									<SelectItem value="obj">OBJ</SelectItem>
									<SelectItem value="stl">STL</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label className="font-mono text-white">Environment</Label>
						<Select
							value={environment}
							onValueChange={(value) =>
								onEnvironmentChange(value as EnvironmentPreset)
							}
						>
							<SelectTrigger className="border-[rgba(255,255,255,0.12)] bg-black text-white">
								<SelectValue placeholder="Select environment" />
							</SelectTrigger>
							<SelectContent className="border-[rgba(255,255,255,0.12)] bg-black text-white">
								{ENVIRONMENT_PRESETS.map(({ value, label }) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-row items-center justify-between rounded-lg border border-[rgba(255,255,255,0.12)] bg-black/50 p-3 shadow-sm">
							<div>
								<Label className="font-mono text-white">Use Hyper</Label>
								<p className="text-xs text-gray-400">Better details</p>
							</div>
							<Switch
								checked={localOptions.use_hyper}
								onCheckedChange={(checked) =>
									handleChange("use_hyper", checked)
								}
							/>
						</div>

						<div className="flex flex-row items-center justify-between rounded-lg border border-[rgba(255,255,255,0.12)] bg-black/50 p-3 shadow-sm">
							<div>
								<Label className="font-mono text-white">T/A Pose</Label>
								<p className="text-xs text-gray-400">For humans</p>
							</div>
							<Switch
								checked={localOptions.TAPose}
								onCheckedChange={(checked) => handleChange("TAPose", checked)}
							/>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="advanced" className="space-y-4">
					<div className="space-y-2">
						<Label className="font-mono text-white">Condition Mode</Label>
						<RadioGroup
							value={localOptions.condition_mode}
							onValueChange={(value) => handleChange("condition_mode", value)}
							className="flex flex-col space-y-1"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value="concat"
									id="rodin-concat"
									className="border-white text-white"
								/>
								<Label htmlFor="rodin-concat" className="text-white">
									Concat (Single object, multiple views)
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value="fuse"
									id="rodin-fuse"
									className="border-white text-white"
								/>
								<Label htmlFor="rodin-fuse" className="text-white">
									Fuse (Multiple objects)
								</Label>
							</div>
						</RadioGroup>
					</div>

					<div className="space-y-2">
						<Label className="font-mono text-white">Material</Label>
						<RadioGroup
							value={localOptions.material}
							onValueChange={(value) => handleChange("material", value)}
							className="flex space-x-4"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value="PBR"
									id="rodin-pbr"
									className="border-white text-white"
								/>
								<Label htmlFor="rodin-pbr" className="text-white">
									PBR
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value="Shaded"
									id="rodin-shaded"
									className="border-white text-white"
								/>
								<Label htmlFor="rodin-shaded" className="text-white">
									Shaded
								</Label>
							</div>
						</RadioGroup>
					</div>

					<div className="space-y-2">
						<Label className="font-mono text-white">Generation Tier</Label>
						<RadioGroup
							value={localOptions.tier}
							onValueChange={(value) => handleChange("tier", value)}
							className="flex space-x-4"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value="Regular"
									id="rodin-regular"
									className="border-white text-white"
								/>
								<Label htmlFor="rodin-regular" className="text-white">
									Regular (Quality)
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value="Sketch"
									id="rodin-sketch"
									className="border-white text-white"
								/>
								<Label htmlFor="rodin-sketch" className="text-white">
									Sketch (Speed)
								</Label>
							</div>
						</RadioGroup>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-md border-[rgba(255,255,255,0.12)] bg-black text-white">
					<DialogHeader>
						<DialogTitle className="font-mono text-xl text-white">
							Options
						</DialogTitle>
					</DialogHeader>
					{content}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent className="border-t border-[rgba(255,255,255,0.12)] bg-black text-white">
				<div className="mx-auto w-full max-w-md">
					<DrawerHeader>
						<DrawerTitle className="font-mono text-xl text-white">
							Options
						</DrawerTitle>
					</DrawerHeader>
					<div className="px-4">{content}</div>
					<DrawerFooter>
						<Button
							onClick={() => onOpenChange(false)}
							className="bg-gray-800 text-white hover:bg-gray-700"
						>
							Apply Settings
						</Button>
					</DrawerFooter>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
