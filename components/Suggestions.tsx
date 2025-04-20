const suggestions = [
    { title: "John Johnson edit", thumb: "/john.png" },
    { title: "ASCII cat", thumb: "/ascii.png" },
    { title: "Egg 100GB", thumb: "/john.png" },
    { title: "Shrek talking", thumb: "/ascii.png" },
  ];
  
  export default function Suggestions() {
    return (
      <div className="px-4 py-6">
        <h2 className="text-lg font-medium mb-3">Suggestions based on recent watches</h2>
        <div className="flex gap-4 overflow-x-auto">
          {suggestions.map((s, idx) => (
            <div key={idx} className="min-w-[160px] bg-zinc-800 rounded-md p-2">
              <img src={s.thumb} alt={s.title} className="rounded" />
              <p className="text-sm mt-2">{s.title}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  