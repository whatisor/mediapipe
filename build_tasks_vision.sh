# Build script for MediaPipe Tasks Vision web components
# Requires: Docker Desktop with access to your drive, image named "mediapipe"

# Define the build commands to execute inside the container
script="rm .bazelversion; bazel build //mediapipe/tasks/web/vision:all; \
     npm install -g @microsoft/api-extractor; \
     cp mediapipe/tasks/web/vision/api-extractor.json bazel-out/k8-fastbuild/bin/mediapipe/tasks/web/vision/api-extractor.json; \
     cp tsconfig.json bazel-out/k8-fastbuild/bin/mediapipe/tasks/web/vision/tsconfig.json; \
     cd bazel-out/k8-fastbuild/bin/mediapipe/tasks/web/vision; npx api-extractor run; \
     cp -rf vision_pkg /mediapipe/vision_pkg; \
     echo Done. "

# Run Docker container with current directory mounted as /mediapipe
# --rm: Remove container after execution
# -it: Interactive terminal
# -v .:/mediapipe: Mount current directory to /mediapipe in container
docker run -v .:/mediapipe --rm -it mediapipe bash -c "$script;"