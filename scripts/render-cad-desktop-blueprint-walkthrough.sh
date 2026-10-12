#!/bin/sh
set -eu

evidence_dir="${CAD_BLUEPRINT_EVIDENCE:-.local/desktop-blueprint-phase2}"
output="$evidence_dir/desktop-input-responsive-walkthrough.mp4"

ffmpeg -y \
  -loop 1 -t 3 -i "$evidence_dir/1440x900-input.png" \
  -loop 1 -t 3 -i "$evidence_dir/1440x900-sample-selected.png" \
  -loop 1 -t 3 -i "$evidence_dir/1440x900-tour-docked.png" \
  -loop 1 -t 3 -i "$evidence_dir/768x1024-input.png" \
  -loop 1 -t 3 -i "$evidence_dir/768x1024-sample-selected.png" \
  -loop 1 -t 3 -i "$evidence_dir/390x844-input.png" \
  -loop 1 -t 3 -i "$evidence_dir/390x844-sample-selected.png" \
  -filter_complex \
  "[0:v]scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=0x090b10,setsar=1[v0];\
   [1:v]scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=0x090b10,setsar=1[v1];\
   [2:v]scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=0x090b10,setsar=1[v2];\
   [3:v]scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=0x090b10,setsar=1[v3];\
   [4:v]scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=0x090b10,setsar=1[v4];\
   [5:v]scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=0x090b10,setsar=1[v5];\
   [6:v]scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=0x090b10,setsar=1[v6];\
   [v0][v1][v2][v3][v4][v5][v6]concat=n=7:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -r 30 -c:v libx264 -preset medium -crf 20 -movflags +faststart "$output"

ffmpeg -v error -i "$output" -f null -
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of json "$output"
