import * as ffmpeg from 'fluent-ffmpeg';
import ffmpegBinary from 'ffmpeg-static'; // precompiled ffmpeg binary

if (ffmpegBinary) {
  ffmpeg.setFfmpegPath(ffmpegBinary);
}

export function transcodeToQuality(inputPath: string, outputPath: string, height: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath).outputOptions([
        `-vf scale=-2:${height}`,
        '-c:v libx264',
        '-preset veryfast',
        '-crf 23',
        '-c:a aac',
        '-movflags +faststart'
    ]).on('end', () => resolve()).on('error', (err) => reject()).save(outputPath);
  });
}