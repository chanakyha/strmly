const shorts = Array(5).fill({
    title: "Pizza Box Booty Attack",
    thumb: "/catshort.png",
  });
  
  export default function ShortsCarousel() {
    return (
      <div className="px-4 py-6">
        <h2 className="text-lg font-medium mb-3">Shorts</h2>
        <div className="flex gap-4 overflow-x-auto">
          {shorts.map((s, idx) => (
            <div key={idx} className="min-w-[120px] bg-zinc-800 rounded-md p-2">
              <img src={s.thumb} alt={s.title} className="rounded" />
              <p className="text-xs mt-2">{s.title}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  