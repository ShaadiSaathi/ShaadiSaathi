import type { CheckInPhoto } from "@/lib/mockPayments"

interface CheckInPhotoDisplayProps {
  photo: CheckInPhoto
  compact?: boolean
}

/** Visual proof tied to a check-in event */
export default function CheckInPhotoDisplay({ photo, compact = false }: CheckInPhotoDisplayProps) {
  return (
    <figure className={`rounded-xl border border-gold/20 bg-white ${compact ? "p-2" : "p-3"}`}>
      {photo.previewUrl ? (
        <img
          src={photo.previewUrl}
          alt={`Setup photo: ${photo.name}`}
          className={`w-full rounded-lg object-cover ${compact ? "max-h-24" : "max-h-40"}`}
        />
      ) : (
        <div
          className={`flex w-full items-center justify-center rounded-lg border border-dashed border-gold/30 bg-ivory text-maroon/50 ${compact ? "min-h-24" : "min-h-40"}`}
        >
          <div className="px-4 text-center text-sm">
            <p className="font-medium text-maroon/70">{photo.name}</p>
            <p className="mt-1 text-xs">Photo saved on check-in</p>
          </div>
        </div>
      )}
      <figcaption className="mt-2 text-xs text-maroon/50">
        {photo.name} ·{" "}
        {new Date(photo.uploadedAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </figcaption>
    </figure>
  )
}
