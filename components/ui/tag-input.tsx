"use client";

import React, { KeyboardEvent, useState } from "react";
import { Input } from "./input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = "Add tag...",
  className,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!inputValue.trim()) return;

    // Add tag on enter or comma
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();

      // Don't add if already exists
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }

      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map((tag, index) => (
          <div
            key={index}
            className="flex items-center gap-1 px-2.5 py-0.5 bg-secondary text-secondary-foreground rounded-full text-sm"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(index)}
              disabled={disabled}
              className="rounded-full p-0.5 hover:bg-secondary-foreground/20 transition-colors"
              aria-label={`Remove ${tag} tag`}
            >
              <X size={14} className="opacity-70" />
            </button>
          </div>
        ))}
      </div>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <p className="text-xs text-muted-foreground mt-1">
        Press enter or use comma to add tags
      </p>
    </div>
  );
}
