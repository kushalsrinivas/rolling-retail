import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, ImageIcon, SlidersHorizontal } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "#/components/ui/button";
import { Form as UIForm } from "#/components/ui/form";
import { useMediaQuery } from "#/hooks/use-media-query";
import { formSchema } from "#/lib/rodin-schema";
import { cn } from "#/lib/utils";
import AutoResizeTextarea from "./AutoResizeTextarea";
import ImageUploadArea from "./ImageUploadArea";

interface RodinFormProps {
  isLoading: boolean;
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void>;
  onOpenOptions: () => void;
  defaultPrompt?: string;
}

export default function RodinForm({
  isLoading,
  onSubmit,
  onOpenOptions,
  defaultPrompt = "",
}: RodinFormProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dragCounter = useRef(0);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: defaultPrompt,
      images: [],
      condition_mode: "concat",
      quality: "medium",
      geometry_file_format: "glb",
      use_hyper: false,
      tier: "Gen-2",
      TAPose: false,
      material: "PBR",
      mesh_mode: "Raw",
      quality_override: 500000,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
  };

  const addImages = (files: File[]) => {
    if (files.length === 0) return;

    const currentImages = form.getValues("images") || [];
    const totalImages = currentImages.length + files.length;

    if (totalImages > 5) {
      setError("You can upload a maximum of 5 images");
      const allowedNewImages = 5 - currentImages.length;
      files = files.slice(0, allowedNewImages);
      if (files.length === 0) return;
    }

    const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
    const updatedImages = [...currentImages, ...files];

    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    form.setValue("images", updatedImages);
  };

  const removeImage = (index: number) => {
    const currentImages = form.getValues("images") || [];
    const newImages = [...currentImages];
    newImages.splice(index, 1);

    const newPreviewUrls = [...previewUrls];
    URL.revokeObjectURL(newPreviewUrls[index]);
    newPreviewUrls.splice(index, 1);

    setPreviewUrls(newPreviewUrls);
    form.setValue("images", newImages);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/"),
      );
      addImages(files);
    }
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (!isMobile && !e.shiftKey) {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
  };

  return (
    <UIForm {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="relative"
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop drop zone */}
        <section
          ref={dropAreaRef}
          className={cn(
            "relative overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.12)] bg-black/60 shadow-lg backdrop-blur-md transition-all",
            isDragging
              ? "ring-2 ring-white"
              : isFocused
                ? "ring-2 ring-white"
                : "",
            isLoading && "pointer-events-none animate-pulse opacity-70",
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <ImageUploadArea
            previewUrls={previewUrls}
            onRemoveImage={removeImage}
            isLoading={isLoading}
          />

          <div className="px-2 py-1.5">
            <div className="flex items-center">
              <div className="flex space-x-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={triggerFileInput}
                  className="ml-0 h-10 w-10 rounded-full text-gray-400 hover:bg-transparent hover:text-white"
                  disabled={isLoading}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onOpenOptions}
                  className="ml-0 h-10 w-10 rounded-full text-gray-400 hover:bg-transparent hover:text-white"
                  disabled={isLoading}
                >
                  <SlidersHorizontal className="h-5 w-5" />
                </Button>
              </div>

              <AutoResizeTextarea
                placeholder="Describe a 3D model..."
                className="flex-1 resize-none border-0 bg-transparent px-3 py-2 text-base text-white placeholder:text-gray-400 focus:ring-0"
                {...form.register("prompt")}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />

              <div>
                <Button
                  type="submit"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-0 text-black hover:bg-gray-200"
                  disabled={isLoading}
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {isDragging && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/80">
              <p className="text-lg font-medium text-white">Drop images here</p>
            </div>
          )}
        </section>

        {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
      </form>
    </UIForm>
  );
}
