export default function MovieCardSkeleton() {
  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-800 animate-pulse flex flex-col w-full border border-white/5">
      {/* Poster area placeholder */}
      <div className="relative aspect-[2/3] w-full bg-gray-700/80">
        {/* Rating badge placeholder */}
        <div className="absolute top-2 left-2 w-10 h-5 rounded bg-gray-600/60" />

        {/* Favorite button placeholder */}
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gray-600/60" />
      </div>

      {/* Info area placeholder */}
      <div className="p-3 space-y-2 bg-gray-800">
        {/* Title placeholder */}
        <div className="h-3.5 bg-gray-700 rounded w-4/5" />

        {/* Year / rating placeholder */}
        <div className="h-3 bg-gray-700/60 rounded w-2/5" />
      </div>
    </div>
  );
}
