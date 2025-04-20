// components/HorizontalScroller.tsx
export default function HorizontalScroller({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4">
        {children}
      </div>
    );
  }
  