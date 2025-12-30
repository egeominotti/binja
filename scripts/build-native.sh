#!/bin/bash
# Build native Zig library for all platforms (optimized for size)

set -e

cd "$(dirname "$0")/.."

NATIVE_DIR="zig-native"
OUTPUT_DIR="native"

echo "=== Building Binja Native Library (Size Optimized) ==="
echo ""

# Create output directories
mkdir -p "$OUTPUT_DIR/darwin-arm64"
mkdir -p "$OUTPUT_DIR/darwin-x64"
mkdir -p "$OUTPUT_DIR/linux-x64"
mkdir -p "$OUTPUT_DIR/linux-arm64"

cd "$NATIVE_DIR"

# Use ReleaseSmall for minimum binary size
OPT="-Doptimize=ReleaseSmall"

# Build and strip function
build_target() {
    local target=$1
    local output_dir=$2
    local lib_name=$3

    echo "  Building $target..."
    if zig build $OPT -Dtarget=$target 2>/dev/null; then
        cp "zig-out/lib/$lib_name" "../$OUTPUT_DIR/$output_dir/"
        # Strip debug symbols
        if command -v strip &> /dev/null; then
            strip "../$OUTPUT_DIR/$output_dir/$lib_name" 2>/dev/null || true
        fi
        return 0
    fi
    return 1
}

# Build for current platform first
echo "Building for current platform..."
zig build $OPT

PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
[ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ] && ARCH="arm64" || ARCH="x64"

if [ "$PLATFORM" = "darwin" ]; then
    cp zig-out/lib/libbinja.dylib "../$OUTPUT_DIR/darwin-$ARCH/"
    strip "../$OUTPUT_DIR/darwin-$ARCH/libbinja.dylib" 2>/dev/null || true
    echo "  -> native/darwin-$ARCH/libbinja.dylib"
elif [ "$PLATFORM" = "linux" ]; then
    cp zig-out/lib/libbinja.so "../$OUTPUT_DIR/linux-$ARCH/"
    strip "../$OUTPUT_DIR/linux-$ARCH/libbinja.so" 2>/dev/null || true
    echo "  -> native/linux-$ARCH/libbinja.so"
fi

# Cross-compile for other targets
echo ""
echo "Cross-compiling..."

[ "$PLATFORM" != "darwin" ] || [ "$ARCH" != "arm64" ] && \
    build_target "aarch64-macos" "darwin-arm64" "libbinja.dylib"

[ "$PLATFORM" != "darwin" ] || [ "$ARCH" != "x64" ] && \
    build_target "x86_64-macos" "darwin-x64" "libbinja.dylib"

[ "$PLATFORM" != "linux" ] || [ "$ARCH" != "x64" ] && \
    build_target "x86_64-linux-musl" "linux-x64" "libbinja.so"

[ "$PLATFORM" != "linux" ] || [ "$ARCH" != "arm64" ] && \
    build_target "aarch64-linux-musl" "linux-arm64" "libbinja.so"

cd ..

echo ""
echo "=== Build Complete ==="
echo ""
echo "Native libraries:"
find "$OUTPUT_DIR" -type f -name "libbinja.*" | while read f; do
    SIZE=$(ls -lh "$f" | awk '{print $5}')
    echo "  $f ($SIZE)"
done
