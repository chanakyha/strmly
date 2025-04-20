// app/page.tsx or app/home/page.tsx (depending on your routing)
import HeroBanner from "@/components/HeroBanner";
import LiveStreams from "@/components/LiveStreams";
import VideoSection from "@/components/VideoSection";
import Suggestions from "@/components/Suggestions";
import ShortsCarousel from "@/components/ShortsCarousel";

export default function Home() {
  return (
    <div className="bg-black min-h-screen text-white pb-20">
      <HeroBanner /> {/* Top full-width banner */}
      <section className="mt-6">
        <LiveStreams /> {/* Scrollable horizontal list */}
      </section>
      <section className="mt-10">
        <VideoSection title="Featured Videos" /> {/* Grid style */}
      </section>
      <section className="mt-10">
        <Suggestions /> {/* Horizontal scroll suggestions */}
      </section>
      <section className="mt-10">
        <ShortsCarousel /> {/* Scrollable short video cards */}
      </section>
    </div>
  );
}
