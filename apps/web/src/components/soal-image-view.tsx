import type { SoalImage } from "@teacher-exam/shared"
import { sanitizeStimulusSvg } from "@teacher-exam/shared"
import type { ReactNode } from "react"

type SoalImageViewProps = {
  image: SoalImage
  printSafe: boolean
}

export function SoalImageView({ image, printSafe }: SoalImageViewProps): ReactNode {
  const style = printSafe ? { filter: "grayscale(1)" } : undefined
  if (image.source === "svg") {
    const svg = sanitizeStimulusSvg(image.svg)
    if (svg === null) return null
    return (
      <div
        className="my-3 flex justify-center"
        data-soal-image
        data-soal-image-source="svg"
        style={style}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }
  return (
    <div
      className="my-3 flex justify-center"
      data-soal-image
      data-soal-image-source={image.source}
      style={style}
    >
      <img
        alt=""
        className="max-h-44 max-w-[220px]"
        src={`data:${image.mediaType};base64,${image.dataBase64}`}
      />
    </div>
  )
}
