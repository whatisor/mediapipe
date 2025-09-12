# Requires: Docker Desktop with access to your drive, image named "mediapipe"
# Usage: pwsh -File .\build_tasks_vision.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Resolve repository root for the bind mount
$repoRoot = (Resolve-Path ".").Path

# Commands executed inside the container (bash).
$innerScript = @'
rm .bazelversion; bazel build //mediapipe/tasks/web/vision:all; \
  npm install -g @microsoft/api-extractor; \
  cp mediapipe/tasks/web/vision/api-extractor.json bazel-out/k8-fastbuild/bin/mediapipe/tasks/web/vision/api-extractor.json; \
  cp tsconfig.json bazel-out/k8-fastbuild/bin/mediapipe/tasks/web/vision/tsconfig.json; \
  cd bazel-out/k8-fastbuild/bin/mediapipe/tasks/web/vision; npx api-extractor run; \
  cp -rf vision_pkg /mediapipe/vision_pkg; \
  echo Done.
'@

# Normalize line endings to LF for bash
$innerScript = $innerScript -replace "`r`n", "`n"
$innerScript = $innerScript -replace "`r", "`n"

# Run container with working directory set to /mediapipe
docker run --rm -it `
  -v "${repoRoot}:/mediapipe" `
  -w /mediapipe `
  mediapipe bash -lc "$innerScript"


