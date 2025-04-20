const videos = [
    { title: "We Are Done", thumb: "/done.png" },
    { title: "Cosmic Lounge", thumb: "/cosmic.png" },
    { title: "Here's a cool walk", thumb: "/walk.png" },
  ];
  
  export default function VideoSection({ title }: { title: string }) {
    return (
      <div className="px-4 py-6">
        <h2 className="text-lg font-medium mb-3">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {videos.map((v, idx) => (
            <div key={idx} className="bg-zinc-800 rounded-md p-2">
              <img src={v.thumb} alt={v.title} className="rounded" />
              <p className="text-sm mt-2">{v.title}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  