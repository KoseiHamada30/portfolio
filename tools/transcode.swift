// Re-encodes a video to web-friendly H.264 MP4 at a set width and bitrate, without audio (the
// case-study videos are always muted). macOS only; no ffmpeg needed.
// Also writes a poster frame (JPEG, first frame at 0.3s) next to it when a poster path is given.
//   swift tools/transcode.swift <in.mov> <out.mp4> [width=480] [kbps=1200] [poster.jpg]
@preconcurrency import AVFoundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 3 else {
  print("usage: transcode <in> <out> [width] [kbps]")
  exit(1)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
let width = args.count > 3 ? Int(args[3])! : 480
let kbps = args.count > 4 ? Int(args[4])! : 1200
let poster = args.count > 5 ? URL(fileURLWithPath: args[5]) : nil
try? FileManager.default.removeItem(at: output)

let asset = AVURLAsset(url: input)
guard let track = asset.tracks(withMediaType: .video).first else { fatalError("no video track") }
let natural = track.naturalSize
let outW = width - width % 2
var outH = Int((CGFloat(outW) * natural.height / natural.width).rounded())
outH -= outH % 2

let reader = try AVAssetReader(asset: asset)
let readerOut = AVAssetReaderTrackOutput(track: track, outputSettings: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
])
reader.add(readerOut)

let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let writerIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: outW,
  AVVideoHeightKey: outH,
  AVVideoScalingModeKey: AVVideoScalingModeResizeAspectFill,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: kbps * 1000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
  ],
])
writerIn.transform = track.preferredTransform // keep the source orientation
writerIn.expectsMediaDataInRealTime = false
writer.add(writerIn)

guard reader.startReading() else { fatalError("reader: \(String(describing: reader.error))") }
guard writer.startWriting() else { fatalError("writer: \(String(describing: writer.error))") }
writer.startSession(atSourceTime: .zero)

while let buffer = readerOut.copyNextSampleBuffer() {
  while !writerIn.isReadyForMoreMediaData { usleep(2000) }
  writerIn.append(buffer)
}
writerIn.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
print("\(output.lastPathComponent): \(outW)x\(outH) @ \(kbps)kbps, status \(writer.status == .completed ? "ok" : String(describing: writer.error))")

if let poster {
  let generator = AVAssetImageGenerator(asset: AVURLAsset(url: output))
  generator.appliesPreferredTrackTransform = true
  let frame = try generator.copyCGImage(at: CMTime(seconds: 0.3, preferredTimescale: 600), actualTime: nil)
  guard let dest = CGImageDestinationCreateWithURL(poster as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else { fatalError("poster") }
  CGImageDestinationAddImage(dest, frame, [kCGImageDestinationLossyCompressionQuality: 0.78] as CFDictionary)
  CGImageDestinationFinalize(dest)
  print("\(poster.lastPathComponent): poster")
}
