import HorizontalScroller from "@/components/HorizontalScroller";

const streams = [
    { title: "Everything Everywhere", thumb: "/thumb1.png" },
    { title: "DISCOORDINATED", thumb: "/thumb1.png" },
    { title: "COLOR", thumb: "/thumb1.png" },
    { title: "COLOR", thumb: "/thumb1.png" },
  ];
  
  export default function LiveStreams() {
    return (
      <div className="px-4 py-6">
        <h2 className="text-lg font-medium mb-3">Live Streams</h2>
        <div className="flex gap-4 overflow-x-auto">
          {streams.map((s, idx) => (
            <div key={idx} className="min-w-[200px] bg-zinc-800 rounded-md p-2">
              <img src={s.thumb} alt={s.title} className="rounded" />
              <p className="text-sm mt-2">{s.title}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  